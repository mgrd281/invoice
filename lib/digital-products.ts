
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email-service'

export async function getDigitalProductByShopifyId(shopifyProductId: string) {
    return prisma.digitalProduct.findUnique({
        where: { shopifyProductId },
        include: {
            variantSettings: true,
            _count: {
                select: { keys: { where: { isUsed: false } } }
            }
        }
    })
}

export async function createDigitalProduct(data: {
    organizationId: string
    shopifyProductId: string
    title: string
    emailTemplate?: string
}) {
    return prisma.digitalProduct.create({
        data
    })
}

export async function addLicenseKeys(digitalProductId: string, keys: string[]) {
    return prisma.licenseKey.createMany({
        data: keys.map(key => ({
            digitalProductId,
            key,
            isUsed: false
        }))
    })
}

export async function getAvailableKey(digitalProductId: string, shopifyVariantId?: string) {
    // 1. If variantId is provided, try to find a key SPECIFIC to that variant
    if (shopifyVariantId) {
        const variantKey = await prisma.licenseKey.findFirst({
            where: {
                digitalProductId,
                isUsed: false,
                shopifyVariantId: shopifyVariantId
            },
            orderBy: { createdAt: 'asc' }
        })

        if (variantKey) return variantKey
    }

    // 2. Fallback (or default): Find a key with NO variant assigned (null)
    // This allows "general" keys to be used for any variant (or if no variant is specified)
    return prisma.licenseKey.findFirst({
        where: {
            digitalProductId,
            isUsed: false,
            shopifyVariantId: null
        },
        orderBy: { createdAt: 'asc' }
    })
}

export async function markKeyAsUsed(keyId: string, orderNumber: string, shopifyOrderId: string, emailSent: boolean = true, customerId?: string, shopifyVariantId?: string) {
    return prisma.licenseKey.update({
        where: { id: keyId },
        data: {
            isUsed: true,
            usedAt: new Date(),
            orderId: orderNumber,
            shopifyOrderId: shopifyOrderId,
            shopifyVariantId: shopifyVariantId, // Store the variant that requested this key
            customerId: customerId, // Link to customer
            // We use 'any' cast here to avoid TS errors until client is regenerated
            emailSent: emailSent,
            emailSentAt: emailSent ? new Date() : null,
            deliveryStatus: emailSent ? 'SENT' : 'PENDING'
        } as any
    })
}

export async function processDigitalProductOrder(
    shopifyProductId: string,
    shopifyOrderId: string,
    orderNumber: string,
    customerEmail: string,
    customerName: string,
    productTitle: string,
    shopifyVariantId?: string,
    customerSalutation?: string,
    shouldSendEmail: boolean = true,
    customerId?: string,
    quantity: number = 1
) {
    console.log(`DEBUG: processDigitalProductOrder for Product ${shopifyProductId}, Order ${orderNumber}, shouldSend: ${shouldSendEmail}, quantity: ${quantity}`)
    const digitalProduct = await getDigitalProductByShopifyId(shopifyProductId)

    if (!digitalProduct) {
        console.log(`DEBUG: [FAIL] Digital product NOT found in database for Shopify Product ID: ${shopifyProductId}`)
        return { success: false, error: 'Product not configured as digital product' }
    }
    console.log(`DEBUG: Found Digital Product: ${digitalProduct.title} (ID: ${digitalProduct.id})`)

    // 1. Check if we should even proceed for Vorkasse if paid check is needed
    // If autoSendVorkasse is false, we don't send automatically even if paid.
    if ((digitalProduct as any).autoSendVorkasse === false && shouldSendEmail) {
        console.log(`⏸️ [SKIPPED] Auto-send is DISABLED for product ${digitalProduct.title}. Key will be assigned but not sent.`)
        shouldSendEmail = false // Force delay
    }

    // 2. Check for existing keys for this order/product to ensure idempotency
    // We search for keys for this order and product. Variant mismatch is common if general keys were assigned.
    const existingKeys = await prisma.licenseKey.findMany({
        where: {
            digitalProductId: digitalProduct.id,
            shopifyOrderId: shopifyOrderId,
            // We search for keys regardless of variant ID if they were assigned to this order,
            // OR we match the variant ID.
            OR: [
                { shopifyVariantId: shopifyVariantId || null },
                { shopifyVariantId: null } // Fallback to check if general keys were reserved
            ]
        }
    })

    let keysToProcess: any[] = []

    if (existingKeys.length > 0) {
        console.log(`🔑 [ORDER ${shopifyOrderId}] ${existingKeys.length} keys already exist for product ${digitalProduct.title}`)
        
        // If we have enough keys already, check if they need sending
        if (existingKeys.length >= quantity) {
            keysToProcess = existingKeys.slice(0, quantity)
            
            const allSent = keysToProcess.every(k => k.emailSent)
            if (allSent) {
                console.log(`✅ [SKIPPED] All keys already sent for this order.`)
                return { success: true, keys: keysToProcess.map(k => k.key), message: 'Keys already assigned and sent' }
            }
            
            if (!shouldSendEmail) {
                console.log(`⏸️ [WAITING] Keys assigned but email not authorized yet.`)
                return { success: true, keys: keysToProcess.map(k => k.key), message: 'Keys already assigned, waiting for payment' }
            }
            
            // If some not sent and shouldSendEmail is true, we proceed to send them
            console.log(`📧 [PROCESSING] Keys found but not all sent. Proceeding...`)
        } else {
            // Need more keys? This is rare but possible if quantity was increased or partial previous run
            console.log(`⚠️ [PARTIAL] Found ${existingKeys.length} keys but need ${quantity}. Fetching more...`)
            keysToProcess = [...existingKeys]
            const needed = quantity - existingKeys.length
            for(let i=0; i<needed; i++) {
                const newKey = await getAvailableKey(digitalProduct.id, shopifyVariantId)
                if (newKey) {
                    await markKeyAsUsed(newKey.id, orderNumber, shopifyOrderId, false, customerId, shopifyVariantId)
                    keysToProcess.push(newKey)
                }
            }
        }
    } else {
        // No existing keys, fetch N keys
        for (let i = 0; i < quantity; i++) {
            const key = await getAvailableKey(digitalProduct.id, shopifyVariantId)
            if (!key) {
                console.error(`No keys available for product: ${digitalProduct.title} (Stock: ${i}/${quantity})`)
                // Admin Alert already handled in getAvailableKey? 
                // Wait, getAvailableKey doesn't send email. Let's send here.
                const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'admin@example.com'
                await sendEmail({
                    to: adminEmail,
                    subject: `⚠️ KEINE KEYS MEHR: ${digitalProduct.title}`,
                    html: `<p>Achtung,</p><p>Für das Produkt <strong>${digitalProduct.title}</strong> sind keine Lizenzschlüssel mehr verfügbar!</p><p>Bestellung ${orderNumber} benötigt ${quantity} Keys, aber nur ${i} waren da.</p>`
                })
                return { success: false, error: 'Not enough keys available' }
            }
            await markKeyAsUsed(key.id, orderNumber, shopifyOrderId, shouldSendEmail, customerId, shopifyVariantId)
            keysToProcess.push(key)
        }
    }

    // 3. If we should NOT send email yet (e.g. waiting for payment), stop here
    if (!shouldSendEmail) {
        return { success: true, message: 'Keys assigned, email delayed' }
    }

    // 4. Prepare consolidated email content
    const consolidatedKeys = keysToProcess.map(k => k.key).join('\n')
    const keyListHtml = keysToProcess.map(k => `<code style="background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-weight: bold;">${k.key}</code>`).join('<br/>')

    // Determine Template & Buttons (Logic from original)
    let template = digitalProduct.emailTemplate || getDefaultTemplate()
    let buttons = digitalProduct.downloadButtons as any[] | null;
    let btnAlignment = digitalProduct.buttonAlignment || 'left';

    if (shopifyVariantId && digitalProduct.variantSettings) {
        const variantSetting = (digitalProduct as any).variantSettings.find((s: any) => s.shopifyVariantId === shopifyVariantId)
        if (variantSetting) {
            if (variantSetting.emailTemplate) template = variantSetting.emailTemplate
            if (variantSetting.downloadButtons && Array.isArray(variantSetting.downloadButtons) && variantSetting.downloadButtons.length > 0) {
                buttons = variantSetting.downloadButtons as any[]
            }
        }
    }

    // Button HTML generation
    let downloadButtonHtml = '';
    const textAlign = btnAlignment === 'center' ? 'center' : (btnAlignment === 'right' ? 'right' : 'left');
    if (Array.isArray(buttons) && buttons.length > 0) {
        downloadButtonHtml = `<div style="margin: 20px 0; text-align: ${textAlign};">` + 
            buttons.map((btn: any) => `
                <div style="margin-bottom: 12px;">
                    <a href="${btn.url}" style="background-color: ${btn.color || '#000000'}; color: ${btn.textColor || '#ffffff'}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; width: 280px; text-align: center;">
                        ${btn.text || 'Download'}
                    </a>
                </div>
            `).join('') + `</div>`;
    } else if (digitalProduct.downloadUrl) {
        downloadButtonHtml = `<div style="margin: 20px 0; text-align: ${textAlign};"><a href="${digitalProduct.downloadUrl}" style="background-color: ${digitalProduct.buttonColor || '#000000'}; color: ${digitalProduct.buttonTextColor || '#ffffff'}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; width: 280px; text-align: center;">${digitalProduct.buttonText || 'Download'}</a></div>`;
    }

    const htmlTemplate = convertToHtml(template);
    const emailBody = replaceVariables(htmlTemplate, {
        customer_name: customerName,
        customer_salutation: customerSalutation || `Hallo ${customerName}`,
        product_title: productTitle,
        license_key: quantity > 1 ? keyListHtml : keysToProcess[0].key,
        download_button: downloadButtonHtml,
        order_number: orderNumber
    })

    const subject = `Ihr Produktschlüssel für ${productTitle}`

    // 5. Send Email
    try {
        await sendEmail({
            to: customerEmail,
            subject,
            html: emailBody
        })

        // Update all processed keys as SENT
        await prisma.licenseKey.updateMany({
            where: { id: { in: keysToProcess.map(k => k.id) } },
            data: {
                emailSent: true,
                emailSentAt: new Date(),
                deliveryStatus: 'SENT'
            }
        })

        console.log(`✅ Email sent to ${customerEmail} with ${keysToProcess.length} keys`)

        // 6. AUTO-FULFILL (Only after successful email)
        try {
            console.log(`📦 Auto-fulfilling Shopify order: ${shopifyOrderId}`)
            const { ShopifyAPI } = await import('@/lib/shopify-api')
            const api = new ShopifyAPI()
            const numericOrderId = parseInt(shopifyOrderId.replace(/\D/g, ''))
            if (!isNaN(numericOrderId)) {
                await api.createFulfillment(numericOrderId)
                console.log(`✅ Shopify fulfillment created for order ${shopifyOrderId}`)
            }
        } catch (fulfillError) {
            console.error('Failed to auto-fulfill Shopify order:', fulfillError)
            // We don't fail the whole request because email was sent, but it's an error.
        }

        return { success: true, keys: keysToProcess.map(k => k.key) }

    } catch (e) {
        console.error(`❌ Failed to send email:`, e)
        await prisma.licenseKey.updateMany({
            where: { id: { in: keysToProcess.map(k => k.id) } },
            data: { deliveryStatus: 'FAILED' }
        })
        return { success: false, error: 'Email delivery failed' }
    }
}

function getDefaultTemplate() {
    return `
Hallo {{ customer_name }},

vielen Dank für Ihre Bestellung!

Hier ist Ihr Produktschlüssel für {{ product_title }}:
{{ license_key }}

Anleitung:
1. ...
2. ...

Viel Spaß!
  `
}

function replaceVariables(template: string, variables: Record<string, string>) {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{ ${key} }}`, 'g'), value)
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    return result
}

function convertToHtml(text: string) {
    // Always replace newlines with <br/> to ensure proper formatting in email clients
    // especially when content comes from contentEditable which might use newlines for breaks
    return text.replace(/\n/g, '<br/>');
}

export async function resendDigitalProductEmail(keyId: string) {
    const key = await prisma.licenseKey.findUnique({
        where: { id: keyId },
        include: {
            digitalProduct: {
                include: { variantSettings: true }
            },
            customer: true
        }
    })

    if (!key) throw new Error('Key not found')
    if (!key.digitalProduct) throw new Error('Digital Product not found')

    // Resolve Customer Email: Try direct link first, then fallback to Order lookup
    let customerEmail = key.customer?.email
    let customerName = key.customer?.name || 'Kunde'

    if (!customerEmail) {
        // Fallback: Try to find order by shopifyOrderId or orderId (orderNumber)
        if (key.shopifyOrderId) {
            const order = await prisma.order.findFirst({
                where: { shopifyOrderId: key.shopifyOrderId },
                include: { customer: true }
            })
            if (order && order.customer?.email) {
                customerEmail = order.customer.email
                customerName = order.customer.name

                // Optional: Heal the data by linking the customer to the key for future
                await prisma.licenseKey.update({
                    where: { id: key.id },
                    data: { customerId: order.customerId } as any
                })
            }
        }

        // If still no email, try by orderNumber
        if (!customerEmail && key.orderId) {
            const order = await prisma.order.findFirst({
                where: { orderNumber: key.orderId }, // Assuming orderId on key stores the order number
                include: { customer: true }
            })
            if (order && order.customer?.email) {
                customerEmail = order.customer.email
                customerName = order.customer.name

                // Optional: Heal the data
                await prisma.licenseKey.update({
                    where: { id: key.id },
                    data: { customerId: order.customerId } as any
                })
            }
        }
    }

    if (!customerEmail) {
        throw new Error('Customer email not found on key or associated order')
    }

    const product = key.digitalProduct

    // Determine Template (Reuse logic from processDigitalProductOrder or abstract it)
    // For simplicity, we duplicate the selection logic here briefly or better yet, refactor.
    // Let's refactor the template generation if possible, but for now inline is safer for 1-step edit.

    let template = product.emailTemplate || getDefaultTemplate()
    let buttons = product.downloadButtons as any[] | null
    let btnAlignment = product.buttonAlignment || 'left'

    if (key.shopifyVariantId && product.variantSettings) {
        const variantSetting = product.variantSettings.find(s => s.shopifyVariantId === key.shopifyVariantId)
        if (variantSetting) {
            if (variantSetting.emailTemplate) template = variantSetting.emailTemplate
            if (variantSetting.downloadButtons && Array.isArray(variantSetting.downloadButtons) && variantSetting.downloadButtons.length > 0) {
                buttons = variantSetting.downloadButtons as any[]
            }
        }
    }

    // Generate Buttons HTML
    let downloadButtonHtml = '';
    const textAlign = btnAlignment === 'center' ? 'center' : (btnAlignment === 'right' ? 'right' : 'left');

    if (Array.isArray(buttons) && buttons.length > 0) {
        const buttonsHtml = buttons.map((btn: any) => `
                <div style="margin-bottom: 12px;">
                    <a href="${btn.url}" style="background-color: ${btn.color || '#000000'}; color: ${btn.textColor || '#ffffff'}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; width: 280px; text-align: center; box-sizing: border-box; white-space: normal; word-wrap: break-word;">
                        ${btn.text || 'Download'}
                    </a>
                </div>
            `).join('');
        downloadButtonHtml = `<div style="margin: 20px 0; text-align: ${textAlign};">${buttonsHtml}</div>`;
    } else if (product.downloadUrl) {
        downloadButtonHtml = `<div style="margin: 20px 0; text-align: ${textAlign};"><a href="${product.downloadUrl}" style="background-color: ${product.buttonColor || '#000000'}; color: ${product.buttonTextColor || '#ffffff'}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; width: 280px; text-align: center; box-sizing: border-box; white-space: normal; word-wrap: break-word;">${product.buttonText || 'Download'}</a></div>`;
    }

    const htmlTemplate = convertToHtml(template);
    const emailBody = replaceVariables(htmlTemplate, {
        customer_name: customerName || 'Kunde',
        customer_salutation: `Hallo ${customerName || 'Kunde'}`,
        product_title: product.title,
        license_key: key.key,
        download_button: downloadButtonHtml
    })

    const subject = `Ihr Produktschlüssel für ${product.title}`

    await sendEmail({
        to: customerEmail,
        subject,
        html: emailBody
    })

    // Update sent status
    await prisma.licenseKey.update({
        where: { id: keyId },
        data: {
            emailSent: true,
            emailSentAt: new Date(),
            deliveryStatus: 'SENT'
        } as any
    })

    return { success: true }
}
