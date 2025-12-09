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

        // Fetch products (limit 250 for now)
        const products = await api.getProducts({ limit: 250 })

        // Filter for products with tag "Imported" (case insensitive)
        const importedProducts = products.filter(p =>
            p.tags && p.tags.toLowerCase().includes('imported')
        )

        return NextResponse.json({ success: true, products: importedProducts })

    } catch (error) {
        console.error('Error fetching imported products:', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
