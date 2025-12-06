
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
        const { keys } = body // Expecting array of strings

        if (!Array.isArray(keys) || keys.length === 0) {
            return NextResponse.json({ error: 'Invalid keys data' }, { status: 400 })
        }

        const createdKeys = await prisma.licenseKey.createMany({
            data: keys.map((key: string) => ({
                digitalProductId: params.id,
                key: key,
                isUsed: false
            }))
        })

        return NextResponse.json({ success: true, count: createdKeys.count })
    } catch (error) {
        console.error('Error adding keys:', error)
        return NextResponse.json({ error: 'Failed to add keys' }, { status: 500 })
    }
}
