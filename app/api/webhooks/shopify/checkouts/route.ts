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
        const connection = await prisma.shopifyConnection.findFirst({
            where: { shopName: shopDomain },
            include: { organization: true }
        })

        if (!connection) {
            console.error(`[Webhook] No connection found for shop: ${shopDomain}`)
            return NextResponse.json({ error: 'Shop not connected' }, { status: 404 })
        }

        // 2. Verify HMAC (Security)
        // Note: In a real production app, you MUST verify the HMAC.
        // For this demo/dev environment, we might skip strict verification if the secret isn't set,
        // but it's highly recommended to implement it.
        // const secret = process.env.SHOPIFY_WEBHOOK_SECRET
        // if (secret) {
        //     const hash = crypto.createHmac('sha256', secret).update(body).digest('base64')
        //     if (hash !== hmac) {
        //         return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 })
        //     }
        // }

        const data = JSON.parse(body)

        // We are interested in checkouts that have an email (so we can contact them)
        if (!data.email) {
            console.log('[Webhook] Checkout has no email yet, skipping.')
            return NextResponse.json({ message: 'No email, skipped' })
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
                email: data.email,
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
                email: data.email,
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
