import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // 1. Get current user's organization
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { organization: true }
        })

        if (!currentUser?.organization) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 })
        }

        const targetOrgId = currentUser.organization.id

        // 2. Update ALL digital products to belong to this organization
        // This is a "Fix All" operation
        const result = await prisma.digitalProduct.updateMany({
            data: {
                organizationId: targetOrgId
            }
        })

        return NextResponse.json({
            success: true,
            count: result.count,
            message: `Successfully moved ${result.count} products to ${currentUser.organization.name}`
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
