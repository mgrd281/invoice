// Legacy Import API محسن لدعم ملايين الطلبات
import { NextRequest, NextResponse } from 'next/server'
import { BackgroundJobManager, RateLimiter } from '@/lib/background-jobs'
import { IdempotencyManager } from '@/lib/idempotency'

interface LegacyImportRequest {
  limit?: number
  financial_status?: string
  created_at_min?: string
  created_at_max?: string
  page_info?: string
  auto_convert?: boolean
}

interface ShopifyOrder {
  id: number
  name: string
  email: string
  total_price: string
  currency: string
  created_at: string
  financial_status: string
  fulfillment_status: string | null
  customer: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  line_items: Array<{
    id: number
    title: string
    quantity: number
    price: string
  }>
  billing_address?: any
  shipping_address?: any
}

// الحصول على إعدادات Shopify
async function getShopifySettings() {
  // استخدام نظام الإعدادات الموحد
  const { getShopifySettings: loadSettings } = await import('@/lib/shopify-settings')
  const settings = loadSettings()
  
  return {
    shop_domain: settings.shopDomain,
    access_token: settings.accessToken,
    api_version: settings.apiVersion
  }
}

// جلب الطلبات مع دعم cursor pagination
async function fetchOrdersWithPagination(
  settings: any,
  params: LegacyImportRequest,
  maxOrders: number = 1000000 // حد أقصى للنظام القديم - 1 Million Bestellungen
): Promise<{
  orders: ShopifyOrder[]
  hasNextPage: boolean
  nextCursor?: string
  totalFetched: number
}> {
  const allOrders: ShopifyOrder[] = []
  let cursor = params.page_info
  let hasNextPage = true
  let totalFetched = 0

  console.log(`🔄 Starting legacy import with max ${maxOrders} orders`)

  while (hasNextPage && totalFetched < maxOrders) {
    try {
      // بناء URL مع المعاملات
      const urlParams = new URLSearchParams({
        limit: '250', // الحد الأقصى لـ Shopify
        status: 'any',
        ...(cursor && { page_info: cursor }),
        ...(params.financial_status && params.financial_status !== 'any' && { 
          financial_status: params.financial_status 
        }),
        ...(params.created_at_min && { created_at_min: params.created_at_min }),
        ...(params.created_at_max && { created_at_max: params.created_at_max })
      })

      const url = `https://${settings.shop_domain}/admin/api/${settings.api_version}/orders.json?${urlParams}`
      
      console.log(`📡 Fetching batch: ${Math.floor(totalFetched / 250) + 1}, cursor: ${cursor?.substring(0, 20)}...`)
      console.log(`🔗 Full URL: ${url}`)
      console.log(`📋 URL Params:`, Object.fromEntries(urlParams.entries()))

      const response = await RateLimiter.withRetry(async () => {
        const res = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': settings.access_token,
            'Content-Type': 'application/json'
          }
        })

        if (!res.ok) {
          throw new Error(`Shopify API error: ${res.status} ${res.statusText}`)
        }

        return res
      })

      const data = await response.json()
      const orders: ShopifyOrder[] = data.orders || []

      console.log(`📦 Received ${orders.length} orders in this batch`)

      // إضافة الطلبات إلى المجموعة
      allOrders.push(...orders)
      totalFetched += orders.length

      // فحص الصفحة التالية
      const linkHeader = response.headers.get('Link')
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        if (nextMatch) {
          const nextUrl = new URL(nextMatch[1])
          cursor = nextUrl.searchParams.get('page_info') || undefined
          hasNextPage = !!cursor
        } else {
          hasNextPage = false
        }
      } else {
        hasNextPage = orders.length === 250
      }

      // إذا وصلنا للحد الأقصى، توقف
      if (totalFetched >= maxOrders) {
        hasNextPage = false
        console.log(`⚠️ Reached maximum limit of ${maxOrders} orders`)
      }

      // تأخير قصير بين الطلبات لتجنب rate limiting
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

    } catch (error) {
      console.error('❌ Error fetching batch:', error)
      throw error
    }
  }

  console.log(`✅ Legacy import completed: ${totalFetched} orders fetched`)

  return {
    orders: allOrders,
    hasNextPage: totalFetched >= maxOrders, // true إذا توقفنا بسبب الحد الأقصى
    nextCursor: cursor,
    totalFetched
  }
}

// تحويل الطلبات إلى فواتير
async function convertOrdersToInvoices(orders: ShopifyOrder[]): Promise<{
  imported: number
  failed: number
  skipped: number
  errors: string[]
}> {
  let imported = 0
  let failed = 0
  let skipped = 0
  const errors: string[] = []

  console.log(`🔄 Converting ${orders.length} orders to invoices`)

  for (const order of orders) {
    try {
      // فحص idempotency
      const fingerprint = IdempotencyManager.createRequestFingerprint(order)
      const check = IdempotencyManager.checkIdempotency(order.id.toString(), fingerprint)
      
      if (check.exists) {
        skipped++
        console.log(`⏭️ Order ${order.id} already processed, skipping`)
        continue
      }

      // بدء معالجة idempotent
      const key = IdempotencyManager.startProcessing(order.id.toString(), fingerprint)

      try {
        // تحويل بيانات الطلب إلى فاتورة
        const invoiceData = {
          customer: {
            name: `${order.customer.first_name} ${order.customer.last_name}`.trim(),
            email: order.customer.email,
            address: order.billing_address?.address1 || order.shipping_address?.address1 || '',
            city: order.billing_address?.city || order.shipping_address?.city || '',
            zipCode: order.billing_address?.zip || order.shipping_address?.zip || '',
            country: order.billing_address?.country || order.shipping_address?.country || 'Deutschland',
            companyName: order.billing_address?.company || order.shipping_address?.company || '',
            isCompany: !!(order.billing_address?.company || order.shipping_address?.company)
          },
          number: `SH-${order.name.replace('#', '')}`,
          date: new Date(order.created_at).toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: order.line_items.map(item => ({
            description: item.title,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            total: parseFloat(item.price) * item.quantity
          })),
          subtotal: parseFloat(order.total_price),
          taxRate: 19,
          taxAmount: 0,
          total: parseFloat(order.total_price),
          status: mapShopifyStatusToInvoiceStatus(order.financial_status),
          shopifyOrderId: order.id.toString(),
          shopifyOrderNumber: order.name,
          currency: order.currency
        }

        // إنشاء الفاتورة - use absolute URL for server-side fetch
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const response = await fetch(`${baseUrl}/api/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invoiceData)
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to create invoice: ${response.status} ${errorText}`)
        }

        const result = await response.json()
        
        // إكمال المعالجة
        IdempotencyManager.completeProcessing(key, result.id)
        
        imported++
        console.log(`✅ Created invoice ${result.id} for order ${order.id}`)

      } catch (error) {
        // فشل المعالجة
        IdempotencyManager.failProcessing(key, error instanceof Error ? error.message : String(error))
        throw error
      }

    } catch (error) {
      failed++
      const errorMsg = `Order ${order.id}: ${error instanceof Error ? error.message : String(error)}`
      errors.push(errorMsg)
      console.error(`❌ Failed to process order ${order.id}:`, error)
    }
  }

  console.log(`🎉 Conversion completed: ${imported} imported, ${failed} failed, ${skipped} skipped`)

  return { imported, failed, skipped, errors }
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

// GET - جلب الطلبات (للعرض)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let limit = parseInt(searchParams.get('limit') || '250')
    const financialStatus = searchParams.get('financial_status') || 'any'
    
    // Validate and cap limit to prevent memory issues
    if (limit > 10000) {
      console.warn(`⚠️ Limit ${limit} too high, capping at 10000 for legacy system`)
      limit = 10000
    }
    if (limit < 1) {
      console.warn(`⚠️ Invalid limit ${limit}, using default 250`)
      limit = 250
    }
    
    // Properly decode URL-encoded date parameters
    let createdAtMin = searchParams.get('created_at_min') ? decodeURIComponent(searchParams.get('created_at_min')!) : null
    let createdAtMax = searchParams.get('created_at_max') ? decodeURIComponent(searchParams.get('created_at_max')!) : null
    const pageInfo = searchParams.get('page_info')
    
    // Validate and format dates for Shopify API
    if (createdAtMin) {
      try {
        const date = new Date(createdAtMin)
        if (isNaN(date.getTime())) {
          console.warn(`⚠️ Invalid created_at_min date: ${createdAtMin}`)
          createdAtMin = null
        } else {
          createdAtMin = date.toISOString()
        }
      } catch (error) {
        console.warn(`⚠️ Error parsing created_at_min: ${createdAtMin}`, error)
        createdAtMin = null
      }
    }
    
    if (createdAtMax) {
      try {
        const date = new Date(createdAtMax)
        if (isNaN(date.getTime())) {
          console.warn(`⚠️ Invalid created_at_max date: ${createdAtMax}`)
          createdAtMax = null
        } else {
          createdAtMax = date.toISOString()
        }
      } catch (error) {
        console.warn(`⚠️ Error parsing created_at_max: ${createdAtMax}`, error)
        createdAtMax = null
      }
    }

    console.log(`🔍 Legacy GET request: limit=${limit}, status=${financialStatus}`)
    console.log(`🔍 Date params: min=${createdAtMin}, max=${createdAtMax}`)

    const settings = await getShopifySettings()
    console.log(`⚙️ Shopify settings loaded: ${settings.shop_domain}`)
    
    // Store original limit for warning message
    const originalLimit = parseInt(searchParams.get('limit') || '250')
    const wasLimitCapped = originalLimit > 10000

    // للطلبات الكبيرة، استخدم نظام pagination محسن
    const maxOrdersForLegacy = Math.min(limit, 10000) // حد أقصى 10k للنظام القديم

    const result = await fetchOrdersWithPagination(settings, {
      limit,
      financial_status: financialStatus,
      created_at_min: createdAtMin || undefined,
      created_at_max: createdAtMax || undefined,
      page_info: pageInfo || undefined
    }, maxOrdersForLegacy)

    // تحويل إلى التنسيق المتوقع
    const formattedOrders = result.orders.map(order => ({
      id: order.id,
      name: order.name,
      email: order.email,
      total_price: order.total_price,
      currency: order.currency,
      created_at: order.created_at,
      financial_status: order.financial_status,
      fulfillment_status: order.fulfillment_status,
      customer: {
        name: `${order.customer.first_name} ${order.customer.last_name}`.trim(),
        email: order.customer.email
      },
      line_items_count: order.line_items?.length || 0
    }))

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        totalFetched: result.totalFetched,
        isLimited: result.totalFetched >= maxOrdersForLegacy
      },
      message: wasLimitCapped 
        ? `Limit ${originalLimit} zu hoch - auf ${maxOrdersForLegacy} reduziert. Nutzen Sie das Advanced Import System für unbegrenzte Bestellungen.`
        : result.totalFetched >= maxOrdersForLegacy 
          ? `Reached legacy system limit of ${maxOrdersForLegacy} orders. Use Advanced Import for unlimited access.`
          : `Fetched ${result.totalFetched} orders successfully`
    })

  } catch (error) {
    console.error('❌ Legacy import GET error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Abrufen der Shopify-Bestellungen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}

// POST - استيراد الطلبات وتحويلها إلى فواتير
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      limit = 1000,
      financial_status = 'paid',
      created_at_min,
      created_at_max,
      auto_convert = true
    } = body

    console.log(`🚀 Legacy POST import: limit=${limit}, status=${financial_status}, auto_convert=${auto_convert}`)

    const settings = await getShopifySettings()

    // للاستيراد، استخدم حد أقصى معقول للنظام القديم
    const maxOrdersForImport = Math.min(limit, 50000) // حد أقصى 50k للاستيراد القديم

    // جلب الطلبات
    const result = await fetchOrdersWithPagination(settings, {
      limit,
      financial_status,
      created_at_min,
      created_at_max
    }, maxOrdersForImport)

    let importResult = {
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // تحويل إلى فواتير إذا كان مطلوباً
    if (auto_convert && result.orders.length > 0) {
      importResult = await convertOrdersToInvoices(result.orders)
    }

    const response = {
      success: true,
      totalOrders: result.totalFetched,
      ...importResult,
      pagination: {
        hasMoreOrders: result.hasNextPage,
        nextCursor: result.nextCursor,
        isLimited: result.totalFetched >= maxOrdersForImport
      },
      message: result.totalFetched >= maxOrdersForImport
        ? `Legacy import completed with ${maxOrdersForImport} orders limit. Use Advanced Import for unlimited processing.`
        : `Legacy import completed successfully`
    }

    console.log(`🎉 Legacy import response:`, response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Legacy import POST error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Importieren der Shopify-Bestellungen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}
