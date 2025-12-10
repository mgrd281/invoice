import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

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

        await prisma.user.update({
            where: { email: session.user.email },
            data: { featureOrder },
        })

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

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { featureOrder: true },
        })

        return NextResponse.json({ featureOrder: user?.featureOrder || null })
    } catch (error) {
        console.error('Error fetching feature order:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
