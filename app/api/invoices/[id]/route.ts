import { NextRequest, NextResponse } from 'next/server'
import { getCompanySettings } from '@/lib/company-settings'

// Access global storage for all invoice data
declare global {
  var csvInvoices: any[] | undefined
  var csvCustomers: any[] | undefined
  var allInvoices: any[] | undefined
  var allCustomers: any[] | undefined
}

// Initialize global storage
if (!global.csvInvoices) {
  global.csvInvoices = []
}
if (!global.csvCustomers) {
  global.csvCustomers = []
}
if (!global.allInvoices) {
  global.allInvoices = []
}
if (!global.allCustomers) {
  global.allCustomers = []
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id
    console.log('Fetching invoice with ID:', invoiceId)

    // Mock invoices for fallback
    const mockInvoices = [
      {
        id: '1',
        number: 'RE-2024-001',
        customerName: 'Max Mustermann',
        customerEmail: 'max.mustermann@email.com',
        customerAddress: 'Musterstraße 123',
        customerCity: 'Berlin',
        customerZip: '12345',
        customerCountry: 'Deutschland',
        date: '2024-01-15',
        dueDate: '2024-01-29',
        amount: '€119.00',
        status: 'Bezahlt',
        statusColor: 'bg-green-100 text-green-800',
        subtotal: 100.00,
        taxRate: 19,
        taxAmount: 19.00,
        total: 119.00,
        items: [
          {
            id: 'item-1',
            description: 'Webentwicklung - Monat Januar',
            quantity: 1,
            unitPrice: 100.00,
            total: 100.00,
            ean: '4006381333931'
          }
        ]
      },
      {
        id: '2',
        number: 'RE-2024-002',
        customerName: 'Anna Schmidt',
        customerEmail: 'anna.schmidt@email.com',
        customerAddress: 'Beispielweg 456',
        customerCity: 'München',
        customerZip: '80331',
        customerCountry: 'Deutschland',
        date: '2024-01-20',
        dueDate: '2024-02-03',
        amount: '€89.50',
        status: 'Offen',
        statusColor: 'bg-yellow-100 text-yellow-800',
        subtotal: 75.21,
        taxRate: 19,
        taxAmount: 14.29,
        total: 89.50,
        items: [
          {
            id: 'item-2',
            description: 'Beratung - 2 Stunden',
            quantity: 2,
            unitPrice: 37.61,
            total: 75.21,
            ean: '978020137962'
          }
        ]
      },
      {
        id: '3',
        number: 'RE-2024-003',
        customerName: 'Peter Müller',
        customerEmail: 'peter.mueller@email.com',
        customerAddress: 'Teststraße 789',
        customerCity: 'Hamburg',
        customerZip: '20095',
        customerCountry: 'Deutschland',
        date: '2024-01-25',
        dueDate: '2024-02-08',
        amount: '€234.75',
        status: 'Überfällig',
        statusColor: 'bg-red-100 text-red-800',
        subtotal: 197.27,
        taxRate: 19,
        taxAmount: 37.48,
        total: 234.75,
        items: [
          {
            id: 'item-3',
            description: 'Website Redesign',
            quantity: 1,
            unitPrice: 197.27,
            total: 197.27,
            ean: '4260458340018'
          }
        ]
      },
      {
        id: 'SH-3288',
        number: 'SH-3288',
        customerName: 'Shopify Kunde',
        customerEmail: 'kunde@shopify-example.com',
        customerAddress: 'Shopify Straße 123',
        customerCity: 'Berlin',
        customerZip: '10115',
        customerCountry: 'Deutschland',
        date: '2024-01-22',
        dueDate: '2024-02-05',
        amount: '€156.99',
        status: 'Offen',
        statusColor: 'bg-yellow-100 text-yellow-800',
        subtotal: 131.84,
        taxRate: 19,
        taxAmount: 25.15,
        total: 156.99,
        items: [
          {
            id: 'item-sh-1',
            description: 'Shopify Produkt - Premium Plan',
            quantity: 1,
            unitPrice: 131.84,
            total: 131.84,
            ean: '1234567890123'
          }
        ]
      }
    ]

    // Combine all invoices from different sources
    const allInvoices = [
      ...mockInvoices,
      ...(global.csvInvoices || []),
      ...(global.allInvoices || [])
    ]

    console.log('Total invoices available:', allInvoices.length)
    console.log('Looking for invoice ID:', invoiceId)

    // Find the specific invoice
    const invoice = allInvoices.find((inv: any) => inv.id === invoiceId)

    if (!invoice) {
      // VERCEL FIX: Fallback to Shopify API if invoice not found locally
      // This allows stateless viewing of invoices
      if (invoiceId.startsWith('shopify-')) {
        console.log('☁️ Vercel: Invoice not found locally. Attempting fetch from Shopify for ID:', invoiceId)
        try {
          const settings = getShopifySettings()
          if (settings.shopDomain && settings.accessToken) {
            const api = new ShopifyAPI(settings)
            // Extract Shopify Order ID (remove 'shopify-' prefix)
            const shopifyOrderId = invoiceId.replace('shopify-', '')

            console.log('Fetching order from Shopify:', shopifyOrderId)
            const order = await api.getOrder(shopifyOrderId)

            if (order) {
              // Convert to invoice on the fly
              // This will use the deterministic ID logic we just added
              const fetchedInvoice = await handleOrderCreate(order, settings.shopDomain)

              // Return this invoice directly
              // We also add it to global storage for this session
              if (fetchedInvoice) {
                // Ensure it's in the global list for subsequent requests
                if (!global.allInvoices!.find((i: any) => i.id === fetchedInvoice.id)) {
                  global.allInvoices!.push(fetchedInvoice)
                }

                // Format and return
                const formattedInvoice = {
                  id: fetchedInvoice.id,
                  number: fetchedInvoice.number,
                  date: fetchedInvoice.date,
                  dueDate: fetchedInvoice.dueDate || new Date(new Date(fetchedInvoice.date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  subtotal: fetchedInvoice.subtotal || 0,
                  taxRate: fetchedInvoice.taxRate || 19,
                  taxAmount: fetchedInvoice.taxAmount || 0,
                  total: fetchedInvoice.total || 0,
                  status: fetchedInvoice.status || 'Offen',
                  customer: {
                    id: fetchedInvoice.customerId || 'unknown',
                    name: fetchedInvoice.customerName || 'Unbekannter Kunde',
                    companyName: fetchedInvoice.customerCompanyName || '',
                    email: fetchedInvoice.customerEmail || '',
                    address: fetchedInvoice.customerAddress || '',
                    zipCode: fetchedInvoice.customerZip || '',
                    city: fetchedInvoice.customerCity || '',
                    country: fetchedInvoice.customerCountry || 'Deutschland'
                  },
                  organization: getCompanySettings(),
                  items: fetchedInvoice.items || [],
                  qrCodeSettings: fetchedInvoice.qrCodeSettings || null
                }
                return NextResponse.json(formattedInvoice)
              }
            }
          }
        } catch (e) {
          console.error('☁️ Vercel: Failed to fetch single invoice from Shopify:', e)
        }
      }

      console.log('Invoice not found')
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    console.log('Found invoice:', invoice.number)
    console.log('Invoice QR-Code settings:', invoice.qrCodeSettings)

    // Format the invoice for the frontend
    const formattedInvoice = {
      id: invoice.id,
      number: invoice.number,
      date: invoice.date,
      dueDate: invoice.dueDate || new Date(new Date(invoice.date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: invoice.subtotal || 0,
      taxRate: invoice.taxRate || 19,
      taxAmount: invoice.taxAmount || 0,
      total: invoice.total || 0,
      status: invoice.status || 'Offen',
      customer: {
        id: invoice.customerId || 'unknown',
        name: invoice.customerName || 'Unbekannter Kunde',
        companyName: invoice.customerCompanyName || '',
        email: invoice.customerEmail || '',
        address: invoice.customerAddress || '',
        zipCode: invoice.customerZip || '',
        city: invoice.customerCity || '',
        country: invoice.customerCountry || 'Deutschland'
      },
      organization: getCompanySettings(),
      items: invoice.items || [],
      // Include QR-Code settings if available
      qrCodeSettings: invoice.qrCodeSettings || null
    }

    return NextResponse.json(formattedInvoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id
    console.log('Deleting invoice with ID:', invoiceId)

    // Mock invoices for fallback
    const mockInvoices = [
      {
        id: '1',
        number: 'RE-2024-001',
        customerName: 'Max Mustermann',
        date: '2024-01-15',
        amount: '€119.00',
        status: 'Bezahlt',
        statusColor: 'bg-green-100 text-green-800'
      },
      {
        id: '2',
        number: 'RE-2024-002',
        customerName: 'Anna Schmidt',
        date: '2024-01-20',
        amount: '€89.50',
        status: 'Offen',
        statusColor: 'bg-yellow-100 text-yellow-800'
      },
      {
        id: '3',
        number: 'RE-2024-003',
        customerName: 'Peter Müller',
        date: '2024-01-25',
        amount: '€234.75',
        status: 'Überfällig',
        statusColor: 'bg-red-100 text-red-800'
      }
    ]

    // Find and remove from CSV invoices
    if (global.csvInvoices) {
      const csvIndex = global.csvInvoices.findIndex((inv: any) => inv.id === invoiceId)
      if (csvIndex !== -1) {
        const record = global.csvInvoices[csvIndex]
        if (record.status === 'Bezahlt' || record.status === 'Storniert') {
          return NextResponse.json(
            {
              error: 'Löschen nicht erlaubt',
              message: `Rechnung ist ${record.status}. Löschen ist nicht erlaubt. Sie können stattdessen archivieren.`,
              code: 'LOCKED_INVOICE'
            },
            { status: 409 }
          )
        }
        // Soft delete: add deleted_at timestamp
        global.csvInvoices[csvIndex].deleted_at = new Date().toISOString()
        console.log('Soft deleted CSV invoice:', invoiceId)
        return NextResponse.json({
          success: true,
          message: 'Rechnung erfolgreich gelöscht',
          type: 'csv'
        })
      }
    }

    // Find and remove from all invoices
    if (global.allInvoices) {
      const allIndex = global.allInvoices.findIndex((inv: any) => inv.id === invoiceId)
      if (allIndex !== -1) {
        const record = global.allInvoices[allIndex]
        if (record.status === 'Bezahlt' || record.status === 'Storniert') {
          return NextResponse.json(
            {
              error: 'Löschen nicht erlaubt',
              message: `Rechnung ist ${record.status}. Löschen ist nicht erlaubt. Sie können stattdessen archivieren.`,
              code: 'LOCKED_INVOICE'
            },
            { status: 409 }
          )
        }
        // Soft delete: add deleted_at timestamp
        global.allInvoices[allIndex].deleted_at = new Date().toISOString()
        console.log('Soft deleted invoice:', invoiceId)
        return NextResponse.json({
          success: true,
          message: 'Rechnung erfolgreich gelöscht',
          type: 'manual'
        })
      }
    }

    // Check if it's a mock/test invoice (cannot be deleted)
    // We treat known seeded IDs and test patterns as mock data.
    const knownMockIds = new Set<string>(['1', '2', '3', 'test-invoice-1', 'test-invoice-2', 'SH-3288'])
    const isPatternMock = invoiceId.startsWith('test-invoice-')
    if (knownMockIds.has(invoiceId) || isPatternMock) {
      return NextResponse.json(
        {
          error: 'Beispiel-Rechnung kann nicht gelöscht werden',
          message: 'Diese Rechnung ist eine Beispiel-/Test-Rechnung und kann nicht gelöscht werden. Sie können sie stattdessen archivieren oder ausblenden.',
          code: 'MOCK_INVOICE'
        },
        { status: 409 }
      )
    }

    // Invoice not found
    return NextResponse.json(
      {
        error: 'Rechnung nicht gefunden',
        message: 'Die angegebene Rechnung konnte nicht gefunden werden. Möglicherweise wurde sie bereits gelöscht oder stammt aus Beispieldaten.',
        code: 'NOT_FOUND'
      },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      {
        error: 'Fehler beim Löschen',
        message: 'Ein unerwarteter Fehler ist aufgetreten.'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id
    const updatedData = await request.json()

    console.log('Updating invoice with ID:', invoiceId)
    console.log('Updated data:', updatedData)

    // Find and update in CSV invoices
    if (global.csvInvoices) {
      const csvIndex = global.csvInvoices.findIndex((inv: any) => inv.id === invoiceId)
      if (csvIndex !== -1) {
        const originalInvoice = global.csvInvoices[csvIndex]

        // Update the invoice with new data
        global.csvInvoices[csvIndex] = {
          ...originalInvoice,
          // Customer data
          customerName: updatedData.customer?.name || originalInvoice.customerName,
          customerCompanyName: updatedData.customer?.companyName || originalInvoice.customerCompanyName || '',
          customerEmail: updatedData.customer?.email || originalInvoice.customerEmail,
          customerAddress: updatedData.customer?.address || originalInvoice.customerAddress,
          customerZip: updatedData.customer?.zipCode || originalInvoice.customerZip,
          customerCity: updatedData.customer?.city || originalInvoice.customerCity,
          customerCountry: updatedData.customer?.country || originalInvoice.customerCountry,
          // Other fields
          subtotal: updatedData.subtotal || originalInvoice.subtotal,
          taxRate: updatedData.taxRate || originalInvoice.taxRate,
          taxAmount: updatedData.taxAmount || originalInvoice.taxAmount,
          total: updatedData.total || originalInvoice.total,
          status: updatedData.status || originalInvoice.status,
          items: updatedData.items || originalInvoice.items,
          updated_at: new Date().toISOString()
        }

        console.log('Updated CSV invoice successfully')
        return NextResponse.json({ success: true, message: 'Invoice updated successfully' })
      }
    }

    // Find and update in all invoices
    if (global.allInvoices) {
      const allIndex = global.allInvoices.findIndex((inv: any) => inv.id === invoiceId)
      if (allIndex !== -1) {
        const originalInvoice = global.allInvoices[allIndex]

        // Update the invoice with new data
        global.allInvoices[allIndex] = {
          ...originalInvoice,
          // Customer data
          customerName: updatedData.customer?.name || originalInvoice.customerName,
          customerCompanyName: updatedData.customer?.companyName || originalInvoice.customerCompanyName || '',
          customerEmail: updatedData.customer?.email || originalInvoice.customerEmail,
          customerAddress: updatedData.customer?.address || originalInvoice.customerAddress,
          customerZip: updatedData.customer?.zipCode || originalInvoice.customerZip,
          customerCity: updatedData.customer?.city || originalInvoice.customerCity,
          customerCountry: updatedData.customer?.country || originalInvoice.customerCountry,
          // Other fields
          subtotal: updatedData.subtotal || originalInvoice.subtotal,
          taxRate: updatedData.taxRate || originalInvoice.taxRate,
          taxAmount: updatedData.taxAmount || originalInvoice.taxAmount,
          total: updatedData.total || originalInvoice.total,
          status: updatedData.status || originalInvoice.status,
          items: updatedData.items || originalInvoice.items,
          updated_at: new Date().toISOString()
        }

        console.log('Updated manual invoice successfully')
        return NextResponse.json({ success: true, message: 'Invoice updated successfully' })
      }
    }

    // Invoice not found
    return NextResponse.json(
      { error: 'Invoice not found' },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}
