import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

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

        const carts = await prisma.abandonedCart.findMany({
            where: {
                organizationId: user.organizationId
            },
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
