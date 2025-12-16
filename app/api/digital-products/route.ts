import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const products = await prisma.digitalProduct.findMany({
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(products)

    } catch (error) {
        console.error('Error fetching digital products:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()

        // 1. Get current user with organization
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { organization: true }
        })

        if (!currentUser?.organization) {
            return NextResponse.json(
                { error: 'User has no organization linked.' },
                { status: 400 }
            )
        }

        const orgId = currentUser.organization.id

        const product = await prisma.digitalProduct.upsert({
            where: {
                shopifyProductId: body.shopifyProductId
            },
            update: {
                title: body.title,
                // CRITICAL: Move product to current user's organization if it belongs to another one
                organization: {
                    connect: { id: orgId }
                }
            },
            create: {
                title: body.title,
                shopifyProductId: body.shopifyProductId,
                organization: {
                    connect: { id: orgId }
                }
            }
        })

        return NextResponse.json(product)

    } catch (error: any) {
        console.error('Error creating digital product:', error)
        // Return JSON error with message to help debugging
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
