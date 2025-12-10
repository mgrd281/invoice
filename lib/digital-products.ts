
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email-service'

export async function getDigitalProductByShopifyId(shopifyProductId: string) {
    return prisma.digitalProduct.findUnique({
        where: { shopifyProductId },
        include: {
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

export async function markKeyAsUsed(keyId: string, orderNumber: string, shopifyOrderId: string) {
    return prisma.licenseKey.update({
        where: { id: keyId },
        data: {
            isUsed: true,
            usedAt: new Date(),
            orderId: orderNumber, // Storing the visible order number (e.g. #1001) here for display
            shopifyOrderId: shopifyOrderId
        }
    })
}

export async function processDigitalProductOrder(
    shopifyProductId: string,
    shopifyOrderId: string,
    orderNumber: string,
    customerEmail: string,
    customerName: string,
    productTitle: string,
    shopifyVariantId?: string
) {
    const digitalProduct = await getDigitalProductByShopifyId(shopifyProductId)

    if (!digitalProduct) {
        console.log(`Digital product not found for Shopify Product ID: ${shopifyProductId}`)
        return { success: false, error: 'Product not configured as digital product' }
    }

    // Check if key already assigned for this order
    const existingKey = await prisma.licenseKey.findFirst({
        where: {
            digitalProductId: digitalProduct.id,
            shopifyOrderId: shopifyOrderId
        }
    })

    if (existingKey) {
        console.log(`Key already assigned for order ${shopifyOrderId} and product ${digitalProduct.id}`)
        return { success: true, key: existingKey.key, message: 'Key already assigned' }
    }

    const key = await getAvailableKey(digitalProduct.id, shopifyVariantId)

    if (!key) {
        console.error(`No keys available for product: ${digitalProduct.title} (${digitalProduct.id}) [Variant: ${shopifyVariantId || 'Any'}]`)

        // Notify Admin
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'admin@example.com'
        await sendEmail({
            to: adminEmail,
            subject: `⚠️ KEINE KEYS MEHR: ${digitalProduct.title}`,
            html: `<p>Achtung,</p><p>Für das Produkt <strong>${digitalProduct.title}</strong> (Shopify ID: ${shopifyProductId}, Variante: ${shopifyVariantId || 'Alle'}) sind keine Lizenzschlüssel mehr verfügbar!</p><p>Eine Bestellung konnte nicht bedient werden.</p>`
        })

        return { success: false, error: 'No keys available' }
    }

    // Mark key as used
    await markKeyAsUsed(key.id, orderNumber, shopifyOrderId)

    // Send Email
    const template = digitalProduct.emailTemplate || getDefaultTemplate()

    // Generate Download Button HTML
    let downloadButtonHtml = '';
    const btnAlignment = digitalProduct.buttonAlignment || 'left';
    const textAlign = btnAlignment === 'center' ? 'center' : (btnAlignment === 'right' ? 'right' : 'left');

    // Check for multiple buttons (new schema)
    const buttons = digitalProduct.downloadButtons;

    if (Array.isArray(buttons) && buttons.length > 0) {
        // Generate HTML for multiple buttons
        // This generates a SINGLE block containing ALL buttons
        const buttonsHtml = buttons.map((btn: any) => `
                <div style="margin-bottom: 12px;">
                    <a href="${btn.url}" style="background-color: ${btn.color || '#000000'}; color: ${btn.textColor || '#ffffff'}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                        ${btn.text || 'Download'}
                    </a>
                </div>
            `).join('');

        downloadButtonHtml = `<div style="margin: 20px 0; text-align: ${textAlign};">${buttonsHtml}</div>`;
    } else if (digitalProduct.downloadUrl) {
        // Fallback to legacy single button
        const btnText = digitalProduct.buttonText || 'Download';
        const btnColor = digitalProduct.buttonColor || '#000000';
        const btnTextColor = digitalProduct.buttonTextColor || '#ffffff';

        downloadButtonHtml = `<div style="margin: 20px 0; text-align: ${textAlign};"><a href="${digitalProduct.downloadUrl}" style="background-color: ${btnColor}; color: ${btnTextColor}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">${btnText}</a></div>`;
    }

    // Convert newlines to HTML breaks in the template BEFORE injecting variables
    // This ensures we don't break the HTML structure of injected variables (like the button)
    const htmlTemplate = convertToHtml(template);

    const emailBody = replaceVariables(htmlTemplate, {
        customer_name: customerName,
        product_title: productTitle,
        license_key: key.key,
        download_button: downloadButtonHtml
    })

    const subject = `Ihr Produktschlüssel für ${productTitle}`

    await sendEmail({
        to: customerEmail,
        subject,
        html: emailBody
    })

    // Automatically fulfill order in Shopify
    try {
        console.log(`📦 Auto-fulfilling Shopify order: ${shopifyOrderId}`)
        const { ShopifyAPI } = await import('@/lib/shopify-api')
        const api = new ShopifyAPI()

        // Ensure ID is a number
        const numericOrderId = parseInt(shopifyOrderId.replace(/\D/g, ''))
        if (!isNaN(numericOrderId)) {
            await api.createFulfillment(numericOrderId)
        } else {
            console.error(`Invalid Shopify Order ID for fulfillment: ${shopifyOrderId}`)
        }
    } catch (fulfillError) {
        console.error('Failed to auto-fulfill Shopify order:', fulfillError)
        // We don't fail the whole process if fulfillment fails, as the key was already sent
    }

    return { success: true, key: key.key }
}

function getDefaultTemplate() {
    return `
Hallo {{ customer_name }},

Vielen Dank für Ihre Bestellung!

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
