import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import crypto from 'crypto'

// This webhook handles 'checkouts/create' and 'checkouts/update' topics
export async function POST(req: Request) {
    try {
        const body = await req.text()
        const headerList = await headers()
        const hmac = headerList.get('x-shopify-hmac-sha256')
        const topic = headerList.get('x-shopify-topic')
        const shopDomain = headerList.get('x-shopify-shop-domain')

        console.log(`[Webhook] Received ${topic} from ${shopDomain}`)

        if (!shopDomain) {
            return NextResponse.json({ error: 'Missing shop domain' }, { status: 400 })
        }

        // 1. Verify Organization
        // Try to find the connection with flexible matching
        let connection = await prisma.shopifyConnection.findFirst({
            where: { shopName: shopDomain },
            include: { organization: true }
        })

        // If not found, try matching without .myshopify.com or vice versa
        if (!connection) {
            const domainPart = shopDomain.replace('.myshopify.com', '')
            connection = await prisma.shopifyConnection.findFirst({
                where: {
                    OR: [
                        { shopName: domainPart },
                        { shopName: `${domainPart}.myshopify.com` }
                    ]
                },
                include: { organization: true }
            })
        }

        // If still not found, try SELF-HEALING using Environment Variables
        if (!connection) {
            const envDomain = process.env.SHOPIFY_SHOP_DOMAIN
            const envToken = process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_KEY

            // Check if Env Var matches the incoming shop (fuzzy match)
            if (envDomain && (shopDomain.includes(envDomain) || envDomain.includes(shopDomain))) {
                console.log('[Webhook] Connection missing in DB, attempting self-healing with Env Vars...')

                // Find default org
                const org = await prisma.organization.findFirst({
                    where: {
                        OR: [
                            { id: 'default-org' },
                            { slug: 'default' }
                        ]
                    }
                }) || await prisma.organization.findFirst()

                if (org && envToken) {
                    try {
                        connection = await prisma.shopifyConnection.create({
                            data: {
                                organizationId: org.id,
                                shopName: shopDomain,
                                accessToken: envToken,
                                scopes: process.env.SCOPES || 'read_orders,write_orders',
                                isActive: true
                            },
                            include: { organization: true }
                        })
                        console.log('[Webhook] Self-healing successful! Created connection.')
                    } catch (err) {
                        console.error('[Webhook] Self-healing failed:', err)
                    }
                }
            }
        }

        if (!connection) {
            console.error(`[Webhook] No connection found for shop: ${shopDomain}`)
            return NextResponse.json({ error: 'Shop not connected' }, { status: 404 })
        }

        // 2. Verify HMAC (Security) - Skipped for now as per previous logic

        const data = JSON.parse(body)

        // Handle Anonymous Carts (No Email)
        let customerEmail = data.email
        if (!customerEmail) {
            console.log('[Webhook] Anonymous cart detected. Saving with placeholder for visibility.')
            customerEmail = `anonymous-${data.id}@hidden.com`
        }

        // 3. Save or Update Abandoned Cart
        const checkoutId = data.id.toString()
        const cartUrl = data.abandoned_checkout_url
        const totalPrice = data.total_price
        const currency = data.currency
        const lineItems = data.line_items

        // Find existing cart to compare for removals
        const existingCart = await prisma.abandonedCart.findUnique({
            where: {
                organizationId_checkoutId: {
                    organizationId: connection.organizationId,
                    checkoutId: checkoutId
                }
            }
        })

        let removedItems = existingCart?.removedItems ? (existingCart.removedItems as any[]) : []
        let currentTotalPricePeak = existingCart?.totalPricePeak ? Number(existingCart.totalPricePeak) : 0
        const newTotalPrice = Number(totalPrice)

        if (existingCart && existingCart.lineItems) {
            const oldItems = existingCart.lineItems as any[]
            const newItems = lineItems as any[]

            // Identify removed items (items that were in the cart but aren't anymore)
            oldItems.forEach(oldItem => {
                const stillExists = newItems.some(newItem =>
                    (newItem.variant_id && newItem.variant_id === oldItem.variant_id) ||
                    (newItem.product_id === oldItem.product_id && newItem.title === oldItem.title)
                )

                if (!stillExists) {
                    console.log(`[Webhook] Item removed detected: ${oldItem.title}`)
                    // Check if already in removed list to avoid duplicates
                    const alreadyRemoved = removedItems.some(rm =>
                        (rm.variant_id && rm.variant_id === oldItem.variant_id) ||
                        (rm.product_id === oldItem.product_id && rm.title === oldItem.title)
                    )

                    if (!alreadyRemoved) {
                        removedItems.push({
                            ...oldItem,
                            removedAt: new Date().toISOString(),
                            isRemoved: true
                        })
                    }
                }

                // Also check if quantity decreased
                const newItem = newItems.find(ni =>
                    (ni.variant_id && ni.variant_id === oldItem.variant_id) ||
                    (ni.product_id === oldItem.product_id && ni.title === oldItem.title)
                )

                if (newItem && newItem.quantity < oldItem.quantity) {
                    console.log(`[Webhook] Quantity decreased for: ${oldItem.title}`)
                    removedItems.push({
                        ...oldItem,
                        quantity: oldItem.quantity - newItem.quantity,
                        removedAt: new Date().toISOString(),
                        isPartialRemoval: true
                    })
                }
            })
        }

        // Update Price Peak
        const totalPricePeak = Math.max(currentTotalPricePeak, newTotalPrice)

        // Parse User Agent for Device/OS Detection
        const userAgent = data.user_agent || ''
        const deviceInfo = parseUserAgent(userAgent)

        await prisma.abandonedCart.upsert({
            where: {
                organizationId_checkoutId: {
                    organizationId: connection.organizationId,
                    checkoutId: checkoutId
                }
            },
            create: {
                organizationId: connection.organizationId,
                checkoutId: checkoutId,
                checkoutToken: data.token,
                email: customerEmail,
                cartUrl: cartUrl,
                totalPrice: totalPrice,
                totalPricePeak: totalPricePeak,
                currency: currency,
                lineItems: lineItems,
                removedItems: removedItems,
                deviceInfo: deviceInfo,
                isRecovered: false,
                recoverySent: false
            },
            update: {
                // Update details if they changed
                email: customerEmail,
                cartUrl: cartUrl,
                totalPrice: totalPrice,
                totalPricePeak: totalPricePeak,
                lineItems: lineItems,
                removedItems: removedItems,
                deviceInfo: deviceInfo,
                updatedAt: new Date()
            }
        })

        console.log(`[Webhook] Saved abandoned cart for ${customerEmail} (Device: ${deviceInfo.os} ${deviceInfo.device})`)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Webhook] Error processing checkout webhook:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * Simple User Agent Parser for Dashboard Visibility
 */
function parseUserAgent(ua: string) {
    const info = {
        device: 'Desktop',
        os: 'Unknown',
        browser: 'Unknown',
        ua: ua
    }

    if (!ua) return info

    const lowerUA = ua.toLowerCase()

    // 1. Device Type
    if (/mobile|android|iphone|ipad|phone/i.test(lowerUA)) {
        info.device = 'Mobile'
    } else if (/tablet|playbook|silk/i.test(lowerUA)) {
        info.device = 'Tablet'
    }

    // 2. OS Detection
    if (lowerUA.includes('windows')) info.os = 'Windows'
    else if (lowerUA.includes('iphone') || lowerUA.includes('ipad')) info.os = 'iOS'
    else if (lowerUA.includes('android')) info.os = 'Android'
    else if (lowerUA.includes('macintosh') || lowerUA.includes('mac os x')) info.os = 'macOS'
    else if (lowerUA.includes('linux')) info.os = 'Linux'

    // 3. Browser Detection
    if (lowerUA.includes('edg/')) info.browser = 'Edge'
    else if (lowerUA.includes('chrome') && !lowerUA.includes('edg/')) info.browser = 'Chrome'
    else if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) info.browser = 'Safari'
    else if (lowerUA.includes('firefox')) info.browser = 'Firefox'
    else if (lowerUA.includes('opera') || lowerUA.includes('opr/')) info.browser = 'Opera'

    return info
}
