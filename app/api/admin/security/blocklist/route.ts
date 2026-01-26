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

        const [blockedUsers, blockedIps] = await Promise.all([
            prisma.blockedUser.findMany({
                where: whereClause,
                orderBy: { blockedAt: 'desc' }
            }),
            prisma.blockedIp.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' }
            })
        ])

        return NextResponse.json({ users: blockedUsers, ips: blockedIps })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch blocklist' }, { status: 500 })
    }
}
