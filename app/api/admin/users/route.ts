import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
    try {
        const auth = requireAuth(request)
        // ... (rest of GET)

        // ... (DELETE handler remains same)

        // ... (GET handler content)
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
            isAdmin: ['mgrdegh@web.de', 'Mkarina321@'].includes((u.email || '').toLowerCase()),
            isSuspended: u.isSuspended,
            country: u.country,
            lastIp: u.lastIp,
            lastLoginAt: u.lastLoginAt
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

        // Create Audit Log
        await prisma.auditLog.create({
            data: {
                organizationId: targetUser.organizationId || 'system',
                userId: user.id,
                action: 'DELETE_USER',
                entityType: 'USER',
                entityId: userId,
                details: {
                    targetEmail: targetUser.email,
                    targetName: targetUser.name
                },
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
            }
        })

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
        const { userId, isVerified, isSuspended, newPassword } = body

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Prevent suspending self
        if (targetUser.email === user.email && isSuspended === true) {
            return NextResponse.json({ error: 'Cannot suspend your own admin account' }, { status: 400 })
        }

        const updateData: any = {}
        let actionType = 'UPDATE_USER'
        let actionDetails: any = {}

        if (typeof isVerified === 'boolean') {
            updateData.emailVerified = isVerified ? new Date() : null
            actionType = isVerified ? 'VERIFY_USER' : 'UNVERIFY_USER'
        }
        if (typeof isSuspended === 'boolean') {
            updateData.isSuspended = isSuspended
            actionType = isSuspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER'
        }
        if (newPassword && typeof newPassword === 'string') {
            if (newPassword.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
            }
            updateData.passwordHash = await bcrypt.hash(newPassword, 10)
            actionType = 'RESET_PASSWORD'
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        })

        // Create Audit Log
        await prisma.auditLog.create({
            data: {
                organizationId: targetUser.organizationId || 'system', // Fallback
                userId: user.id,
                action: actionType,
                entityType: 'USER',
                entityId: userId,
                details: {
                    targetEmail: targetUser.email,
                    ...actionDetails
                },
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
            }
        })

        return NextResponse.json({ success: true, message: 'User updated' })
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

