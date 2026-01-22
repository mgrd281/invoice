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
            // Admins see all within 30 days
            whereClause = {
                updatedAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            }
        } else {
            // Non-admins need an organization and 30 day filter
            const user = await prisma.user.findUnique({
                where: { email: session.user?.email! },
                include: { organization: true }
            })

            if (!user?.organizationId) {
                console.error(`[AbandonedCarts] User ${session.user?.email} has no organization`)
                return NextResponse.json({ error: 'No organization found' }, { status: 404 })
            }
            whereClause = {
                organizationId: user.organizationId,
                updatedAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            }
        }

        const carts = await prisma.abandonedCart.findMany({
            where: whereClause,
            include: { organization: { include: { shopifyConnection: true } } },
            orderBy: {
                updatedAt: 'desc'
            }
        })

        // 3. Image Enrichment
        // Collect all unique product IDs across all carts (current and removed)
        const productIds = new Set<string>()
        carts.forEach(cart => {
            if (Array.isArray(cart.lineItems)) {
                (cart.lineItems as any[]).forEach(item => {
                    if (item.product_id) productIds.add(item.product_id.toString())
                })
            }
            if (Array.isArray(cart.removedItems)) {
                (cart.removedItems as any[]).forEach(item => {
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

                    // Track if we made any changes that need persisting
                    let hasNewImages = false

                    // Map images back to carts
                    for (const cart of carts) {
                        let cartModified = false

                        // Current Items
                        if (Array.isArray(cart.lineItems)) {
                            (cart.lineItems as any[]).forEach(item => {
                                if (item.product_id && !item.image?.src) {
                                    const imgSrc = productImageMap[item.product_id.toString()]
                                    if (imgSrc) {
                                        item.image = { src: imgSrc }
                                        cartModified = true
                                        hasNewImages = true
                                    }
                                }
                            })
                        }

                        // Removed Items
                        if (Array.isArray(cart.removedItems)) {
                            (cart.removedItems as any[]).forEach(item => {
                                if (item.product_id && !item.image?.src) {
                                    const imgSrc = productImageMap[item.product_id.toString()]
                                    if (imgSrc) {
                                        item.image = { src: imgSrc }
                                        cartModified = true
                                        hasNewImages = true
                                    }
                                }
                            })
                        }

                        // Persist to DB if modified
                        if (cartModified) {
                            try {
                                await prisma.abandonedCart.update({
                                    where: { id: cart.id },
                                    data: {
                                        lineItems: cart.lineItems as any,
                                        removedItems: cart.removedItems as any
                                    }
                                })
                            } catch (dbErr) {
                                console.error(`[AbandonedCarts] Failed to persist images for cart ${cart.id}:`, dbErr)
                            }
                        }
                    }
                }
            } catch (enrichError) {
                console.error('[AbandonedCarts] Image enrichment failed:', enrichError)
            }
        }

        return NextResponse.json({ carts })
    } catch (error) {
        console.error('Error fetching abandoned carts:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
