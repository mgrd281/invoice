import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const organization = await prisma.organization.findFirst()
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        // Group reviews by productId to get stats
        const groupedReviews = await prisma.review.groupBy({
            by: ['productId', 'productTitle', 'productImage'],
            where: {
                organizationId: organization.id
            },
            _count: {
                id: true
            },
            _avg: {
                rating: true
            },
            _max: {
                createdAt: true
            },
            orderBy: {
                _max: {
                    createdAt: 'desc'
                }
            }
        })

        // Format the response
        const productStats = groupedReviews.map(group => ({
            productId: group.productId,
            productTitle: group.productTitle || 'Unbekanntes Produkt',
            productImage: group.productImage,
            reviewCount: group._count.id,
            averageRating: group._avg.rating || 0,
            lastReviewDate: group._max.createdAt
        }))

        return NextResponse.json(productStats)
    } catch (error) {
        console.error('Error fetching product review stats:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
