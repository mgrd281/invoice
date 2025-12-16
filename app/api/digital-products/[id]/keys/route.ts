import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const keys = await prisma.licenseKey.findMany({
            where: { digitalProductId: id },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, data: keys })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { keys, shopifyVariantId } = body

        if (!Array.isArray(keys)) {
            return NextResponse.json({ error: 'Keys must be an array' }, { status: 400 })
        }

        const createdKeys = await prisma.licenseKey.createMany({
            data: keys.map((key: string) => ({
                key,
                digitalProductId: id,
                isUsed: false,
                shopifyVariantId: shopifyVariantId || null
            }))
        })

        return NextResponse.json({ success: true, count: createdKeys.count })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add keys' }, { status: 500 })
    }
}
