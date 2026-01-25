import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const draft = await prisma.importDraft.findUnique({
            where: { id: params.id },
            include: { organization: true }
        })

        if (!draft) {
            return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, draft })

    } catch (error) {
        console.error('Error fetching draft:', error)
        return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { product, settings } = await request.json()

        const draft = await prisma.importDraft.update({
            where: { id: params.id },
            data: {
                data: product,
                settings: settings
            }
        })

        return NextResponse.json({ success: true, draft })

    } catch (error) {
        console.error('Error updating draft:', error)
        return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
    }
}
