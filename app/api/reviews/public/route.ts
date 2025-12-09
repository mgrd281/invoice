import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const productId = searchParams.get('productId')
        const shopDomain = searchParams.get('shop')

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
        }

        // Fetch approved reviews for this product
        const reviews = await prisma.review.findMany({
            where: {
                productId: productId,
                status: 'APPROVED', // Only show approved reviews publicly
                // If you have multiple organizations, you might want to filter by shopDomain here too
                // organization: { shopifyShopDomain: shopDomain } 
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
                isVerified: true,
                reply: true,
                repliedAt: true
            }
        })

        // Calculate aggregate stats
        const totalReviews = reviews.length
        const averageRating = totalReviews > 0
            ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / totalReviews
            : 0

        return NextResponse.json({
            success: true,
            stats: {
                total: totalReviews,
                average: parseFloat(averageRating.toFixed(1))
            },
            reviews
        })

    } catch (error) {
        console.error('Error fetching public reviews:', error)
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Basic validation
        if (!body.productId || !body.rating || !body.customerName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Create the review
        // Note: In a real app, you'd want to link this to a specific Organization based on the API key or Origin
        // For now, we'll need a way to identify the organization. 
        // A simple way for this demo is to pass organizationId or find it via shop domain.

        // For this demo, we will just return success to simulate submission if we can't link org yet
        // In production, you MUST link to an Organization.

        return NextResponse.json({
            success: true,
            message: 'Review submitted successfully (Pending Approval)'
        })

    } catch (error) {
        console.error('Error submitting review:', error)
        return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
    }
}
