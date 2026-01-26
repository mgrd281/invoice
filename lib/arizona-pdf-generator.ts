





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
    paymentTerms: boolean
    bankDetails: boolean
    taxId: boolean
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

/**
 * Handle 3-digit and 6-digit hex codes
 */
function normalizeHex(hex: string): [number, number, number] {
  let c: any = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  c = '0x' + c.join('');
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
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
  let primaryColorRGB: [number, number, number];
  try {
    primaryColorRGB = hexToRgb(primaryColorHex);
    if (primaryColorHex.length === 4) { // Handle #RGB shorthand
      primaryColorRGB = normalizeHex(primaryColorHex);
    }
  } catch (e) {
    primaryColorRGB = [76, 130, 106];
  }
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
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(7)
    const senderZipCode = companySettings.zip || companySettings.zipCode
    const senderLine = `${displayCompanyName} • ${companySettings.address} • ${senderZipCode} ${companySettings.city}`
    doc.text(senderLine, 20, 45)

    // Recipient Block
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
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
    if (invoice.customer.country && invoice.customer.country !== 'DE') {
      yPos += 4
      doc.text(invoice.customer.country, 20, yPos)
    }

    // Info Box (Top Right)
    const boxX = 130, boxY = 35, boxW = 65, boxH = 40
    doc.setFillColor(255, 255, 255) // White background like in image
    doc.rect(boxX, boxY, boxW, boxH, 'F')
    doc.setDrawColor(...primaryColorRGB)
    doc.setLineWidth(0.5)
    doc.rect(boxX, boxY, boxW, boxH, 'S')

    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text('Rechnung', boxX + 5, boxY + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const info = [
      ['Beleg-Nr.', invoice.number.replace(/^#/, '')],
      ['Kunden-Nr.', (invoice as any).customerNumber || invoice.id.substring(0, 6).toUpperCase()],
      ['Datum', new Date(invoice.date).toLocaleDateString('de-DE')],
      ['E-Mail', invoice.customer.email],
      ['Lieferdatum', new Date(invoice.dueDate || invoice.date).toLocaleDateString('de-DE')]
    ]
    info.forEach((row, i) => {
      if (row[0] === 'Kunden-Nr.' && !invoice.showSettings?.customerNumber) return;

      doc.setFont('helvetica', 'bold')
      doc.text(row[0], boxX + 5, boxY + 16 + (i * 5))
      doc.setFont('helvetica', 'normal')
      doc.text(String(row[1]), boxX + boxW - 5, boxY + 16 + (i * 5), { align: 'right' })
    })

    // Contact Person (if enabled and set)
    if (invoice.showSettings?.contactPerson && companySettings.name) {
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text(`Ihr Ansprechpartner: ${companySettings.name}`, 20, 105)
    }

    // Sub Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Rechnung', 20, 115)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Lieferung bzw. Leistung:', 20, 125)

    renderItemsTable(135)
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

    // Header Background
    doc.setFillColor(...primaryColorRGB)
    doc.rect(tableX, yPos - 5, tableWidth, 9, 'F')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)

    // Column Definitions based on image: Bezeichnung, EAN, Menge, MwSt., Preis, Gesamt
    doc.text('Bezeichnung', tableX + 5, yPos + 1)
    if (invoice.showSettings?.articleNumber) {
      doc.text('EAN', tableX + tableWidth - 85, yPos + 1, { align: 'center' })
    }
    doc.text('Menge', tableX + tableWidth - 65, yPos + 1, { align: 'center' })
    if (invoice.showSettings?.vatPerItem) {
      doc.text('MwSt.', tableX + tableWidth - 45, yPos + 1, { align: 'center' })
    }
    doc.text('Preis', tableX + tableWidth - 25, yPos + 1, { align: 'right' })
    doc.text('Gesamt', tableX + tableWidth - 5, yPos + 1, { align: 'right' })

    // Items
    yPos += 12
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    invoice.items.forEach(item => {
      const desc = doc.splitTextToSize(item.description, tableWidth - 100)
      doc.text(desc, tableX + 5, yPos)

      // EAN
      if (invoice.showSettings?.articleNumber) {
        const ean = item.ean || ''
        doc.text(String(ean), tableX + tableWidth - 85, yPos, { align: 'center' })
      }

      // Menge
      doc.text(`${item.quantity} Stk.`, tableX + tableWidth - 65, yPos, { align: 'center' })

      // MwSt.
      if (invoice.showSettings?.vatPerItem) {
        const vat = item.vat || invoice.taxRate || 19
        doc.text(`${vat}%`, tableX + tableWidth - 45, yPos, { align: 'center' })
      }

      // Preis & Gesamt
      doc.text(`${item.unitPrice.toFixed(2)}`, tableX + tableWidth - 25, yPos, { align: 'right' })
      doc.text(`${item.total.toFixed(2)}`, tableX + tableWidth - 5, yPos, { align: 'right' })

      yPos += (desc.length * 4.5) + 3
    })

    // Totals Block
    yPos += 10
    const totalX = tableX + tableWidth - 70
    doc.setDrawColor(...primaryColorRGB)
    doc.line(totalX, yPos - 5, tableX + tableWidth, yPos - 5)

    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.text('Summe netto', totalX, yPos)
    doc.text(`${invoice.subtotal.toFixed(2)}`, tableX + tableWidth - 5, yPos, { align: 'right' })

    yPos += 6
    doc.text(`MwSt. ${invoice.taxRate || 19}%`, totalX, yPos)
    doc.text(`${invoice.taxAmount.toFixed(2)}`, tableX + tableWidth - 5, yPos, { align: 'right' })

    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.text('Gesamt', totalX, yPos)
    doc.text(`${invoice.total.toFixed(2)}`, tableX + tableWidth - 5, yPos, { align: 'right' })

    // Closing Text like in image
    yPos += 20
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('Wir bedanken uns für Ihren Auftrag und freuen uns auf die weitere Zusammenarbeit.', tableX, yPos)
    yPos += 6
    doc.setFont('helvetica', 'normal')
    doc.text('Sie haben Fragen oder wünschen weitere Informationen? Rufen Sie uns an', tableX, yPos)
    yPos += 5
    doc.text('wir sind für Sie da.', tableX, yPos)

    // Payment Terms (if enabled)
    if (invoice.showSettings?.paymentTerms) {
      yPos += 8
      doc.setFont('helvetica', 'bold')
      doc.text('Zahlungsbedingungen:', tableX, yPos)
      doc.setFont('helvetica', 'normal')
      // Calculate due date diff or show standard text
      const dueDate = new Date(invoice.dueDate);
      const issueDate = new Date(invoice.date);
      const diffTime = Math.abs(dueDate.getTime() - issueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      doc.text(`Zahlbar innerhalb von ${diffDays > 0 ? diffDays : '14'} Tagen ohne Abzug.`, tableX + 40, yPos)
    }

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
    const footerY = 265
    doc.setFillColor(245, 248, 247) // Light greenish/grayish background
    doc.rect(0, footerY - 5, 210, 40, 'F')

    doc.setFontSize(7.5)
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'normal')

    const col1X = 20
    const col2X = 80
    const col3X = 140

    // Column 1: Company & Address
    const name = companySettings.companyName || companySettings.name || 'KARINEX'
    doc.text(name, col1X, footerY)
    doc.text(companySettings.address, col1X, footerY + 4)
    doc.text(`${companySettings.zipCode} ${companySettings.city}`, col1X, footerY + 8)
    doc.text(companySettings.country || 'Deutschland', col1X, footerY + 12)

    // Column 2: Management & Contact
    doc.text(`Geschäftsführer: ${name}`, col2X, footerY)
    doc.text(`Telefon: ${companySettings.phone || '--'}`, col2X, footerY + 4)
    doc.text(`E-Mail: ${companySettings.email || '--'}`, col2X, footerY + 8)

    // Column 3: Bank
    if (invoice.showSettings?.bankDetails) {
      doc.text('Bankverbindungen', col3X, footerY)
      doc.text(companySettings.bankName || '--', col3X, footerY + 4)
      doc.text(`IBAN: ${companySettings.iban || ''}`, col3X, footerY + 8)
      doc.text(`BIC: ${companySettings.bic || ''}`, col3X, footerY + 12)
    }

    // Lower Footer Line (Tax IDs)
    if (invoice.showSettings?.taxId) {
      let yPos = footerY + 22
      doc.text(`Steuernummer: ${companySettings.taxId || '--'}`, col2X, yPos)
      doc.text(`USt.-IdNr.: ${companySettings.vatId || '--'}`, col2X, yPos + 4)
    }
  }

  // QR-Code Integration
  if (invoice.showSettings?.qrCode || invoice.showSettings?.epcQrCode) {
    if (invoice.qrCodeSettings) {
      await addQRCodeToPDF(doc, {
        iban: invoice.qrCodeSettings.iban || '',
        bic: invoice.qrCodeSettings.bic || '',
        recipientName: invoice.qrCodeSettings.recipientName || '',
        amount: invoice.total,
        reference: invoice.number
      } as any)
    }
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

