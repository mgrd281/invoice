import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/lib/auth-middleware'
import { AccountingInvoice, InvoiceStatus } from '@/lib/accounting-types'

// Global storage for invoices (in production, use database)
declare global {
  var invoices: any[] | undefined
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const statusFilter = searchParams.get('status')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')

    // Get invoices from global storage
    let invoices = global.invoices || []

    // Convert to accounting format
    const accountingInvoices: AccountingInvoice[] = invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.number || invoice.invoiceNumber,
      customerName: invoice.customerName || invoice.customer?.name || 'Unbekannter Kunde',
      customerTaxId: invoice.customer?.taxId,
      date: invoice.date,
      dueDate: invoice.dueDate,
      status: mapInvoiceStatus(invoice.status),
      subtotal: invoice.subtotal || 0,
      taxRate: invoice.taxRate || 19,
      taxAmount: invoice.taxAmount || 0,
      totalAmount: invoice.total || invoice.totalAmount || 0,
      paidDate: invoice.paidDate,
      category: 'service', // Default category
      description: invoice.items?.[0]?.description || 'Dienstleistung',
      accountingAccount: '8400', // Default revenue account
      costCenter: '',
      bookingText: `Rechnung ${invoice.number || invoice.invoiceNumber}`
    }))

    // Apply filters
    let filteredInvoices = accountingInvoices

    // Date filter
    if (startDate) {
      filteredInvoices = filteredInvoices.filter(inv => inv.date >= startDate)
    }
    if (endDate) {
      filteredInvoices = filteredInvoices.filter(inv => inv.date <= endDate)
    }

    // Status filter
    if (statusFilter && statusFilter !== '') {
      const statusArray = statusFilter.split(',') as InvoiceStatus[]
      filteredInvoices = filteredInvoices.filter(inv => statusArray.includes(inv.status))
    }

    // Amount filter
    if (minAmount) {
      filteredInvoices = filteredInvoices.filter(inv => inv.totalAmount >= parseFloat(minAmount))
    }
    if (maxAmount) {
      filteredInvoices = filteredInvoices.filter(inv => inv.totalAmount <= parseFloat(maxAmount))
    }

    // Sort by date (newest first)
    filteredInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      invoices: filteredInvoices,
      total: filteredInvoices.length
    })

  } catch (error) {
    console.error('Error fetching accounting invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounting invoices' },
      { status: 500 }
    )
  }
}

function mapInvoiceStatus(status: string): InvoiceStatus {
  const statusMap: { [key: string]: InvoiceStatus } = {
    'Bezahlt': 'bezahlt',
    'Offen': 'offen',
    'Erstattet': 'erstattet',
    'Storniert': 'storniert',
    'Überfällig': 'überfällig'
  }

  return statusMap[status] || 'offen'
}
