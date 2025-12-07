import { NextRequest, NextResponse } from 'next/server'
import { loadInvoicesFromDisk, saveInvoicesToDisk, loadCustomersFromDisk } from '@/lib/server-storage'
import { getCompanySettings } from '@/lib/company-settings'
import { requireAuth, getUserFromRequest, shouldShowAllData } from '@/lib/auth-middleware'

// No mock data - all invoices come from disk or user creation

// Access global storage for CSV data
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
  const persisted = loadInvoicesFromDisk()
  global.allInvoices = Array.isArray(persisted) ? persisted : []
  console.log(`[init /api/invoices] Loaded ${global.allInvoices.length} invoices from disk`)
}
if (!global.allCustomers) {
  const persisted = loadCustomersFromDisk()
  global.allCustomers = Array.isArray(persisted) ? persisted : []
  console.log(`[init /api/invoices] Loaded ${global.allCustomers.length} customers from disk`)
}

import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'
import { handleOrderCreate } from '@/lib/shopify-order-handler'

export async function GET(request: NextRequest) {
  const fs = require('fs');
  const path = require('path');
  const debugFile = path.join(process.cwd(), 'debug_route_output.txt');

  const log = (msg: string) => {
    try {
      fs.appendFileSync(debugFile, new Date().toISOString() + ': ' + msg + '\n');
    } catch (e) { }
  };

  try {
    log('GET /api/invoices called');

    // Always reload from disk to ensure we have the latest data from import scripts
    // This is crucial because import scripts run in a separate process
    try {
      const persisted = loadInvoicesFromDisk();
      log(`Loaded persisted data. IsArray: ${Array.isArray(persisted)}. Length: ${persisted?.length}`);

      if (Array.isArray(persisted) && persisted.length > 0) {
        global.allInvoices = persisted;
        log(`Updated global.allInvoices. New length: ${global.allInvoices.length}`);
      } else {
        log('Persisted data was empty or invalid.');
      }
    } catch (e: any) {
      log(`Failed to reload invoices from disk: ${e.message}`);
    }

    // Check Vercel flag
    log(`process.env.VERCEL: ${process.env.VERCEL}`);
    log(`global.allInvoices length before fallback check: ${global.allInvoices?.length}`);

    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    // VERCEL FIX: If local storage is empty, fetch directly from Shopify
    // This ensures data is visible even without a persistent database
    if ((!global.allInvoices || global.allInvoices.length === 0) && process.env.VERCEL) {
      console.log('☁️ Vercel: Local storage empty. Fetching directly from Shopify...')
      try {
        const settings = getShopifySettings()
        if (settings.shopDomain && settings.accessToken) {
          const api = new ShopifyAPI(settings)
          // Fetch last 50 orders to populate the view
          const orders = await api.getOrders({ limit: 50, status: 'any' })

          // Convert to invoices in memory
          const syncedInvoices = []
          for (const order of orders) {
            // We use handleOrderCreate but we don't await the disk save (it's pointless on Vercel read)
            // We just want the object
            const invoice = await handleOrderCreate(order, settings.shopDomain)
            // handleOrderCreate returns ID, we need the object. 
            // Actually handleOrderCreate saves to global.allInvoices, so we are good!
          }
          console.log(`☁️ Vercel: Hydrated ${global.allInvoices?.length} invoices from Shopify`)
        }
      } catch (e) {
        console.error('☁️ Vercel: Failed to hydrate from Shopify:', e)
      }
    }

    // Combine CSV invoices with manually created invoices (no mock data)
    const allInvoices = [
      ...(global.csvInvoices || []),
      ...(global.allInvoices || [])
    ]

    // Filter out soft-deleted invoices
    // Admin sees all
    // Regular users see:
    // 1. Their own invoices (userId matches)
    let filteredInvoices
    if (shouldShowAllData(user)) {
      filteredInvoices = allInvoices.filter((invoice: any) => !invoice.deleted_at)
      log(`ADMIN access: returning ${filteredInvoices.length} active invoices`);
    } else {
      // STRICT ISOLATION: Users only see their own invoices
      filteredInvoices = allInvoices.filter((invoice: any) =>
        !invoice.deleted_at &&
        invoice.userId === user.id
      )
      log(`USER access: returning ${filteredInvoices.length} invoices (own only)`);
    }

    return NextResponse.json(filteredInvoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// Advanced deduplication and transaction locking system
const recentRequests = new Map<string, number>()
const processingRequests = new Set<string>()
const invoiceCreationLock = new Map<string, Promise<any>>()

// Comprehensive request fingerprinting for absolute duplicate detection
const generateRequestFingerprint = (invoiceNumber: string, customer: any, total: number, items: any[]) => {
  const customerFingerprint = `${customer.name}-${customer.email}-${customer.address || ''}`
  const itemsFingerprint = items.map(item => `${item.description}-${item.quantity}-${item.unitPrice}`).join('|')
  return `${invoiceNumber}-${customerFingerprint}-${total}-${itemsFingerprint}`
}

export async function POST(request: NextRequest) {
  let requestFingerprint: string = ''

  try {
    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    const body = await request.json()
    const {
      invoiceNumber,
      date,
      dueDate,
      taxRate,
      customer,
      items,
      subtotal,
      taxAmount,
      total,
      status,
      statusColor,
      // Optional linkage fields
      shopifyOrderId,
      shopifyOrderNumber,
      source,
      // QR-Code payment settings
      qrCodeSettings
    } = body

    console.log('Creating new invoice for user:', { invoiceNumber, customer: customer.name, total, userEmail: user.email })
    console.log('QR-Code settings received:', qrCodeSettings)

    // Generate comprehensive request fingerprint
    requestFingerprint = generateRequestFingerprint(invoiceNumber, customer, total, items)
    const now = Date.now()

    // Check if this exact request is currently being processed (race condition protection)
    // Skip this check for Shopify imports as they have their own idempotency system
    const isShopifyImport = shopifyOrderId && shopifyOrderNumber
    if (!isShopifyImport && processingRequests.has(requestFingerprint)) {
      console.warn('Identical request already being processed:', requestFingerprint)
      return NextResponse.json(
        {
          error: 'Request in progress',
          message: 'Eine identische Anfrage wird bereits verarbeitet. Bitte warten Sie.'
        },
        { status: 409 }
      )
    }

    // Check for recent duplicate requests (within 10 seconds) - but skip for Shopify imports
    const recentRequest = recentRequests.get(requestFingerprint)
    if (!isShopifyImport && recentRequest && (now - recentRequest) < 10000) {
      console.warn('Duplicate request detected within 10 seconds:', requestFingerprint)
      return NextResponse.json(
        {
          error: 'Duplicate request',
          message: 'Eine identische Anfrage wurde kürzlich verarbeitet. Bitte warten Sie einen Moment.'
        },
        { status: 429 }
      )
    }

    // Check if there's an existing lock for this request
    if (invoiceCreationLock.has(requestFingerprint)) {
      console.warn('Request locked, waiting for completion:', requestFingerprint)
      try {
        const existingResult = await invoiceCreationLock.get(requestFingerprint)
        return NextResponse.json(existingResult)
      } catch (error) {
        console.error('Error waiting for locked request:', error)
      }
    }

    // Mark this request as being processed
    processingRequests.add(requestFingerprint)
    recentRequests.set(requestFingerprint, now)

    // Create a promise for this request to handle concurrent identical requests
    const creationPromise = (async () => {
      try {
        // Clean up old requests (older than 30 seconds)
        const keysToDelete: string[] = []
        recentRequests.forEach((timestamp, key) => {
          if (now - timestamp > 30000) {
            keysToDelete.push(key)
          }
        })
        keysToDelete.forEach(key => {
          recentRequests.delete(key)
          processingRequests.delete(key)
          invoiceCreationLock.delete(key)
        })

        // Check for duplicate invoice number
        const allInvoices = [
          ...(global.csvInvoices || []),
          ...(global.allInvoices || [])
        ]

        let finalInvoiceNumber = invoiceNumber
        let suffix = 2
        while (allInvoices.find((inv: any) => inv.number === finalInvoiceNumber && !inv.deleted_at)) {
          finalInvoiceNumber = `${invoiceNumber}-${suffix}`
          suffix++
        }

        // Validate required fields (email optional to allow Shopify orders without email)
        if (!invoiceNumber || !customer.name || !items || items.length === 0) {
          return NextResponse.json(
            {
              error: 'Missing required fields',
              message: 'Pflichtfelder fehlen: Rechnungsnummer, Kundenname und Positionen sind erforderlich.'
            },
            { status: 400 }
          )
        }

        // Create or find customer for this user
        let customerRecord = global.allCustomers!.find((c: any) =>
          c.email === customer.email && c.userId === user.id
        )

        if (!customerRecord) {
          customerRecord = {
            id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: user.id, // Link customer to authenticated user
            name: customer.name,
            companyName: customer.companyName || '',
            email: customer.email || '',
            address: customer.address,
            zipCode: customer.zipCode,
            city: customer.city,
            country: customer.country,
            createdAt: new Date().toISOString()
          }
          global.allCustomers!.push(customerRecord)
        } else {
          // Update existing customer (only if it belongs to this user)
          customerRecord.name = customer.name
          customerRecord.companyName = customer.companyName || ''
          customerRecord.address = customer.address
          customerRecord.zipCode = customer.zipCode
          customerRecord.city = customer.city
          customerRecord.country = customer.country
        }

        // Status color function
        const getStatusColor = (status: string): string => {
          switch (status) {
            case 'Bezahlt': return 'bg-green-100 text-green-800'
            case 'Erstattet': return 'bg-blue-100 text-blue-800'
            case 'Storniert': return 'bg-gray-100 text-gray-800'
            case 'Offen': return 'bg-gray-100 text-gray-600'
            case 'Mahnung': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-600'
          }
        }

        // Create invoice
        const invoice = {
          id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id, // Link invoice to authenticated user
          number: finalInvoiceNumber,
          date: date,
          dueDate: dueDate,
          subtotal: subtotal,
          taxRate: taxRate,
          taxAmount: taxAmount,
          total: total,
          status: status || 'Offen',
          statusColor: statusColor || getStatusColor(status || 'Offen'),
          amount: `€${total.toFixed(2)}`,
          customerId: customerRecord.id,
          customerName: customerRecord.name,
          customerCompanyName: customerRecord.companyName || '',
          customerEmail: customerRecord.email || undefined,
          customerAddress: customerRecord.address,
          customerCity: customerRecord.city,
          customerZip: customerRecord.zipCode,
          customerCountry: customerRecord.country,
          items: items.map((item: any) => ({
            id: `item-${Math.random().toString(36).substr(2, 9)}`,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            // Use SKU as primary EAN source
            ean: item.sku ?? item.ean ?? undefined,
          })),
          createdAt: new Date().toISOString(),
          organizationId: getCompanySettings().id,
          organizationName: getCompanySettings().name,
          // Optional Shopify linkage
          shopifyOrderId: shopifyOrderId,
          shopifyOrderNumber: shopifyOrderNumber,
          source: source,
          // QR-Code payment settings
          qrCodeSettings: qrCodeSettings || null
        }

        // Save to global storage and persist to disk
        global.allInvoices!.push(invoice)
        saveInvoicesToDisk(global.allInvoices!)

        console.log('Invoice created successfully:', invoice.id)
        console.log('Total invoices now:', global.allInvoices!.length)

        // Trigger dashboard stats update (for real-time updates)
        // This will be handled by the frontend event system

        return invoice
      } catch (error) {
        console.error('Error in invoice creation promise:', error)
        throw error
      } finally {
        // Clean up processing state
        processingRequests.delete(requestFingerprint)
        invoiceCreationLock.delete(requestFingerprint)
      }
    })()

    // Store the promise for concurrent requests
    invoiceCreationLock.set(requestFingerprint, creationPromise)

    try {
      const result = await creationPromise
      return NextResponse.json(result, { status: 201 })
    } catch (error) {
      console.error('Error creating invoice:', error)
      return NextResponse.json(
        { error: 'Failed to create invoice: ' + (error as Error).message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in POST handler:', error)
    // Clean up in case of outer error
    if (typeof requestFingerprint !== 'undefined') {
      processingRequests.delete(requestFingerprint)
      invoiceCreationLock.delete(requestFingerprint)
    }
    return NextResponse.json(
      { error: 'Failed to process request: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
