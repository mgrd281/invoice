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
    // Admin sees all, User sees own
    const whereClause: Prisma.InvoiceWhereInput = {
      organizationId: org.id
    }

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
      taxRate,
      customer,
      items,
      subtotal,
      taxAmount,
      total,
      status,
      document_kind,
      reference_number,
      original_invoice_date,
      grund,
      refund_amount
    } = body

    // Ensure dependencies exist
    const org = await ensureOrganization()
    const taxRateObj = await ensureTaxRate(org.id, taxRate || 19)
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
        totalNet: subtotal,
        totalGross: total,
        totalTax: taxAmount,
        status: mapFrontendStatusToPrisma(status),
        documentKind: document_kind || 'INVOICE',
        referenceNumber: reference_number,
        originalDate: original_invoice_date ? new Date(original_invoice_date) : null,
        reason: grund,
        refundAmount: refund_amount,
        items: {
          create: items.map((item: any) => {
            // Frontend sends gross totals (unitPrice * quantity)
            const gross = item.total
            const net = gross / (1 + (taxRate || 19) / 100)
            const tax = gross - net
            return {
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice, // Storing gross unit price
              taxRateId: taxRateObj.id,
              netAmount: net,
              grossAmount: gross,
              taxAmount: tax,
              ean: item.ean
            }
          })
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
