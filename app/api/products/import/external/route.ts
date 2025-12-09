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
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

        // Use more realistic browser headers to avoid bot detection (e.g. Otto.de)
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        }

        const response = await fetch(url, { headers })

        if (!response.ok) {
            // If 202 Accepted, it might be processing, but for scraping it usually means failure/bot protection
            if (response.status === 202) {
                console.warn('Received 202 Accepted - likely bot protection or async processing')
            }
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

        // B. Fallback to Open Graph & Meta Tags
        if (!productData.title) {
            productData.title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text() || ''
        }
        if (!productData.description) {
            productData.description = $('meta[property="og:description"]').attr('content') ||
                $('meta[name="description"]').attr('content') ||
                $('meta[name="twitter:description"]').attr('content') || ''
        }
        if (productData.images.length === 0) {
            const ogImage = $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content')
            if (ogImage) productData.images.push(ogImage)
        }

        // C. Enhanced HTML Scraping (Specific Selectors for Otto & Others)

        // Title Fallback
        if (!productData.title) {
            productData.title = $('h1[data-qa="product-title"]').text().trim() ||
                $('h1.p_name').text().trim() ||
                $('h1').first().text().trim()
        }

        // Price Fallback
        if (!productData.price || productData.price === '0.00') {
            // 1. Try Microdata
            const microdataPrice = $('[itemprop="price"]').attr('content') || $('[itemprop="price"]').text()
            if (microdataPrice) productData.price = microdataPrice.trim()

            const microdataCurrency = $('[itemprop="priceCurrency"]').attr('content') || $('[itemprop="priceCurrency"]').text()
            if (microdataCurrency) productData.currency = microdataCurrency.trim()

            // 2. Otto specific selectors
            if (!productData.price || productData.price === '0.00') {
                const ottoPrice = $('span[data-qa="price"]').text().trim() ||
                    $('.p_price__amount').text().trim() ||
                    $('#normalPriceAmount').text().trim()

                if (ottoPrice) {
                    const match = ottoPrice.match(/[\d,.]+/)
                    if (match) productData.price = match[0].replace(',', '.')
                }
            }

            // 3. Common Class Names
            if (!productData.price || productData.price === '0.00') {
                const priceSelectors = ['.price', '.product-price', '.offer-price', '.amount', '.current-price', '[data-price]']
                for (const selector of priceSelectors) {
                    const priceText = $(selector).first().text().trim()
                    if (priceText) {
                        const match = priceText.match(/[\d,.]+/)
                        if (match) {
                            productData.price = match[0].replace(',', '.')
                            if (priceText.includes('€') || priceText.includes('EUR')) productData.currency = 'EUR'
                            break
                        }
                    }
                }
            }
        }

        // Images Fallback
        if (productData.images.length === 0) {
            // Otto specific
            $('img[data-qa="product-gallery-image"]').each((_, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src')
                if (src) productData.images.push(src)
            })

            // Generic gallery
            if (productData.images.length === 0) {
                $('.product-gallery img, .gallery img, .product-images img').each((_, el) => {
                    const src = $(el).attr('src') || $(el).attr('data-src')
                    if (src) productData.images.push(src)
                })
            }
        }

        // SKU Fallback
        if (!productData.sku) {
            productData.sku = $('[itemprop="sku"]').attr('content') ||
                $('[itemprop="sku"]').text().trim() ||
                $('[data-qa="article-number"]').text().trim() || // Otto
                ''
        }

        // Description Fallback
        if (productData.description.length < 50) {
            const descSelectors = [
                '[itemprop="description"]',
                '.product-description',
                '.description',
                '#description',
                'div[data-qa="product-description"]' // Otto
            ]
            for (const selector of descSelectors) {
                const desc = $(selector).first().text().trim()
                if (desc && desc.length > productData.description.length) {
                    productData.description = desc
                    break
                }
            }
        }

        // Clean up data
        productData.fullDescription = productData.description

        // Ensure absolute URLs for images
        productData.images = productData.images.map((img: string) => {
            if (img && !img.startsWith('http')) {
                return new URL(img, url).toString()
            }
            return img
        })

        // Remove duplicates from images
        productData.images = [...new Set(productData.images)]

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
