import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/lib/auth-middleware'
import { loadInvoicesFromDisk, loadCustomersFromDisk } from '@/lib/server-storage'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if ('error' in auth) return auth.error

    const invoices = loadInvoicesFromDisk()
    const customers = loadCustomersFromDisk()

    const totalInvoices = invoices.length
    const totalCustomers = customers.length

    let totalRevenue = 0
    let paidInvoicesCount = 0
    let paidInvoicesAmount = 0
    let openInvoicesCount = 0
    let openInvoicesAmount = 0
    let overdueInvoicesCount = 0
    let overdueInvoicesAmount = 0
    let refundInvoicesCount = 0
    let refundInvoicesAmount = 0
    let cancelledInvoicesCount = 0
    let cancelledInvoicesAmount = 0

    for (const invoice of invoices) {
      const amount = Number(invoice.subtotalGross || invoice.totalGross || invoice.total || 0)
      const status = invoice.status
      const kind = invoice.documentKind || invoice.document_kind

      // Status aggregation
      if (status === 'Bezahlt' || status === 'PAID') {
        paidInvoicesCount++
        paidInvoicesAmount += amount
        totalRevenue += amount
      } else if (status === 'Offen' || status === 'SENT') {
        openInvoicesCount++
        openInvoicesAmount += amount
        totalRevenue += amount
      } else if (status === 'Mahnung' || status === 'OVERDUE') {
        overdueInvoicesCount++
        overdueInvoicesAmount += amount
        totalRevenue += amount
      } else if (status === 'Storniert' || status === 'CANCELLED') {
        cancelledInvoicesCount++
        cancelledInvoicesAmount += amount
      } else if (status === 'Gutschrift' || kind === 'CREDIT_NOTE' || kind === 'REFUND_FULL') {
        refundInvoicesCount++
        refundInvoicesAmount += amount
        // Refunds reduce revenue
        totalRevenue -= amount
      } else {
        // Treat unknown as open if amount > 0?
        // Or just ignore.
        if (amount > 0 && status !== 'DRAFT' && status !== 'Entwurf') {
          openInvoicesCount++
          openInvoicesAmount += amount
          totalRevenue += amount
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalInvoices,
        totalCustomers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        paidInvoicesCount,
        paidInvoicesAmount: Math.round(paidInvoicesAmount * 100) / 100,
        openInvoicesCount,
        openInvoicesAmount: Math.round(openInvoicesAmount * 100) / 100,
        overdueInvoicesCount,
        overdueInvoicesAmount: Math.round(overdueInvoicesAmount * 100) / 100,
        refundInvoicesCount,
        refundInvoicesAmount: Math.round(refundInvoicesAmount * 100) / 100,
        cancelledInvoicesCount,
        cancelledInvoicesAmount: Math.round(cancelledInvoicesAmount * 100) / 100
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard statistics:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
