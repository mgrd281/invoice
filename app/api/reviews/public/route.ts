import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'


export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const productId = searchParams.get('productId')
        const shopDomain = searchParams.get('shop')

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' }
            })
        }

        // Fetch approved reviews for this product
        const reviews = await prisma.review.findMany({
            where: {
                productId: productId,
                status: 'APPROVED', // Only show approved reviews publicly
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                rating: true,
                title: true,
                content: true,
                customerName: true,
                createdAt: true,
                images: true,
                videos: true,
                isVerified: true,
                reply: true,
                repliedAt: true,
                helpful: true,
                notHelpful: true
            }
        })

        // Calculate aggregate stats
        const totalReviews = reviews.length
        const averageRating = totalReviews > 0
            ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / totalReviews
            : 0

        // Get widget settings
        const { getWidgetSettings } = await import('@/lib/widget-settings')
        const widgetSettings = await getWidgetSettings()

        return NextResponse.json({
            success: true,
            stats: {
                total: totalReviews,
                average: parseFloat(averageRating.toFixed(1))
            },
            reviews,
            settings: widgetSettings
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            }
        })

    } catch (error) {
        console.error('Error fetching public reviews:', error)
        return NextResponse.json({ error: 'Failed to fetch reviews' }, {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Basic validation
        if (!body.productId || !body.rating || !body.customerName) {
            return NextResponse.json({ error: 'Missing required fields' }, {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' }
            })
        }

        // Find Organization (Fallback to first one if no specific logic yet)
        // In a real multi-tenant app, you'd verify the origin or API key.
        const organization = await prisma.organization.findFirst()

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, {
                status: 404,
                headers: { 'Access-Control-Allow-Origin': '*' }
            })
        }

        // Create the review
        const review = await prisma.review.create({
            data: {
                organizationId: organization.id,
                productId: body.productId.toString(),
                productTitle: body.productTitle || '',
                customerName: body.customerName,
                customerEmail: body.customerEmail || 'anonymous@example.com', // Fallback if not provided
                rating: parseInt(body.rating),
                title: body.title || '',
                content: body.content || '',
                images: body.images || [], // Save images (Base64)
                videos: body.videos || [], // Save videos (Base64)
                status: 'PENDING', // Always pending initially
                isVerified: false, // Can be updated if we verify purchase later
                source: 'web'
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Review submitted successfully (Pending Approval)',
            review
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            }
        })

    } catch (error) {
        console.error('Error submitting review:', error)
        return NextResponse.json({ error: 'Failed to submit review' }, {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        })
    }
}
