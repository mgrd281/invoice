import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'
import { loadUsersFromDisk, saveUsersToDisk } from '@/lib/server-storage'

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

        const users = loadUsersFromDisk()

        // Return safe user data (no passwords)
        const safeUsers = users.map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            provider: u.provider,
            createdAt: u.createdAt,
            isVerified: u.isVerified,
            isAdmin: ['mgrdegh@web.de', 'Mkarina321@'].includes(u.email?.toLowerCase())
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

        const users = loadUsersFromDisk()
        const userIndex = users.findIndex((u: any) => u.id === userId)

        if (userIndex === -1) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Prevent deleting self
        if (users[userIndex].email === user.email) {
            return NextResponse.json({ error: 'Cannot delete your own admin account' }, { status: 400 })
        }

        users.splice(userIndex, 1)
        saveUsersToDisk(users)

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

        const users = loadUsersFromDisk()
        const userIndex = users.findIndex((u: any) => u.id === userId)

        if (userIndex === -1) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        if (typeof isVerified === 'boolean') {
            users[userIndex].isVerified = isVerified
        }

        saveUsersToDisk(users)

        return NextResponse.json({ success: true, message: 'User updated', user: users[userIndex] })
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
