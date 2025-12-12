import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request)
        if ('error' in authResult) {
            return authResult.error
        }
        const { user } = authResult

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const organization = await prisma.organization.findFirst({
            where: { users: { some: { id: user.id } } }
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
        const authResult = requireAuth(request)
        if ('error' in authResult) {
            return authResult.error
        }
        const { user } = authResult

        const body = await request.json()
        const { filename, url, date, description, category, mimeType, size, amount } = body

        const organization = await prisma.organization.findFirst({
            where: { users: { some: { id: user.id } } }
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
                amount: amount ? parseFloat(amount) : null,
                mimeType,
                size
            }
        })

        // If amount is provided, create corresponding accounting entry
        if (amount) {
            const amountValue = parseFloat(amount)

            if (category === 'EXPENSE') {
                await prisma.expense.create({
                    data: {
                        organizationId: organization.id,
                        expenseNumber: `EXP-${Date.now()}`, // Simple generation
                        date: new Date(date),
                        category: 'other',
                        description: description || filename,
                        supplier: 'Beleg-Upload',
                        netAmount: amountValue, // Simplified: assuming 0% tax for quick upload
                        taxRate: 0,
                        taxAmount: 0,
                        totalAmount: amountValue,
                        receiptUrl: url,
                        receiptFileName: filename
                    }
                })
            } else if (category === 'INCOME') {
                await prisma.additionalIncome.create({
                    data: {
                        organizationId: organization.id,
                        date: new Date(date),
                        description: description || filename,
                        amount: amountValue,
                        type: 'INCOME'
                    }
                })
            }
        }

        return NextResponse.json(receipt)
    } catch (error) {
        console.error('Error creating receipt:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
