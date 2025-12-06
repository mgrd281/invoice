
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
// import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
    try {
        // const session = await getServerSession(authOptions)
        // if (!session) {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        // }

        const products = await prisma.digitalProduct.findMany({
            include: {
                _count: {
                    select: { keys: { where: { isUsed: false } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: products })
    } catch (error) {
        console.error('Error fetching digital products:', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { shopifyProductId, title, organizationId } = body

        if (!shopifyProductId || !title || !organizationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const product = await prisma.digitalProduct.create({
            data: {
                shopifyProductId,
                title,
                organizationId,
                emailTemplate: '' // Default empty
            }
        })

        return NextResponse.json({ success: true, data: product })
    } catch (error) {
        console.error('Error creating digital product:', error)
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }
}
