import { NextResponse, NextRequest } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = Math.min(parseInt(searchParams.get('limit') || '250'), 250) // Default 250 to show more products

        const api = new ShopifyAPI()
        // Fetch essential fields used by frontend (including vendor/type for filtering and image for display)
        const products = await api.getProducts({
            limit,
            fields: 'id,title,handle,variants,images,image,vendor,product_type'
        })

        return NextResponse.json({
            success: true,
            data: products,
            count: products.length
        })
    } catch (error) {
        console.error('Error fetching Shopify products:', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
