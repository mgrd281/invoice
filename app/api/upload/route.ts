import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { getCompanySettings } from '@/lib/company-settings'
import * as XLSX from 'xlsx'
import {
  DocumentKind,
  DocumentStatus,
  DocumentData,
  getDocumentPrefix,
  getStatusColor,
  determineDocumentKind,
  determineDocumentStatus
} from '@/lib/document-types'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

interface ShopifyOrder {
  orderNumber: string
  customerName: string
  customerCompany?: string
  customerEmail: string
  customerAddress: string
  customerCity: string
  customerZip: string
  customerCountry: string
  orderDate: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  taxRate: number
  taxAmount: number
  // New optional identifiers
  sku?: string
  ean?: string
  rechnungstyp?: string
  statusDeutsch?: string
  grund?: string
  originalRechnung?: string
  financialStatus?: string
  paymentMethod?: string
}

// No mock data - all data goes directly to global storage

// Better CSV parsing function with auto-delimiter detection
function parseCSVLine(line: string, delimiter?: string): string[] {
  // Auto-detect delimiter if not provided
  if (!delimiter) {
    const commaCount = (line.match(/,/g) || []).length
    const semicolonCount = (line.match(/;/g) || []).length
    delimiter = semicolonCount > commaCount ? ';' : ','
  }

  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  result.push(current.trim())
  return result
}

// Helper to find value with flexible header matching
function getColumnValue(record: Record<string, string>, possibleHeaders: string[]): string {
  const recordKeys = Object.keys(record);

  for (const header of possibleHeaders) {
    // 1. Exact match
    if (record[header]) return record[header];

    // 2. Case-insensitive match
    const key = recordKeys.find(k => k.toLowerCase().trim() === header.toLowerCase().trim());
    if (key && record[key]) return record[key];
  }
  return '';
}

// Helper to parse dates including German format
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();

  // Try parsing German format (DD.MM.YYYY HH:mm:ss)
  const germanDateRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?.*$/;
  const match = dateStr.trim().match(germanDateRegex);

  if (match) {
    const [_, day, month, year, hour, minute, second] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${(hour || '00').padStart(2, '0')}:${(minute || '00').padStart(2, '0')}:${(second || '00').padStart(2, '0')}`;
  }

  // Try parsing Shopify format (YYYY-MM-DD HH:mm:ss +ZZZZ)
  // Example: 2025-12-14 22:38:42 +0100
  const shopifyDateRegex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})$/;
  const shopifyMatch = dateStr.trim().match(shopifyDateRegex);

  if (shopifyMatch) {
    const [_, year, month, day, hour, minute, second, offset] = shopifyMatch;
    // Construct ISO string with offset: YYYY-MM-DDTHH:mm:ss+HH:MM
    const offsetFormatted = offset.slice(0, 3) + ':' + offset.slice(3);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetFormatted}`;
  }

  // Try standard parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  return new Date().toISOString();
}


export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    // Local storage for parsed data
    const invoices: any[] = []
    const customers: any[] = []

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }

    // Handle file uploads (receipts, documents, etc.) - non-CSV files
    if (type && type !== 'csv') {
      // Validate file type and size
      const allowedTypes = [
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime'
      ]

      const isVideo = file.type.startsWith('video/')
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB for video, 10MB for others

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload PDF, JPG, PNG, WebP, MP4, or WebM files.' },
          { status: 400 }
        )
      }

      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${isVideo ? '50MB' : '10MB'}.` },
          { status: 400 }
        )
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileExtension = file.name.split('.').pop()
      const fileName = `${type}-${timestamp}-${randomString}.${fileExtension}`

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads')
      try {
        await mkdir(uploadsDir, { recursive: true })
      } catch (error) {
        // Directory might already exist
      }

      // Save file
      const filePath = join(uploadsDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      await writeFile(filePath, buffer)

      // Return file URL
      const fileUrl = `/uploads/${fileName}`

      return NextResponse.json({
        success: true,
        url: fileUrl,
        fileName: file.name,
        size: file.size,
        type: file.type
      })
    }

    // Check if file is CSV, Excel or Numbers
    const isCsv = file.name.endsWith('.csv')
    const isExcel = file.name.endsWith('.xlsx')
    const isNumbers = file.name.endsWith('.numbers')

    if (!isCsv && !isExcel && !isNumbers) {
      return NextResponse.json(
        { error: 'Nur CSV, Excel (.xlsx) oder Numbers (.numbers) Dateien sind erlaubt' },
        { status: 400 }
      )
    }

    // Read file content
    let fileContent = ''

    if (isExcel || isNumbers) {
      try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        if (workbook.SheetNames.length === 0) {
          throw new Error('Keine Tabellenblätter gefunden')
        }

        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        fileContent = XLSX.utils.sheet_to_csv(worksheet)
      } catch (error) {
        console.error('Error parsing spreadsheet:', error)
        return NextResponse.json(
          { error: 'Fehler beim Lesen der Excel/Numbers Datei. Bitte stellen Sie sicher, dass die Datei nicht beschädigt ist.' },
          { status: 400 }
        )
      }
    } else {
      fileContent = await file.text()
    }

    const lines = fileContent.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'Datei ist leer oder hat keine Daten' },
        { status: 400 }
      )
    }

    // Parse CSV header with auto-delimiter detection
    const headers = parseCSVLine(lines[0])
    console.log('CSV Headers:', headers)
    console.log('Number of headers:', headers.length)

    // Process CSV data
    let recordsProcessed = 0
    let invoicesCreated = 0
    let customersCreated = 0
    const errors: string[] = []

    // Group orders by customer and order number
    const orderGroups: Map<string, ShopifyOrder[]> = new Map()

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])

        // Allow some flexibility in column count (±2 columns)
        if (Math.abs(values.length - headers.length) > 2) {
          errors.push(`Zeile ${i + 1}: Anzahl der Spalten stimmt nicht überein (${values.length} vs ${headers.length})`)
          continue
        }

        // Pad values array if it's shorter than headers
        while (values.length < headers.length) {
          values.push('')
        }

        // Create a record object
        const record: Record<string, string> = {}
        headers.forEach((header, index) => {
          record[header] = values[index] || ''
        })

        // Debug logging for first few records
        if (i <= 3) {
          console.log(`Record ${i} mapping:`)
          console.log('Available headers:', Object.keys(record))
        }

        // Map common Shopify CSV fields with more flexibility - prioritize Bestellnummer
        const order: ShopifyOrder = {
          orderNumber: getColumnValue(record, ['Bestellnummer', 'Order Number', 'Name', 'Order']) || `ORD-${Date.now()}-${i}`,
          customerName: getColumnValue(record, ['Billing Name', 'Shipping Name', 'Customer Name', 'Name', 'Kundenname', 'Rechnungsname', 'Liefername', 'Customer']) || 'Unbekannter Kunde',
          customerCompany: getColumnValue(record, ['Company', 'Billing Company', 'Shipping Company', 'Firma', 'Unternehmen', 'Lieferfirma']) || '',
          customerEmail: getColumnValue(record, ['Email', 'Customer Email', 'E-Mail', 'Billing Email', 'Shipping Email', 'Lieferemail']) || `kunde${i}@example.com`,
          customerAddress: getColumnValue(record, ['Billing Address1', 'Shipping Address1', 'Address1', 'Adresse', 'Billing Address', 'Shipping Address', 'Street', 'Straße', 'Rechnungsadresse', 'Lieferadresse']) || 'Musterstraße 1',
          customerCity: getColumnValue(record, ['Billing City', 'Shipping City', 'City', 'Stadt', 'Ort', 'Rechnungsstadt', 'Lieferstadt']) || 'Berlin',
          customerZip: getColumnValue(record, ['Billing Zip', 'Shipping Zip', 'Zip', 'PLZ', 'Postal Code', 'Postleitzahl', 'RechnungsPLZ', 'LieferPLZ']) || '12345',
          customerCountry: getColumnValue(record, ['Billing Country', 'Shipping Country', 'Country', 'Land', 'Country Code', 'Rechnungsland', 'Lieferland']) || 'DE',
          orderDate: parseDate(getColumnValue(record, ['Fulfilled at', 'Erfüllt am', 'Created at', 'Date', 'Bestelldatum', 'Order Date', 'Paid at'])),
          productName: getColumnValue(record, ['Lineitem name', 'Product', 'Item', 'Produktname', 'Product Name']) || 'Produkt',
          quantity: parseInt(getColumnValue(record, ['Lineitem quantity', 'Quantity', 'Menge', 'Qty']) || '1'),
          unitPrice: parseFloat(getColumnValue(record, ['Lineitem price', 'Price', 'Unit Price', 'Preis', 'Einzelpreis']) || '0'),
          totalPrice: parseFloat(getColumnValue(record, ['Total', 'Amount', 'Gesamt', 'Line Total']) || '0'),
          taxRate: 19, // Default German VAT
          taxAmount: 0,
          // Identifiers from CSV (flexible header names)
          sku: getColumnValue(record, ['Lineitem sku', 'SKU', 'Artikelnummer', 'Art.-Nr.']) || '',
          ean: getColumnValue(record, ['Lineitem sku', 'EAN', 'Barcode', 'GTIN']) || ''
        }

        // Add additional fields for invoice type detection
        order.rechnungstyp = getColumnValue(record, ['Rechnungstyp']) || 'Rechnung'
        order.statusDeutsch = getColumnValue(record, ['Status_Deutsch', 'Status']) || ''
        order.grund = getColumnValue(record, ['Grund']) || ''
        order.originalRechnung = getColumnValue(record, ['Original_Rechnung', 'Originalrechnung']) || ''
        order.financialStatus = getColumnValue(record, ['Financial Status', 'Finanzstatus']) || ''
        order.paymentMethod = getColumnValue(record, ['Payment Method', 'Payment', 'Zahlungsmethode', 'Zahlungsart']) || ''

        // Calculate tax amount if not provided - unitPrice already includes tax (Brutto)
        if (!order.taxAmount) {
          // Extract tax from unit price: tax = brutto - (brutto / (1 + taxRate/100))
          const bruttoTotal = order.unitPrice * order.quantity
          const nettoTotal = bruttoTotal / (1 + order.taxRate / 100)
          order.taxAmount = bruttoTotal - nettoTotal
        }

        // Group by order number
        const key = `${order.customerEmail}-${order.orderNumber}`
        if (!orderGroups.has(key)) {
          orderGroups.set(key, [])
        }
        orderGroups.get(key)!.push(order)

        recordsProcessed++

      } catch (error) {
        errors.push(`Zeile ${i + 1}: Fehler beim Verarbeiten - ${error}`)
      }
    }

    // Create customers and invoices from grouped orders
    orderGroups.forEach((orders, key) => {
      try {
        const firstOrder = orders[0]

        // Create or find customer in local storage
        let customer = customers.find((c: any) => c.email === firstOrder.customerEmail)
        if (!customer) {
          customer = {
            id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: firstOrder.customerName || 'Unbekannter Kunde',
            email: firstOrder.customerEmail || '',
            address: firstOrder.customerAddress || '',
            zipCode: firstOrder.customerZip || '',
            city: firstOrder.customerCity || '',
            country: firstOrder.customerCountry || 'Deutschland',
            taxId: '',
            notes: '',
            invoiceCount: 0,
            totalAmount: '€0.00',
            phone: '+49 123 456789', // Default phone
            createdAt: new Date().toISOString()
          }
          customers.push(customer)
          customersCreated++
        }

        // Determine document kind and status using new system
        const csvData = {
          rechnungstyp: firstOrder.rechnungstyp,
          statusDeutsch: firstOrder.statusDeutsch,
          financialStatus: orders[0]?.financialStatus,
          orderNumber: firstOrder.orderNumber,
          total: orders.reduce((sum: number, order: ShopifyOrder) => sum + (order.unitPrice * order.quantity), 0) // Keep brutto total for document detection
        }

        const documentKind = determineDocumentKind(csvData)
        const documentStatus = determineDocumentStatus(csvData, documentKind)

        // Calculate totals with correct signs - unitPrice already includes tax (Brutto)
        // For each item: extract netto price first, then calculate totals
        let total = 0
        let subtotal = 0
        let taxAmount = 0

        orders.forEach((order: ShopifyOrder) => {
          // unitPrice is brutto (includes 19% tax already)
          const bruttoItemTotal = order.unitPrice * order.quantity
          // Extract netto from brutto: netto = brutto / (1 + taxRate/100)
          const nettoItemTotal = bruttoItemTotal / (1 + firstOrder.taxRate / 100)
          // Tax for this item
          const taxItemTotal = bruttoItemTotal - nettoItemTotal

          total += bruttoItemTotal
          subtotal += nettoItemTotal
          taxAmount += taxItemTotal
        })

        // Apply correct signs for Storno/Gutschrift
        if (documentKind === DocumentKind.CANCELLATION ||
          documentKind === DocumentKind.CREDIT_NOTE ||
          documentKind === DocumentKind.REFUND_FULL ||
          documentKind === DocumentKind.REFUND_PARTIAL) {
          if (total > 0) {
            subtotal = -subtotal
            taxAmount = -taxAmount
            total = -total
          }
        }

        // Generate document number
        const prefix = getDocumentPrefix(documentKind)
        let documentNumber = firstOrder.orderNumber

        if (!documentNumber || documentNumber.startsWith('ORD-')) {
          const count = invoices.filter((inv: any) => inv.number?.startsWith(prefix)).length + 1
          documentNumber = `${prefix}-2024-${String(count).padStart(3, '0')}`
        }

        // Get status color
        const statusColor = getStatusColor(documentStatus)

        // Additional fields
        const grund = firstOrder.grund || ''
        const originalRechnung = firstOrder.originalRechnung || ''

        // Create invoice
        const invoice = {
          id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          number: documentNumber,
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          customerAddress: customer.address,
          customerCity: customer.city,
          customerZip: customer.zipCode,
          customerCountry: customer.country,
          date: firstOrder.orderDate,
          dueDate: documentKind === DocumentKind.CANCELLATION || documentKind === DocumentKind.CREDIT_NOTE ? '' : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: orders.map((order: ShopifyOrder) => {
            // unitPrice from CSV is brutto
            const bruttoUnitPrice = order.unitPrice
            const bruttoTotal = bruttoUnitPrice * order.quantity

            // Calculate net values
            const nettoUnitPrice = bruttoUnitPrice / (1 + firstOrder.taxRate / 100)
            const nettoTotal = nettoUnitPrice * order.quantity
            const taxAmount = bruttoTotal - nettoTotal

            return {
              id: `item-${Math.random().toString(36).substr(2, 9)}`,
              description: order.productName,
              quantity: order.quantity,
              unitPrice: nettoUnitPrice, // Net unit price
              netAmount: nettoTotal,
              grossAmount: bruttoTotal,
              taxAmount: taxAmount,
              ean: order.sku || order.ean || undefined
            }
          }),
          subtotal,
          taxRate: firstOrder.taxRate,
          taxAmount,
          total,
          status: documentStatus,
          statusColor,
          amount: `${total.toFixed(2)} €`,
          createdAt: new Date().toISOString(),
          shopifyOrderNumber: firstOrder.orderNumber,
          // New document type fields
          document_kind: documentKind,
          document_number: documentNumber,
          reference_number: originalRechnung,
          totals_signed: true,
          grund: grund,
          // Legacy compatibility
          type: documentKind === DocumentKind.CANCELLATION ? 'STORNO' : documentKind === DocumentKind.CREDIT_NOTE ? 'GUTSCHRIFT' : 'REGULAR',
          originalInvoiceNumber: originalRechnung,
          paymentMethod: firstOrder.paymentMethod || '-',
          settings: {
            paymentMethod: firstOrder.paymentMethod || '-'
          }
        }

        invoices.push(invoice)
        invoicesCreated++

      } catch (error) {
        errors.push(`Fehler beim Erstellen der Rechnung für ${key}: ${error}`)
      }
    })

    // Debug logging
    console.log('Upload API - Final counts:')
    console.log('- Local invoices:', invoices.length)
    console.log('- Local customers:', customers.length)
    console.log('- Sample invoice:', invoices[0])

    return NextResponse.json({
      success: true,
      recordsProcessed,
      invoicesCreated,
      customersCreated,
      invoices, // Return the data
      customers, // Return the data
      errors: errors.length > 0 ? errors : undefined,
      message: `${recordsProcessed} Datensätze verarbeitet, ${invoicesCreated} Rechnungen und ${customersCreated} Kunden gefunden${errors.length > 0 ? ` (${errors.length} Fehler)` : ''}`
    })

  } catch (error) {
    console.error('Error processing CSV upload:', error)
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der CSV-Datei' },
      { status: 500 }
    )
  }
}


