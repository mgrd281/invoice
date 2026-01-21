import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { url, productIds } = body

        if (!url || !productIds || productIds.length === 0) {
            return NextResponse.json({ error: 'URL and Product IDs are required' }, { status: 400 })
        }

        // Determine source
        let source = 'unknown'
        if (url.includes('aliexpress.com')) source = 'aliexpress'
        if (url.includes('amazon.')) source = 'amazon'

        if (source === 'unknown') {
            return NextResponse.json({ error: 'Only AliExpress and Amazon URLs are supported currently.' }, { status: 400 })
        }

        let targetUrl = url

        // Optimize Amazon URL to point to reviews page directly
        if (source === 'amazon') {
            const asinMatch = url.match(/(?:dp|gp\/product|product-reviews)\/([A-Z0-9]{10})/)
            if (asinMatch && asinMatch[1]) {
                const asin = asinMatch[1]
                // Construct reviews URL (works for .de, .com, etc. based on input domain)
                const domain = url.split('/')[2]
                targetUrl = `https://${domain}/product-reviews/${asin}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews`
            }
        }

        // Fetch HTML
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Upgrade-Insecure-Requests': '1'
            }
        })

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch URL: ${response.status} ${response.statusText}` }, { status: 400 })
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Check for Amazon Captcha
        if ($('title').text().includes('Captcha') || $('form[action*="validateCaptcha"]').length > 0) {
            return NextResponse.json({
                error: 'Amazon hat den Zugriff blockiert (Captcha). Bitte versuchen Sie es später erneut oder nutzen Sie den CSV-Import.'
            }, { status: 429 })
        }

        const reviews: any[] = []

        if (source === 'amazon') {
            // Basic Amazon Scraper (Best Effort)
            // Look for review elements
            const reviewElements = $('div[data-hook="review"]')

            reviewElements.each((i, el) => {
                if (reviews.length >= 20) return // Limit to 20

                const ratingText = $(el).find('i[data-hook="review-star-rating"] span').text() ||
                    $(el).find('i[data-hook="cmps-review-star-rating"] span').text()
                const rating = parseInt(ratingText.split(' ')[0]) || 5

                const title = $(el).find('a[data-hook="review-title"]').text().trim() ||
                    $(el).find('span[data-hook="review-title"]').text().trim()

                const content = $(el).find('span[data-hook="review-body"]').text().trim()

                const author = $(el).find('span.a-profile-name').text().trim() || 'Amazon Customer'

                const dateText = $(el).find('span[data-hook="review-date"]').text().trim()
                // Parse date: "Rezension aus Deutschland vom 10. Dezember 2023"
                let date = new Date()
                const dateMatch = dateText.match(/(\d{1,2})\.\s+([a-zA-ZäöüÄÖÜ]+)\s+(\d{4})/)
                if (dateMatch) {
                    const months: { [key: string]: number } = {
                        'Januar': 0, 'Februar': 1, 'März': 2, 'April': 3, 'Mai': 4, 'Juni': 5,
                        'Juli': 6, 'August': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Dezember': 11,
                        'January': 0, 'February': 1, 'March': 2, 'May': 4, 'June': 5, 'July': 6, 'October': 9, 'December': 11
                    }
                    date = new Date(parseInt(dateMatch[3]), months[dateMatch[2]] || 0, parseInt(dateMatch[1]))
                }

                if (title && content) {
                    reviews.push({
                        rating,
                        title,
                        content,
                        customerName: author,
                        date: date.toISOString(),
                        source: 'amazon'
                    })
                }
            })
        } else if (source === 'aliexpress') {
            // AliExpress is harder because it's mostly dynamic (React/Vue).
            // We might find JSON in scripts.
            // This is a simplified attempt.

            // Try to find feedback data in scripts
            const scripts = $('script')
            scripts.each((i, el) => {
                const text = $(el).html() || ''
                if (text.includes('feedbackComponent')) {
                    // Try to extract JSON... very fragile
                }
            })

            // Fallback: Check for basic HTML structure if SSR
            $('.feedback-item').each((i, el) => {
                // ... implementation would go here
            })
        }

        if (reviews.length === 0) {
            // If scraping failed (likely due to bot protection), we can return a specific error
            // OR we can generate some mock reviews based on the product page content if we want to be "smart"
            // but that might be misleading.
            // Let's return an error for now.
            return NextResponse.json({
                error: 'Keine Bewertungen gefunden. Amazon/AliExpress blockieren möglicherweise den automatischen Zugriff. Bitte nutzen Sie den CSV-Import oder die manuelle Erstellung.'
            }, { status: 400 })
        }

        // Save reviews to DB
        let savedCount = 0
        for (const productId of productIds) {
            // Get product title for the review
            // We don't have easy access to product title here unless we fetch it from Shopify or DB
            // But we can just use the scraped title or generic

            for (const review of reviews) {
                await prisma.review.create({
                    data: {
                        organizationId: (await prisma.organization.findFirst())?.id || '', // Fallback
                        productId: String(productId),
                        productTitle: '', // We could fetch this if needed
                        customerName: review.customerName,
                        customerEmail: 'import@amazon.com', // Placeholder
                        rating: review.rating,
                        title: review.title,
                        content: review.content,
                        source: review.source,
                        status: 'APPROVED', // Auto-approve imported reviews? Or PENDING? Let's say APPROVED for convenience
                        createdAt: review.date,
                        isVerified: true
                    }
                })
                savedCount++
            }
        }

        return NextResponse.json({ success: true, count: savedCount })

    } catch (error) {
        console.error('Import URL error:', error)
        return NextResponse.json({ error: 'Failed to import from URL: ' + (error as Error).message }, { status: 500 })
    }
}
