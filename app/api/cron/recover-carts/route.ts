import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { sendRecoveryEmail } from '@/lib/email-recovery-service'
import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'

// This route should be called by a Cron Job scheduler (e.g., Vercel Cron, GitHub Actions, or external service)
// Recommended frequency: Every 10-15 minutes
export async function GET(req: Request) {
    try {
        // Security: Verify a secret token to prevent unauthorized access
        const authHeader = headers().get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('[Cron] Starting Abandoned Cart Recovery...')

        // 1. Find eligible carts
        // Criteria:
        // - Created/Updated more than 1 hour ago
        // - Created/Updated less than 24 hours ago (don't spam old carts)
        // - Not recovered (customer hasn't bought yet)
        // - Recovery email NOT sent yet

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const eligibleCarts = await prisma.abandonedCart.findMany({
            where: {
                updatedAt: {
                    lt: oneHourAgo,
                    gt: twentyFourHoursAgo
                },
                isRecovered: false,
                recoverySent: false,
                email: {
                    not: '' // Ensure we have an email
                }
            },
            include: {
                organization: {
                    include: {
                        shopifyConnection: true
                    }
                }
            },
            take: 20 // Process in batches to avoid timeouts
        })

        console.log(`[Cron] Found ${eligibleCarts.length} carts to recover.`)

        const results = []

        for (const cart of eligibleCarts) {
            try {
                // 2. Generate Discount Code (10%)
                // In a real scenario, we would call Shopify API to create a unique price rule and discount code.
                // For this MVP, we'll simulate it or use a static code if API fails.

                const discountCode = `COMEBACK-${cart.checkoutId.slice(-6).toUpperCase()}`

                // Call Shopify API to create the actual discount code
                const shopify = new ShopifyAPI(cart.organization.shopifyConnection ? {
                    ...getShopifySettings(),
                    accessToken: cart.organization.shopifyConnection.accessToken,
                    shopDomain: cart.organization.shopifyConnection.shopName
                } : undefined)

                await shopify.createDiscountCode(discountCode, 10)

                // 3. Send Email
                // We'll use the existing email service or a placeholder for now.

                console.log(`[Recovery] Sending email to ${cart.email} with code ${discountCode}`)

                await sendRecoveryEmail(cart.email, discountCode, cart.cartUrl)

                // 4. Update Database
                await prisma.abandonedCart.update({
                    where: { id: cart.id },
                    data: {
                        recoverySent: true,
                        recoverySentAt: new Date()
                    }
                })

                results.push({ email: cart.email, status: 'sent', code: discountCode })

            } catch (err) {
                console.error(`[Recovery] Failed for cart ${cart.id}:`, err)
                results.push({ email: cart.email, status: 'failed', error: String(err) })
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results
        })

    } catch (error) {
        console.error('[Cron] Error in abandoned cart job:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
