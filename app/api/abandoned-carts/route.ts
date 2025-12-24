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

        // Check if admin from session
        const isAdmin = (session.user as any).isAdmin

        let whereClause = {}

        if (isAdmin) {
            // Admins see all
            whereClause = {}
        } else {
            // Non-admins need an organization
            const user = await prisma.user.findUnique({
                where: { email: session.user?.email! },
                include: { organization: true }
            })

            if (!user?.organizationId) {
                console.error(`[AbandonedCarts] User ${session.user?.email} has no organization`)
                return NextResponse.json({ error: 'No organization found' }, { status: 404 })
            }
            whereClause = { organizationId: user.organizationId }
        }

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
