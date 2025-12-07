import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'
import { loadUsersFromDisk } from '@/lib/server-storage'

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
