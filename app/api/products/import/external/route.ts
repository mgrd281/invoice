import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json()

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        // Basic URL validation
        try {
            new URL(url)
        } catch (e) {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
        }

        // Append .json to try fetching Shopify product data
        // Remove query parameters if any, then append .json
        const cleanUrl = url.split('?')[0]
        const jsonUrl = cleanUrl.endsWith('.json') ? cleanUrl : `${cleanUrl}.json`

        console.log(`Fetching product data from: ${jsonUrl}`)

        const response = await fetch(jsonUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        if (!response.ok) {
            console.error(`Failed to fetch product data: ${response.status} ${response.statusText}`)
            return NextResponse.json({
                error: 'Could not fetch product data. Ensure this is a valid Shopify product URL.'
            }, { status: 400 })
        }

        const data = await response.json()

        if (!data.product) {
            return NextResponse.json({ error: 'No product data found in response' }, { status: 400 })
        }

        const product = data.product

        // Map Shopify data to our preview format
        const previewData = {
            title: product.title,
            description: product.body_html?.replace(/<[^>]*>/g, '').slice(0, 200) + '...' || '', // Strip HTML for preview
            fullDescription: product.body_html,
            price: product.variants?.[0]?.price || '0.00',
            currency: 'EUR', // Default assumption, scraping currency is harder from .json alone usually
            images: product.images?.map((img: any) => img.src) || [],
            vendor: product.vendor,
            product_type: product.product_type,
            tags: product.tags,
            variants: product.variants,
            options: product.options
        }

        return NextResponse.json({ success: true, product: previewData })

    } catch (error) {
        console.error('Error importing product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
