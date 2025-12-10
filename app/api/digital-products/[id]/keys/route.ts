
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const keys = await prisma.licenseKey.findMany({
            where: { digitalProductId: params.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: keys })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json()
        const { keys, shopifyVariantId } = body // Expecting array of strings

        if (!Array.isArray(keys) || keys.length === 0) {
            return NextResponse.json({ error: 'Invalid keys data' }, { status: 400 })
        }

        const createdKeys = await prisma.licenseKey.createMany({
            data: keys.map((key: string) => ({
                digitalProductId: params.id,
                key: key,
                isUsed: false,
                shopifyVariantId: shopifyVariantId || null
            }))
        })

        return NextResponse.json({ success: true, count: createdKeys.count })
    } catch (error) {
        console.error('Error adding keys:', error)
        return NextResponse.json({ error: 'Failed to add keys' }, { status: 500 })
    }
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const { searchParams } = new URL(req.url)
        const keyId = searchParams.get('keyId')

        if (keyId) {
            // Single delete
            await prisma.licenseKey.delete({
                where: {
                    id: keyId,
                    digitalProductId: params.id
                }
            })
            return NextResponse.json({ success: true })
        }

        // Try bulk delete from body
        try {
            const body = await req.json()
            const { keyIds } = body

            if (Array.isArray(keyIds) && keyIds.length > 0) {
                await prisma.licenseKey.deleteMany({
                    where: {
                        id: { in: keyIds },
                        digitalProductId: params.id
                    }
                })
                return NextResponse.json({ success: true })
            }
        } catch (e) {
            // Body parsing failed or no body, fall through to error
        }

        return NextResponse.json({ error: 'Key ID or keyIds required' }, { status: 400 })

    } catch (error) {
        console.error('Error deleting key:', error)
        return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 })
    }
}
