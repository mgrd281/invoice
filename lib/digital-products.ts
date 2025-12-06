
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

export async function getAvailableKey(digitalProductId: string) {
    return prisma.licenseKey.findFirst({
        where: {
            digitalProductId,
            isUsed: false
        },
        orderBy: { createdAt: 'asc' }
    })
}

export async function markKeyAsUsed(keyId: string, orderId: string, shopifyOrderId: string) {
    return prisma.licenseKey.update({
        where: { id: keyId },
        data: {
            isUsed: true,
            usedAt: new Date(),
            // orderId: orderId, // We might not have a local order ID yet if this runs before local order creation
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
    productTitle: string
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

    const key = await getAvailableKey(digitalProduct.id)

    if (!key) {
        console.error(`No keys available for product: ${digitalProduct.title} (${digitalProduct.id})`)

        // Notify Admin
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'admin@example.com'
        await sendEmail({
            to: adminEmail,
            subject: `⚠️ KEINE KEYS MEHR: ${digitalProduct.title}`,
            html: `<p>Achtung,</p><p>Für das Produkt <strong>${digitalProduct.title}</strong> (Shopify ID: ${shopifyProductId}) sind keine Lizenzschlüssel mehr verfügbar!</p><p>Eine Bestellung konnte nicht bedient werden.</p>`
        })

        return { success: false, error: 'No keys available' }
    }

    // Mark key as used
    await markKeyAsUsed(key.id, '', orderNumber)

    // Send Email
    const template = digitalProduct.emailTemplate || getDefaultTemplate()

    const emailBody = replaceVariables(template, {
        customer_name: customerName,
        product_title: productTitle,
        license_key: key.key
    })

    const subject = `Ihr Produktschlüssel für ${productTitle}`

    await sendEmail({
        to: customerEmail,
        subject,
        html: convertToHtml(emailBody) // Simple conversion or use HTML template
    })

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
    // Replace newlines with <br/> to preserve line breaks while allowing HTML tags
    return text.replace(/\n/g, '<br/>')
}
