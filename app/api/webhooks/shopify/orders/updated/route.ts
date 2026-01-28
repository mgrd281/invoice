import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { processDigitalProductOrder } from '@/lib/digital-products'

export const dynamic = 'force-dynamic' // Ensure dynamic behavior

// Verify Shopify Webhook HMAC
async function verifyWebhook(req: NextRequest, secret: string) {
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256')
    if (!hmacHeader) return false

    // We need the raw body for HMAC verification
    // clone() is needed because we might read the body later
    const rawBody = await req.clone().text()

    // Create hash
    const hash = crypto
        .createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('base64')

    return crypto.timingSafeEqual(
        Buffer.from(hash, 'base64'),
        Buffer.from(hmacHeader, 'base64')
    )
}

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate / Verify HMAC
        // We use the same secret as other webhooks (usually process.env.SHOPIFY_API_SECRET)
        // If you have a specific webhook secret, use that.
        const secret = process.env.SHOPIFY_API_SECRET
        if (secret) {
            const isValid = await verifyWebhook(req, secret)
            if (!isValid) {
                console.error('❌ Invalid Webhook HMAC')
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        } else {
            console.warn('⚠️ No SHOPIFY_API_SECRET found, skipping HMAC check (Not recommended for production)')
        }

        const topic = req.headers.get('x-shopify-topic')
        const shopDomain = req.headers.get('x-shopify-shop-domain')
        const body = await req.json()

        // We only care about orders/updated (though the file path implies this, logic is good)
        // Check for paid status
        const financialStatus = body.financial_status

        if (financialStatus !== 'paid') {
            // We only trigger on PAID. 
            // Note: If you want to trigger on "authorized" for instant delivery before capture, change this.
            // But user requirement says "Zahlung als bezahlt markieren" (Mark as paid) -> Send key.
            return NextResponse.json({ message: 'Order not paid, skipping' })
        }

        console.log(`🔄 Webhook: Order ${body.name} (${body.id}) is PAID. Processing digital products...`)

        // 2. Find Organization
        let organization = null
        if (shopDomain) {
            const connection = await prisma.shopifyConnection.findFirst({
                where: { shopName: shopDomain },
                include: { organization: true }
            })
            organization = connection?.organization
        }
        if (!organization) {
            organization = await prisma.organization.findFirst()
        }

        if (!organization) {
            console.error('❌ No organization found for webhook processing')
            return NextResponse.json({ error: 'No organization' }, { status: 400 })
        }

        // 3. Find Customer Link
        // We try to find the local Customer ID to link the key
        const shopifyOrderId = String(body.id)
        let customerId: string | undefined

        // Try to find the local order first
        const localOrder = await prisma.order.findFirst({
            where: {
                shopifyOrderId: shopifyOrderId,
                organizationId: organization.id
            }
        })

        if (localOrder) {
            customerId = localOrder.customerId
        } else {
            // Fallback: Find customer by email or shopify ID
            const shopifyCustomerId = String(body.customer?.id)
            const email = body.email || body.customer?.email

            const customer = await prisma.customer.findFirst({
                where: {
                    organizationId: organization.id,
                    OR: [
                        { shopifyCustomerId: shopifyCustomerId },
                        { email: email }
                    ]
                }
            })

            if (customer) {
                customerId = customer.id
            }
        }

        // 4. Process Line Items
        const lineItems = body.line_items || []
        const results = []

        for (const item of lineItems) {
            const result = await processDigitalProductOrder(
                String(item.product_id), // Shopify Product ID
                shopifyOrderId,
                body.name, // Order Number (e.g. #1001)
                body.email || body.customer?.email, // Customer Email
                `${body.customer?.first_name || ''} ${body.customer?.last_name || ''}`.trim(), // Customer Name
                item.title, // Product Title
                String(item.variant_id), // Shopify Variant ID
                undefined, // Salutation (optional)
                true, // shouldSendEmail: TRUE because it's PAID now
                customerId, // Pass the linked customer ID
                item.quantity // Pass the quantity
            )
            results.push(result)
        }

        // 5. RADICAL: Link to Session & Mark as PAID
        const noteAttributes = body.note_attributes || [];
        const sessionIdAttr = noteAttributes.find((attr: any) => attr.name === '_visitor_session_id');

        if (sessionIdAttr?.value) {
            console.log(`[Webhook] Linking Order ${body.name} to Session ${sessionIdAttr.value}`);
            try {
                // Update VisitorSession
                await prisma.visitorSession.update({
                    where: { sessionId: sessionIdAttr.value },
                    data: {
                        purchaseStatus: 'PAID',
                        orderNumber: body.name,
                        totalValue: parseFloat(body.total_price || '0')
                    }
                });

                // Update AbandonedCart
                await prisma.abandonedCart.updateMany({
                    where: {
                        OR: [
                            { checkoutToken: body.checkout_token },
                            { checkoutId: sessionIdAttr.value }
                        ]
                    },
                    data: { isRecovered: true }
                });
            } catch (e) {
                console.error('[Webhook] Failed to link session:', e);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Processed',
            results
        })

    } catch (error) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
