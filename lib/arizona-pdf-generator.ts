





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
  ] : [76, 130, 106] // Default KARNEX Green
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

  // Branding: Use the KARNEX Green (#4c826a) as primary color
  const karnexGreen: [number, number, number] = [76, 130, 106]

  // ========================================
  // INVOICE RENDERING (with template support)
  // ========================================
  const renderDefault = () => {
    // Set font
    doc.setFont('helvetica')

    // Header Background - Pure white
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 50, 'F')

    // Company Logo
    const logoX = 20
    const logoY = 18
    const logoW = 60
    const logoH = 14

    const displayCompanyName = companySettings.companyName || companySettings.name || 'KARINEX'

    doc.setFillColor(...karnexGreen)
    doc.rect(logoX, logoY, logoW, logoH, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)

    const logoTextWidth = doc.getTextWidth(displayCompanyName)
    doc.text(displayCompanyName, logoX + (logoW - logoTextWidth) / 2, logoY + logoH / 2 + 2.5)

    // Reset colors
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    // Sender line
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    const senderZipCode = companySettings.zip || companySettings.zipCode
    const senderLine = `${displayCompanyName} • ${companySettings.address} • ${senderZipCode} ${companySettings.city}`
    doc.text(senderLine, 20, 45)

    // Recipient Block
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    let yPos = 55
    const personName = (invoice.customer.name || '').toString().trim()
    const companyName = (invoice.customer.companyName || '').toString().trim()

    if (personName) {
      doc.text(personName, 20, yPos)
      yPos += 4
    }
    if (companyName) {
      doc.text(companyName, 20, yPos)
      yPos += 4
    }
    doc.text(invoice.customer.address, 20, yPos)
    yPos += 4
    doc.text(`${invoice.customer.zipCode} ${invoice.customer.city}`, 20, yPos)
    yPos += 4
    if (invoice.customer.country && invoice.customer.country !== 'DE') {
      doc.text(invoice.customer.country, 20, yPos)
    }

    // Info Box (Right side)
    const boxX = 130
    const boxY = 35
    const boxW = 65
    const boxH = 35

    doc.setFillColor(240, 248, 244)
    doc.rect(boxX, boxY, boxW, boxH, 'F')
    doc.setDrawColor(...karnexGreen)
    doc.setLineWidth(0.5)
    doc.rect(boxX, boxY, boxW, boxH, 'S')

    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text('Rechnung', boxX + 5, boxY + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    yPos = boxY + 15
    const infoLabels = [
      { label: 'Beleg-Nr.', value: invoice.number.replace(/^#/, '') },
      { label: 'Kunden-Nr.', value: invoice.id.substring(0, 6).toUpperCase() },
      { label: 'Datum', value: new Date(invoice.date).toLocaleDateString('de-DE') },
      { label: 'E-Mail', value: invoice.customer.email },
      { label: 'Lieferdatum', value: new Date(invoice.dueDate || invoice.date).toLocaleDateString('de-DE') }
    ]

    infoLabels.forEach(row => {
      doc.setFont('helvetica', 'bold')
      doc.text(row.label, boxX + 5, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(String(row.value), boxX + 30, yPos)
      yPos += 4
    })

    // Invoice Title
    yPos = 110
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Rechnung', 20, yPos)

    yPos += 10
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Lieferung bzw. Leistung:', 20, yPos)

    // Table Header
    yPos += 15
    doc.setFillColor(240, 248, 244)
    doc.rect(20, yPos - 5, 170, 8, 'F')
    doc.setDrawColor(...karnexGreen)
    doc.line(20, yPos - 5, 190, yPos - 5)
    doc.line(20, yPos + 3, 190, yPos + 3)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Bezeichnung', 25, yPos)
    doc.text('EAN', 110, yPos, { align: 'center' })
    doc.text('Menge', 125, yPos)
    doc.text('MwSt.', 145, yPos)
    doc.text('Preis', 165, yPos)
    doc.text('Gesamt', 182, yPos)

    // Table Items
    yPos += 10
    doc.setFont('helvetica', 'normal')
    invoice.items.forEach(item => {
      const desc = doc.splitTextToSize(item.description, 70)
      doc.text(desc, 25, yPos)

      const ean = (item as any).ean || (item as any).sku || ''
      doc.text(String(ean), 110, yPos, { align: 'center' })
      doc.text(`${item.quantity} Stk.`, 125, yPos)
      doc.text(`${invoice.taxRate || 19}%`, 145, yPos)
      doc.text(`${item.unitPrice.toFixed(2)}`, 165, yPos)
      doc.text(`${item.total.toFixed(2)}`, 182, yPos)

      yPos += (desc.length * 4) + 2
    })

    // Totals
    yPos += 10
    doc.setDrawColor(...karnexGreen)
    doc.line(140, yPos - 5, 190, yPos - 5)

    doc.setFontSize(9)
    doc.text('Summe netto', 140, yPos)
    doc.text(`${invoice.subtotal.toFixed(2)}`, 182, yPos, { align: 'right' })

    yPos += 6
    doc.text(`MwSt. ${invoice.taxRate || 19}%`, 140, yPos)
    doc.text(`${invoice.taxAmount.toFixed(2)}`, 182, yPos, { align: 'right' })

    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Gesamt', 140, yPos)
    doc.text(`${invoice.total.toFixed(2)}`, 182, yPos, { align: 'right' })
    doc.line(140, yPos + 2, 190, yPos + 2)

    // Footer
    yPos = 270
    doc.setFillColor(240, 248, 244)
    doc.rect(0, yPos - 5, 210, 25, 'F')
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')

    const footerCompanyName = companySettings.companyName || companySettings.name
    doc.text(footerCompanyName, 20, yPos)
    doc.text(companySettings.address, 20, yPos + 4)
    doc.text(`${senderZipCode} ${companySettings.city}`, 20, yPos + 8)

    doc.text(`Geschäftsführer: ${footerCompanyName}`, 80, yPos)
    doc.text(`Telefon: ${companySettings.phone || ''}`, 80, yPos + 4)
    doc.text(`E-Mail: ${companySettings.email || ''}`, 80, yPos + 8)

    doc.text('Bankverbindungen', 140, yPos)
    doc.text(companySettings.bankName || '', 140, yPos + 4)
    doc.text(`IBAN: ${companySettings.iban || ''}`, 140, yPos + 8)
    doc.text(`BIC: ${companySettings.bic || ''}`, 140, yPos + 12)
  }

  renderDefault()
  return doc
}

/**
 * Saves PDF directly to user's downloads
 */
export async function saveArizonaPDF(invoice: InvoiceData): Promise<void> {
  const doc = await generateArizonaPDF(invoice)
  const customerName = invoice.customer.name.replace(/[^a-zA-Z0-9]/g, '-')
  const filename = `${invoice.number}-${customerName}.pdf`
  doc.save(filename)
}

