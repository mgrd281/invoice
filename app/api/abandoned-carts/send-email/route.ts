import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { sendEmail } from '@/lib/email-service'
import { getPersonalizedTemplate } from '@/lib/abandoned-cart-templates'
import { ShopifyAPI } from '@/lib/shopify-api'
import { DEFAULT_SHOPIFY_SETTINGS } from '@/lib/shopify-settings'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { cartId, templateId, discountValue, expiryHours } = body

        if (!cartId || !templateId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Fetch Cart
        const cart = await prisma.abandonedCart.findUnique({
            where: { id: cartId },
            include: { organization: { include: { shopifyConnection: true } } }
        })

        if (!cart) {
            return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
        }

        const org = cart.organization
        const shopifyConn = org.shopifyConnection

        // 2. Generate Discount Code if requested
        let couponCode = ''
        if (discountValue && discountValue > 0 && shopifyConn) {
            try {
                // Ensure the shopName is used as the domain if it looks like one
                const shopDomain = shopifyConn.shopName.includes('.')
                    ? shopifyConn.shopName
                    : `${shopifyConn.shopName}.myshopify.com`

                const shopify = new ShopifyAPI({
                    ...DEFAULT_SHOPIFY_SETTINGS,
                    shopDomain,
                    accessToken: shopifyConn.accessToken,
                })

                // Create a unique coupon code
                const uniqueId = Math.random().toString(36).substring(7).toUpperCase()
                const codeName = `RECOVERY-${uniqueId}`

                const createdCode = await shopify.createDiscountCode(codeName, discountValue)
                if (createdCode) {
                    couponCode = createdCode
                }
            } catch (error) {
                console.error('Failed to create Shopify discount code:', error)
                // Continue without discount if it fails
            }
        }

        // 3. Prepare Template Data
        const itemsList = Array.isArray(cart.lineItems)
            ? (cart.lineItems as any[]).map((item: any) => `- ${item.quantity}x ${item.title}`).join('\n')
            : 'Ihre Artikel'

        const personalized = getPersonalizedTemplate(templateId, {
            customerName: cart.email.split('@')[0],
            shopName: org.name,
            itemsList,
            discountCode: couponCode || undefined,
            expiryHours: expiryHours?.toString(),
            cartUrl: cart.cartUrl,
            ownerName: session.user.name || org.name
        })

        if (!personalized) {
            return NextResponse.json({ error: 'Template not found' }, { status: 400 })
        }

        // 4. Send Email
        const emailResult = await sendEmail({
            to: cart.email,
            subject: personalized.subject,
            html: personalized.body.replace(/\n/g, '<br>')
        })

        if (!emailResult.success) {
            // Log failure
            await (prisma as any).abandonedCartEmailLog.create({
                data: {
                    cartId: cart.id,
                    subject: personalized.subject,
                    status: 'FAILED',
                    error: emailResult.error
                }
            })
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
        }

        // 5. Update Cart & Log Success
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
                    discountValue: discountValue || null,
                    discountType: discountValue ? 'PERCENTAGE' : null,
                    couponExpiresAt: expiryHours ? new Date(Date.now() + expiryHours * 3600000) : null
                }
            })
        ])

        return NextResponse.json({ success: true, couponCode })

    } catch (error) {
        console.error('Error in send-email recovery:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
