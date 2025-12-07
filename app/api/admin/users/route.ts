import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const auth = requireAuth(request)
        if ('error' in auth) {
            return auth.error
        }
        const { user } = auth

        if (!shouldShowAllData(user)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        })

        // Return safe user data (no passwords)
        const safeUsers = users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            provider: u.passwordHash ? 'credentials' : 'oauth', // Simple heuristic
            createdAt: u.createdAt,
            isVerified: !!u.emailVerified,
            isAdmin: ['mgrdegh@web.de', 'Mkarina321@'].includes((u.email || '').toLowerCase())
        }))

        return NextResponse.json({ users: safeUsers })
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const auth = requireAuth(request)
        if ('error' in auth) return auth.error
        const { user } = auth

        if (!shouldShowAllData(user)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('id')

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Prevent deleting self
        if (targetUser.email === user.email) {
            return NextResponse.json({ error: 'Cannot delete your own admin account' }, { status: 400 })
        }

        await prisma.user.delete({
            where: { id: userId }
        })

        return NextResponse.json({ success: true, message: 'User deleted' })
    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const auth = requireAuth(request)
        if ('error' in auth) return auth.error
        const { user } = auth

        if (!shouldShowAllData(user)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const body = await request.json()
        const { userId, isVerified } = body

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        if (typeof isVerified === 'boolean') {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    emailVerified: isVerified ? new Date() : null
                }
            })
        }

        return NextResponse.json({ success: true, message: 'User updated' })
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
