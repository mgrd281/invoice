import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface DashboardStats {
  totalInvoices: number
  totalCustomers: number
  totalRevenue: number
  paidInvoicesCount: number
  paidInvoicesAmount: number
  openInvoicesCount: number
  openInvoicesAmount: number
  overdueInvoicesCount: number
  overdueInvoicesAmount: number
  refundInvoicesCount: number
  refundInvoicesAmount: number
  cancelledInvoicesCount: number
  cancelledInvoicesAmount: number
}

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching dashboard statistics from Prisma...')

    // Authenticate user
    const auth = requireAuth(request)
    if ('error' in auth) {
      return auth.error
    }
    const { user } = auth
    const isAdmin = shouldShowAllData(user)

    console.log(`👤 Current user: ${user.email} (Admin: ${isAdmin})`)

    // Build query filters
    const invoiceWhere: Prisma.InvoiceWhereInput = {}
    const customerWhere: Prisma.CustomerWhereInput = {}

    if (!isAdmin) {
      // If not admin, filter by organization
      // Assuming user has organizationId. If not, we might need to look it up.
      // For now, let's assume we filter by organizationId if available on the user object
      // or if we can derive it.

      // Ideally, we should filter by organizationId. 
      // Let's check if the user object from requireAuth has organizationId.
      // If not, we might need to fetch the user from DB to get organizationId.

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organizationId: true }
      })

      if (dbUser?.organizationId) {
        invoiceWhere.organizationId = dbUser.organizationId
        customerWhere.organizationId = dbUser.organizationId
      } else {
        // Fallback: if no org, maybe filter by createdBy or similar?
        // But the schema links invoices to Organization.
        // If user has no org, they probably shouldn't see anything or just their own if there was a userId field.
        // The schema has organizationId on Invoice.
        console.warn('User has no organizationId, returning empty stats')
        return NextResponse.json({
          success: true,
          data: {
            totalInvoices: 0,
            totalCustomers: 0,
            totalRevenue: 0,
            paidInvoicesCount: 0,
            paidInvoicesAmount: 0,
            openInvoicesCount: 0,
            openInvoicesAmount: 0,
            overdueInvoicesCount: 0,
            overdueInvoicesAmount: 0,
            refundInvoicesCount: 0,
            refundInvoicesAmount: 0,
            cancelledInvoicesCount: 0,
            cancelledInvoicesAmount: 0
          }
        })
      }
    }

    // Fetch data in parallel
    const [invoices, customerCount] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          id: true,
          invoiceNumber: true,
          totalGross: true,
          status: true,
          // We might need refundAmount if we track refunds separately
          refundAmount: true,
          documentKind: true
        }
      }),
      prisma.customer.count({
        where: customerWhere
      })
    ])

    console.log(`📊 Fetched ${invoices.length} invoices and ${customerCount} customers`)

    // Calculate statistics
    const totalInvoices = invoices.length
    const totalCustomers = customerCount

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
      const amount = Number(invoice.totalGross) || 0
      const status = invoice.status
      const kind = (invoice as any).documentKind // Cast because it might be missing in types if not updated

      // Check for Refund/Cancellation documents first if documentKind is available
      if (kind === 'REFUND_FULL' || kind === 'REFUND_PARTIAL' || kind === 'CREDIT_NOTE') {
        refundInvoicesCount++
        // Track refund volume as positive number for the "Refunded" card
        refundInvoicesAmount += Math.abs(Number((invoice as any).refundAmount) || amount)

        // Do NOT continue here. Let it fall through to switch(status).
        // Since refunds have negative amounts in DB, adding them to 'PAID' 
        // will correctly subtract from the total revenue.
      }

      // Status-based aggregation
      switch (status) {
        case 'PAID':
          paidInvoicesCount++
          paidInvoicesAmount += amount
          totalRevenue += amount
          break
        case 'SENT': // Offen
          openInvoicesCount++
          openInvoicesAmount += amount
          totalRevenue += amount
          break
        case 'OVERDUE': // Mahnung/Überfällig
          overdueInvoicesCount++
          overdueInvoicesAmount += amount
          totalRevenue += amount
          // Overdue is technically still open revenue-wise, but usually tracked separately
          // If you want to count overdue as open for "total outstanding", add it here.
          // For now, keeping them separate as per dashboard design.
          break
        case 'CANCELLED': // Storniert
          cancelledInvoicesCount++
          cancelledInvoicesAmount += amount
          break
        case 'DRAFT':
          // Drafts usually don't count towards stats
          break
        default:
          // Treat unknown as open? Or ignore?
          // Let's treat as open if it has an amount
          if (amount > 0) {
            openInvoicesCount++
            openInvoicesAmount += amount
            totalRevenue += amount
          }
          break
      }
    }

    const stats: DashboardStats = {
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

    console.log('📈 Dashboard statistics calculated:', stats)

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error fetching dashboard statistics:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard statistics',
        message: 'Ein Fehler ist beim Laden der Statistiken aufgetreten'
      },
      { status: 500 }
    )
  }
}
