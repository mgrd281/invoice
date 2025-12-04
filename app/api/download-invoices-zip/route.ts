import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { generateArizonaPDF } from '@/lib/arizona-pdf-generator'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('ZIP download request received')
    const { invoiceIds } = await request.json()
    console.log('Invoice IDs:', invoiceIds)
    
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      console.log('No invoice IDs provided')
      return NextResponse.json(
        { error: 'No invoice IDs provided' },
        { status: 400 }
      )
    }

    // Get invoices from API
    const selectedInvoices = []
    
    for (const invoiceId of invoiceIds) {
      try {
        // Fetch invoice from internal API
        const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`)
        if (response.ok) {
          const invoiceData = await response.json()
          selectedInvoices.push(invoiceData)
        } else {
          console.error(`Invoice ${invoiceId} not found`)
        }
      } catch (error) {
        console.error(`Error fetching invoice ${invoiceId}:`, error)
        // Continue with other invoices
      }
    }

    console.log(`Found ${selectedInvoices.length} invoices`)
    
    if (selectedInvoices.length === 0) {
      console.log('No valid invoices found')
      return NextResponse.json(
        { error: 'No valid invoices found' },
        { status: 404 }
      )
    }

    // Create ZIP file
    console.log('Creating ZIP file...')
    const zip = new JSZip()

    // Generate PDF for each invoice and add to ZIP
    for (const invoice of selectedInvoices) {
      try {
        console.log(`Generating PDF for invoice ${invoice.number}`)
        
        // Generate PDF buffer using jsPDF
        const doc = generateArizonaPDF(invoice)
        const pdfBuffer = doc.output('arraybuffer')
        
        // Create filename: Rechnung_NUMMER_DATUM.pdf
        const date = new Date(invoice.date).toISOString().split('T')[0]
        const filename = `Rechnung_${invoice.number}_${date}.pdf`
        
        console.log(`Adding ${filename} to ZIP (${pdfBuffer.byteLength} bytes)`)
        
        // Add PDF to ZIP
        zip.file(filename, pdfBuffer)
      } catch (error) {
        console.error(`Error generating PDF for invoice ${invoice.number}:`, error)
        // Continue with other invoices even if one fails
      }
    }

    // Generate ZIP buffer
    console.log('Generating ZIP buffer...')
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

    // Create filename for ZIP
    const timestamp = new Date().toISOString().split('T')[0]
    const zipFilename = `Rechnungen_${timestamp}.zip`

    console.log(`ZIP created: ${zipFilename} (${zipBuffer.byteLength} bytes)`)

    // Return ZIP file
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
    return NextResponse.json(
      { error: 'Failed to create ZIP file' },
      { status: 500 }
    )
  }
}
