import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { ensureOrganization } from '@/lib/db-operations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request)
        if ('error' in authResult) {
            return authResult.error
        }
        const { user } = authResult

        let org = await prisma.organization.findFirst({
            where: { id: 'default-org' }
        })
        if (!org) {
            org = await ensureOrganization()
        }

        const whereClause: any = {}
        if (!shouldShowAllData(user)) {
            whereClause.organizationId = org.id
        }

        // 1. Monthly Income (Last 12 Months)
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        oneYearAgo.setDate(1) // Start of the month
        oneYearAgo.setHours(0, 0, 0, 0)

        const invoicesLastYear = await prisma.invoice.findMany({
            where: {
                ...whereClause,
                issueDate: {
                    gte: oneYearAgo
                },
                status: {
                    not: 'CANCELLED' // Exclude cancelled
                }
            },
            select: {
                issueDate: true,
                totalGross: true,
                status: true
            }
        })

        // Process for chart
        const monthlyDataMap = new Map<string, number>()
        const months: string[] = []

        // Initialize last 12 months
        for (let i = 0; i < 12; i++) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            monthlyDataMap.set(key, 0)
            months.unshift(key) // Order chronological
        }

        invoicesLastYear.forEach(inv => {
            const d = new Date(inv.issueDate)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (monthlyDataMap.has(key)) {
                monthlyDataMap.set(key, (monthlyDataMap.get(key) || 0) + Number(inv.totalGross))
            }
        })

        const monthlyIncome = months.map(key => ({
            name: key, // Or format as "Jan 24"
            total: monthlyDataMap.get(key) || 0
        }))

        // 2. Paid Invoices Count
        const paidInvoicesCount = await prisma.invoice.count({
            where: {
                ...whereClause,
                status: 'PAID'
            }
        })

        // 3. Average Invoice Value
        // We can use aggregate
        const aggregations = await prisma.invoice.aggregate({
            where: {
                ...whereClause,
                status: { not: 'CANCELLED' }
            },
            _avg: {
                totalGross: true
            },
            _sum: {
                totalGross: true
            }
        })

        const averageInvoiceValue = aggregations._avg.totalGross || 0
        const totalRevenue = aggregations._sum.totalGross || 0

        // 4. Top Customers
        // Prisma groupBy is good here
        const topCustomersRaw = await prisma.invoice.groupBy({
            by: ['customerId'],
            where: {
                ...whereClause,
                status: { not: 'CANCELLED' }
            },
            _sum: {
                totalGross: true
            },
            orderBy: {
                _sum: {
                    totalGross: 'desc'
                }
            },
            take: 5
        })

        // Fetch customer details
        const customerIds = topCustomersRaw.map(c => c.customerId).filter(id => id !== null) as string[]
        const customers = await prisma.customer.findMany({
            where: {
                id: { in: customerIds }
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        })

        const topCustomers = topCustomersRaw.map(item => {
            const customer = customers.find(c => c.id === item.customerId)
            return {
                id: item.customerId,
                name: customer?.name || 'Unbekannt',
                email: customer?.email || '',
                totalSpent: item._sum.totalGross || 0
            }
        })

        return NextResponse.json({
            monthlyIncome,
            paidInvoicesCount,
            averageInvoiceValue,
            totalRevenue,
            topCustomers
        })

    } catch (error) {
        console.error('Analytics error:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
