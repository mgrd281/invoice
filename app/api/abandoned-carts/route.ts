import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get organization ID from user
        const user = await prisma.user.findUnique({
            where: { email: session.user?.email! },
            include: { organization: true }
        })

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 })
        }

        // Allow admins to see ALL carts, otherwise filter by user's organization
        const isAdmin = (session.user as any).isAdmin
        const whereClause = isAdmin ? {} : { organizationId: user.organizationId }

        const carts = await prisma.abandonedCart.findMany({
            where: whereClause,
            orderBy: {
                updatedAt: 'desc'
            }
        })

        return NextResponse.json({ carts })
    } catch (error) {
        console.error('Error fetching abandoned carts:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
