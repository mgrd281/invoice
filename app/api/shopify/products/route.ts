import { NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 250) // Default 50, max 250
        
        const api = new ShopifyAPI()
        // Only fetch essential fields to reduce data size
        const products = await api.getProducts({ 
            limit,
            fields: 'id,title,handle,variants,images' // Minimal fields needed for sync
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
