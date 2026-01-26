import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // @ts-ignore
        const organizationId = session.user.organizationId
        const whereClause = organizationId ? { organizationId } : {}

        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

        const activities = await prisma.auditLog.findMany({
            where: whereClause,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        })

        return NextResponse.json(activities)
    } catch (error) {
        console.error('Activity fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }
}
