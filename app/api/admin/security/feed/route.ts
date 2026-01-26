import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // @ts-ignore
        const organizationId = session.user.organizationId
        const whereClause = organizationId ? { organizationId } : {}

        // Fetch recent blocked attempts (Live Feed)
        const feed = await prisma.blockedUserAttempt.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        return NextResponse.json(feed)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
    }
}
