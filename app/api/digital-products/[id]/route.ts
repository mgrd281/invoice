
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const product = await prisma.digitalProduct.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { keys: { where: { isUsed: false } } }
                }
            }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: product })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json()
        const { emailTemplate, title, downloadUrl, buttonText, buttonColor, buttonTextColor } = body

        const product = await prisma.digitalProduct.update({
            where: { id: params.id },
            data: {
                emailTemplate,
                title,
                downloadUrl,
                buttonText,
                buttonColor,
                buttonTextColor
            }
        })

        return NextResponse.json({ success: true, data: product })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        // Delete all associated keys first
        await prisma.licenseKey.deleteMany({
            where: { digitalProductId: params.id }
        })

        await prisma.digitalProduct.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }
}
