import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const [
      totalRevenue,
      invoiceCount,
      customerCount,
      recentInvoices
    ] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { totalGross: true }
      }),
      prisma.invoice.count(),
      prisma.customer.count(),
      prisma.invoice.findMany({
        take: 5,
        orderBy: { issueDate: 'desc' },
        include: { customer: true }
      })
    ])

    return NextResponse.json({
      totalRevenue: Number(totalRevenue._sum.totalGross || 0),
      invoiceCount,
      customerCount,
      recentInvoices: recentInvoices.map(inv => ({
        id: inv.id,
        number: inv.invoiceNumber,
        customer: inv.customer.name,
        amount: Number(inv.totalGross),
        status: inv.status,
        date: inv.issueDate.toISOString()
      }))
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
