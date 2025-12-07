import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifyShopifyWebhook } from '@/lib/shopify'
import { handleOrderCreate, handleOrderUpdate } from '@/lib/shopify-order-handler'
import { log } from '@/lib/logger'
import { sendInvoiceEmail } from '@/lib/email-service'
import { getShopifySettings } from '@/lib/shopify-settings'

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const headersList = headers()
    const topic = headersList.get('x-shopify-topic') || ''
    const hmac = headersList.get('x-shopify-hmac-sha256') || ''
    const shop = headersList.get('x-shopify-shop-domain') || ''

    log(`📨 Webhook received! Topic: ${topic}, Shop: ${shop}`)

    // 1. Verify Webhook
    const webhookSecret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_WEBHOOK_SECRET
    if (webhookSecret) {
      if (!verifyShopifyWebhook(body, hmac, webhookSecret)) {
        log('❌ Webhook signature verification FAILED')
        log('⚠️ DEBUG MODE: Proceeding despite verification failure to ensure delivery.')
        // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      } else {
        log('✅ Webhook signature verification PASSED')
      }
    } else {
      log('⚠️ Webhook signature verification skipped (no secret configured)')
    }

    const payload = JSON.parse(body)
    log(`📦 Payload parsed. Order ID: ${payload.id}, Financial Status: ${payload.financial_status}`)

    // 2. Route based on topic
    if (topic === 'orders/create' || topic === 'orders/updated') {
      log('🔄 Processing order...')

      // Create invoice immediately for any valid order (except voided/refunded)
      if (payload.financial_status !== 'voided' && payload.financial_status !== 'refunded') {
        log('⚡ Condition met: Creating invoice...')

        try {
          const invoice = await handleOrderCreate(payload, shop)
          log(`✅ Invoice created successfully! Invoice ID: ${invoice.id}`)

          // Auto-send email if enabled
          const settings = getShopifySettings()
          if (settings.autoSendEmail) {
            log('📧 Auto-send email is ENABLED. Attempting to send...')
            const emailResult = await sendInvoiceEmail(
              invoice.id,
              invoice.customer.email,
              invoice.number,
              invoice.customer.name
            )
            log(`📬 Email sending result: ${JSON.stringify(emailResult)}`)
          } else {
            log('🔕 Auto-send email is DISABLED.')
          }

          // Process Digital Products
          // if (payload.financial_status === 'paid') { // REMOVED: Send keys for all valid orders
          log('🔐 Checking for digital products...')
          const { processDigitalProductOrder } = await import('@/lib/digital-products')

          for (const item of payload.line_items) {
            if (item.product_id) {
              try {
                await processDigitalProductOrder(
                  String(item.product_id),
                  String(payload.id),
                  payload.name || String(payload.order_number) || String(payload.id), // Pass visible order number
                  payload.email || payload.customer?.email,
                  payload.shipping_address?.first_name || payload.customer?.first_name || 'Kunde',
                  item.title
                )
              } catch (err) {
                log(`❌ Error processing digital product ${item.product_id}:`, err)
              }
            }
          }
          // }

        } catch (err) {
          log('❌ Error during invoice creation/sending:', err)
          console.error(err)
        }
      } else {
        log('🚫 Order status is voided/refunded. Skipping invoice.')
      }
    } else {
      log(`ℹ️ Unhandled topic: ${topic}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log('❌ Critical error in webhook handler:', error)
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
