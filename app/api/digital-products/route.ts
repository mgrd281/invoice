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
                    connectOrCreate: {
                        where: { id: 'default-org-id' },
                        create: {
                            id: 'default-org-id',
                            name: 'Default Organization',
                            slug: 'default-org',
                            address: 'Musterstraße 1',
                            zipCode: '12345',
                            city: 'Musterstadt'
                        }
                    }
                }
            }
        })

        return NextResponse.json(product)

    } catch (error) {
        console.error('Error creating digital product:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
