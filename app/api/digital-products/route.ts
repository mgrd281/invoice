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
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()

        const product = await prisma.digitalProduct.create({
            data: {
                title: body.title,
                shopifyProductId: body.shopifyProductId,
                // Removed isActive as it's not in schema
                organization: {
                    connect: { id: 'default-org-id' } // Placeholder, needs real org logic if multi-tenant
                }
            }
        })

        return NextResponse.json(product)

    } catch (error) {
        console.error('Error creating digital product:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
