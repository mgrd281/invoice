import { NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const api = new ShopifyAPI()
        const products = await api.getProducts({ limit: 250 })
        return NextResponse.json({ success: true, data: products })
    } catch (error) {
        console.error('Error fetching Shopify products:', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
