import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { loadInvoicesFromDisk, saveInvoicesToDisk } from '@/lib/server-storage'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Load from disk
    let allInvoices = loadInvoicesFromDisk()

    // Filter
    let filtered = allInvoices.filter((inv: any) => {
      // Search
      if (search) {
        const term = search.toLowerCase()
        const matchesNumber = (inv.number || inv.invoiceNumber || '').toLowerCase().includes(term)
        const matchesCustomer = (inv.customer?.name || '').toLowerCase().includes(term) || (inv.customer?.email || '').toLowerCase().includes(term)
        const matchesOrder = (inv.orderNumber || '').toLowerCase().includes(term)
        if (!matchesNumber && !matchesCustomer && !matchesOrder) return false
      }

      // Date
      const invDate = new Date(inv.date || inv.issueDate)
      if (from && invDate < new Date(from)) return false
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        if (invDate > toDate) return false
      }

      return true
    })

    // Sort (Newest first)
    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.issueDate).getTime()
      const dateB = new Date(b.date || b.issueDate).getTime()
      return dateB - dateA
    })

    // Pagination
    const totalCount = filtered.length
    const paginated = filtered.slice((page - 1) * limit, page * limit)

    // Map to Frontend
    const mapped = paginated.map((inv: any) => ({
      id: inv.id,
      number: inv.number || inv.invoiceNumber,
      date: inv.date || inv.issueDate,
      dueDate: inv.dueDate,
      subtotal: Number(inv.subtotal || inv.totalNet || 0),
      taxRate: Number(inv.taxRate || 19),
      taxAmount: Number(inv.taxAmount || inv.totalTax || 0),
      total: Number(inv.subtotalGross || inv.totalGross || inv.total || 0),
      status: inv.status || 'Offen',
      paymentMethod: inv.paymentMethod || '-',
      customer: inv.customer,
      items: [], // List view doesn't need items
      emailStatus: inv.emailStatus || { sent: false },
      orderNumber: inv.orderNumber,
      document_kind: inv.documentKind || inv.document_kind
    }))

    // Stats
    let totalVat19 = 0
    let totalVat7 = 0
    let totalPaidAmount = 0

    filtered.forEach((inv: any) => {
      if (inv.status === 'Bezahlt' || inv.status === 'PAID') {
        const amount = Number(inv.subtotalGross || inv.totalGross || inv.total || 0)
        totalPaidAmount += amount
        // Simplified VAT calc for stats
        const tax = Number(inv.taxAmount || inv.totalTax || 0)
        totalVat19 += tax // Assume 19 for now or check taxRate
      }
    })

    return NextResponse.json({
      invoices: mapped,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        page,
        limit
      },
      stats: {
        totalVat19,
        totalVat7,
        totalPaidAmount
      }
    })

  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) return authResult.error

    const body = await request.json()

    // Basic calculation if needed, but assuming frontend sends correct data
    const newInvoice = {
      id: crypto.randomUUID(),
      ...body,
      // Map to JSON schema fields
      number: body.invoiceNumber,
      date: body.date,
      issueDate: body.date, // Store both for compatibility
      invoiceNumber: body.invoiceNumber,

      totalNet: Number(body.totalNet || 0),
      totalGross: Number(body.totalGross || 0),
      totalTax: Number(body.totalTax || 0),

      subtotal: Number(body.totalNet || 0), // JSON schema compatibility
      subtotalGross: Number(body.totalGross || 0),
      taxAmount: Number(body.totalTax || 0),

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const invoices = loadInvoicesFromDisk()
    invoices.push(newInvoice)
    saveInvoicesToDisk(invoices)

    return NextResponse.json(newInvoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
