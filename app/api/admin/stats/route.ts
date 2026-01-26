import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const [totalUsers, verifiedUsers, adminUsers, activeToday] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { emailVerified: { not: null } } }),
            prisma.user.count({ where: { role: 'ADMIN' } }),
            prisma.user.count({
                where: {
                    lastLoginAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            })
        ])

        return NextResponse.json({
            totalUsers,
            verifiedUsers,
            adminUsers,
            activeToday
        })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
