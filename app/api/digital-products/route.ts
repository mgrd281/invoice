
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
        let { shopifyProductId, title, organizationId } = body

        if (!shopifyProductId || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // If no organizationId provided or it's the dummy one, try to find a valid one
        if (!organizationId || organizationId === 'default-org-id') {
            const firstOrg = await prisma.organization.findFirst()
            if (firstOrg) {
                organizationId = firstOrg.id
            } else {
                // Create a default organization if none exists
                // This is a fallback for initial setup
                try {
                    const newOrg = await prisma.organization.create({
                        data: {
                            name: 'Default Organization',
                            slug: 'default-org-' + Date.now(),
                            address: 'Default Address',
                            zipCode: '00000',
                            city: 'Default City'
                        }
                    })
                    organizationId = newOrg.id
                } catch (e) {
                    console.error('Failed to create default org:', e)
                    return NextResponse.json({ error: `Organization setup failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
                }
            }
        }

        // Check if product already exists
        const existingProduct = await prisma.digitalProduct.findUnique({
            where: { shopifyProductId }
        })

        if (existingProduct) {
            return NextResponse.json({ error: 'Dieses Produkt ist bereits aktiviert.' }, { status: 409 })
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
        return NextResponse.json({ error: `Server Error: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 })
    }
}
