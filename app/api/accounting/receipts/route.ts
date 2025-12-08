import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const auth = await getServerAuth()
        if (!auth.isAuthenticated || !auth.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const organization = await prisma.organization.findFirst({
            where: { users: { some: { id: String(auth.user.id) } } }
        }) || await prisma.organization.findFirst()

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const where: any = {
            organizationId: organization.id
        }

        if (startDate) {
            where.date = { ...where.date, gte: new Date(startDate) }
        }
        if (endDate) {
            where.date = { ...where.date, lte: new Date(endDate) }
        }

        const receipts = await prisma.receipt.findMany({
            where,
            orderBy: { date: 'desc' }
        })

        return NextResponse.json(receipts)
    } catch (error) {
        console.error('Error fetching receipts:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getServerAuth()
        if (!auth.isAuthenticated || !auth.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { filename, url, date, description, category, mimeType, size } = body

        const organization = await prisma.organization.findFirst({
            where: { users: { some: { id: String(auth.user.id) } } }
        }) || await prisma.organization.findFirst()

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const receipt = await prisma.receipt.create({
            data: {
                organizationId: organization.id,
                filename,
                url,
                date: new Date(date),
                description,
                category,
                mimeType,
                size
            }
        })

        return NextResponse.json(receipt)
    } catch (error) {
        console.error('Error creating receipt:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
