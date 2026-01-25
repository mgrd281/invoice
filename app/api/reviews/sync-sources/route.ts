import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'

// Helper for title extraction (reused)
async function extractProductTitle(html: string, source: string): Promise<string> {
    const $ = cheerio.load(html)
    let title = ''

    if (source === 'amazon') {
        title = $('h1#title').text().trim() ||
            $('span#productTitle').text().trim() ||
            $('a[data-hook="product-link"]').text().trim()
    } else if (source === 'aliexpress') {
        title = $('meta[property="og:title"]').attr('content') ||
            $('h1[data-pl="product-title"]').text().trim() ||
            $('title').text().trim()
    } else if (source === 'vercel') {
        title = $('h1').first().text().trim() || $('title').text().trim()
    }

    return title.split('|')[0].split('-')[0].trim()
}

export async function GET(request: NextRequest) {
    try {
        const sources = await prisma.reviewSource.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, sources })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const activeSources = await prisma.reviewSource.findMany({
            where: { isActive: true }
        })

        if (activeSources.length === 0) {
            return NextResponse.json({ success: true, message: 'No active sources to sync', results: [] })
        }

        const results = []

        for (const sourceItem of activeSources) {
            try {
                const { url, type, productId, organizationId } = sourceItem

                // Fetch content
                let targetUrl = url
                if (type === 'amazon') {
                    const asinMatch = url.match(/(?:dp|gp\/product|product-reviews)\/([A-Z0-9]{10})/)
                    if (asinMatch && asinMatch[1]) {
                        const asin = asinMatch[1]
                        const domain = url.split('/')[2]
                        targetUrl = `https://${domain}/product-reviews/${asin}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews`
                    }
                }

                const response = await fetch(targetUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    }
                })

                if (!response.ok) {
                    results.push({ url, status: 'error', error: `Fetch failed: ${response.status}` })
                    continue
                }

                const html = await response.text()
                const $ = cheerio.load(html)
                const reviewsFound: any[] = []

                if (type === 'amazon') {
                    $('div[data-hook="review"]').each((i, el) => {
                        if (reviewsFound.length >= 20) return
                        const ratingText = $(el).find('i[data-hook="review-star-rating"] span').text() || $(el).find('i[data-hook="cmps-review-star-rating"] span').text()
                        const rating = parseInt(ratingText.split(' ')[0]) || 5
                        const title = $(el).find('a[data-hook="review-title"]').text().trim() || $(el).find('span[data-hook="review-title"]').text().trim()
                        const content = $(el).find('span[data-hook="review-body"]').text().trim()
                        const author = $(el).find('span.a-profile-name').text().trim() || 'Amazon Customer'

                        if (title || content) {
                            reviewsFound.push({ rating, title, content: content || title, customerName: author, date: new Date().toISOString(), source: 'amazon' })
                        }
                    })
                } else if (type === 'vercel') {
                    $('table tbody tr').each((i, el) => {
                        const cells = $(el).find('td')
                        if (cells.length >= 5) {
                            const ratingStars = $(cells[1]).find('span').length || 5
                            const title = $(cells[2]).text().trim()
                            const content = $(cells[3]).text().trim()
                            const name = $(cells[4]).text().trim()
                            if (content || title) {
                                reviewsFound.push({ rating: ratingStars, title, content: content || title, customerName: name, date: new Date().toISOString(), source: 'vercel' })
                            }
                        }
                    })
                }

                // Deduplicate and Save
                let newCount = 0
                for (const review of reviewsFound) {
                    // Check existence
                    const existing = await prisma.review.findFirst({
                        where: {
                            organizationId,
                            productId,
                            content: review.content,
                            customerName: review.customerName
                        }
                    })

                    if (!existing) {
                        await prisma.review.create({
                            data: {
                                organizationId,
                                productId,
                                productTitle: sourceItem.productTitle,
                                customerName: review.customerName,
                                customerEmail: `import@${type}.com`,
                                rating: review.rating,
                                title: review.title,
                                content: review.content,
                                source: review.source,
                                status: 'APPROVED',
                                createdAt: review.date,
                                isVerified: true
                            }
                        })
                        newCount++
                    }
                }

                // Update source last sync
                await prisma.reviewSource.update({
                    where: { id: sourceItem.id },
                    data: { lastSyncAt: new Date() }
                })

                results.push({ url, status: 'success', newReviews: newCount })

            } catch (err) {
                console.error(`Sync error for ${sourceItem.url}:`, err)
                results.push({ url: sourceItem.url, status: 'error', error: String(err) })
            }
        }

        return NextResponse.json({ success: true, results })
    } catch (error) {
        console.error('Sync Sources API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
