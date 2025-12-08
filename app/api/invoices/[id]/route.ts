import { NextRequest, NextResponse } from 'next/server'
import { getCompanySettings } from '@/lib/company-settings'
import { prisma } from '@/lib/prisma'
import { ensureOrganization, ensureCustomer, ensureTaxRate } from '@/lib/db-operations'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    case 'Erstattet': return 'PAID'
    default: return 'SENT'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id
    console.log('Fetching invoice with ID:', invoiceId)

    // Fetch from Prisma
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: true,
        order: true // Include order to get shopifyOrderId
      }
    })

    if (!invoice) {
      console.log('Rechnung nicht gefunden in DB:', invoiceId)
      return NextResponse.json(
        { error: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    console.log('Rechnung gefunden:', invoice.invoiceNumber)

    // Format for frontend
    const formattedInvoice = {
      id: invoice.id,
      number: invoice.invoiceNumber,
      date: invoice.issueDate.toISOString().split('T')[0],
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      subtotal: Number(invoice.totalNet),
      taxRate: 19, // Approximation or fetch from items
      taxAmount: Number(invoice.totalTax),
      total: Number(invoice.totalGross),
      status: mapPrismaStatusToFrontend(invoice.status),
      customer: {
        id: invoice.customer.id,
        name: invoice.customer.name,
        companyName: '', // Add to schema if needed
        email: invoice.customer.email || '',
        address: invoice.customer.address,
        zipCode: invoice.customer.zipCode,
        city: invoice.customer.city,
        country: invoice.customer.country
      },
      organization: getCompanySettings(),
      items: invoice.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.grossAmount),
        ean: (item as any).ean
      })),
      // Document type fields
      document_kind: (invoice as any).documentKind,
      reference_number: (invoice as any).referenceNumber,
      original_invoice_date: (invoice as any).originalDate?.toISOString().split('T')[0],
      grund: (invoice as any).reason,
      refund_amount: (invoice as any).refundAmount ? Number((invoice as any).refundAmount) : undefined,
      // QR Code settings - not in schema yet, return null or default
      qrCodeSettings: null,
      // Order details
      order: invoice.order ? {
        id: invoice.order.id,
        shopifyOrderId: invoice.order.shopifyOrderId
      } : undefined
    }

    return NextResponse.json(formattedInvoice)

  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnung:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Rechnung' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id
    const updatedData = await request.json()

    console.log('Aktualisiere Rechnung mit ID:', invoiceId)

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { organization: true }
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Update Customer if provided
    if (updatedData.customer) {
      await ensureCustomer(existingInvoice.organizationId, updatedData.customer)
      // Note: We might want to update the specific customer record linked to this invoice
      // or just update the invoice's customerId if it changed.
      // For simplicity, let's assume we update the linked customer details
      await prisma.customer.update({
        where: { id: existingInvoice.customerId },
        data: {
          name: updatedData.customer.name,
          email: updatedData.customer.email,
          address: updatedData.customer.address,
          zipCode: updatedData.customer.zipCode,
          city: updatedData.customer.city,
          country: updatedData.customer.country
        }
      })
    }

    // Update Invoice fields
    const updateData: Prisma.InvoiceUpdateInput = {}
    if (updatedData.status) updateData.status = mapFrontendStatusToPrisma(updatedData.status)
    if (updatedData.subtotal) updateData.totalNet = updatedData.subtotal
    if (updatedData.total) updateData.totalGross = updatedData.total
    if (updatedData.taxAmount) updateData.totalTax = updatedData.taxAmount

    // Update items if provided
    if (updatedData.items) {
      // Delete existing items and recreate (simplest approach for full update)
      await prisma.invoiceItem.deleteMany({ where: { invoiceId } })

      const taxRateObj = await ensureTaxRate(existingInvoice.organizationId, updatedData.taxRate || 19)

      updateData.items = {
        create: updatedData.items.map((item: any) => {
          const gross = item.total
          const net = gross / (1 + (updatedData.taxRate || 19) / 100)
          const tax = gross - net
          return {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRateId: taxRateObj.id,
            netAmount: net,
            grossAmount: gross,
            taxAmount: tax,
            ean: item.ean
          }
        })
      }
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData
    })

    console.log('Rechnung erfolgreich aktualisiert')
    return NextResponse.json({ success: true, message: 'Rechnung erfolgreich aktualisiert' })

  } catch (error) {
    console.error('Fehler beim Aktualisieren der Rechnung:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Rechnung' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id
    console.log('Lösche Rechnung mit ID:', invoiceId)

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Check status
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      return NextResponse.json(
        {
          error: 'Löschen nicht erlaubt',
          message: `Rechnung ist ${mapPrismaStatusToFrontend(invoice.status)}. Löschen ist nicht erlaubt.`,
          code: 'LOCKED_INVOICE'
        },
        { status: 409 }
      )
    }

    // Hard delete for now as we don't have deletedAt
    await prisma.invoice.delete({
      where: { id: invoiceId }
    })

    console.log('Rechnung erfolgreich gelöscht')
    return NextResponse.json({
      success: true,
      message: 'Rechnung erfolgreich gelöscht'
    })

  } catch (error) {
    console.error('Fehler beim Löschen der Rechnung:', error)
    return NextResponse.json(
      {
        error: 'Fehler beim Löschen',
        message: 'Ein unerwarteter Fehler ist aufgetreten.'
      },
      { status: 500 }
    )
  }
}
