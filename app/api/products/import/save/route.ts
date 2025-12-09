import { NextRequest, NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'

export async function POST(request: NextRequest) {
    try {
        const { product, settings } = await request.json()

        if (!product) {
            return NextResponse.json({ error: 'Product data is required' }, { status: 400 })
        }

        // Initialize Shopify API
        const shopifySettings = getShopifySettings()
        if (!shopifySettings.accessToken || !shopifySettings.shopDomain) {
            return NextResponse.json({ error: 'Shopify settings are not configured' }, { status: 500 })
        }
        const api = new ShopifyAPI(shopifySettings)

        // Prepare product data for Shopify
        const shopifyProduct: any = {
            title: product.title,
            body_html: product.fullDescription || product.description,
            vendor: product.vendor,
            product_type: product.product_type,
            tags: product.tags,
            status: settings.isActive ? 'active' : 'draft',
            images: product.images.map((src: string) => ({ src })),
            variants: [
                {
                    price: product.price,
                    sku: product.sku,
                    taxable: settings.chargeTax,
                    inventory_management: settings.trackQuantity ? 'shopify' : null,
                    requires_shipping: settings.isPhysical
                }
            ]
        }

        // If original product had variants, we might want to try mapping them, 
        // but for this simple import we'll stick to a single variant created from the main price
        // to avoid complex option mapping issues unless we want to do a full clone.
        // For a "Migration" tool, a full clone is better, but let's start with the simple version 
        // that matches the preview data.

        // If the user provided a collection, we can't easily add it during creation 
        // (requires a separate call to Collects API), so we'll skip it for now or handle it later.

        const createdProduct = await api.createProduct(shopifyProduct)

        return NextResponse.json({ success: true, product: createdProduct })

    } catch (error) {
        console.error('Error saving product to Shopify:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to save product'
        }, { status: 500 })
    }
}
