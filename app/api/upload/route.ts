import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { getCompanySettings } from '@/lib/company-settings'
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

// Global storage for CSV data
declare global {
  var csvInvoices: any[] | undefined
  var csvCustomers: any[] | undefined
}

// Initialize global storage
if (!global.csvInvoices) {
  global.csvInvoices = []
}
if (!global.csvCustomers) {
  global.csvCustomers = []
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

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }

    // Handle file uploads (receipts, documents, etc.) - non-CSV files
    if (type && type !== 'csv') {
      // Validate file type and size
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      const maxSize = 10 * 1024 * 1024 // 10MB

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload PDF, JPG, or PNG files.' },
          { status: 400 }
        )
      }

      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 10MB.' },
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

    // Check if file is CSV
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Nur CSV-Dateien sind erlaubt' },
        { status: 400 }
      )
    }

    // Read file content
    const fileContent = await file.text()
    const lines = fileContent.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV-Datei ist leer oder hat keine Daten' },
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
          console.log('Address fields:', {
            'Billing Address1': record['Billing Address1'],
            'Shipping Address1': record['Shipping Address1'],
            'Address1': record['Address1'],
            'Adresse': record['Adresse'],
            'Billing Address': record['Billing Address'],
            'Shipping Address': record['Shipping Address'],
            'Street': record['Street'],
            'Straße': record['Straße']
          })
        }

        // Map common Shopify CSV fields with more flexibility - prioritize Bestellnummer
        const order: ShopifyOrder = {
          orderNumber: record['Bestellnummer'] || record['Order Number'] || record['Name'] || record['Order'] || `ORD-${Date.now()}-${i}`,
          customerName: record['Billing Name'] || record['Shipping Name'] || record['Customer Name'] || record['Name'] || record['Kundenname'] || record['Customer'] || 'Unbekannter Kunde',
          customerCompany: record['Company'] || record['Billing Company'] || record['Shipping Company'] || record['Firma'] || record['Unternehmen'] || '',
          customerEmail: record['Email'] || record['Customer Email'] || record['E-Mail'] || record['Billing Email'] || record['Shipping Email'] || `kunde${i}@example.com`,
          customerAddress: record['Billing Address1'] || record['Shipping Address1'] || record['Address1'] || record['Adresse'] || record['Billing Address'] || record['Shipping Address'] || record['Street'] || record['Straße'] || 'Musterstraße 1',
          customerCity: record['Billing City'] || record['Shipping City'] || record['City'] || record['Stadt'] || record['Ort'] || 'Berlin',
          customerZip: record['Billing Zip'] || record['Shipping Zip'] || record['Zip'] || record['PLZ'] || record['Postal Code'] || record['Postleitzahl'] || '12345',
          customerCountry: record['Billing Country'] || record['Shipping Country'] || record['Country'] || record['Land'] || record['Country Code'] || 'DE',
          orderDate: record['Created at'] || record['Date'] || record['Bestelldatum'] || record['Order Date'] || new Date().toISOString().split('T')[0],
          productName: record['Lineitem name'] || record['Product'] || record['Item'] || record['Produktname'] || record['Product Name'] || 'Produkt',
          quantity: parseInt(record['Lineitem quantity'] || record['Quantity'] || record['Menge'] || record['Qty'] || '1'),
          unitPrice: parseFloat(record['Lineitem price'] || record['Price'] || record['Unit Price'] || record['Preis'] || record['Einzelpreis'] || '0'),
          totalPrice: parseFloat(record['Total'] || record['Amount'] || record['Gesamt'] || record['Line Total'] || '0'),
          taxRate: 19, // Default German VAT
          taxAmount: 0,
          // Identifiers from CSV (flexible header names)
          sku: record['Lineitem sku'] || record['SKU'] || record['Artikelnummer'] || record['Art.-Nr.'] || '',
          ean: record['Lineitem sku'] || record['EAN'] || record['Barcode'] || record['GTIN'] || ''
        }

        // Add additional fields for invoice type detection
        order.rechnungstyp = record['Rechnungstyp'] || 'Rechnung'
        order.statusDeutsch = record['Status_Deutsch'] || ''
        order.grund = record['Grund'] || ''
        order.originalRechnung = record['Original_Rechnung'] || ''
        order.financialStatus = record['Financial Status'] || ''

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
        
        // Create or find customer in global storage
        let customer = global.csvCustomers!.find((c: any) => c.email === firstOrder.customerEmail)
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
          global.csvCustomers!.push(customer)
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
        if (documentKind === DocumentKind.CANCELLATION || documentKind === DocumentKind.CREDIT_NOTE) {
          if (total > 0) {
            subtotal = -subtotal
            taxAmount = -taxAmount
            total = -total
          }
        }

        // Generate document number
        const prefix = getDocumentPrefix(documentKind)
        let documentNumber = firstOrder.orderNumber
        
        if (!documentNumber || documentNumber.startsWith('ORD-') || !documentNumber.startsWith(prefix)) {
          const count = global.csvInvoices!.filter((inv: any) => inv.number?.startsWith(prefix)).length + 1
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
            // Convert brutto unitPrice to netto for display
            const nettoUnitPrice = order.unitPrice / (1 + firstOrder.taxRate / 100)
            const nettoTotal = nettoUnitPrice * order.quantity
            return {
              id: `item-${Math.random().toString(36).substr(2, 9)}`,
              description: order.productName,
              quantity: order.quantity,
              unitPrice: nettoUnitPrice, // Show netto price in invoice
              total: nettoTotal, // Show netto total in invoice
              // Use Lineitem sku as EAN (primary source)
              ean: order.sku || order.ean || undefined
            }
          }),
          subtotal,
          taxRate: firstOrder.taxRate,
          taxAmount,
          total,
          status: documentStatus,
          statusColor,
          amount: `€${total.toFixed(2)}`,
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
          originalInvoiceNumber: originalRechnung
        }

        // Invoice is already added to global.csvInvoices above
        global.csvInvoices!.push(invoice)
        invoicesCreated++

      } catch (error) {
        errors.push(`Fehler beim Erstellen der Rechnung für ${key}: ${error}`)
      }
    })

    // Customers are already saved to global.csvCustomers during creation

    // Debug logging
    console.log('Upload API - Final counts:')
    console.log('- Global csvInvoices:', global.csvInvoices!.length)
    console.log('- Global csvCustomers:', global.csvCustomers!.length)
    console.log('- Sample invoice:', global.csvInvoices![0])

    return NextResponse.json({
      success: true,
      recordsProcessed,
      invoicesCreated,
      customersCreated,
      errors: errors.length > 0 ? errors : undefined,
      message: `${recordsProcessed} Datensätze verarbeitet, ${invoicesCreated} Rechnungen und ${customersCreated} Kunden erstellt${errors.length > 0 ? ` (${errors.length} Fehler)` : ''}`
    })

  } catch (error) {
    console.error('Error processing CSV upload:', error)
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der CSV-Datei' },
      { status: 500 }
    )
  }
}


