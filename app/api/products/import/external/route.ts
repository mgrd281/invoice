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

        // 2. Multi-Provider Proxy Strategy (Enterprise Grade)
        // We implement a waterfall fallback: ZenRows -> ScrapingBee -> ScraperAPI -> Direct
        // This ensures maximum reliability. If one service is down or blocked, the other takes over.

        const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY
        const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY
        const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY

        // Helper to parse HTML and extract data (Shared logic)
        const parseProductData = ($: any, vendor: string) => {
            let data: any = {
                title: '', description: '', price: '0.00', currency: 'EUR',
                images: [], vendor: vendor, product_type: '', tags: 'Imported, ' + vendor
            }

            if (vendor === 'Amazon') {
                data.title = $('#productTitle').text().trim() || $('#title').text().trim()
                const priceSelectors = ['.a-price .a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice', '.apexPriceToPay .a-offscreen']
                for (const selector of priceSelectors) {
                    const priceText = $(selector).first().text().trim()
                    if (priceText) {
                        const match = priceText.match(/[\d,.]+/)
                        if (match) {
                            data.price = match[0].replace(',', '.')
                            if (priceText.includes('€')) data.currency = 'EUR'
                            break
                        }
                    }
                }
                try {
                    const dynamicImageAttr = $('#imgTagWrapperId img').attr('data-a-dynamic-image') || $('#landingImage').attr('data-a-dynamic-image')
                    if (dynamicImageAttr) data.images = Object.keys(JSON.parse(dynamicImageAttr))
                } catch (e) { }
                const features = $('#feature-bullets li span.a-list-item').map((_: number, el: any) => $(el).text().trim()).get()
                if (features.length > 0) data.description = '<ul>' + features.map((f: string) => `<li>${f}</li>`).join('') + '</ul>'
                data.sku = $('input#ASIN').val() || $('[data-asin]').attr('data-asin')
            }
            else if (vendor === 'Otto') {
                data.title = $('h1[data-qa="product-title"]').text().trim() || $('.p_name').text().trim()
                const priceText = $('#normalPriceAmount').text().trim() || $('.p_price__amount').text().trim() || $('span[data-qa="price"]').text().trim()
                if (priceText) {
                    const match = priceText.match(/[\d,.]+/)
                    if (match) data.price = match[0].replace(',', '.')
                }
                $('#product_gallery img').each((_: number, el: any) => {
                    const src = $(el).attr('data-src') || $(el).attr('src'); if (src) data.images.push(src)
                })
                $('img[data-qa="product-gallery-image"]').each((_: number, el: any) => {
                    const src = $(el).attr('data-src') || $(el).attr('src'); if (src) data.images.push(src)
                })
                data.description = $('.p_description').html() || $('div[data-qa="product-description"]').html() || ''
                data.sku = $('[data-qa="article-number"]').text().replace('Artikel-Nr.', '').trim()
            }

            data.images = Array.from(new Set(data.images))
            data.fullDescription = data.description
            return data
        }

        if (url.includes('amazon') || url.includes('amzn') || url.includes('otto.de')) {
            const vendor = url.includes('otto.de') ? 'Otto' : 'Amazon'
            console.log(`Detected ${vendor} URL, initiating proxy waterfall...`)

            // Priority 1: ZenRows
            if (ZENROWS_API_KEY) {
                try {
                    console.log('Trying Provider 1: ZenRows...')
                    const zenRowsUrl = `https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=${encodeURIComponent(url)}&js_render=true&antibot=true&premium_proxy=true`
                    const response = await fetch(zenRowsUrl)
                    if (response.ok) {
                        const html = await response.text()
                        const productData = parseProductData(cheerio.load(html), vendor)
                        if (productData.title) return NextResponse.json({ product: productData })
                    }
                } catch (e) { console.error('ZenRows failed:', e) }
            }

            // Priority 2: ScrapingBee (New)
            if (SCRAPINGBEE_API_KEY) {
                try {
                    console.log('Trying Provider 2: ScrapingBee...')
                    const sbUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true&country_code=de`
                    const response = await fetch(sbUrl)
                    if (response.ok) {
                        const html = await response.text()
                        const productData = parseProductData(cheerio.load(html), vendor)
                        if (productData.title) return NextResponse.json({ product: productData })
                    }
                } catch (e) { console.error('ScrapingBee failed:', e) }
            }

            // Priority 3: ScraperAPI (Fallback)
            if (SCRAPERAPI_KEY) {
                try {
                    console.log('Trying Provider 3: ScraperAPI...')
                    // ScraperAPI format: http://api.scraperapi.com/?api_key=KEY&url=URL&render=true
                    const scraperApiUrl = `http://api.scraperapi.com/?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(url)}&render=true&country_code=de`
                    const response = await fetch(scraperApiUrl)
                    if (response.ok) {
                        const html = await response.text()
                        const productData = parseProductData(cheerio.load(html), vendor)
                        if (productData.title) return NextResponse.json({ product: productData })
                    }
                } catch (e) { console.error('ScraperAPI failed:', e) }
            }

            console.log('All proxies failed, falling back to direct scrape...')
        }

        // 3. Fallback: Generic HTML Scraping (Standard Fetch)
        console.log('Attempting generic scrape for:', url)

        // Use more realistic browser headers to avoid bot detection (e.g. Otto.de)
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'Upgrade-Insecure-Requests': '1'
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
        productData.images = Array.from(new Set(productData.images))

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
