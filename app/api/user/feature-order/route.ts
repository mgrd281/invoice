import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { loadUsersFromDisk, saveUsersToDisk } from '@/lib/server-storage'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { featureOrder } = body

        if (!Array.isArray(featureOrder)) {
            return new NextResponse('Invalid data', { status: 400 })
        }

        const users = loadUsersFromDisk()
        const userIndex = users.findIndex((u: any) => u.email === session.user.email)

        if (userIndex !== -1) {
            users[userIndex].featureOrder = featureOrder
            saveUsersToDisk(users)
        } else {
            // User not found in local storage, might be a session-only user or first time
            // We could create them, but for feature order it's fine to skip or create on the fly if needed
            // For now, let's try to find if we can add it to a new user entry if we want full persistence
            // But usually loadUsersFromDisk handles the main users.
            console.warn(`User ${session.user.email} not found in local storage for feature order update`)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error saving feature order:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const users = loadUsersFromDisk()
        const user = users.find((u: any) => u.email === session.user.email)

        return NextResponse.json({ featureOrder: user?.featureOrder || null })
    } catch (error) {
        console.error('Error fetching feature order:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
