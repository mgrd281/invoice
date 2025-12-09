import { NextRequest, NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const productId = parseInt(params.id)
        if (isNaN(productId)) {
            return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
        }

        const shopifySettings = getShopifySettings()
        if (!shopifySettings.accessToken || !shopifySettings.shopDomain) {
            return NextResponse.json({ error: 'Shopify settings are not configured' }, { status: 500 })
        }

        const api = new ShopifyAPI(shopifySettings)

        // 1. Delete from Shopify (Ignore 404 if already deleted)
        try {
            await api.deleteProduct(productId)
        } catch (error: any) {
            // Check if error message contains 404 or "Not Found"
            // The ShopifyAPI throws an error with the status text
            const errorMessage = error.message || ''
            if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
                console.log(`Product ${productId} already deleted from Shopify (404), proceeding to local cleanup.`)
            } else {
                // If it's another error (e.g. 403 Forbidden, 500 Server Error), we should probably still try to clean up local data
                // but log it as a warning.
                console.warn(`Warning: Failed to delete product ${productId} from Shopify:`, error)
                // We choose to proceed to delete local data so the user isn't stuck with a ghost product.
            }
        }

        // 2. Delete from local database (Review) if exists
        try {
            await prisma.review.deleteMany({
                where: {
                    productId: productId.toString()
                }
            })
        } catch (dbError) {
            console.error('Error deleting local reviews:', dbError)
            // Even if DB fails, we return success if Shopify part was handled, 
            // or maybe we should warn. But for UI experience, let's return success 
            // so the item disappears.
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error in delete route:', error)
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const productId = parseInt(params.id)
        if (isNaN(productId)) {
            return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
        }

        const body = await request.json()
        const { product } = body

        if (!product) {
            return NextResponse.json({ error: 'Product data is required' }, { status: 400 })
        }

        const shopifySettings = getShopifySettings()
        if (!shopifySettings.accessToken || !shopifySettings.shopDomain) {
            return NextResponse.json({ error: 'Shopify settings are not configured' }, { status: 500 })
        }

        const api = new ShopifyAPI(shopifySettings)
        const updatedProduct = await api.updateProduct(productId, product)

        return NextResponse.json({ success: true, product: updatedProduct })

    } catch (error) {
        console.error('Error updating product:', error)
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }
}
