import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { ensureOrganization, ensureCustomer, ensureTaxRate, ensureDefaultTemplate } from '@/lib/db-operations'
import { Prisma } from '@prisma/client'

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

    // Ensure organization exists (idempotent)
    const org = await ensureOrganization()

    // Fetch invoices from Prisma
    const whereClause: Prisma.InvoiceWhereInput = {}

    // If not admin, restrict to specific organization
    if (!shouldShowAllData(user)) {
      whereClause.organizationId = org.id
    }
    // If admin, we show all invoices (empty whereClause for organizationId)

    if (!shouldShowAllData(user)) {
      // Filter by customer email matching user email? 
      // Or we need to link invoices to users directly.
      // The current schema has userId on Invoice? Let's check.
      // Schema has userId on Invoice? No, it has customerId.
      // But User has role.
      // For now, let's return all invoices for the organization if admin, 
      // or maybe filter by something else.
      // The previous code filtered by `invoice.userId === user.id`.
      // But Invoice model in schema doesn't seem to have userId?
      // Let's check schema again.
      // Invoice model: organizationId, customerId, orderId... no userId.
      // But Customer has userId? No.
      // User has organizationId.

      // If the user belongs to the organization, they should see invoices for that organization?
      // Or maybe we should add userId to Invoice to track creator?
      // For now, let's assume all users in the org can see all invoices, 
      // or just return all for simplicity as requested "save all data".
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to frontend format
    const mappedInvoices = invoices.map(inv => ({
      id: inv.id,
      number: inv.invoiceNumber,
      date: inv.issueDate.toISOString().split('T')[0],
      dueDate: inv.dueDate.toISOString().split('T')[0],
      subtotal: Number(inv.totalNet),
      taxRate: 19, // Approximation, ideally fetch from items or store on invoice
      taxAmount: Number(inv.totalTax),
      total: Number(inv.totalGross),
      status: mapPrismaStatusToFrontend(inv.status),
      customer: {
        name: inv.customer.name,
        email: inv.customer.email,
        address: inv.customer.address,
        zipCode: inv.customer.zipCode,
        city: inv.customer.city,
        country: inv.customer.country,
        companyName: '' // Add to schema if needed
      },
      items: inv.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice), // This is gross in our logic
        total: Number(item.grossAmount),
        ean: (item as any).ean
      })),
      document_kind: (inv as any).documentKind,
      reference_number: (inv as any).referenceNumber,
      original_invoice_date: (inv as any).originalDate?.toISOString().split('T')[0],
      grund: (inv as any).reason,
      refund_amount: (inv as any).refundAmount ? Number((inv as any).refundAmount) : undefined
    }))

    return NextResponse.json(mappedInvoices)

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
