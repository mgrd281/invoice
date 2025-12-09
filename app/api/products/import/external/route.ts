import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json()

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        // 1. Try Shopify JSON endpoint first (most reliable for Shopify stores)
        try {
            const shopifyUrl = url.endsWith('.json') ? url : `${url}.json`
            const response = await fetch(shopifyUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            })

            if (response.ok) {
                const contentType = response.headers.get('content-type')
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json()
                    if (data.product) {
                        return NextResponse.json({
                            product: {
                                title: data.product.title,
                                description: data.product.body_html?.replace(/<[^>]*>/g, '').slice(0, 200) + '...', // Plain text preview
                                fullDescription: data.product.body_html,
                                price: data.product.variants?.[0]?.price || '0.00',
                                currency: 'EUR', // Default assumption or extract if possible
                                images: data.product.images?.map((img: any) => img.src) || [],
                                vendor: data.product.vendor,
                                product_type: data.product.product_type,
                                tags: data.product.tags,
                                variants: data.product.variants,
                                options: data.product.options
                            }
                        })
                    }
                }
            }
        } catch (e) {
            console.log('Shopify JSON fetch failed, trying generic scrape...', e)
        }

        // 2. Fallback: Generic HTML Scraping (JSON-LD & Meta Tags)
        console.log('Attempting generic scrape for:', url)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        let productData: any = {
            title: '',
            description: '',
            price: '0.00',
            currency: 'EUR',
            images: [],
            vendor: '',
            product_type: '',
            tags: ''
        }

        // A. Try JSON-LD (Schema.org)
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const jsonContent = $(el).html()
                if (!jsonContent) return

                const json = JSON.parse(jsonContent)
                const items = Array.isArray(json) ? json : [json]

                const product = items.find((item: any) =>
                    item['@type'] === 'Product' || item['@type'] === 'http://schema.org/Product'
                )

                if (product) {
                    productData.title = product.name || productData.title
                    productData.description = product.description || productData.description
                    productData.vendor = product.brand?.name || product.brand || productData.vendor
                    productData.product_type = product.category || productData.product_type

                    // Images
                    if (product.image) {
                        if (Array.isArray(product.image)) {
                            productData.images = product.image
                        } else if (typeof product.image === 'string') {
                            productData.images = [product.image]
                        } else if (product.image.url) {
                            productData.images = [product.image.url]
                        }
                    }

                    // Offers (Price)
                    if (product.offers) {
                        const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers
                        productData.price = offer.price || productData.price
                        productData.currency = offer.priceCurrency || productData.currency
                    }
                }
            } catch (e) {
                console.error('Error parsing JSON-LD:', e)
            }
        })

        // B. Fallback to Open Graph & Meta Tags if JSON-LD missed something
        if (!productData.title) {
            productData.title = $('meta[property="og:title"]').attr('content') || $('title').text() || ''
        }
        if (!productData.description) {
            productData.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || ''
        }
        if (productData.images.length === 0) {
            const ogImage = $('meta[property="og:image"]').attr('content')
            if (ogImage) productData.images.push(ogImage)
        }
        if (!productData.price || productData.price === '0.00') {
            productData.price = $('meta[property="product:price:amount"]').attr('content') ||
                $('meta[property="og:price:amount"]').attr('content') ||
                '0.00'
            productData.currency = $('meta[property="product:price:currency"]').attr('content') ||
                $('meta[property="og:price:currency"]').attr('content') ||
                'EUR'
        }

        // Clean up data
        productData.fullDescription = productData.description // Use description as full description for generic sites

        // Ensure absolute URLs for images
        productData.images = productData.images.map((img: string) => {
            if (img && !img.startsWith('http')) {
                return new URL(img, url).toString()
            }
            return img
        })

        if (!productData.title) {
            return NextResponse.json({ error: 'Could not detect product data. Ensure this is a valid product page.' }, { status: 400 })
        }

        return NextResponse.json({ product: productData })

    } catch (error) {
        console.error('Error importing product:', error)
        return NextResponse.json(
            { error: 'Could not fetch product data. Ensure this is a valid URL.' },
            { status: 500 }
        )
    }
}
