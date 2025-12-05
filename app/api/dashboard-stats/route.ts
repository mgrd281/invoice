import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import fs from 'fs'
import path from 'path'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'

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

// Access global storage for all data
declare global {
  var csvInvoices: any[] | undefined
  var csvCustomers: any[] | undefined
  var allInvoices: any[] | undefined
  var allCustomers: any[] | undefined
}

// Initialize global storage
if (!global.csvInvoices) {
  global.csvInvoices = []
}
if (!global.csvCustomers) {
  global.csvCustomers = []
}
if (!global.allInvoices) {
  global.allInvoices = []
}
if (!global.allCustomers) {
  global.allCustomers = []
}

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching dashboard statistics...')

    // Authenticate user
    const auth = requireAuth(request)
    if ('error' in auth) {
      return auth.error
    }
    const { user } = auth
    const isAdmin = shouldShowAllData(user)

    // Collect real data only - no sample data mixing
    let allInvoices = [
      ...(global.csvInvoices || []),
      ...(global.allInvoices || [])
    ]

    let allCustomers = [
      ...(global.csvCustomers || []),
      ...(global.allCustomers || [])
    ]

    console.log(`📊 Raw data counts: ${allInvoices.length} invoices, ${allCustomers.length} customers`)
    console.log(`👤 Current user: ${user.email} (Admin: ${isAdmin})`)

    // Filter out soft-deleted invoices
    let activeInvoices = allInvoices.filter((invoice: any) => !invoice.deleted_at)

    // Helper: determine ownership - more comprehensive check
    const belongsToUser = (entity: any) => {
      const uid = user.id
      const email = user.email

      // Check various ownership fields
      const hasUserId = entity?.userId === uid
      const hasOwnerId = entity?.ownerId === uid
      const hasCreatedBy = entity?.createdBy?.id === uid
      const hasCustomerUserId = entity?.customer?.userId === uid || entity?.customerUserId === uid
      const hasUserEmail = entity?.userEmail === email || entity?.customer?.userEmail === email

      return hasUserId || hasOwnerId || hasCreatedBy || hasCustomerUserId || hasUserEmail
    }

    console.log(`🔍 Sample invoice ownership check:`)
    if (activeInvoices.length > 0) {
      const sample = activeInvoices[0]
      console.log(`   Invoice ${sample.id || sample.number}:`, {
        userId: sample.userId,
        ownerId: sample.ownerId,
        userEmail: sample.userEmail,
        customerUserId: sample.customer?.userId || sample.customerUserId,
        belongsToCurrentUser: belongsToUser(sample)
      })
    }

    // Restrict to user's own data unless admin
    if (!isAdmin) {
      const beforeFilter = activeInvoices.length
      activeInvoices = activeInvoices.filter(belongsToUser)
      console.log(`🔒 User filtering: ${beforeFilter} → ${activeInvoices.length} invoices`)

      const beforeCustomerFilter = allCustomers.length
      allCustomers = allCustomers.filter((c: any) => belongsToUser(c))
      console.log(`🔒 User filtering: ${beforeCustomerFilter} → ${allCustomers.length} customers`)
    } else {
      console.log(`👑 Admin access: showing all ${activeInvoices.length} invoices and ${allCustomers.length} customers`)
    }

    // Calculate statistics
    const totalInvoices = activeInvoices.length
    const totalCustomers = allCustomers.length

    // Calculate total revenue from paid invoices only
    const paidInvoices = activeInvoices.filter((invoice: any) => {
      const status = invoice.status?.toLowerCase() || ''
      return status === 'bezahlt' || status === 'paid'
    })

    console.log('Paid invoices found:', paidInvoices.length)
    console.log('Sample paid invoice:', paidInvoices[0])

    // Helper function to extract amount from invoice
    const extractAmount = (invoice: any): number => {
      let amount = 0

      // Try to extract numeric value from different amount formats
      if (typeof invoice.total === 'number') {
        amount = invoice.total
      } else if (typeof invoice.amount === 'string') {
        // Extract number from strings like "€119.00" or "119.00"
        const numericMatch = invoice.amount.match(/[\d,]+\.?\d*/g)
        if (numericMatch) {
          amount = parseFloat(numericMatch[0].replace(',', ''))
        }
      } else if (typeof invoice.amount === 'number') {
        amount = invoice.amount
      }

      return amount
    }

    const totalRevenue = paidInvoices.reduce((sum: number, invoice: any) => {
      const amount = extractAmount(invoice)
      console.log(`Invoice ${invoice.number || invoice.id}: ${amount}`)
      return sum + amount
    }, 0)

    // Calculate invoice counts and amounts by status
    const refundInvoices = activeInvoices.filter((invoice: any) => {
      const status = invoice.status?.toLowerCase() || ''
      return status === 'erstattet' || status === 'erstattung' || status === 'refund'
    })
    const refundInvoicesAmount = refundInvoices.reduce((sum: number, invoice: any) => sum + extractAmount(invoice), 0)

    const openInvoices = activeInvoices.filter((invoice: any) => {
      const status = invoice.status?.toLowerCase() || ''
      return status === 'offen' || status === 'open'
    })
    const openInvoicesAmount = openInvoices.reduce((sum: number, invoice: any) => sum + extractAmount(invoice), 0)

    const cancelledInvoices = activeInvoices.filter((invoice: any) => {
      const status = invoice.status?.toLowerCase() || ''
      return status === 'storniert' || status === 'cancelled' || status === 'canceled'
    })
    const cancelledInvoicesAmount = cancelledInvoices.reduce((sum: number, invoice: any) => sum + extractAmount(invoice), 0)

    const overdueInvoices = activeInvoices.filter((invoice: any) => {
      const status = invoice.status?.toLowerCase() || ''
      return status === 'überfällig' || status === 'overdue' || status === 'mahnung'
    })
    const overdueInvoicesAmount = overdueInvoices.reduce((sum: number, invoice: any) => sum + extractAmount(invoice), 0)

    const paidInvoicesAmount = totalRevenue

    const stats: DashboardStats = {
      totalInvoices,
      totalCustomers,
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
      paidInvoicesCount: paidInvoices.length,
      paidInvoicesAmount: Math.round(paidInvoicesAmount * 100) / 100,
      openInvoicesCount: openInvoices.length,
      openInvoicesAmount: Math.round(openInvoicesAmount * 100) / 100,
      overdueInvoicesCount: overdueInvoices.length,
      overdueInvoicesAmount: Math.round(overdueInvoicesAmount * 100) / 100,
      refundInvoicesCount: refundInvoices.length,
      refundInvoicesAmount: Math.round(refundInvoicesAmount * 100) / 100,
      cancelledInvoicesCount: cancelledInvoices.length,
      cancelledInvoicesAmount: Math.round(cancelledInvoicesAmount * 100) / 100
    }

    console.log('📈 Dashboard statistics calculated:', stats)
    console.log('📊 Final counts:', {
      activeInvoices: activeInvoices.length,
      paidInvoices: paidInvoices.length,
      openInvoices: openInvoices.length,
      overdueInvoices: overdueInvoices.length,
      totalCustomers: allCustomers.length
    })
    console.log('💰 Revenue breakdown:', {
      totalRevenue: stats.totalRevenue,
      paidAmount: stats.paidInvoicesAmount,
      openAmount: stats.openInvoicesAmount
    })

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
