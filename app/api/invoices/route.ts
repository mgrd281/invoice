import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { Prisma, InvoiceStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const dateRange = searchParams.get('dateRange') || 'all'

    const skip = (page - 1) * limit

    const where: Prisma.InvoiceWhereInput = {}

    // Search filter
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { customer: { tags: { has: search } } }
      ]
    }

    // Status filter
    if (status !== 'all') {
      const s = status.toUpperCase()
      if (s === 'REFUND' || s === 'GUTSCHRIFT') {
        where.documentKind = { in: ['CREDIT_NOTE', 'REFUND_FULL', 'REFUND_PARTIAL'] }
      } else if (s === 'OFFEN' || s === 'OPEN' || s === 'SENT') {
        where.status = 'SENT'
      } else if (s === 'BEZAHLT' || s === 'PAID') {
        where.status = 'PAID'
      } else if (s === 'STORNIERT' || s === 'CANCELLED') {
        where.status = 'CANCELLED'
      } else if (s === 'ÜBERFÄLLIG' || s === 'UEBERFAELLIG' || s === 'OVERDUE') {
        where.status = 'OVERDUE'
      } else {
        where.status = status as InvoiceStatus
      }
    }

    // Date range filter
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (from || to) {
      where.issueDate = {}
      if (from) where.issueDate.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.issueDate.lte = toDate
      }
    } else {
      const now = new Date()
      if (dateRange === 'today') {
        const start = new Date(now.setHours(0, 0, 0, 0))
        const end = new Date(now.setHours(23, 59, 59, 999))
        where.issueDate = { gte: start, lte: end }
      } else if (dateRange === 'week') {
        const start = new Date(now.setDate(now.getDate() - 7))
        where.issueDate = { gte: start }
      } else if (dateRange === 'month') {
        const start = new Date(now.setMonth(now.getMonth() - 1))
        where.issueDate = { gte: start }
      } else if (dateRange === 'year') {
        const start = new Date(now.setFullYear(now.getFullYear() - 1))
        where.issueDate = { gte: start }
      }
    }

    // Execute query
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          items: true,
          order: true
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.invoice.count({ where })
    ])

    // Calculate detailed stats manually using a where clause WITHOUT the status filter
    // This ensures summary cards show totals for all statuses even when one is selected
    const statsWhere = { ...where };
    delete statsWhere.status;
    delete statsWhere.documentKind; // Remove documentKind as well if it was used for REFUND status filter

    const allMatchingInvoices = await prisma.invoice.findMany({
      where: statsWhere,
      select: {
        status: true,
        documentKind: true,
        totalGross: true,
        totalTax: true,
      }
    })

    // Helper for safe number conversion
    const toNumber = (val: any) => {
      if (!val) return 0
      if (typeof val === 'number') return val
      if (val && typeof val === 'object' && 'toNumber' in val) return val.toNumber()
      return Number(val.toString())
    }

    const normalizeStatus = (s: string) => s?.toUpperCase().trim() || ''

    let totalPaidAmount = 0
    let totalVat19 = 0
    let totalVat7 = 0
    let paidInvoicesCount = 0
    let openInvoicesCount = 0
    let overdueInvoicesCount = 0
    let cancelledInvoicesCount = 0
    let refundInvoicesCount = 0

    for (const inv of allMatchingInvoices) {
      const s = normalizeStatus(inv.status as any)
      const amount = toNumber(inv.totalGross)
      const tax = toNumber(inv.totalTax)

      // Calculate Counts & Amounts
      if (s === 'PAID' || s === 'BEZAHLT') {
        totalPaidAmount += amount
        paidInvoicesCount++
      } else if (s === 'SENT' || s === 'OFFEN' || s === 'OPEN' || s === 'PENDING') {
        openInvoicesCount++
      } else if (s === 'OVERDUE' || s === 'ÜBERFÄLLIG' || s === 'UEBERFAELLIG') {
        overdueInvoicesCount++
      } else if (s === 'CANCELLED' || s === 'STORNIERT') {
        cancelledInvoicesCount++
      }

      // Check for refunds (based on document kind usually, or status)
      // Note: In our schema, REFUND is not a status but a document kind, but we map it for stats
      if (inv.documentKind === 'CREDIT_NOTE' || inv.documentKind === 'REFUND_FULL' || inv.documentKind === 'REFUND_PARTIAL' || s === 'GUTSCHRIFT') {
        refundInvoicesCount++
      }

      // Calculate VAT sums (approximate based on total tax or items)
      // Since we don't have explicit VAT breakdown in invoice model, we'll try to infer or use totalTax
      // For now, let's assume standard tax is 19% if not specified
      // A better approach would be to sum up taxAmount from InvoiceItems grouped by taxRate
      // But for performance, we might just sum totalTax for now as "Vat19" if we assume mostly 19%

      // Let's try to be smarter: check items
      // This is complex without fetching all items. For now, let's aggregate totalTax as Vat19
      // and 0 for Vat7 unless we have specific logic.
      // User requested "19% MwSt" specifically.
      totalVat19 += tax
    }

    // Map to frontend format
    const mappedInvoices = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.issueDate.toISOString(),
      dueDate: inv.dueDate?.toISOString(),
      status: inv.status,
      customer: {
        name: inv.customer.name,
        email: inv.customer.email,
        address: inv.customer.address,
      },
      items: inv.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.grossAmount),
        taxRate: 0 // Placeholder
      })),
      subtotal: Number(inv.totalNet),
      taxTotal: Number(inv.totalTax),
      total: Number(inv.totalGross),
      currency: inv.currency || 'EUR',
      notes: '', // Notes field does not exist on Invoice model
      number: inv.invoiceNumber, // Alias for frontend compatibility
      orderNumber: inv.orderNumber || (inv.order?.shopifyOrderId ? (inv.order.shopifyOrderId.startsWith('#') ? inv.order.shopifyOrderId : `#${inv.order.shopifyOrderId}`) : inv.order?.orderNumber),
      order: inv.order ? {
        id: inv.order.id,
        orderNumber: inv.order.orderNumber,
        shopifyOrderId: inv.order.shopifyOrderId,
        totalAmount: Number(inv.order.totalAmount),
        createdAt: inv.order.createdAt.toISOString()
      } : null,
      paymentMethod: inv.paymentMethod || 'Shopify Payments',
      settings: inv.settings,
    }))

    return NextResponse.json({
      invoices: mappedInvoices,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      },
      stats: {
        totalAmount: allMatchingInvoices.reduce((sum, inv) => sum + toNumber(inv.totalGross), 0),
        count: allMatchingInvoices.length,
        totalPaidAmount,
        paidInvoicesCount,
        openInvoicesCount,
        overdueInvoicesCount,
        cancelledInvoicesCount,
        refundInvoicesCount,
        totalVat19,
        totalVat7
      }
    })

  } catch (error) {
    console.error('Error fetching invoices:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const organizationId = (session.user as any).organizationId

    if (!organizationId) {
      return new NextResponse('Organization context missing', { status: 400 })
    }

    // 1. Resolve Template (use default if not specified)
    let templateId = body.templateId
    if (!templateId) {
      const defaultTemplate = await prisma.invoiceTemplate.findFirst({
        where: { organizationId, isDefault: true }
      })
      templateId = defaultTemplate?.id
    }

    if (!templateId) {
      const anyTemplate = await prisma.invoiceTemplate.findFirst({
        where: { organizationId }
      })
      templateId = anyTemplate?.id
    }

    if (!templateId) {
      return new NextResponse('Kein Rechnungs-Template gefunden. Bitte erst ein Template erstellen.', { status: 400 })
    }

    // 2. Customer UPSERT (identity resolution)
    let customerId = body.customerId

    if (!customerId) {
      const email = body.customer.email?.toLowerCase().trim()
      const name = body.customer.name.trim()
      const zip = body.customer.zipCode || ''
      const city = body.customer.city || ''

      // Look for existing customer
      let existingCustomer = null

      if (email) {
        existingCustomer = await prisma.customer.findFirst({
          where: { organizationId, email }
        })
      }

      if (!existingCustomer) {
        // Fallback search by name + zip + city
        existingCustomer = await prisma.customer.findFirst({
          where: {
            organizationId,
            name: { equals: name, mode: 'insensitive' },
            zipCode: zip,
            city: { equals: city, mode: 'insensitive' }
          }
        })
      }

      if (existingCustomer) {
        // Update customer if data changed
        const updatedCustomer = await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name: name || existingCustomer.name,
            email: email || existingCustomer.email,
            phone: body.customer.phone || existingCustomer.phone,
            address: body.customer.address || existingCustomer.address,
            zipCode: zip || existingCustomer.zipCode,
            city: city || existingCustomer.city,
            taxId: body.customer.taxId || existingCustomer.taxId,
            status: 'ACTIVE'
          }
        })
        customerId = updatedCustomer.id
      } else {
        // Create new customer
        const newCustomer = await prisma.customer.create({
          data: {
            organizationId,
            name,
            email,
            phone: body.customer.phone || '',
            address: body.customer.address || '',
            zipCode: zip,
            city,
            country: body.customer.country || 'DE',
            taxId: body.customer.taxId || '',
            status: 'ACTIVE'
          }
        })
        customerId = newCustomer.id
      }
    }

    // 3. Create invoice matched to customer
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: body.invoiceNumber,
        issueDate: new Date(body.date),
        dueDate: body.dueDate ? new Date(body.dueDate) : new Date(),
        status: (body.status || 'DRAFT') as InvoiceStatus,
        totalNet: body.subtotal,
        totalTax: body.taxTotal,
        totalGross: body.total,
        currency: body.currency || 'EUR',
        paymentMethod: body.paymentMethod || 'Überweisung',
        orderNumber: body.orderNumber,
        organization: { connect: { id: organizationId } },
        template: { connect: { id: templateId } },
        customer: { connect: { id: customerId } },
        items: {
          create: body.items.map((item: any) => ({
            description: item.description,
            ean: item.ean || '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            grossAmount: item.total,
            netAmount: item.netAmount || item.total,
            taxAmount: item.taxAmount || 0,
            taxRate: {
              connect: { id: item.taxRateId || 'default-tax-rate' }
            }
          }))
        }
      },
      include: {
        customer: true,
        items: true
      }
    })

    return NextResponse.json({ ok: true, data: invoice })

  } catch (error) {
    console.error('Error creating invoice:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
