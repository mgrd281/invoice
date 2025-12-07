import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
    const auth = requireAuth(req)
    if ('error' in auth) {
        return auth.error
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: auth.user.email },
        include: { organization: true }
    })

    if (!dbUser?.organizationId) {
        return NextResponse.json({ error: 'User has no organization' }, { status: 400 })
    }

    const templates = await prisma.dunningTemplate.findMany({
        where: { organizationId: dbUser.organizationId }
    })

    return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
    const auth = requireAuth(req)
    if ('error' in auth) {
        return auth.error
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: auth.user.email },
        include: { organization: true }
    })

    if (!dbUser?.organizationId) {
        return NextResponse.json({ error: 'User has no organization' }, { status: 400 })
    }

    const body = await req.json()
    const { level, subject, content } = body

    const template = await prisma.dunningTemplate.upsert({
        where: {
            organizationId_level: {
                organizationId: dbUser.organizationId,
                level: level
            }
        },
        update: {
            subject,
            content
        },
        create: {
            organizationId: dbUser.organizationId,
            level,
            subject,
            content
        }
    })

    return NextResponse.json(template)
}
