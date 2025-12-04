// Webhooks-System für automatische Systemaktualisierungen von Shopify
import { NextRequest, NextResponse } from 'next/server'
import { IdempotencyManager, withIdempotency } from '@/lib/idempotency'
import crypto from 'crypto'

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
  refunds?: Array<{
    id: number
    order_id: number
    created_at: string
    note?: string
    refund_line_items: Array<{
      id: number
      line_item_id: number
      quantity: number
      restock_type: string
      subtotal: string
      total_tax: string
    }>
    transactions: Array<{
      id: number
      order_id: number
      amount: string
      kind: string
      gateway: string
      status: string
      created_at: string
    }>
  }>
  // Weitere Felder...
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

// معالجة إنشاء طلب جديد
async function handleOrderCreate(payload: ShopifyWebhookPayload) {
  console.log(`📦 New order created: ${payload.id}`)
  
  try {
    // التحقق من وجود الطلب مسبقاً
    const fingerprint = IdempotencyManager.createRequestFingerprint(payload)
    const check = IdempotencyManager.checkIdempotency(payload.id.toString(), fingerprint)
    
    if (check.exists) {
      console.log(`✅ Order ${payload.id} already exists as invoice ${check.invoiceId}`)
      return { success: true, invoiceId: check.invoiceId, duplicate: true }
    }

    // إنشاء فاتورة جديدة تلقائياً إذا كان الطلب مدفوع
    if (payload.financial_status === 'paid') {
      const invoiceData = {
        customer: {
          name: payload.email || 'Unknown Customer',
          email: payload.email || '',
          // يمكن إضافة المزيد من البيانات حسب payload
        },
        number: `SH-${payload.order_number || payload.id}`,
        date: new Date(payload.created_at).toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0], // مدفوع بالفعل
        items: [
          {
            description: `Shopify Order #${payload.order_number || payload.id}`,
            quantity: 1,
            unitPrice: parseFloat(payload.total_price || '0'),
            total: parseFloat(payload.total_price || '0')
          }
        ],
        subtotal: parseFloat(payload.total_price || '0'),
        taxRate: 19,
        taxAmount: 0,
        total: parseFloat(payload.total_price || '0'),
        status: 'Bezahlt',
        shopifyOrderId: payload.id.toString(),
        shopifyOrderNumber: payload.order_number || payload.id.toString(),
        currency: payload.currency || 'EUR'
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Auto-created invoice ${result.id} for order ${payload.id}`)
        return { success: true, invoiceId: result.id, created: true }
      } else {
        throw new Error(`Failed to create invoice: ${response.status}`)
      }
    } else {
      console.log(`⏳ Order ${payload.id} not paid yet (${payload.financial_status}), skipping auto-creation`)
      return { success: true, skipped: true, reason: 'not_paid' }
    }

  } catch (error) {
    console.error(`❌ Failed to handle order create for ${payload.id}:`, error)
    throw error
  }
}

// معالجة تحديث طلب
async function handleOrderUpdate(payload: ShopifyWebhookPayload) {
  console.log(`🔄 Order updated: ${payload.id}`)
  
  try {
    // البحث عن الفاتورة المرتبطة
    const existingInvoiceId = global.orderToInvoiceMap?.get(payload.id.toString())
    
    if (existingInvoiceId) {
      // تحديث حالة الفاتورة حسب حالة الطلب
      const newStatus = mapShopifyStatusToInvoiceStatus(payload.financial_status || '')
      
      const updateResponse = await fetch(`/api/invoices/${existingInvoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          shopifyOrderId: payload.id.toString(),
          updatedAt: new Date().toISOString()
        })
      })

      if (updateResponse.ok) {
        console.log(`✅ Updated invoice ${existingInvoiceId} status to ${newStatus}`)
        return { success: true, invoiceId: existingInvoiceId, updated: true }
      } else {
        throw new Error(`Failed to update invoice: ${updateResponse.status}`)
      }
    } else {
      // إذا لم توجد فاتورة وأصبح الطلب مدفوع، أنشئ فاتورة جديدة
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

// معالجة استرداد
async function handleRefundCreate(payload: any) {
  console.log(`💰 Refund created for order: ${payload.order_id}`)
  
  try {
    // البحث عن الفاتورة المرتبطة
    const existingInvoiceId = global.orderToInvoiceMap?.get(payload.order_id.toString())
    
    if (existingInvoiceId) {
      // حساب مبلغ الاسترداد
      const refundAmount = payload.transactions
        ?.filter((t: any) => t.kind === 'refund' && t.status === 'success')
        ?.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0) || 0

      // تحديث الفاتورة لتصبح مستردة
      const updateResponse = await fetch(`/api/invoices/${existingInvoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Erstattet',
          refundAmount,
          refundDate: new Date().toISOString().split('T')[0],
          refundNote: payload.note || 'Shopify refund',
          updatedAt: new Date().toISOString()
        })
      })

      if (updateResponse.ok) {
        console.log(`✅ Updated invoice ${existingInvoiceId} as refunded (${refundAmount} EUR)`)
        return { success: true, invoiceId: existingInvoiceId, refunded: true, amount: refundAmount }
      } else {
        throw new Error(`Failed to update invoice for refund: ${updateResponse.status}`)
      }
    } else {
      console.log(`⚠️ No invoice found for refunded order ${payload.order_id}`)
      return { success: true, skipped: true, reason: 'no_invoice_found' }
    }

  } catch (error) {
    console.error(`❌ Failed to handle refund for order ${payload.order_id}:`, error)
    throw error
  }
}

// تحويل حالة Shopify إلى حالة الفاتورة
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

// معالج webhook رئيسي
export async function POST(request: NextRequest) {
  try {
    // قراءة البيانات الخام
    const body = await request.text()
    const signature = request.headers.get('X-Shopify-Hmac-Sha256')
    const topic = request.headers.get('X-Shopify-Topic')
    const shopDomain = request.headers.get('X-Shopify-Shop-Domain')

    console.log(`📨 Webhook received: ${topic} from ${shopDomain}`)

    // التحقق من صحة الـ webhook
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

    // تحليل البيانات
    const payload = JSON.parse(body)
    let result

    // معالجة حسب نوع الـ webhook
    switch (topic) {
      case 'orders/create':
        result = await handleOrderCreate(payload)
        break

      case 'orders/updated':
        result = await handleOrderUpdate(payload)
        break

      case 'orders/paid':
        // معالجة خاصة للطلبات المدفوعة
        payload.financial_status = 'paid'
        result = await handleOrderUpdate(payload)
        break

      case 'orders/cancelled':
        // تحديث الفاتورة لتصبح ملغية
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

// GET - معلومات عن الـ webhooks المدعومة
export async function GET() {
  return NextResponse.json({
    supportedWebhooks: [
      {
        topic: 'orders/create',
        description: 'إنشاء فاتورة تلقائياً للطلبات المدفوعة',
        endpoint: '/api/shopify/webhooks'
      },
      {
        topic: 'orders/updated',
        description: 'تحديث حالة الفاتورة عند تغيير حالة الطلب',
        endpoint: '/api/shopify/webhooks'
      },
      {
        topic: 'orders/paid',
        description: 'تحديث الفاتورة عند دفع الطلب',
        endpoint: '/api/shopify/webhooks'
      },
      {
        topic: 'orders/cancelled',
        description: 'إلغاء الفاتورة عند إلغاء الطلب',
        endpoint: '/api/shopify/webhooks'
      },
      {
        topic: 'refunds/create',
        description: 'تحديث الفاتورة عند إنشاء استرداد',
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
      idempotencyRecords: global.idempotencyRecords?.size || 0,
      orderMappings: global.orderToInvoiceMap?.size || 0
    }
  })
}
