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

        // 1. Find ANY existing organization first to avoid unique constraint errors
        let org = await prisma.organization.findFirst()

        // 2. If no organization exists, create a default one
        if (!org) {
            org = await prisma.organization.create({
                data: {
                    name: 'Default Organization',
                    slug: 'default-org-' + Date.now(), // Ensure uniqueness
                    address: 'Musterstraße 1',
                    zipCode: '12345',
                    city: 'Musterstadt'
                }
            })
        }

        const product = await prisma.digitalProduct.upsert({
            where: {
                shopifyProductId: body.shopifyProductId
            },
            update: {
                title: body.title,
            },
            create: {
                title: body.title,
                shopifyProductId: body.shopifyProductId,
                organization: {
                    connect: { id: org.id }
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
