import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const organizationId = 'default-org-id'

        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ''
        const type = searchParams.get('type') || '' // Filter by attempt type
        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')

        const where: any = { organizationId }

        if (search) {
            where.email = { contains: search, mode: 'insensitive' }
        }

        if (type) {
            where.attemptType = type
        }

        const [attempts, total] = await Promise.all([
            prisma.blockedUserAttempt.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.blockedUserAttempt.count({ where })
        ])

        return NextResponse.json({
            attempts,
            total,
            limit,
            offset
        })
    } catch (error) {
        console.error('Error fetching blocked attempts:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
