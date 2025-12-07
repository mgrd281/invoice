
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const auth = requireAuth(request)
        if ('error' in auth) {
            return auth.error
        }
        const { user } = auth

        // Get IP and Country from headers
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        const country = request.headers.get('x-vercel-ip-country') || 'unknown'

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastIp: ip,
                country: country,
                lastLoginAt: new Date()
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating user info:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
