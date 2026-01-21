import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { ensureOrganization } from '@/lib/db-operations'

async function getOrganizationId(email: string) {
    const user = await prisma.user.findUnique({
        where: { email },
        select: { organizationId: true }
    })

    if (user?.organizationId) return user.organizationId

    const org = await ensureOrganization()
    return org.id
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const organizationId = await getOrganizationId(session.user.email)
        const { id } = await params

        // Verify ownership
        const blockedUser = await prisma.blockedUser.findUnique({
            where: { id }
        })

        if (!blockedUser || blockedUser.organizationId !== organizationId) {
            return new NextResponse('Not found', { status: 404 })
        }

        await prisma.blockedUser.delete({
            where: { id }
        })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error('Error unblocking user:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
