import { NextRequest, NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'

export async function GET(request: NextRequest) {
    try {
        const shopifySettings = getShopifySettings()
        if (!shopifySettings.accessToken || !shopifySettings.shopDomain) {
            return NextResponse.json({ error: 'Shopify settings are not configured' }, { status: 500 })
        }

        const api = new ShopifyAPI(shopifySettings)

        // Fetch products with tag "Imported" directly from Shopify
        // This is much more efficient and avoids the 250 limit issue for non-imported products
        const products = await api.getProducts({
            limit: 250,
            tags: 'Imported'
        })

        return NextResponse.json({ success: true, products })

    } catch (error) {
        console.error('Error fetching imported products:', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
