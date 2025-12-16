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

    // Get all invoices with their details
    const allInvoices = await prisma.invoice.findMany({
      include: { customer: true }
    })

    // Calculate statistics
    const totalInvoices = allInvoices.length
    const customerCount = await prisma.customer.count()

    // Calculate revenue (sum of all invoice totals)
    const totalRevenue = allInvoices.reduce((sum, inv) => sum + Number(inv.totalGross || 0), 0)

    // Filter by status - using Prisma enum values (English)
    const paidInvoices = allInvoices.filter(inv => inv.status === 'PAID')
    const openInvoices = allInvoices.filter(inv => inv.status === 'SENT')
    const overdueInvoices = allInvoices.filter(inv => inv.status === 'OVERDUE')
    const cancelledInvoices = allInvoices.filter(inv => inv.status === 'CANCELLED')
    // Note: REFUND is not in the enum, but we'll keep it for backwards compatibility
    const refundInvoices = allInvoices.filter(inv => inv.documentKind === 'CREDIT_NOTE' || inv.documentKind === 'REFUND_FULL' || inv.documentKind === 'REFUND_PARTIAL')

    // Calculate amounts for each status
    const paidInvoicesAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalGross || 0), 0)
    const openInvoicesAmount = openInvoices.reduce((sum, inv) => sum + Number(inv.totalGross || 0), 0)
    const overdueInvoicesAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.totalGross || 0), 0)
    const refundInvoicesAmount = refundInvoices.reduce((sum, inv) => sum + Number(inv.totalGross || 0), 0)
    const cancelledInvoicesAmount = cancelledInvoices.reduce((sum, inv) => sum + Number(inv.totalGross || 0), 0)

    // Get recent invoices
    const recentInvoices = allInvoices
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 5)
      .map(inv => ({
        id: inv.id,
        number: inv.invoiceNumber,
        customer: inv.customer.name,
        amount: Number(inv.totalGross),
        status: inv.status,
        date: inv.issueDate.toISOString()
      }))

    const stats = {
      totalRevenue,
      totalInvoices,
      totalCustomers: customerCount,
      paidInvoicesCount: paidInvoices.length,
      paidInvoicesAmount,
      openInvoicesCount: openInvoices.length,
      openInvoicesAmount,
      overdueInvoicesCount: overdueInvoices.length,
      overdueInvoicesAmount,
      refundInvoicesCount: refundInvoices.length,
      refundInvoicesAmount,
      cancelledInvoicesCount: cancelledInvoices.length,
      cancelledInvoicesAmount,
      recentInvoices
    }

    console.log('📊 Dashboard Stats:', stats)

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Error',
        data: {
          totalRevenue: 0,
          totalInvoices: 0,
          totalCustomers: 0,
          paidInvoicesCount: 0,
          paidInvoicesAmount: 0,
          openInvoicesCount: 0,
          openInvoicesAmount: 0,
          overdueInvoicesCount: 0,
          overdueInvoicesAmount: 0,
          refundInvoicesCount: 0,
          refundInvoicesAmount: 0,
          cancelledInvoicesCount: 0,
          cancelledInvoicesAmount: 0,
          recentInvoices: []
        }
      },
      { status: 500 }
    )
  }
}
