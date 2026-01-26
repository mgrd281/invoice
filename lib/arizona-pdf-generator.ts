





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

  // Branding Logic
  const primaryColorHex = invoice.primaryColor || '#4c826a' // Default KARINEX Green
  const primaryColorRGB: [number, number, number] = hexToRgb(primaryColorHex)
  const logoScale = invoice.logoSize ? invoice.logoSize / 100 : 1.0

  // ========================================
  // LAYOUT: CLASSIC (Default)
  // ========================================
  const renderClassic = () => {
    doc.setFont('helvetica')
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 50, 'F')

    // Company Logo / Name
    const logoX = 20
    const logoY = 18
    const logoW = 60 * logoScale
    const logoH = 14 * logoScale

    const displayCompanyName = companySettings.companyName || companySettings.name || 'KARINEX'

    doc.setFillColor(...primaryColorRGB)
    doc.rect(logoX, logoY, logoW, logoH, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12 * logoScale)
    doc.setTextColor(255, 255, 255)

    const logoTextWidth = doc.getTextWidth(displayCompanyName)
    doc.text(displayCompanyName, logoX + (logoW - logoTextWidth) / 2, logoY + logoH / 2 + (2.5 * logoScale))

    // Sender line
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(7)
    const senderZipCode = companySettings.zip || companySettings.zipCode
    const senderLine = `${displayCompanyName} • ${companySettings.address} • ${senderZipCode} ${companySettings.city}`
    doc.text(senderLine, 20, 45)

    // Recipient Block
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    let yPos = 55
    if (invoice.customer.name) {
      doc.text(invoice.customer.name, 20, yPos)
      yPos += 4
    }
    if (invoice.customer.companyName) {
      doc.text(invoice.customer.companyName, 20, yPos)
      yPos += 4
    }
    doc.text(invoice.customer.address, 20, yPos)
    yPos += 4
    doc.text(`${invoice.customer.zipCode} ${invoice.customer.city}`, 20, yPos)

    // Info Box
    const boxX = 130, boxY = 35, boxW = 65, boxH = 35
    doc.setFillColor(245, 245, 245) // Light gray bg
    doc.rect(boxX, boxY, boxW, boxH, 'F')
    doc.setDrawColor(...primaryColorRGB)
    doc.setLineWidth(0.5)
    doc.rect(boxX, boxY, boxW, boxH, 'S')

    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text('Rechnung', boxX + 5, boxY + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const info = [
      ['Beleg-Nr.', invoice.number.replace(/^#/, '')],
      ['Kunden-Nr.', (invoice as any).customerNumber || invoice.id.substring(0, 6).toUpperCase()],
      ['Datum', new Date(invoice.date).toLocaleDateString('de-DE')],
      ['E-Mail', invoice.customer.email],
      ['Lieferdatum', new Date(invoice.dueDate || invoice.date).toLocaleDateString('de-DE')]
    ]
    info.forEach((row, i) => {
      doc.setFont('helvetica', 'bold')
      doc.text(row[0], boxX + 5, boxY + 15 + (i * 4))
      doc.setFont('helvetica', 'normal')
      doc.text(String(row[1]), boxX + 28, boxY + 15 + (i * 4))
    })

    renderItemsTable(120)
  }

  // ========================================
  // LAYOUT: MODERN
  // ========================================
  const renderModern = () => {
    // Top Bar
    doc.setFillColor(...primaryColorRGB)
    doc.rect(0, 0, 210, 40, 'F')

    // Logo on white circle or just text
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24 * logoScale)
    doc.setFont('helvetica', 'bold')
    doc.text(companySettings.name || 'KARINEX', 20, 25)

    // Address in top bar right
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`${companySettings.address}`, 190, 15, { align: 'right' })
    doc.text(`${companySettings.zipCode} ${companySettings.city}`, 190, 20, { align: 'right' })
    doc.text(`${companySettings.email}`, 190, 25, { align: 'right' })

    // Big Title
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(32)
    doc.setFont('helvetica', 'bold')
    doc.text('RECHNUNG', 20, 65)

    // Info Grid
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('RECHNUNG AN', 20, 85)
    doc.text('RECHNUNGSDATEN', 130, 85)

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(invoice.customer.name, 20, 92)
    doc.text(invoice.customer.address, 20, 97)
    doc.text(`${invoice.customer.zipCode} ${invoice.customer.city}`, 20, 102)

    doc.text(`NR: ${invoice.number}`, 130, 92)
    doc.text(`DATUM: ${new Date(invoice.date).toLocaleDateString('de-DE')}`, 130, 97)
    doc.text(`FÄLLIG: ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}`, 130, 102)

    renderItemsTable(130)
  }

  // ========================================
  // LAYOUT: MINIMAL
  // ========================================
  const renderMinimal = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14 * logoScale)
    doc.setTextColor(0, 0, 0)
    doc.text(companySettings.name || 'KARINEX', 20, 25)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`${companySettings.address} | ${companySettings.zipCode} ${companySettings.city}`, 20, 32)

    doc.setFontSize(22)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...primaryColorRGB)
    doc.text('Rechnung', 190, 25, { align: 'right' })

    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(`Nummer: ${invoice.number}`, 190, 35, { align: 'right' })
    doc.text(`Datum: ${new Date(invoice.date).toLocaleDateString('de-DE')}`, 190, 40, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('Empfänger:', 20, 60)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.customer.name, 20, 65)
    doc.text(invoice.customer.address, 20, 70)
    doc.text(`${invoice.customer.zipCode} ${invoice.customer.city}`, 20, 75)

    renderItemsTable(100)
  }

  // ========================================
  // LAYOUT: BOLD HEADER
  // ========================================
  const renderBoldHeader = () => {
    // Left Sidebar colored
    doc.setFillColor(...primaryColorRGB)
    doc.rect(0, 0, 70, 297, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24 * logoScale)
    doc.setFont('helvetica', 'bold')
    doc.text(companySettings.name || 'KARINEX', 10, 30)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('KONTAKT', 10, 70)
    doc.setFontSize(8)
    doc.text(companySettings.email || '', 10, 78)
    doc.text(companySettings.phone || '', 10, 83)
    doc.text(companySettings.address, 10, 95, { maxWidth: 50 })

    doc.setFontSize(10)
    doc.text('BANK', 10, 120)
    doc.setFontSize(8)
    doc.text(companySettings.bankName || '', 10, 128)
    doc.text(`IBAN: ${companySettings.iban || ''}`, 10, 133, { maxWidth: 50 })

    // Content area
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(40)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', 80, 40)

    doc.setFontSize(12)
    doc.text('BILLED TO', 80, 70)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.customer.name, 80, 78)
    doc.text(invoice.customer.address, 80, 83)
    doc.text(`${invoice.customer.zipCode} ${invoice.customer.city}`, 80, 88)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE DETAILS', 140, 70)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Number: ${invoice.number}`, 140, 78)
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('de-DE')}`, 140, 83)

    renderItemsTable(120, 80, 120)
  }

  // ========================================
  // SHARED: ITEMS TABLE RENDERER
  // ========================================
  const renderItemsTable = (startY: number, tableX = 20, tableWidth = 170) => {
    let yPos = startY

    // Header
    doc.setFillColor(...primaryColorRGB)
    doc.rect(tableX, yPos - 5, tableWidth, 8, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Bezeichnung', tableX + 5, yPos)
    doc.text('Menge', tableX + tableWidth - 60, yPos)
    doc.text('Preis', tableX + tableWidth - 35, yPos)
    doc.text('Gesamt', tableX + tableWidth - 10, yPos, { align: 'right' })

    // Items
    yPos += 10
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    invoice.items.forEach(item => {
      const desc = doc.splitTextToSize(item.description, tableWidth - 80)
      doc.text(desc, tableX + 5, yPos)
      doc.text(`${item.quantity}`, tableX + tableWidth - 60, yPos)
      doc.text(`${item.unitPrice.toFixed(2)}`, tableX + tableWidth - 35, yPos)
      doc.text(`${item.total.toFixed(2)}`, tableX + tableWidth - 5, yPos, { align: 'right' })
      yPos += (desc.length * 4) + 2
    })

    // Totals
    yPos += 10
    doc.setDrawColor(...primaryColorRGB)
    doc.line(tableX + tableWidth - 70, yPos - 5, tableX + tableWidth, yPos - 5)

    doc.setFontSize(10)
    doc.text('Netto:', tableX + tableWidth - 70, yPos)
    doc.text(`${invoice.subtotal.toFixed(2)}`, tableX + tableWidth - 5, yPos, { align: 'right' })
    yPos += 6
    doc.text('MwSt 19%:', tableX + tableWidth - 70, yPos)
    doc.text(`${invoice.taxAmount.toFixed(2)}`, tableX + tableWidth - 5, yPos, { align: 'right' })
    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Gesamt:', tableX + tableWidth - 70, yPos)
    doc.text(`${invoice.total.toFixed(2)}`, tableX + tableWidth - 5, yPos, { align: 'right' })

    // Footer marks
    if (invoice.showSettings?.foldMarks) {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.1)
      doc.line(0, 105, 5, 105) // Folding mark 1
      doc.line(0, 210, 5, 210) // Folding mark 2
      doc.line(0, 148.5, 7, 148.5) // Center mark
    }
  }

  // Dispatch to selected layout
  const layout = invoice.layout || 'classic'
  if (layout === 'modern') renderModern()
  else if (layout === 'minimal') renderMinimal()
  else if (layout === 'bold') renderBoldHeader()
  else renderClassic()

  // General Footer (common for non-sidebar layouts)
  if (layout !== 'bold') {
    const footerY = 270
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text(`${companySettings.companyName || companySettings.name} | ${companySettings.address} | ${companySettings.zipCode} ${companySettings.city}`, 105, footerY, { align: 'center' })
    doc.text(`IBAN: ${companySettings.iban || ''} | BIC: ${companySettings.bic || ''} | Tax ID: ${companySettings.taxId || ''}`, 105, footerY + 4, { align: 'center' })
  }

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

