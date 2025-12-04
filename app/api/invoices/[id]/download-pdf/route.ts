import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { loadInvoicesFromDisk } from '@/lib/server-storage'
import { generateArizonaPDFBuffer } from '@/lib/arizona-pdf-generator'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const invoiceId = params.id
    console.log('📄 Generating PDF download for invoice:', invoiceId)

    // Load invoice data
    const invoices = loadInvoicesFromDisk()
    const invoice = invoices.find((inv: any) => inv.id === invoiceId)

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Generate PDF buffer
    const pdfBuffer = await generateArizonaPDFBuffer(invoiceId)
    
    if (!pdfBuffer) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate PDF' },
        { status: 500 }
      )
    }

    // Create filename
    const customerName = invoice.customerName?.replace(/[^a-zA-Z0-9]/g, '-') || 'customer'
    const filename = `${invoice.number}-${customerName}.pdf`

    // Return PDF as download
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('❌ PDF download error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'PDF generation failed',
        message: 'Fehler beim Erstellen der PDF-Datei. Bitte versuchen Sie es erneut.'
      },
      { status: 500 }
    )
  }
}
