import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate and get user's organization
        const authResult = requireAuth(request)
        if ('error' in authResult) {
            return authResult.error
        }
        const { user } = authResult

        // Find the organization the user belongs to
        const userOrg = await prisma.organization.findFirst({
            where: { users: { some: { id: user.id } } }
        })

        if (!userOrg) {
            return NextResponse.json({ error: 'User does not belong to any organization' }, { status: 400 })
        }

        const targetOrgId = userOrg.id
        console.log(`Fixing data: Moving all records to organization ${userOrg.name} (${targetOrgId})`)

        // 2. Update all records to point to this organization
        // We update EVERYTHING that is not already in this org
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

        // Also update the 'default-org' settings if it exists to match this org,
        // or ensure this org is the one used for settings

        return NextResponse.json({
            success: true,
            targetOrgId,
            targetOrgName: userOrg.name,
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
