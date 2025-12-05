// Webhooks-System für automatische Systemaktualisierungen von Shopify
import { NextRequest, NextResponse } from 'next/server'
import { IdempotencyManager } from '@/lib/idempotency'
import { getShopifySettings } from '@/lib/shopify-settings'
import { sendInvoiceEmail } from '@/lib/email-service'
import { loadInvoicesFromDisk, saveInvoicesToDisk, loadCustomersFromDisk, saveCustomersToDisk } from '@/lib/server-storage'
import { getCompanySettings } from '@/lib/company-settings'
import crypto from 'crypto'

// Globale Variablen für In-Memory-Speicher (Shared State)
declare global {
  var allInvoices: any[] | undefined
  var allCustomers: any[] | undefined
  var orderToInvoiceMap: Map<string, string> | undefined
}

// Initialisierung
if (!global.allInvoices) {
  global.allInvoices = loadInvoicesFromDisk()
}
if (!global.allCustomers) {
  global.allCustomers = loadCustomersFromDisk()
}
if (!global.orderToInvoiceMap) {
  global.orderToInvoiceMap = new Map()
  global.allInvoices?.forEach((inv: any) => {
    if (inv.shopifyOrderId) {
      global.orderToInvoiceMap!.set(inv.shopifyOrderId, inv.id)
    }
  })
}

interface ShopifyWebhookPayload {
  id: number
  order_number?: string
  name?: string
  email?: string
  created_at: string
  updated_at: string
  total_price?: string
  currency?: string
  financial_status?: string
  fulfillment_status?: string
  cancelled_at?: string | null
  refunds?: Array<any>
  customer?: {
    id: number
    email: string
    first_name?: string
    last_name?: string
    default_address?: any
  }
  billing_address?: any
  shipping_address?: any
  line_items?: Array<any>
}

// Shopify Webhook-Verifizierung
function verifyShopifyWebhook(body: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(body, 'utf8')
    const calculatedSignature = hmac.digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(calculatedSignature, 'base64')
    )
  } catch (error) {
    console.error('❌ Webhook verification error:', error)
    return false
  }
}

// Neue Bestellung verarbeiten
async function handleOrderCreate(payload: ShopifyWebhookPayload) {
  console.log(`📦 New order created: ${payload.id}`)

  try {
    // Prüfen ob Bestellung bereits existiert
    const fingerprint = IdempotencyManager.createRequestFingerprint(payload)
    const check = IdempotencyManager.checkIdempotency(payload.id.toString(), fingerprint)

    if (check.exists) {
      console.log(`✅ Order ${payload.id} already exists as invoice ${check.invoiceId}`)
      return { success: true, invoiceId: check.invoiceId, duplicate: true }
    }

    // Automatisch Rechnung erstellen für alle gültigen Bestellungen (auch Vorkasse/Rechnung)
    // Wir schließen nur stornierte oder komplett erstattete aus
    if (payload.financial_status !== 'voided' && payload.financial_status !== 'refunded') {

      // Kundendaten extrahieren
      const customerData = {
        name: payload.customer ? `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim() : (payload.email || 'Unknown Customer'),
        email: payload.email || payload.customer?.email || '',
        address: payload.billing_address?.address1 || payload.shipping_address?.address1 || '',
        city: payload.billing_address?.city || payload.shipping_address?.city || '',
        zipCode: payload.billing_address?.zip || payload.shipping_address?.zip || '',
        country: payload.billing_address?.country || payload.shipping_address?.country || '',
        companyName: payload.billing_address?.company || payload.shipping_address?.company || ''
      }

      // Kunde finden oder erstellen
      if (!global.allCustomers) global.allCustomers = loadCustomersFromDisk()

      let customerRecord = global.allCustomers!.find((c: any) => c.email === customerData.email)

      if (!customerRecord) {
        customerRecord = {
          id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: 'system', // System-User
          ...customerData,
          createdAt: new Date().toISOString()
        }
        global.allCustomers!.push(customerRecord)
        saveCustomersToDisk(global.allCustomers!)
      }

      // Rechnungsdaten vorbereiten
      const invoiceNumber = `SH-${payload.order_number || payload.id}`
      const total = parseFloat(payload.total_price || '0')

      const invoice = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: 'system', // System-User
        number: invoiceNumber,
        date: new Date(payload.created_at).toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0], // Sofort fällig da bezahlt
        subtotal: total, // Vereinfacht
        taxRate: 19,
        taxAmount: 0, // Vereinfacht
        total: total,
        status: 'Bezahlt',
        statusColor: 'bg-green-100 text-green-800',
        amount: `€${total.toFixed(2)}`,
        customerId: customerRecord.id,
        customerName: customerRecord.name,
        customerEmail: customerRecord.email,
        customerAddress: customerRecord.address,
        customerCity: customerRecord.city,
        customerZip: customerRecord.zipCode,
        customerCountry: customerRecord.country,
        items: (payload.line_items || []).map((item: any) => ({
          id: `item-${Math.random().toString(36).substr(2, 9)}`,
          description: item.title || 'Produkt',
          quantity: item.quantity || 1,
          unitPrice: parseFloat(item.price || '0'),
          total: (item.quantity || 1) * parseFloat(item.price || '0')
        })),
        createdAt: new Date().toISOString(),
        organizationId: getCompanySettings().id,
        organizationName: getCompanySettings().name,
        shopifyOrderId: payload.id.toString(),
        shopifyOrderNumber: payload.order_number || payload.id.toString(),
        currency: payload.currency || 'EUR'
      }

      // Rechnung speichern
      if (!global.allInvoices) global.allInvoices = loadInvoicesFromDisk()
      global.allInvoices!.push(invoice)
      saveInvoicesToDisk(global.allInvoices!)

      // Mapping aktualisieren
      global.orderToInvoiceMap?.set(payload.id.toString(), invoice.id)

      console.log(`✅ Auto-created invoice ${invoice.id} for order ${payload.id}`)

      // E-Mail senden
      const settings = getShopifySettings()
      if (settings.autoSendEmail && customerData.email) {
        console.log(`📧 Auto-sending email to ${customerData.email} for invoice ${invoiceNumber}`)
        try {
          // Kurze Verzögerung um sicherzustellen, dass alles gespeichert ist
          await new Promise(resolve => setTimeout(resolve, 1000))

          const emailResult = await sendInvoiceEmail(
            invoice.id,
            customerData.email,
            customerData.name,
            invoiceNumber,
            undefined,
            undefined,
            undefined,
            `${total.toFixed(2)} ${payload.currency || 'EUR'}`,
            invoice.dueDate
          )

          if (emailResult.success) {
            console.log(`✅ Email sent successfully: ${emailResult.messageId}`)
          } else {
            console.error(`❌ Failed to send email: ${emailResult.error}`)
          }
        } catch (emailError) {
          console.error('❌ Error in auto-send email process:', emailError)
        }
      }

      return { success: true, invoiceId: invoice.id, created: true }

    } else {
      console.log(`⏳ Order ${payload.id} not paid yet (${payload.financial_status}), skipping auto-creation`)
      return { success: true, skipped: true, reason: 'not_paid' }
    }

  } catch (error) {
    console.error(`❌ Failed to handle order create for ${payload.id}:`, error)
    throw error
  }
}

// Bestellaktualisierung verarbeiten
async function handleOrderUpdate(payload: ShopifyWebhookPayload) {
  console.log(`🔄 Order updated: ${payload.id}`)

  try {
    // Zugehörige Rechnung suchen
    if (!global.allInvoices) global.allInvoices = loadInvoicesFromDisk()
    const invoiceIndex = global.allInvoices!.findIndex((inv: any) => inv.shopifyOrderId === payload.id.toString())

    if (invoiceIndex >= 0) {
      const invoice = global.allInvoices![invoiceIndex]

      // Rechnungsstatus basierend auf Bestellstatus aktualisieren
      const newStatus = mapShopifyStatusToInvoiceStatus(payload.financial_status || '')

      if (invoice.status !== newStatus) {
        invoice.status = newStatus
        invoice.updatedAt = new Date().toISOString()

        // Speichern
        saveInvoicesToDisk(global.allInvoices!)
        console.log(`✅ Updated invoice ${invoice.id} status to ${newStatus}`)
        return { success: true, invoiceId: invoice.id, updated: true }
      }
      return { success: true, invoiceId: invoice.id, updated: false, reason: 'status_unchanged' }
    } else {
      // Wenn keine Rechnung existiert und Bestellung bezahlt ist, neue erstellen
      if (payload.financial_status === 'paid') {
        return await handleOrderCreate(payload)
      } else {
        console.log(`⏳ No invoice found for order ${payload.id} and not paid, skipping`)
        return { success: true, skipped: true, reason: 'no_invoice_and_not_paid' }
      }
    }

  } catch (error) {
    console.error(`❌ Failed to handle order update for ${payload.id}:`, error)
    throw error
  }
}

// Rückerstattung verarbeiten
async function handleRefundCreate(payload: any) {
  console.log(`💰 Refund created for order: ${payload.order_id}`)

  try {
    if (!global.allInvoices) global.allInvoices = loadInvoicesFromDisk()
    const invoiceIndex = global.allInvoices!.findIndex((inv: any) => inv.shopifyOrderId === payload.order_id.toString())

    if (invoiceIndex >= 0) {
      const invoice = global.allInvoices![invoiceIndex]

      // Rückerstattungsbetrag berechnen
      const refundAmount = payload.transactions
        ?.filter((t: any) => t.kind === 'refund' && t.status === 'success')
        ?.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0) || 0

      // Rechnung aktualisieren
      invoice.status = 'Erstattet'
      invoice.refundAmount = refundAmount
      invoice.refundDate = new Date().toISOString().split('T')[0]
      invoice.refundNote = payload.note || 'Shopify refund'
      invoice.updatedAt = new Date().toISOString()

      // Speichern
      saveInvoicesToDisk(global.allInvoices!)

      console.log(`✅ Updated invoice ${invoice.id} as refunded (${refundAmount} EUR)`)
      return { success: true, invoiceId: invoice.id, refunded: true, amount: refundAmount }
    } else {
      console.log(`⚠️ No invoice found for refunded order ${payload.order_id}`)
      return { success: true, skipped: true, reason: 'no_invoice_found' }
    }

  } catch (error) {
    console.error(`❌ Failed to handle refund for order ${payload.order_id}:`, error)
    throw error
  }
}

// Shopify-Status in Rechnungsstatus umwandeln
function mapShopifyStatusToInvoiceStatus(financialStatus: string): string {
  switch (financialStatus?.toLowerCase()) {
    case 'paid':
      return 'Bezahlt'
    case 'pending':
    case 'authorized':
      return 'Offen'
    case 'refunded':
    case 'partially_refunded':
      return 'Erstattet'
    case 'voided':
      return 'Storniert'
    default:
      return 'Entwurf'
  }
}

// Haupt-Webhook-Handler
export async function POST(request: NextRequest) {
  try {
    // Rohdaten lesen
    const body = await request.text()
    const signature = request.headers.get('X-Shopify-Hmac-Sha256')
    const topic = request.headers.get('X-Shopify-Topic')
    const shopDomain = request.headers.get('X-Shopify-Shop-Domain')

    console.log(`📨 Webhook received: ${topic} from ${shopDomain}`)

    // Webhook validieren
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const isValid = verifyShopifyWebhook(body, signature, webhookSecret)
      if (!isValid) {
        console.error('❌ Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else {
      console.warn('⚠️ Webhook signature verification skipped (no secret configured)')
    }

    // Daten parsen
    const payload = JSON.parse(body)
    let result

    // Je nach Webhook-Typ verarbeiten
    switch (topic) {
      case 'orders/create':
        result = await handleOrderCreate(payload)
        break

      case 'orders/updated':
        result = await handleOrderUpdate(payload)
        break

      case 'orders/paid':
        payload.financial_status = 'paid'
        result = await handleOrderUpdate(payload)
        break

      case 'orders/cancelled':
        payload.financial_status = 'voided'
        result = await handleOrderUpdate(payload)
        break

      case 'refunds/create':
        result = await handleRefundCreate(payload)
        break

      default:
        console.log(`⏭️ Unhandled webhook topic: ${topic}`)
        return NextResponse.json({
          success: true,
          message: `Webhook ${topic} received but not processed`
        })
    }

    console.log(`✅ Webhook ${topic} processed successfully:`, result)

    return NextResponse.json({
      success: true,
      topic,
      result,
      processedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        topic: request.headers.get('X-Shopify-Topic'),
        processedAt: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET - Informationen über unterstützte Webhooks
export async function GET() {
  return NextResponse.json({
    supportedWebhooks: [
      {
        topic: 'orders/create',
        description: 'Automatische Rechnungserstellung für bezahlte Bestellungen',
        endpoint: '/api/shopify/webhooks'
      },
      {
        topic: 'orders/updated',
        description: 'Rechnungsstatus aktualisieren bei Bestelländerung',
        endpoint: '/api/shopify/webhooks'
      },
      {
        topic: 'orders/paid',
        description: 'Rechnung aktualisieren wenn Bestellung bezahlt',
        endpoint: '/api/shopify/webhooks'
      },
      {
        topic: 'orders/cancelled',
        description: 'Rechnung stornieren wenn Bestellung storniert',
        endpoint: '/api/shopify/webhooks'
      },
      {
        topic: 'refunds/create',
        description: 'Rechnung aktualisieren bei Rückerstattung',
        endpoint: '/api/shopify/webhooks'
      }
    ],
    setup: {
      url: `${process.env.NEXTAUTH_URL || 'https://your-domain.com'}/api/shopify/webhooks`,
      format: 'JSON',
      verification: 'HMAC-SHA256',
      secretEnvVar: 'SHOPIFY_WEBHOOK_SECRET'
    },
    stats: {
      idempotencyRecords: 0,
      orderMappings: global.orderToInvoiceMap?.size || 0
    }
  })
}
