import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { ensureOrganization, ensureCustomer, ensureTaxRate, ensureDefaultTemplate } from '@/lib/db-operations'
import { Prisma } from '@prisma/client'

// Mock storage for Email Status (shared with [id]/email-status/route.ts)
declare global {
  var invoiceEmailStatus: Record<string, {
    sent: boolean
    sentAt?: string
    sentTo?: string
    messageId?: string
    lastAttempt?: string
  }> | undefined
}

export const dynamic = 'force-dynamic'

// Helper to map Prisma status to Frontend status
function mapPrismaStatusToFrontend(status: string): string {
  switch (status) {
    case 'PAID': return 'Bezahlt'
    case 'SENT': return 'Offen'
    case 'OVERDUE': return 'Mahnung'
    case 'CANCELLED': return 'Storniert'
    case 'DRAFT': return 'Entwurf'
    default: return 'Offen'
  }
}

// Helper to map Frontend status to Prisma status
function mapFrontendStatusToPrisma(status: string): 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' {
  switch (status) {
    case 'Bezahlt': return 'PAID'
    case 'Offen': return 'SENT'
    case 'Mahnung': return 'OVERDUE'
    case 'Storniert': return 'CANCELLED'
    case 'Erstattet': return 'PAID' // Map refunded to paid for now, or add REFUNDED to enum
    default: return 'SENT'
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    // Ensure organization exists (read-only check first for performance)
    // We use 'default-org' as fallback ID matching ensureOrganization logic
    let org = await prisma.organization.findFirst({
      where: { id: 'default-org' } // In a real app, this might come from session/settings
    })

    if (!org) {
      org = await ensureOrganization()
    }

    // Pagination parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    // Fetch invoices from Prisma
    const whereClause: Prisma.InvoiceWhereInput = {}

    // If not admin, restrict to specific organization
    if (!shouldShowAllData(user)) {
      whereClause.organizationId = org.id
    }

    // Date range filter
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (from || to) {
      whereClause.issueDate = {}
      if (from) {
        whereClause.issueDate.gte = new Date(from)
      }
      if (to) {
        // Set 'to' date to end of day
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        whereClause.issueDate.lte = toDate
      }
    }

    // Add search filter if query is present
    if (search) {
      const searchTerms = search.trim().split(/[\s,]+/) // Split by space or comma

      // Create AND condition for multiple terms (all terms must match something)
      // OR create OR condition if you want any term to match
      // Let's stick to simple "contains" logic for the whole string or split terms

      const termConditions = searchTerms.map(term => ({
        OR: [
          { invoiceNumber: { contains: term, mode: 'insensitive' } },
          { customer: { name: { contains: term, mode: 'insensitive' } } },
          { customer: { email: { contains: term, mode: 'insensitive' } } },
          { order: { orderNumber: { contains: term, mode: 'insensitive' } } }
        ]
      }))

      whereClause.AND = termConditions as any
    }

    // Get total count for pagination
    const totalCount = await prisma.invoice.count({
      where: whereClause
    })

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        // items: true, // Removed for performance - not needed in list view
        order: true
      },
      orderBy: [
        { issueDate: 'desc' },
        { invoiceNumber: 'desc' }
      ],
      skip: skip,
      take: limit
    })

    // Map to frontend format
    const mappedInvoices = invoices.map(inv => {
      let status = mapPrismaStatusToFrontend(inv.status)

      // Override status for Credit Notes and Refunds
      // If it's a credit note/refund but marked as PAID in DB, show as Gutschrift/Erstattet
      if ((inv as any).documentKind === 'CREDIT_NOTE' ||
        (inv as any).documentKind === 'REFUND_FULL' ||
        (inv as any).documentKind === 'REFUND_PARTIAL') {
        status = 'Gutschrift' // Or 'Erstattet' if preferred, but Gutschrift is standard
      }

      return {
        id: inv.id,
        number: inv.invoiceNumber,
        date: inv.issueDate.toISOString().split('T')[0],
        dueDate: inv.dueDate.toISOString().split('T')[0],
        subtotal: Number(inv.totalNet),
        taxRate: 19, // Approximation, ideally fetch from items or store on invoice
        taxAmount: Number(inv.totalTax),
        total: Number(inv.totalGross),
        status: status,
        customer: {
          name: inv.customer.name,
          email: inv.customer.email,
          address: inv.customer.address,
          zipCode: inv.customer.zipCode,
          city: inv.customer.city,
          country: inv.customer.country,
          companyName: '' // Add to schema if needed
        },
        items: [], // Items not fetched for list view performance
        document_kind: (inv as any).documentKind,
        reference_number: (inv as any).referenceNumber,
        original_invoice_date: (inv as any).originalDate?.toISOString().split('T')[0],
        grund: (inv as any).reason,
        refund_amount: (inv as any).refundAmount ? Number((inv as any).refundAmount) : undefined,
        orderNumber: inv.order?.orderNumber,
        vorkasseReminderLevel: inv.order?.vorkasseReminderLevel,
        vorkasseLastReminderAt: inv.order?.vorkasseLastReminderAt,
        emailStatus: global.invoiceEmailStatus?.[inv.id] || { sent: false }
      }
    })

    return NextResponse.json({
      invoices: mappedInvoices,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        page: page,
        limit: limit
      }
    })

  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    const body = await request.json()
    const {
      invoiceNumber,
      date,
      dueDate,
      deliveryDate,
      customer,
      items,
      settings,
      status,
      // Support both camelCase and snake_case
      documentKind, document_kind,
      referenceNumber, reference_number,
      originalInvoiceDate, original_invoice_date,
      reason, grund,
      refundAmount, refund_amount
    } = body

    // Calculate totals if not provided
    // We assume items have total (gross) and we know tax rate from settings or default
    const taxRate = settings?.vatRegulation === 'In Deutschland' ? 19 : 0 // Simplified logic

    let totalGross = 0
    let totalNet = 0
    let totalTax = 0

    const processedItems = items.map((item: any) => {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unitPrice) // Net or Gross? Frontend says Net in table header, but logic was mixed.
      // In the new frontend, we calculate item.total = quantity * unitPrice * (1-discount)
      // And we sum up totals to get Net Total, then add VAT.
      // So item.total is Net.

      const net = Number(item.total)
      const vatPercent = Number(item.vat || taxRate)
      const tax = net * (vatPercent / 100)
      const gross = net + tax

      totalNet += net
      totalTax += tax
      totalGross += gross

      return {
        description: item.description,
        quantity: quantity,
        unitPrice: unitPrice,
        taxRateId: null, // Will be set later
        netAmount: net,
        grossAmount: gross,
        taxAmount: tax,
        ean: item.ean
      }
    })

    // Ensure dependencies exist
    const org = await ensureOrganization()
    const taxRateObj = await ensureTaxRate(org.id, taxRate)
    const templateObj = await ensureDefaultTemplate(org.id)
    const customerObj = await ensureCustomer(org.id, customer)

    // Create Invoice in Prisma
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        customerId: customerObj.id,
        templateId: templateObj.id,
        invoiceNumber: invoiceNumber,
        issueDate: new Date(date),
        dueDate: new Date(dueDate),
        serviceDate: deliveryDate ? new Date(deliveryDate) : undefined,
        totalNet: totalNet,
        totalGross: totalGross,
        totalTax: totalTax,
        status: mapFrontendStatusToPrisma(status || 'Offen'),
        documentKind: documentKind || document_kind || 'INVOICE',
        referenceNumber: referenceNumber || reference_number,
        originalDate: (originalInvoiceDate || original_invoice_date) ? new Date(originalInvoiceDate || original_invoice_date) : null,
        reason: reason || grund,
        refundAmount: (refundAmount || refund_amount) ? Number(refundAmount || refund_amount) : null,

        // New fields
        headerSubject: settings?.headerSubject,
        headerText: settings?.headerText,
        footerText: settings?.footerText,
        settings: settings || Prisma.JsonNull,

        items: {
          create: processedItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRateId: taxRateObj.id,
            netAmount: item.netAmount,
            grossAmount: item.grossAmount,
            taxAmount: item.taxAmount,
            ean: item.ean
          }))
        }
      } as any
    })

    console.log('✅ Invoice created in Prisma:', invoice.id)

    return NextResponse.json(invoice, { status: 201 })

  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
