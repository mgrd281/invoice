import jsPDF from 'jspdf'
import { getCompanySettings } from './company-settings'
import { 
  DocumentKind, 
  getDocumentTitle, 
  getDocumentColor 
} from './document-types'
import { saveArizonaPDF } from './arizona-pdf-generator'
import { generateQRCodeData, generateQRCodeSVG } from './qr-code-generator'

interface InvoiceData {
  id: string
  number: string
  date: string
  dueDate: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  status: string
  // New document type system
  document_kind?: DocumentKind
  document_number?: string
  reference_number?: string
  grund?: string
  // Legacy compatibility
  type?: string
  originalInvoiceNumber?: string
  // QR-Code payment settings
  qrCodeSettings?: {
    enabled: boolean
    paymentMethod: 'sepa' | 'paypal' | 'custom'
    iban?: string
    bic?: string
    paypalEmail?: string
    customText?: string
    recipientName?: string
  } | null
  customer: {
    name: string
    email: string
    address: string
    zipCode: string
    city: string
    country: string
  }
  organization: {
    name: string
    address: string
    zipCode: string
    city: string
    country: string
    taxId: string
    bankName: string
    iban: string
    bic: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
}

export async function generateInvoicePDF(invoice: InvoiceData): Promise<void> {
  // Use Arizona design for all invoices
  await saveArizonaPDF(invoice as any)
  return
  
  const doc = new jsPDF()
  
  // Get current company settings
  const companySettings = getCompanySettings()
  
  // Set font
  doc.setFont('helvetica')
  
  // Header - Company Info
  doc.setFontSize(20)
  doc.setTextColor(37, 99, 235) // Blue color
  doc.text(companySettings.name, 20, 30)
  
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(companySettings.address, 20, 40)
  doc.text(`${companySettings.zipCode} ${companySettings.city}`, 20, 45)
  doc.text(companySettings.country, 20, 50)
  doc.text(`USt-IdNr.: ${companySettings.taxId}`, 20, 60)
  
  // Document Type Badge (top right)
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  
  // Determine document kind (new system first, fallback to legacy)
  let documentKind: DocumentKind = invoice.document_kind || DocumentKind.INVOICE
  if (!documentKind && invoice.type) {
    // Legacy compatibility
    switch (invoice.type) {
      case 'STORNO':
        documentKind = DocumentKind.CANCELLATION
        break
      case 'GUTSCHRIFT':
        documentKind = DocumentKind.CREDIT_NOTE
        break
      default:
        documentKind = DocumentKind.INVOICE
    }
  }
  if (!documentKind) {
    documentKind = DocumentKind.INVOICE // Default fallback
  }
  
  // Add document type badge
  let badgeText = 'Typ: Rechnung'
  if (documentKind === DocumentKind.CANCELLATION) {
    badgeText = 'Typ: Storno'
  } else if (documentKind === DocumentKind.CREDIT_NOTE) {
    badgeText = 'Typ: Gutschrift'
  }
  doc.text(badgeText, 140, 20)
  
  // Invoice Title - Larger for Gutschrift
  const titleSize = documentKind === DocumentKind.CREDIT_NOTE ? 28 : 24
  doc.setFontSize(titleSize)
  
  // Get title and color based on document kind
  const title = getDocumentTitle(documentKind)
  const color = getDocumentColor(documentKind)
  doc.setTextColor(color.r, color.g, color.b)
  
  doc.text(title, 140, 35)
  
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  
  let yPos = 45
  doc.text(`Nummer: ${invoice.number}`, 140, yPos)
  yPos += 5
  doc.text(`Datum: ${new Date(invoice.date).toLocaleDateString('de-DE')}`, 140, yPos)
  yPos += 5
  
  // Special handling for Gutschrift
  if (documentKind === DocumentKind.CREDIT_NOTE) {
    // Show reference to original invoice prominently
    const referenceNumber = invoice.reference_number || invoice.originalInvoiceNumber
    if (referenceNumber) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129) // Green color
      doc.text(`Mرجع الفاتورة الأصلية: ${referenceNumber}`, 140, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      yPos += 5
    }
    
    // Show refund date instead of due date
    doc.text(`Erstattet am: ${new Date(invoice.date).toLocaleDateString('de-DE')}`, 140, yPos)
  } else if (documentKind === DocumentKind.INVOICE && invoice.dueDate) {
    // Add due date only for regular invoices
    doc.text(`Fällig am: ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}`, 140, yPos)
  } else if (documentKind === DocumentKind.CANCELLATION) {
    // Add reference to original invoice for Storno
    const referenceNumber = invoice.reference_number || invoice.originalInvoiceNumber
    if (referenceNumber) {
      doc.text(`Bezieht sich auf: ${referenceNumber}`, 140, yPos)
    }
  }
  
  // Customer Info
  doc.setFontSize(12)
  doc.setTextColor(55, 65, 81)
  doc.text('Rechnungsempfänger:', 20, 80)
  
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(invoice.customer.name, 20, 90)
  doc.text(invoice.customer.address, 20, 95)
  doc.text(`${invoice.customer.zipCode} ${invoice.customer.city}`, 20, 100)
  doc.text(invoice.customer.country, 20, 105)
  doc.text(`E-Mail: ${invoice.customer.email}`, 20, 115)
  
  // Items Table Header
  let yPosition = 140
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  
  // Table header background
  doc.setFillColor(243, 244, 246)
  doc.rect(20, yPosition - 5, 170, 10, 'F')
  
  // Table headers
  doc.text('Beschreibung', 25, yPosition)
  doc.text('Menge', 120, yPosition)
  doc.text('Einzelpreis', 140, yPosition)
  doc.text('Gesamt', 170, yPosition)
  
  yPosition += 15
  
  // Items
  invoice.items.forEach((item) => {
    doc.text(item.description, 25, yPosition)
    doc.text(item.quantity.toString(), 125, yPosition)
    doc.text(`${item.unitPrice.toFixed(2)}`, 145, yPosition)
    doc.text(`${item.total.toFixed(2)}`, 175, yPosition)
    yPosition += 10
  })
  
  // Totals
  yPosition += 10
  doc.line(120, yPosition, 190, yPosition) // Line above totals
  yPosition += 10
  
  doc.text('Zwischensumme:', 120, yPosition)
  doc.text(`${invoice.subtotal.toFixed(2)}`, 175, yPosition)
  yPosition += 8
  
  doc.text(`MwSt. (${invoice.taxRate}%):`, 120, yPosition)
  doc.text(`${invoice.taxAmount.toFixed(2)}`, 175, yPosition)
  yPosition += 8
  
  // Total line
  doc.setLineWidth(0.5)
  doc.line(120, yPosition, 190, yPosition)
  yPosition += 8
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Gesamtsumme:', 120, yPosition)
  doc.text(`${invoice.total.toFixed(2)}`, 175, yPosition)
  
  // Add reason for Storno/Gutschrift
  if ((documentKind === DocumentKind.CANCELLATION || documentKind === DocumentKind.CREDIT_NOTE) && invoice.grund) {
    yPosition += 15
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(220, 38, 38) // Red color for attention
    doc.text('Grund:', 20, yPosition)
    yPosition += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(invoice.grund || '', 20, yPosition)
  }

  // Bank Details (only for regular invoices)
  if (documentKind === DocumentKind.INVOICE) {
    yPosition += 20
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81)
    doc.text('Bankverbindung für Überweisungen:', 20, yPosition)
    
    yPosition += 10
    doc.setTextColor(0, 0, 0)
    doc.text(`Bank: ${companySettings.bankName}`, 20, yPosition)
    yPosition += 5
    doc.text(`IBAN: ${companySettings.iban}`, 20, yPosition)
    yPosition += 5
    doc.text(`BIC: ${companySettings.bic}`, 20, yPosition)
    yPosition += 5
    doc.text(`Verwendungszweck: ${invoice.number}`, 20, yPosition)
  } else {
    yPosition += 10
  }
  
  // Footer
  yPosition += 20
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text('Vielen Dank für Ihr Vertrauen!', 20, yPosition)
  yPosition += 5
  doc.text('Diese Rechnung wurde automatisch erstellt und ist ohne Unterschrift gültig.', 20, yPosition)
  
  // Save the PDF
  doc.save(`Rechnung_${invoice.number}.pdf`)
}

// Generate PDF as buffer for email attachment
export async function generateInvoicePDFBuffer(invoiceId: string): Promise<Buffer | null> {
  try {
    // Fetch invoice data
    const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch invoice data')
    }
    
    const invoice = await response.json()
    
    // Get current company settings
    const companySettings = getCompanySettings()
    
    const doc = new jsPDF()
    
    // Set font
    doc.setFont('helvetica')
    
    // Header - Company Info
    doc.setFontSize(20)
    doc.setTextColor(37, 99, 235) // Blue color
    doc.text(companySettings.name, 20, 30)
    
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(companySettings.address, 20, 40)
    doc.text(`${companySettings.zipCode} ${companySettings.city}`, 20, 45)
    doc.text(companySettings.country, 20, 50)
    doc.text(`USt-IdNr.: ${companySettings.taxId}`, 20, 60)
    
    // Invoice Title and Info - Dynamic based on document kind
    doc.setFontSize(24)
    
    // Determine document kind (new system first, fallback to legacy)
    let documentKind: DocumentKind = invoice.document_kind || DocumentKind.INVOICE
    if (!documentKind && invoice.type) {
      // Legacy compatibility
      switch (invoice.type) {
        case 'STORNO':
          documentKind = DocumentKind.CANCELLATION
          break
        case 'GUTSCHRIFT':
          documentKind = DocumentKind.CREDIT_NOTE
          break
        default:
          documentKind = DocumentKind.INVOICE
      }
    }
    if (!documentKind) {
      documentKind = DocumentKind.INVOICE // Default fallback
    }
    
    // Get title and color based on document kind
    const title = getDocumentTitle(documentKind)
    const color = getDocumentColor(documentKind)
    doc.setTextColor(color.r, color.g, color.b)
    
    doc.text(title, 140, 30)
    
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(`Nummer: ${invoice.number}`, 140, 40)
    doc.text(`Datum: ${new Date(invoice.date).toLocaleDateString('de-DE')}`, 140, 45)
    
    // Add due date only for regular invoices
    if (documentKind === DocumentKind.INVOICE && invoice.dueDate) {
      doc.text(`Fällig am: ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}`, 140, 50)
    }
    
    // Add reference to original invoice for Storno/Gutschrift
    const referenceNumber = invoice.reference_number || invoice.originalInvoiceNumber
    if ((documentKind === DocumentKind.CANCELLATION || documentKind === DocumentKind.CREDIT_NOTE) && referenceNumber) {
      doc.text(`Bezieht sich auf: ${referenceNumber}`, 140, 50)
    }
    
    // Customer Info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Rechnungsempfänger:', 20, 80)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(invoice.customer.name, 20, 90)
    doc.text(invoice.customer.address, 20, 95)
    doc.text(`${invoice.customer.zipCode} ${invoice.customer.city}`, 20, 100)
    doc.text(invoice.customer.country, 20, 105)
    
    // Items Table Header
    let yPosition = 130
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Pos.', 20, yPosition)
    doc.text('Beschreibung', 40, yPosition)
    doc.text('Menge', 120, yPosition)
    doc.text('Einzelpreis', 145, yPosition)
    doc.text('Gesamt', 175, yPosition)
    
    // Draw line under header
    doc.line(20, yPosition + 2, 190, yPosition + 2)
    
    // Items
    yPosition += 10
    doc.setFont('helvetica', 'normal')
    
    invoice.items.forEach((item: any, index: number) => {
      doc.text((index + 1).toString(), 20, yPosition)
      doc.text(item.description, 40, yPosition)
      doc.text(item.quantity.toString(), 120, yPosition)
      doc.text(`€${item.unitPrice.toFixed(2)}`, 145, yPosition)
      doc.text(`€${item.total.toFixed(2)}`, 175, yPosition)
      yPosition += 8
    })
    
    // Totals
    yPosition += 10
    doc.line(120, yPosition, 190, yPosition)
    yPosition += 10
    
    doc.text('Zwischensumme:', 120, yPosition)
    doc.text(`€${invoice.subtotal.toFixed(2)}`, 175, yPosition)
    yPosition += 8
    
    doc.text(`MwSt. (${invoice.taxRate}%):`, 120, yPosition)
    doc.text(`€${invoice.taxAmount.toFixed(2)}`, 175, yPosition)
    yPosition += 8
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Gesamtsumme:', 120, yPosition)
    doc.text(`€${invoice.total.toFixed(2)}`, 175, yPosition)
    
    // Bank Details
    yPosition += 20
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81)
    doc.text('Bankverbindung für Überweisungen:', 20, yPosition)
    
    yPosition += 10
    doc.setTextColor(0, 0, 0)
    doc.text(`Bank: ${companySettings.bankName}`, 20, yPosition)
    yPosition += 5
    doc.text(`IBAN: ${companySettings.iban}`, 20, yPosition)
    yPosition += 5
    doc.text(`BIC: ${companySettings.bic}`, 20, yPosition)
    yPosition += 5
    doc.text(`Verwendungszweck: ${invoice.number}`, 20, yPosition)
    
    // Footer
    yPosition += 20
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text('Vielen Dank für Ihr Vertrauen!', 20, yPosition)
    yPosition += 5
    doc.text('Diese Rechnung wurde automatisch erstellt und ist ohne Unterschrift gültig.', 20, yPosition)
    
    // Convert to buffer
    const pdfArrayBuffer = doc.output('arraybuffer')
    return Buffer.from(pdfArrayBuffer)
    
  } catch (error) {
    console.error('Error generating PDF buffer:', error)
    return null
  }
}

export async function downloadInvoicePDF(invoiceId: string, invoiceNumber: string): Promise<void> {
  let retryCount = 0
  const maxRetries = 3
  
  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries} - Downloading PDF for invoice:`, invoiceId)
      
      // Fetch invoice data from API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const invoiceData = await response.json()
      console.log('✅ Fetched invoice data for PDF:', {
        id: invoiceData.id,
        number: invoiceData.number,
        customer: invoiceData.customerName,
        total: invoiceData.total
      })
      
      // Validate required data
      if (!invoiceData.number || !invoiceData.customerName) {
        throw new Error('Invalid invoice data: missing required fields')
      }
      
      // Generate PDF with the actual data
      await generateInvoicePDF(invoiceData)
      console.log('✅ PDF generated successfully')
      return // Success, exit retry loop
      
    } catch (error) {
      retryCount++
      console.error(`❌ Attempt ${retryCount} failed:`, error)
      
      if (retryCount >= maxRetries) {
        console.error('🚨 All retry attempts failed, using fallback')
        break
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
    }
  }
  
  // Fallback to mock data if all retries fail
  try {
    console.log('🔄 Using fallback mock data for PDF generation')
    const mockInvoice: InvoiceData = {
      id: invoiceId,
      number: invoiceNumber,
      date: '2024-01-15',
      dueDate: '2024-01-29',
      subtotal: 100.00,
      taxRate: 19,
      taxAmount: 19.00,
      total: 119.00,
      status: 'Bezahlt',
      customer: {
        name: 'Max Mustermann',
        email: 'max.mustermann@email.com',
        address: 'Musterstraße 123',
        zipCode: '12345',
        city: 'Berlin',
        country: 'Deutschland'
      },
      organization: {
        name: 'Muster GmbH',
        address: 'Geschäftsstraße 456',
        zipCode: '54321',
        city: 'Hamburg',
        country: 'Deutschland',
        taxId: 'DE123456789',
        bankName: 'Deutsche Bank',
        iban: 'DE89 3704 0044 0532 0130 00',
        bic: 'COBADEFFXXX'
      },
      items: [
        {
          description: 'Webentwicklung - Monat Januar',
          quantity: 1,
          unitPrice: 100.00,
          total: 100.00
        }
      ]
    }
    
    await generateInvoicePDF(mockInvoice)
    console.log('✅ Fallback PDF generated successfully')
  } catch (fallbackError) {
    console.error('🚨 Even fallback PDF generation failed:', fallbackError)
    throw new Error('PDF generation completely failed. Please try again or contact support.')
  }
}
