
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const auth = requireAuth(request)
        if ('error' in auth) return auth.error
        const { user } = auth

        if (!shouldShowAllData(user)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // 1. User Status Distribution
        const totalUsers = await prisma.user.count()
        const verifiedUsers = await prisma.user.count({ where: { emailVerified: { not: null } } })
        const suspendedUsers = await prisma.user.count({ where: { isSuspended: true } })
        const unverifiedUsers = totalUsers - verifiedUsers

        // 2. User Growth (Last 30 Days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const usersLast30Days = await prisma.user.findMany({
            where: {
                createdAt: {
                    gte: thirtyDaysAgo
                }
            },
            select: {
                createdAt: true
            }
        })

        // Group by date
        const growthMap = new Map<string, number>()
        // Initialize last 30 days with 0
        for (let i = 0; i < 30; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            growthMap.set(dateStr, 0)
        }

        usersLast30Days.forEach(u => {
            const dateStr = u.createdAt.toISOString().split('T')[0]
            if (growthMap.has(dateStr)) {
                growthMap.set(dateStr, (growthMap.get(dateStr) || 0) + 1)
            }
        })

        const growthData = Array.from(growthMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))

        return NextResponse.json({
            stats: {
                total: totalUsers,
                verified: verifiedUsers,
                suspended: suspendedUsers,
                unverified: unverifiedUsers
            },
            growth: growthData
        })

    } catch (error) {
        console.error('Error fetching analytics:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
