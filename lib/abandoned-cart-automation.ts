import { prisma } from './prisma'
// Automated Abandoned Cart Recovery Logic - Updated for Railway build trigger
import { sendEmail } from './email-service'
import { getPersonalizedTemplate } from './abandoned-cart-templates'
import { ShopifyAPI } from './shopify-api'
import { DEFAULT_SHOPIFY_SETTINGS } from './shopify-settings'

/**
 * Main automation function to process all eligible abandoned carts across all organizations.
 */
export async function processAutomatedRecoveries() {
    console.log('[Automation] Starting Abandoned Cart Recovery Processing...')

    // 1. Get all organizations with recovery enabled
    const allSettings = await prisma.abandonedCartSettings.findMany({
        where: { enabled: true },
        include: { organization: { include: { shopifyConnection: true } } }
    })

    console.log(`[Automation] Found ${allSettings.length} organizations with automated recovery enabled.`)

    let totalSent = 0
    let totalFailed = 0

    for (const settings of allSettings) {
        const orgId = settings.organizationId
        const delayMs = settings.autoSendDelay * 60 * 1000
        const cutoffTime = new Date(Date.now() - delayMs)
        const expiryTime = new Date(Date.now() - 48 * 3600000) // Don't process older than 48h

        // 2. Find eligible carts for this organization
        const eligibleCarts = await prisma.abandonedCart.findMany({
            where: {
                organizationId: orgId,
                isRecovered: false,
                recoverySent: false,
                updatedAt: {
                    lt: cutoffTime,
                    gt: expiryTime
                },
                email: { not: '' }
            },
            take: 10 // Safe batch size per org run
        })

        if (eligibleCarts.length === 0) continue

        console.log(`[Automation] Org ${orgId}: Processing ${eligibleCarts.length} carts.`)

        for (const cart of eligibleCarts) {
            try {
                // Determine template and discount
                const hasDiscount = settings.defaultDiscount > 0
                const templateId = hasDiscount ? 'incentive-10' : 'friendly-reminder'

                let couponCode = ''
                if (hasDiscount && settings.organization.shopifyConnection) {
                    try {
                        const conn = settings.organization.shopifyConnection
                        const shopDomain = conn.shopName.includes('.') ? conn.shopName : `${conn.shopName}.myshopify.com`

                        const shopify = new ShopifyAPI({
                            ...DEFAULT_SHOPIFY_SETTINGS,
                            shopDomain,
                            accessToken: conn.accessToken
                        })

                        const uniqueId = Math.random().toString(36).substring(7).toUpperCase()
                        const codeName = `AUTO-${uniqueId}`

                        const createdCode = await shopify.createDiscountCode(codeName, settings.defaultDiscount)
                        if (createdCode) {
                            couponCode = createdCode
                        }
                    } catch (err) {
                        console.error(`[Automation] Shopify Code Gen failed for cart ${cart.id}:`, err)
                    }
                }

                // Personalize template
                const itemsList = Array.isArray(cart.lineItems)
                    ? (cart.lineItems as any[]).map((item: any) => `- ${item.quantity}x ${item.title}`).join('\n')
                    : 'Ihre Artikel'

                const personalized = getPersonalizedTemplate(templateId, {
                    customerName: cart.email.split('@')[0],
                    shopName: settings.organization.name,
                    itemsList,
                    discountCode: couponCode || undefined,
                    expiryHours: settings.expiryHours.toString(),
                    cartUrl: cart.cartUrl,
                    ownerName: settings.organization.name
                })

                if (!personalized) continue

                // Send Email
                const emailResult = await sendEmail({
                    to: cart.email,
                    subject: personalized.subject,
                    html: personalized.body.replace(/\n/g, '<br>')
                })

                if (emailResult.success) {
                    await prisma.$transaction([
                        (prisma as any).abandonedCartEmailLog.create({
                            data: {
                                cartId: cart.id,
                                subject: personalized.subject,
                                status: 'SENT'
                            }
                        }),
                        prisma.abandonedCart.update({
                            where: { id: cart.id },
                            data: {
                                recoverySent: true,
                                recoverySentAt: new Date(),
                                couponCode: couponCode || null,
                                discountValue: hasDiscount ? settings.defaultDiscount : null,
                                discountType: hasDiscount ? 'PERCENTAGE' : null,
                                couponExpiresAt: new Date(Date.now() + settings.expiryHours * 3600000)
                            }
                        })
                    ])
                    totalSent++
                } else {
                    await (prisma as any).abandonedCartEmailLog.create({
                        data: {
                            cartId: cart.id,
                            subject: personalized.subject,
                            status: 'FAILED',
                            error: emailResult.error
                        }
                    })
                    totalFailed++
                }

            } catch (err) {
                console.error(`[Automation] Error processing cart ${cart.id}:`, err)
                totalFailed++
            }
        }
    }

    console.log(`[Automation] Completed. Sent: ${totalSent}, Failed: ${totalFailed}`)
    return { sent: totalSent, failed: totalFailed }
}
