import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ShopifyAPI } from '@/lib/shopify-api'
import { DEFAULT_SHOPIFY_SETTINGS } from '@/lib/shopify-settings'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if admin from session
        const isAdmin = (session.user as any).isAdmin

        let whereClause = {}

        if (isAdmin) {
            // Admins see all
            whereClause = {}
        } else {
            // Non-admins need an organization
            const user = await prisma.user.findUnique({
                where: { email: session.user?.email! },
                include: { organization: true }
            })

            if (!user?.organizationId) {
                console.error(`[AbandonedCarts] User ${session.user?.email} has no organization`)
                return NextResponse.json({ error: 'No organization found' }, { status: 404 })
            }
            whereClause = { organizationId: user.organizationId }
        }

        const carts = await prisma.abandonedCart.findMany({
            where: whereClause,
            include: { organization: { include: { shopifyConnection: true } } },
            orderBy: {
                updatedAt: 'desc'
            }
        })

        // 3. Image Enrichment
        // Collect all unique product IDs across all carts
        const productIds = new Set<string>()
        carts.forEach(cart => {
            if (Array.isArray(cart.lineItems)) {
                (cart.lineItems as any[]).forEach(item => {
                    if (item.product_id) productIds.add(item.product_id.toString())
                })
            }
        })

        if (productIds.size > 0 && carts.length > 0) {
            try {
                const org = carts[0].organization
                const shopifyConn = org.shopifyConnection

                if (shopifyConn) {
                    const shopDomain = shopifyConn.shopName.includes('.')
                        ? shopifyConn.shopName
                        : `${shopifyConn.shopName}.myshopify.com`

                    const shopify = new ShopifyAPI({
                        ...DEFAULT_SHOPIFY_SETTINGS,
                        shopDomain,
                        accessToken: shopifyConn.accessToken,
                    })

                    // Fetch products to get images
                    const products = await shopify.getProducts({
                        ids: Array.from(productIds).join(','),
                        fields: 'id,images,variants'
                    })

                    // Create image maps
                    const productImageMap: Record<string, string> = {}
                    const variantImageMap: Record<string, string> = {}

                    products.forEach(p => {
                        const firstImage = p.images?.[0]?.src
                        if (firstImage) {
                            productImageMap[p.id.toString()] = firstImage
                        }

                        // If variant has specific image, we could map it too
                        // Note: v.image_id is not always present in simple fields, but p.images should contain it
                    })

                    // Map images back to carts
                    carts.forEach(cart => {
                        if (Array.isArray(cart.lineItems)) {
                            (cart.lineItems as any[]).forEach(item => {
                                if (item.product_id && !item.image?.src) {
                                    const imgSrc = productImageMap[item.product_id.toString()]
                                    if (imgSrc) {
                                        item.image = { src: imgSrc }
                                    }
                                }
                            })
                        }
                    })
                }
            } catch (enrichError) {
                console.error('[AbandonedCarts] Image enrichment failed:', enrichError)
                // Continue with missing images if Shopify API fails
            }
        }

        return NextResponse.json({ carts })
    } catch (error) {
        console.error('Error fetching abandoned carts:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
