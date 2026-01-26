import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // @ts-ignore
        const organizationId = session.user.organizationId
        if (!organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

        const settings = await prisma.securitySettings.findUnique({
            where: { organizationId }
        })

        // If no settings exist, return defaults (or create?)
        // Let's just return defaults if null
        if (!settings) {
            return NextResponse.json({
                blockFailedAttempts: false,
                maxFailedAttempts: 5,
                blockSuspiciousDomains: false,
                autoUnblock: false,
                autoUnblockDuration: 24
            })
        }

        return NextResponse.json(settings)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // @ts-ignore
        const organizationId = session.user.organizationId
        if (!organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

        const body = await request.json()

        const settings = await prisma.securitySettings.upsert({
            where: { organizationId },
            update: body,
            create: {
                organizationId,
                ...body
            }
        })

        return NextResponse.json(settings)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
