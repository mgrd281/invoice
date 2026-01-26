





import jsPDF from 'jspdf'
import { getCompanySettings } from './company-settings'
import { DocumentKind } from './document-types'
import { InvoiceTemplate, getTemplateById, getDefaultTemplate } from './invoice-templates'
import { generateQRCodeData } from './qr-code-generator'
import { addQRCodeToPDF } from './qr-code-pdf'

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
  document_kind?: DocumentKind
  reference_number?: string
  grund?: string
  // Refund specific fields
  original_invoice_date?: string
  refund_amount?: number
  remaining_amount?: number
  // Template information
  templateId?: string
  templateName?: string
  templateType?: string
  // Layout & Styling
  layout?: 'classic' | 'modern' | 'minimal' | 'bold'
  primaryColor?: string
  logoSize?: number
  showSettings?: {
    qrCode: boolean
    epcQrCode: boolean
    customerNumber: boolean
    contactPerson: boolean
    vatPerItem: boolean
    articleNumber: boolean
    foldMarks: boolean
  }
  // QR-Code payment settings
  qrCodeSettings?: {
    enabled: boolean
    paymentMethod: 'sepa' | 'paypal' | 'custom'
    iban?: string
    bic?: string
    paypalEmail?: string
    customText?: string
    recipientName?: string
    placement?: 'flex-beside-thanks' | 'left-below-table' | 'top-right-outside-info' | 'top-right-summary' | 'bottom-right-footer'
  } | null
  customer: {
    name: string
    companyName?: string
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
    email?: string
    phone?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
    ean?: string
    unit?: string
    vat?: number
  }>
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [37, 99, 235] // Default blue
}

// ========================================
// STAMP & WATERMARK FUNCTIONS
// ========================================

/**
 * Adds a watermark to the PDF
 */
function addWatermark(doc: jsPDF, text: string, color: [number, number, number]) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Save current state
  doc.saveGraphicsState()

  // Set watermark properties
  doc.setTextColor(...color)
  doc.setFontSize(60)
  doc.setFont('helvetica', 'bold')

  // Calculate center position
  const textWidth = doc.getTextWidth(text)
  const x = (pageWidth - textWidth) / 2
  const y = pageHeight / 2

  // Add rotated watermark
  doc.text(text, x, y, { angle: 45 })

  // Restore state
  doc.restoreGraphicsState()
}

/**
 * Adds a rectangular stamp with border
 */
function addRectangularStamp(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: [number, number, number],
  fontSize: number = 14
) {
  // Background rectangle
  doc.setFillColor(...backgroundColor)
  doc.rect(x, y, width, height, 'F')

  // White border
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(1)
  doc.rect(x, y, width, height, 'S')

  // White text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  doc.setTextColor(255, 255, 255)
  doc.text(text, x + width / 2, y + height / 2 + 2, { align: 'center' })
}

/**
 * Adds a diagonal watermark in the background
 */
function addDiagonalText(
  doc: jsPDF,
  text: string,
  color: [number, number, number],
  fontSize: number = 80
) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  doc.setTextColor(...color)

  const angle = -45 * Math.PI / 180 // -45 degrees
  doc.text(text, 105, 148, { // Center of A4 page
    angle: angle,
    align: 'center'
  })
}

/**
 * Main function to add stamps and watermarks based on document type
 */
function addDocumentStamps(doc: jsPDF, documentKind?: DocumentKind) {
  if (documentKind === DocumentKind.CANCELLATION) {
    // STORNO: Red stamp + gray watermark
    addRectangularStamp(doc, 'STORNO', 85, 130, 40, 20, [220, 38, 38], 14)
    addDiagonalText(doc, 'STORNO', [200, 200, 200], 80)

  }
  // ERSTATTUNG stamp removed as per user request
  // else if (documentKind === DocumentKind.CREDIT_NOTE || documentKind === DocumentKind.REFUND_FULL || documentKind === DocumentKind.REFUND_PARTIAL) {
  //   addRectangularStamp(doc, 'ERSTATTUNG', 75, 130, 60, 20, [37, 99, 235], 12)
  //   addDiagonalText(doc, 'ERSTATTUNG', [180, 200, 230], 70)
  // }
}

// ========================================
// MAIN PDF GENERATION FUNCTION
// ========================================

export async function generateArizonaPDF(invoice: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF()
  const companySettings = getCompanySettings()

  // Get template information for customization
  let template: InvoiceTemplate | null = null
  if (invoice.templateId) {
    template = getTemplateById(invoice.templateId)
  }
  if (!template) {
    template = getDefaultTemplate()
  }



  // Use template bank details if available, otherwise fallback to company settings
  const bankDetails = template.bankDetails || {
    bankName: companySettings.bankName || 'Ihre Bank',
    iban: companySettings.iban || 'DE89 3704 0044 0532 0130 00',
    bic: companySettings.bic || 'COBADEFFXXX',
    accountHolder: companySettings.accountHolder || companySettings.companyName || 'Ihr Unternehmen'
  }

  // ========================================
  // LAYOUT RENDERING
  // ========================================

  const renderClassic = (doc: jsPDF, invoice: InvoiceData, primaryColor: [number, number, number]) => {
    // Set font
    doc.setFont('helvetica')
    const cs = invoice.organization

    // Header Background - Pure white across full width
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 50, 'F')

    // Company Logo - Box with text
    const logoX = 20
    const logoY = 18
    const logoSizeFactor = (invoice.logoSize || 50) / 100
    const logoW = 60 * logoSizeFactor
    const logoH = 14 * logoSizeFactor

    const displayCompanyName = companySettings.companyName || companySettings.name || 'KARINEX'

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(logoX, logoY, logoW, logoH, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12 * logoSizeFactor)
    doc.setTextColor(255, 255, 255)

    const textWidth = doc.getTextWidth(displayCompanyName)
    doc.text(displayCompanyName, logoX + (logoW - textWidth) / 2, logoY + logoH / 2 + (2.5 * logoSizeFactor))

    // Reset colors
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    // Sender line (Small text above address)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    const senderLine = `${displayCompanyName} • ${cs.address} • ${cs.zipCode} ${cs.city}`
    doc.text(senderLine, 20, 45)

    // Recipient Block
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    let yPos = 55
    if (invoice.customer.companyName) {
      doc.setFont('helvetica', 'bold')
      doc.text(invoice.customer.companyName, 20, yPos)
      yPos += 5
    }
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.customer.name, 20, yPos)
    yPos += 5
    doc.text(invoice.customer.address, 20, yPos)
    yPos += 5
    doc.text(`${invoice.customer.zipCode} ${invoice.customer.city}`, 20, yPos)
    if (invoice.customer.country && invoice.customer.country !== 'DE') {
      yPos += 5
      doc.text(invoice.customer.country, 20, yPos)
    }

    // Info Box (Right side)
    const boxX = 130
    const boxY = 55
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)

    const info = [
      { label: 'Rechnungs-Nr.', value: invoice.number },
      { label: 'Datum', value: new Date(invoice.date).toLocaleDateString('de-DE') },
      { label: 'Lieferdatum', value: new Date(invoice.dueDate || invoice.date).toLocaleDateString('de-DE') }
    ]

    if (invoice.showSettings?.customerNumber) {
      info.push({ label: 'Kundennummer', value: `KD-${invoice.id.substring(0, 6).toUpperCase()}` })
    }

    info.forEach((row, i) => {
      doc.text(row.label, boxX, boxY + (i * 5))
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(row.value, boxX + 35, boxY + (i * 5), { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
    })

    // Subject/Title
    yPos = 110
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(invoice.number, 20, yPos)

    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text('Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Leistungen:', 20, yPos)

    // Table
    yPos += 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('Pos.', 20, yPos)
    doc.text('Beschreibung', 30, yPos)
    doc.text('Menge', 120, yPos, { align: 'right' })
    doc.text('Preis', 150, yPos, { align: 'right' })
    doc.text('Gesamt', 190, yPos, { align: 'right' })

    yPos += 3
    doc.setDrawColor(230, 230, 230)
    doc.line(20, yPos, 190, yPos)

    yPos += 7
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)

    invoice.items.forEach((item, i) => {
      doc.text(`${i + 1}`, 20, yPos)
      const desc = doc.splitTextToSize(item.description, 80)
      doc.text(desc, 30, yPos)
      const lines = desc.length

      doc.text(`${item.quantity} ${item.unit || 'Stk'}`, 120, yPos, { align: 'right' })
      doc.text(`${item.unitPrice.toFixed(2)} €`, 150, yPos, { align: 'right' })
      doc.text(`${item.total.toFixed(2)} €`, 190, yPos, { align: 'right' })

      yPos += (lines * 5) + 2
    })

    // Totals
    yPos += 5
    doc.line(130, yPos, 190, yPos)
    yPos += 7
    doc.setFontSize(9)
    doc.text('Netto', 130, yPos)
    doc.text(`${invoice.subtotal.toFixed(2)} €`, 190, yPos, { align: 'right' })
    yPos += 5
    doc.text(`USt. ${invoice.taxRate}%`, 130, yPos)
    doc.text(`${invoice.taxAmount.toFixed(2)} €`, 190, yPos, { align: 'right' })
    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('Gesamtbetrag', 130, yPos)
    doc.text(`${invoice.total.toFixed(2)} €`, 190, yPos, { align: 'right' })

    renderFooter(doc, invoice, cs)
  }

  const renderMinimal = (doc: jsPDF, invoice: InvoiceData, primaryColor: [number, number, number]) => {
    // Basic implementation for compatibility
    renderClassic(doc, invoice, primaryColor)
  }

  const renderModern = (doc: jsPDF, invoice: InvoiceData, primaryColor: [number, number, number]) => {
    renderClassic(doc, invoice, primaryColor)
  }

  const renderBold = (doc: jsPDF, invoice: InvoiceData, primaryColor: [number, number, number]) => {
    renderClassic(doc, invoice, primaryColor)
  }

  const renderFooter = (doc: jsPDF, invoice: InvoiceData, cs: any) => {
    const yFooter = 270

    // Light background rect for footer
    doc.setFillColor(248, 250, 252)
    doc.rect(0, yFooter - 5, 210, 30, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.line(0, yFooter - 5, 210, yFooter - 5)

    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')

    // Col 1: Name & Address
    doc.text(cs.name || '', 20, yFooter)
    doc.text(cs.address || '', 20, yFooter + 4)
    doc.text(`${cs.zipCode || ''} ${cs.city || ''}`, 20, yFooter + 8)

    // Col 2: Bank
    doc.text('Bankverbindung', 80, yFooter)
    doc.text(cs.bankName || '', 80, yFooter + 4)
    doc.text(`IBAN: ${cs.iban || ''}`, 80, yFooter + 8)
    doc.text(`BIC: ${cs.bic || ''}`, 80, yFooter + 12)

    // Col 3: Tax & Contact
    doc.text(`USt-IdNr: ${cs.taxId || ''}`, 150, yFooter)
    doc.text(cs.email || '', 150, yFooter + 4)
    doc.text(cs.phone || '', 150, yFooter + 8)
  }

  const addFoldMarks = (doc: jsPDF) => {
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.1)
    doc.line(0, 105, 5, 105) // Top fold
    doc.line(0, 148.5, 7, 148.5) // Center
    doc.line(0, 210, 5, 210) // Bottom fold
  }

  // ========================================
  // PDF GENERATION EXECUTION
  // ========================================

  const layout = invoice.layout || 'classic'
  const primaryColor = hexToRgb(invoice.primaryColor || '#2563eb')

  if (layout === 'minimal') {
    renderMinimal(doc, invoice, primaryColor)
  } else if (layout === 'modern') {
    renderModern(doc, invoice, primaryColor)
  } else if (layout === 'bold') {
    renderBold(doc, invoice, primaryColor)
  } else {
    renderClassic(doc, invoice, primaryColor)
  }

  // Common overlays
  const totalPages = doc.getNumberOfPages()
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum)
    if (invoice.showSettings?.foldMarks !== false) {
      addFoldMarks(doc)
    }
    addDocumentStamps(doc, invoice.document_kind)
  }

  // QR-Code
  if (invoice.qrCodeSettings?.enabled) {
    try {
      const paymentData = {
        paymentMethod: invoice.qrCodeSettings.paymentMethod,
        iban: invoice.qrCodeSettings.iban,
        bic: invoice.qrCodeSettings.bic,
        paypalEmail: invoice.qrCodeSettings.paypalEmail,
        customText: invoice.qrCodeSettings.customText,
        recipientName: invoice.qrCodeSettings.recipientName || companySettings.companyName || 'Unternehmen',
        amount: invoice.total,
        currency: 'EUR',
        reference: invoice.number,
        purpose: `Rechnung ${invoice.number}`
      }
      const placement = invoice.qrCodeSettings.placement || 'flex-beside-thanks'
      await addQRCodeToPDF(doc, paymentData as any, placement as any)
    } catch (e) {
      console.warn('QR Code generation failed', e)
    }
  }

  return doc
} // End of generateArizonaPDF function

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Saves PDF directly to user's downloads
 */
export async function saveArizonaPDF(invoice: InvoiceData): Promise<void> {
  const doc = await generateArizonaPDF(invoice)
  const customerName = invoice.customer.name.replace(/[^a-zA-Z0-9]/g, '-')
  const filename = `${invoice.number}-${customerName}.pdf`
  doc.save(filename)
}

