import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        // 1. Find the target organization (prefer 'default-org' or the first one found)
        let targetOrg = await prisma.organization.findUnique({
            where: { id: 'default-org' }
        })

        if (!targetOrg) {
            targetOrg = await prisma.organization.findFirst()
        }

        if (!targetOrg) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 })
        }

        const targetOrgId = targetOrg.id

        // 2. Update all records to point to this organization
        const updateInvoices = await prisma.invoice.updateMany({
            where: { organizationId: { not: targetOrgId } },
            data: { organizationId: targetOrgId }
        })

        const updateExpenses = await prisma.expense.updateMany({
            where: { organizationId: { not: targetOrgId } },
            data: { organizationId: targetOrgId }
        })

        const updateIncome = await prisma.additionalIncome.updateMany({
            where: { organizationId: { not: targetOrgId } },
            data: { organizationId: targetOrgId }
        })

        const updateCustomers = await prisma.customer.updateMany({
            where: { organizationId: { not: targetOrgId } },
            data: { organizationId: targetOrgId }
        })

        const updateReceipts = await prisma.receipt.updateMany({
            where: { organizationId: { not: targetOrgId } },
            data: { organizationId: targetOrgId }
        })

        return NextResponse.json({
            success: true,
            targetOrgId,
            updated: {
                invoices: updateInvoices.count,
                expenses: updateExpenses.count,
                income: updateIncome.count,
                customers: updateCustomers.count,
                receipts: updateReceipts.count
            }
        })

    } catch (error) {
        console.error('Error fixing organization IDs:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
