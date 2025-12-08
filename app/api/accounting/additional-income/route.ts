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

        // Get organization ID (assuming user is linked to one, or use default)
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

        const incomes = await prisma.additionalIncome.findMany({
            where,
            orderBy: { date: 'desc' }
        })

        return NextResponse.json(incomes)
    } catch (error) {
        console.error('Error fetching additional incomes:', error)
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
        const { date, description, amount, type } = body

        const organization = await prisma.organization.findFirst({
            where: { users: { some: { id: String(auth.user.id) } } }
        }) || await prisma.organization.findFirst()

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const income = await prisma.additionalIncome.create({
            data: {
                organizationId: organization.id,
                date: new Date(date),
                description,
                amount: parseFloat(amount),
                type: type || 'INCOME'
            }
        })

        return NextResponse.json(income)
    } catch (error) {
        console.error('Error creating additional income:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
