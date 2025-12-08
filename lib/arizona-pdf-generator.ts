





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
  // Template information
  templateId?: string
  templateName?: string
  templateType?: string
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
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
    ean?: string
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

  } else if (documentKind === DocumentKind.CREDIT_NOTE) {
    // ERSTATTUNG: Blue stamp + light blue watermark
    addRectangularStamp(doc, 'ERSTATTUNG', 75, 130, 60, 20, [37, 99, 235], 12)
    addDiagonalText(doc, 'ERSTATTUNG', [180, 200, 230], 70)
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

  // Apply template styling and settings (using default colors since styling was removed)
  const primaryColor = hexToRgb('#2563eb') // Default blue
  const secondaryColor = hexToRgb('#64748b') // Default gray

  // Use template bank details if available, otherwise fallback to company settings
  const bankDetails = template.bankDetails || {
    bankName: companySettings.bankName || 'Ihre Bank',
    iban: companySettings.iban || 'DE89 3704 0044 0532 0130 00',
    bic: companySettings.bic || 'COBADEFFXXX',
    accountHolder: companySettings.accountHolder || companySettings.companyName || 'Ihr Unternehmen'
  }

  // ========================================
  // INVOICE RENDERING (with template support)
  // ========================================
  const renderDefault = () => {
    // Set font
    doc.setFont('helvetica')

    // Header Background - Pure white across full width
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 50, 'F')

    // Company Logo - Support custom logo or fallback to company name
    const logoX = 20
    const logoY = 18
    const logoW = 60  // Much smaller and more proportional
    const logoH = 14  // Compact height

    const logoUrl = companySettings.logoUrl || companySettings.logo
    const displayCompanyName = companySettings.companyName || companySettings.name || 'KARNEX'

    if (logoUrl && typeof window !== 'undefined') {
      // Try to load custom logo (client-side only)
      try {
        // For now, show company name as text logo
        // TODO: Implement actual image loading for logos
        doc.setFillColor(76, 130, 106) // Default green color
        doc.rect(logoX, logoY, logoW, logoH, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(255, 255, 255)

        const textWidth = doc.getTextWidth(displayCompanyName)
        const textX = logoX + (logoW - textWidth) / 2
        const textY = logoY + logoH / 2 + 2.5

        doc.text(displayCompanyName, textX, textY)
      } catch (error) {
        console.warn('Could not load custom logo, using text fallback')
      }
    } else {
      // Fallback to company name as text logo
      doc.setFillColor(76, 130, 106) // Default green color
      doc.rect(logoX, logoY, logoW, logoH, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(255, 255, 255)

      const textWidth = doc.getTextWidth(displayCompanyName)
      const textX = logoX + (logoW - textWidth) / 2
      const textY = logoY + logoH / 2 + 2.5

      doc.text(displayCompanyName, textX, textY)
    }

    // Reset colors
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    // Company Info (Left side) - Simple and clean
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100) // Standard gray
    let yPos = 55 // Back to normal spacing
    const senderCompanyName = companySettings.companyName || companySettings.name
    const senderZipCode = companySettings.zip || companySettings.zipCode
    const senderLine = `${senderCompanyName} • ${companySettings.address} • ${senderZipCode} ${companySettings.city}`
    doc.text(senderLine, 20, yPos)

    // Invoice Info Box (Right side) - Simple and clean
    const boxX = 130
    const boxY = 45 // Back to normal position
    const boxW = 65
    const boxH = 40

    // Simple light green background
    doc.setFillColor(240, 248, 244) // Light green tint
    doc.rect(boxX, boxY, boxW, boxH, 'F')

    // Simple border
    doc.setDrawColor(76, 130, 106) // KARNEX Green border
    doc.setLineWidth(0.5)
    doc.rect(boxX, boxY, boxW, boxH, 'S')

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')

    // Document title based on type
    let title = 'Rechnung'
    if (invoice.document_kind === DocumentKind.CANCELLATION) {
      title = 'Storno-Rechnung'
    } else if (invoice.document_kind === DocumentKind.CREDIT_NOTE) {
      title = 'Gutschrift'
    }

    // Simple title
    doc.text(title, boxX + 5, boxY + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    yPos = boxY + 16
    doc.text(`Rechnungs-Nr.`, boxX + 5, yPos)
    doc.text(invoice.number.replace(/^#/, ''), boxX + 40, yPos)

    yPos += 5
    doc.text(`Kunden-Nr.`, boxX + 5, yPos)
    doc.text(invoice.id.substring(0, 6), boxX + 40, yPos)

    yPos += 5
    doc.text(`Rechnungsdatum`, boxX + 5, yPos)
    doc.text(new Date(invoice.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), boxX + 40, yPos)

    yPos += 5
    doc.text(`E-Mail`, boxX + 5, yPos)

    // Handle email display in same line with smaller font
    const email = invoice.customer.email || ''
    // Use smaller font for email (8pt instead of 9pt)
    doc.setFontSize(8)
    doc.text(email, boxX + 20, yPos)
    doc.setFontSize(9) // Reset font size

    yPos += 5

    if (invoice.document_kind === DocumentKind.INVOICE && invoice.dueDate) {
      doc.text(`Lieferdatum`, boxX + 5, yPos)
      doc.text(new Date(invoice.dueDate).toLocaleDateString('de-DE'), boxX + 40, yPos)
    } else if (invoice.reference_number) {
      doc.text(`Referenz`, boxX + 5, yPos)
      doc.text(invoice.reference_number, boxX + 40, yPos)
    }

    // Customer Info - Enhanced: separate person name and company name
    yPos = 70 // Back to normal spacing

    // Get person name and company name from separate fields
    const personName = (invoice.customer.name || '').toString().trim()
    const companyName = (invoice.customer.companyName || '').toString().trim()

    // Display person name (same as address format)
    if (personName) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(personName, 20, yPos)
      yPos += 4
    }

    // Display company name (same as address format)
    if (companyName) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(companyName, 20, yPos)
      yPos += 4
    }

    // Address information (normal font)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)

    const address1Line = (invoice.customer.address || '').toString().trim()
    const address2Line = (invoice.customer as any).address2 ? String((invoice.customer as any).address2).trim() : ''
    const zipCityLine = `${(invoice.customer.zipCode || '').toString().trim()} ${(invoice.customer.city || '').toString().trim()}`.trim()
    let countryLine = (invoice.customer.country || '').toString().trim()
    // Convert country codes to display names
    if (countryLine === 'DE' || countryLine.toLowerCase() === 'germany' || countryLine.toLowerCase() === 'deutschland') {
      countryLine = 'DE'
    } else if (countryLine === 'AT' || countryLine.toLowerCase() === 'austria' || countryLine.toLowerCase() === 'österreich') {
      countryLine = 'Österreich'
    } else if (countryLine === 'CH' || countryLine.toLowerCase() === 'switzerland' || countryLine.toLowerCase() === 'schweiz') {
      countryLine = 'Schweiz'
    }

    const addressLines: string[] = []
    if (address1Line) addressLines.push(address1Line)
    if (address2Line) addressLines.push(address2Line)
    if (zipCityLine) addressLines.push(zipCityLine)
    if (countryLine) addressLines.push(countryLine)

    addressLines.forEach((line) => {
      // Filter out "Order #" lines as requested
      if (line.trim().startsWith('Order #')) return

      doc.text(line, 20, yPos)
      yPos += 4
    })

    // Invoice Title - Simple and clean
    yPos = 130 // Back to normal position
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(title, 20, yPos)

    // Intro/thank you message (German)
    yPos += 10
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)

    let thankYouMessage = 'Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Lieferung bzw. Leistung:'
    if (invoice.document_kind === DocumentKind.CANCELLATION) {
      thankYouMessage = 'Hiermit stornieren wir folgende Rechnung:'
    } else if (invoice.document_kind === DocumentKind.CREDIT_NOTE) {
      thankYouMessage = 'Hiermit erstatten wir Ihnen folgende Beträge:'
    }

    // Left-align for German
    doc.text(thankYouMessage, 20, yPos)

    // Items Table
    yPos += 15

    // Table Header
    doc.setFillColor(240, 248, 244) // Light green tint
    doc.rect(20, yPos - 5, 170, 8, 'F')
    doc.setDrawColor(76, 130, 106) // KARNEX Green
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

    invoice.items.forEach((item, index) => {
      // Split long descriptions into two lines
      const maxLineLength = 35 // Maximum characters per line
      let descriptionLines: string[] = []

      if (item.description.length > maxLineLength) {
        // Try to split at word boundaries
        const words = item.description.split(' ')
        let currentLine = ''

        words.forEach(word => {
          if ((currentLine + ' ' + word).length <= maxLineLength) {
            currentLine += (currentLine ? ' ' : '') + word
          } else {
            if (currentLine) {
              descriptionLines.push(currentLine)
              currentLine = word
            } else {
              // Word is too long, split it
              descriptionLines.push(word.substring(0, maxLineLength))
              currentLine = word.substring(maxLineLength)
            }
          }
        })

        if (currentLine) {
          descriptionLines.push(currentLine)
        }

        // Limit to 2 lines maximum
        descriptionLines = descriptionLines.slice(0, 2)
      } else {
        descriptionLines = [item.description]
      }

      // Print description lines
      descriptionLines.forEach((line, lineIndex) => {
        doc.text(line, 25, yPos + (lineIndex * 4))
      })

      // Print other columns aligned with first line - prioritize SKU as EAN source
      const eanValue = (item as any).sku || (item as any).ean || ''
      const eanText = eanValue ? String(eanValue) : '-'

      // Debug: Show what data we have
      console.log('PDF Debug - Item:', {
        description: item.description,
        sku: (item as any).sku,
        ean: (item as any).ean,
        eanValue,
        eanText
      })

      doc.text(eanText, 110, yPos, { align: 'center' })
      doc.text(`${item.quantity} Stk.`, 125, yPos)

      // Fix undefined% issue by defaulting to 19 if taxRate is missing or 0
      const taxRate = invoice.taxRate || 19
      doc.text(`${taxRate}%`, 145, yPos)

      const unitPrice = Math.abs(item.unitPrice)
      const total = Math.abs(item.total)

      if (invoice.document_kind === DocumentKind.CANCELLATION || invoice.document_kind === DocumentKind.CREDIT_NOTE) {
        doc.text(`-${unitPrice.toFixed(2)}`, 165, yPos)
        doc.text(`-${total.toFixed(2)}`, 182, yPos)
      } else {
        doc.text(`${unitPrice.toFixed(2)}`, 165, yPos)
        doc.text(`${total.toFixed(2)}`, 182, yPos)
      }

      // Adjust yPos based on number of description lines
      yPos += Math.max(6, descriptionLines.length * 4 + 2)
    })

    // Totals Section
    yPos += 10

    // Subtotal
    // Add line before Summe netto with more space
    doc.setDrawColor(76, 130, 106) // KARNEX Green
    doc.line(140, yPos - 5, 190, yPos - 5)

    doc.setFontSize(9)
    doc.text('Summe netto', 140, yPos)
    const subtotal = Math.abs(invoice.subtotal)
    if (invoice.document_kind === DocumentKind.CANCELLATION || invoice.document_kind === DocumentKind.CREDIT_NOTE) {
      doc.text(`-${subtotal.toFixed(2)}`, 180, yPos)
    } else {
      doc.text(`${subtotal.toFixed(2)}`, 180, yPos)
    }

    yPos += 6
    const finalTaxRate = invoice.taxRate || 19
    doc.text(`MwSt. ${finalTaxRate}%`, 140, yPos)
    const taxAmount = Math.abs(invoice.taxAmount)
    if (invoice.document_kind === DocumentKind.CANCELLATION || invoice.document_kind === DocumentKind.CREDIT_NOTE) {
      doc.text(`-${taxAmount.toFixed(2)}`, 180, yPos)
    } else {
      doc.text(`${taxAmount.toFixed(2)}`, 180, yPos)
    }

    // Total
    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Gesamt', 140, yPos)

    const total = Math.abs(invoice.total)
    if (invoice.document_kind === DocumentKind.CANCELLATION || invoice.document_kind === DocumentKind.CREDIT_NOTE) {
      doc.text(`-${total.toFixed(2)}`, 180, yPos)
    } else {
      doc.text(`${total.toFixed(2)}`, 180, yPos)
    }

    doc.setDrawColor(76, 130, 106) // KARNEX Green
    doc.line(140, yPos + 2, 190, yPos + 2)

    // Footer Message
    yPos += 20
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)

    // Thank you message section without background
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60) // Dark gray text

    // Use custom footer text if available, otherwise default
    const footerText = companySettings.footerText || 'Wir bedanken uns für Ihren Auftrag und freuen uns auf die weitere Zusammenarbeit.'
    doc.text(footerText, 20, yPos)

    doc.setFont('helvetica', 'normal')
    doc.text('Sie haben Fragen oder wünschen weitere Informationen? Rufen Sie uns an', 20, yPos + 6)
    doc.text('wir sind für Sie da.', 20, yPos + 10)

    // Show reason if available
    if (invoice.grund) {
      doc.setTextColor(220, 38, 38)
      doc.text(`Grund: ${invoice.grund}`, 20, yPos + 14)
    }

    yPos += 20

    // Company Footer
    yPos = 270
    doc.setFillColor(240, 248, 244) // Light green tint
    doc.rect(0, yPos - 5, 210, 25, 'F')

    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)

    // Left column - Use new field names with fallback
    const footerCompanyName = companySettings.companyName || companySettings.name
    const footerZipCode = companySettings.zip || companySettings.zipCode

    doc.text(footerCompanyName, 20, yPos)
    yPos += 3
    doc.text(companySettings.address, 20, yPos)
    yPos += 3
    doc.text(`${footerZipCode} ${companySettings.city}`, 20, yPos)
    yPos += 3
    doc.text(companySettings.country, 20, yPos)

    // Middle column - Use dynamic values
    yPos = 270
    doc.text(`Geschäftsführer: ${footerCompanyName}`, 80, yPos)
    yPos += 3
    if (companySettings.phone) {
      doc.text(`Telefon: ${companySettings.phone}`, 80, yPos)
      yPos += 3
    }
    if (companySettings.email) {
      doc.text(`E-Mail: ${companySettings.email}`, 80, yPos)
    }

    // Right column
    yPos = 270
    doc.text('Bankverbindungen', 140, yPos)
    yPos += 3
    doc.text(`${companySettings.bankName}`, 140, yPos)
    yPos += 3
    doc.text(`IBAN: ${companySettings.iban}`, 140, yPos)
    yPos += 3
    doc.text(`BIC: ${companySettings.bic}`, 140, yPos)

    // Tax info - positioned under each other
    yPos += 8
    const taxNumber = companySettings.taxNumber || companySettings.taxId
    if (taxNumber) {
      doc.text(`Steuernummer: ${taxNumber}`, 80, yPos)
      yPos += 3
    }
    // Use the same tax number for USt-IdNr if available
    if (taxNumber) {
      doc.text(`USt.-IdNr.: ${taxNumber}`, 80, yPos)
    }
  } // End of renderDefault function

  // Helper: run custom user code (if enabled)
  const runCustomCode = (code: string) => {
    try {
      const api = { renderDefault }
      const fn = new Function('doc', 'invoice', 'settings', 'jsPDF', 'api', code)
      fn(doc, invoice as any, companySettings as any, jsPDF, api)
      return true
    } catch (e) {
      console.error('Custom PDF code error:', e)
      return false
    }
  }

  // ========================================
  // PDF GENERATION EXECUTION
  // ========================================

  // Get custom template settings
  const customEnabled = (companySettings as any).pdfTemplateEnabled
  const customMode = (companySettings as any).pdfTemplateMode || 'custom_only'
  const customCode = (companySettings as any).pdfTemplateCode || ''

  // Step 1: Render default invoice content (now with template support)
  renderDefault()

  // Step 2: Add document-specific stamps and watermarks (including template watermarks)
  const totalPages = doc.getNumberOfPages()
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum)
    addDocumentStamps(doc, invoice.document_kind)

    // Add template-specific watermark if configured
    // TODO: Implement template watermarks in future update
    // if (template.settings.watermarkText) {
    //   const watermarkColor = hexToRgb(template.settings.watermarkColor || '#10b981')
    //   addWatermark(doc, template.settings.watermarkText, watermarkColor)
    // }
  }

  // Step 3: Apply custom code overlay (if enabled)
  if (customEnabled && customCode && customMode === 'custom_after') {
    runCustomCode(customCode)
  }

  // Step 4: Add QR-Code for payment (if enabled)
  console.log('PDF Generator - QR-Code settings:', invoice.qrCodeSettings)
  if (invoice.qrCodeSettings && invoice.qrCodeSettings.enabled) {
    console.log('PDF Generator - Adding high-quality QR-Code to PDF')
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

      // Add professional QR-Code using the new flex system
      // Use user-selected placement or default to flex-beside-thanks
      const placement = invoice.qrCodeSettings.placement || 'flex-beside-thanks'
      const qrResult = await addQRCodeToPDF(doc, paymentData, placement as any)

      if (qrResult.success) {
        console.log('High-quality QR-Code successfully added to PDF')
        console.log(`Layout: ${qrResult.layout}, Responsive: ${qrResult.responsive}`)

        if (qrResult.layout === 'flex') {
          console.log(`QR-Code positioned using flex system - column width: ${qrResult.columnWidth}mm`)
        } else if (qrResult.layout === 'grid') {
          console.log('QR-Code positioned using grid system - no overlap issues')
        }
      } else {
        console.warn('Failed to add QR-Code to PDF')
      }

    } catch (error) {
      console.warn('Failed to generate QR-Code:', error)
      // Continue without QR-Code if generation fails
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

/**
 * Generates PDF as buffer for email attachments
 */
export async function generateArizonaPDFBuffer(invoiceId: string): Promise<Buffer | null> {
  try {
    // Direct data access instead of fetch
    let invoiceData = null;

    // Try to find in global scope if available (server runtime)
    if (global.allInvoices) {
      invoiceData = global.allInvoices.find((inv: any) => inv.id === invoiceId)
    }

    // If not found, try to load from disk using dynamic import to avoid client-side bundling issues
    if (!invoiceData) {
      try {
        // Dynamically import server-storage only when running on server
        // @ts-ignore
        const { loadInvoicesFromDisk } = require('./server-storage')
        const allInvoices = loadInvoicesFromDisk()
        invoiceData = allInvoices.find((inv: any) => inv.id === invoiceId)
      } catch (e) {
        console.warn('Could not load invoices from disk (likely client-side)', e)
      }
    }

    if (!invoiceData) {
      console.error(`Invoice ${invoiceId} not found for PDF generation`)
      return null
    }

    // Generate PDF document
    const doc = await generateArizonaPDF(invoiceData)

    // Convert to buffer for email attachment
    return Buffer.from(doc.output('arraybuffer'))
  } catch (error) {
    console.error('Error generating Arizona PDF buffer:', error)
    return null
  }
}



