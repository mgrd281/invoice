import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import crypto from 'crypto'

// This webhook handles 'checkouts/create' and 'checkouts/update' topics
export async function POST(req: Request) {
    try {
        const body = await req.text()
        const headerList = headers()
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
                currency: currency,
                lineItems: lineItems,
                // New carts are not recovered and email not sent
                isRecovered: false,
                recoverySent: false
            },
            update: {
                // Update details if they changed
                email: customerEmail,
                cartUrl: cartUrl,
                totalPrice: totalPrice,
                lineItems: lineItems,
                updatedAt: new Date()
            }
        })

        console.log(`[Webhook] Saved abandoned cart for ${data.email}`)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Webhook] Error processing checkout webhook:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
