<<<<<<< HEAD
import { NextResponse, NextRequest } from 'next/server'
=======
import { NextResponse } from 'next/server'
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
import { ShopifyAPI } from '@/lib/shopify-api'

export const dynamic = 'force-dynamic'

<<<<<<< HEAD
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        // Default to ALL (unlimited) if no limit specified, or use the param
        const limitParam = searchParams.get('limit')
        const limit = limitParam ? parseInt(limitParam) : 999999

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
=======
export async function GET() {
    try {
        const api = new ShopifyAPI()
        const products = await api.getProducts({ limit: 250 })
        return NextResponse.json({ success: true, data: products })
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
    } catch (error) {
        console.error('Error fetching Shopify products:', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
