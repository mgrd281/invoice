import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { generateArizonaPDF } from '@/lib/arizona-pdf-generator'
import { prisma } from '@/lib/prisma'
import { getCompanySettings } from '@/lib/company-settings'

export async function POST(request: NextRequest) {
  try {
    console.log('ZIP download request received')
    const { invoiceIds } = await request.json()
    console.log(`Requested ZIP for ${invoiceIds?.length} invoices`)

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ error: 'No invoice IDs provided' }, { status: 400 })
    }

    // 1. Fetch all invoices in ONE query (Fixes N+1 problem)
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds }
      },
      include: {
        customer: true,
        items: true,
        organization: true
      }
    })

    console.log(`Fetched ${invoices.length} invoices from database`)

    if (invoices.length === 0) {
      return NextResponse.json({ error: 'No valid invoices found' }, { status: 404 })
    }

    // 2. Create ZIP file
    const zip = new JSZip()
    const companySettings = getCompanySettings()

    // 3. Generate PDFs
    // We process in chunks to avoid blocking the event loop too long
    const CHUNK_SIZE = 10
    let processedCount = 0
    let errorCount = 0

    for (let i = 0; i < invoices.length; i += CHUNK_SIZE) {
      const chunk = invoices.slice(i, i + CHUNK_SIZE)

      await Promise.all(chunk.map(async (invoice) => {
        try {
          // Map Prisma invoice to InvoiceData expected by generator
          const invoiceData = {
            id: invoice.id,
            number: invoice.invoiceNumber,
            date: invoice.issueDate.toISOString(),
            dueDate: invoice.dueDate.toISOString(),
            subtotal: Number(invoice.subtotal),
            taxRate: Number(invoice.taxRate),
            taxAmount: Number(invoice.taxAmount),
            total: Number(invoice.totalGross),
            status: invoice.status,
            document_kind: (invoice as any).documentKind || 'invoice', // Fallback
            reference_number: (invoice as any).referenceNumber,
            grund: (invoice as any).reason,
            // Map customer
            customer: {
              name: invoice.customer.name,
              companyName: invoice.customer.companyName || undefined,
              email: invoice.customer.email,
              address: invoice.customer.address,
              zipCode: invoice.customer.zipCode,
              city: invoice.customer.city,
              country: invoice.customer.country
            },
            // Map organization (use invoice's org or fallback to settings)
            organization: invoice.organization ? {
              name: invoice.organization.name,
              address: invoice.organization.address,
              zipCode: invoice.organization.zipCode,
              city: invoice.organization.city,
              country: invoice.organization.country,
              taxId: invoice.organization.taxId || '',
              bankName: invoice.organization.bankName || '',
              iban: invoice.organization.iban || '',
              bic: invoice.organization.bic || ''
            } : {
              name: companySettings.companyName || 'Company',
              address: companySettings.address || '',
              zipCode: companySettings.zipCode || '',
              city: companySettings.city || '',
              country: companySettings.country || '',
              taxId: companySettings.taxId || '',
              bankName: companySettings.bankName || '',
              iban: companySettings.iban || '',
              bic: companySettings.bic || ''
            },
            // Map items
            items: invoice.items.map(item => ({
              description: item.description,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              total: Number(item.total),
              ean: item.ean || undefined
            }))
          }

          // Generate PDF
          // @ts-ignore - Types might slightly mismatch but structure is correct
          const doc = await generateArizonaPDF(invoiceData)
          const pdfBuffer = doc.output('arraybuffer')

          // Create filename
          const date = new Date(invoice.issueDate).toISOString().split('T')[0]
          const safeNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_')
          const filename = `Rechnung_${safeNumber}_${date}.pdf`

          zip.file(filename, pdfBuffer)
          processedCount++
        } catch (error) {
          console.error(`Error generating PDF for invoice ${invoice.invoiceNumber}:`, error)
          errorCount++
        }
      }))

      // Small delay to allow GC?
      if (i + CHUNK_SIZE < invoices.length) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    console.log(`ZIP generation complete. Processed: ${processedCount}, Errors: ${errorCount}`)

    // 4. Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
    const timestamp = new Date().toISOString().split('T')[0]
    const zipFilename = `Rechnungen_${timestamp}.zip`

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zipBuffer.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error('Error creating ZIP file:', error)
    return NextResponse.json({ error: 'Failed to create ZIP file' }, { status: 500 })
  }
}
