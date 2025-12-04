// API الاستيراد الشامل من Shopify مع دعم REST و GraphQL Bulk
import { NextRequest, NextResponse } from 'next/server'
import { BackgroundJobManager, RateLimiter, CheckpointManager } from '@/lib/background-jobs'
import { IdempotencyManager, withIdempotency } from '@/lib/idempotency'
import { DateFilterManager, type ShopifyFilters } from '@/lib/date-filters'

interface ImportRequest {
  mode: 'rest' | 'bulk'
  dateFrom?: string
  dateTo?: string
  financialStatus?: string
  fulfillmentStatus?: string
  status?: string
  search?: string
  resumeJobId?: string
}

interface ShopifyOrder {
  id: number
  order_number: string
  name: string
  email: string
  created_at: string
  updated_at: string
  total_price: string
  currency: string
  financial_status: string
  fulfillment_status: string
  line_items: Array<{
    id: number
    title: string
    quantity: number
    price: string
    total_discount: string
    tax_lines: Array<{
      title: string
      price: string
      rate: number
    }>
  }>
  customer: {
    id: number
    first_name: string
    last_name: string
    email: string
    phone?: string
  }
  billing_address?: {
    first_name: string
    last_name: string
    company?: string
    address1: string
    address2?: string
    city: string
    zip: string
    country: string
    country_code: string
  }
  shipping_address?: {
    first_name: string
    last_name: string
    company?: string
    address1: string
    address2?: string
    city: string
    zip: string
    country: string
    country_code: string
  }
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

// استيراد باستخدام REST API مع cursor pagination
async function importWithREST(
  jobId: string,
  filters: ShopifyFilters,
  abortSignal: AbortSignal
): Promise<void> {
  const settings = await getShopifySettings()
  let cursor: string | undefined
  let totalImported = 0
  let totalFailed = 0
  let hasNextPage = true

  // استرداد checkpoint إذا كان موجوداً
  const checkpoint = CheckpointManager.getCheckpoint(jobId)
  if (checkpoint?.cursor) {
    cursor = checkpoint.cursor
    totalImported = checkpoint.processedCount
    console.log(`📍 Resuming from checkpoint: cursor=${cursor}, processed=${totalImported}`)
  }

  while (hasNextPage && !abortSignal.aborted) {
    try {
      // بناء URL مع الفلاتر
      const params = new URLSearchParams({
        limit: '250', // الحد الأقصى لـ Shopify
        ...(cursor && { page_info: cursor })
      })

      // إضافة الفلاتر فقط إذا كانت موجودة وليست فارغة
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })

      const url = `https://${settings.shop_domain}/admin/api/${settings.api_version}/orders.json?${params}`
      
      console.log(`🔄 Fetching orders: ${url}`)

      const response = await RateLimiter.withRetry(async () => {
        const res = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': settings.access_token,
            'Content-Type': 'application/json'
          },
          signal: abortSignal
        })

        if (!res.ok) {
          throw new Error(`Shopify API error: ${res.status} ${res.statusText}`)
        }

        return res
      })

      const data = await response.json()
      const orders: ShopifyOrder[] = data.orders || []

      console.log(`📦 Received ${orders.length} orders`)

      // معالجة الطلبات
      for (const order of orders) {
        if (abortSignal.aborted) break

        try {
          await processOrderToInvoice(order.id.toString(), order)
          totalImported++
          
          // تحديث التقدم
          BackgroundJobManager.updateJob(jobId, {
            progress: {
              current: totalImported,
              total: totalImported + orders.length, // تقدير تقريبي
              percentage: Math.min(95, (totalImported / (totalImported + orders.length)) * 100)
            },
            results: {
              imported: totalImported,
              failed: totalFailed,
              duplicates: 0,
              errors: []
            }
          })

        } catch (error) {
          totalFailed++
          console.error(`❌ Failed to process order ${order.id}:`, error)
          
          // تحديث الأخطاء
          const job = BackgroundJobManager.getJob(jobId)
          if (job) {
            job.results.errors.push(`Order ${order.id}: ${error instanceof Error ? error.message : String(error)}`)
            BackgroundJobManager.updateJob(jobId, { results: job.results })
          }
        }
      }

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
        hasNextPage = orders.length === 250 // إذا كان العدد أقل من 250، فلا توجد صفحة تالية
      }

      // حفظ checkpoint
      if (cursor) {
        CheckpointManager.saveCheckpoint({
          jobId,
          cursor,
          processedCount: totalImported,
          lastProcessedId: orders[orders.length - 1]?.id.toString(),
          timestamp: new Date().toISOString()
        })
      }

      console.log(`✅ Batch completed: imported=${totalImported}, failed=${totalFailed}, hasNext=${hasNextPage}`)

    } catch (error) {
      if (abortSignal.aborted) {
        console.log('🛑 Import aborted by user')
        break
      }
      
      console.error('❌ Batch failed:', error)
      throw error
    }
  }

  // تنظيف checkpoint عند الانتهاء
  CheckpointManager.clearCheckpoint(jobId)
  
  console.log(`🎉 REST import completed: ${totalImported} imported, ${totalFailed} failed`)
}

// استيراد باستخدام GraphQL Bulk Operations
async function importWithBulk(
  jobId: string,
  filters: ShopifyFilters,
  abortSignal: AbortSignal
): Promise<void> {
  const settings = await getShopifySettings()
  
  // بناء GraphQL query
  const query = `
    mutation {
      bulkOperationRunQuery(
        query: """
          {
            orders(
              first: 10000,
              query: "${buildBulkQuery(filters)}"
            ) {
              edges {
                node {
                  id
                  name
                  orderNumber
                  email
                  createdAt
                  updatedAt
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  financialStatus
                  fulfillmentStatus
                  lineItems(first: 50) {
                    edges {
                      node {
                        id
                        title
                        quantity
                        originalUnitPriceSet {
                          shopMoney {
                            amount
                            currencyCode
                          }
                        }
                        taxLines {
                          title
                          priceSet {
                            shopMoney {
                              amount
                              currencyCode
                            }
                          }
                          rate
                        }
                      }
                    }
                  }
                  customer {
                    id
                    firstName
                    lastName
                    email
                    phone
                  }
                  billingAddress {
                    firstName
                    lastName
                    company
                    address1
                    address2
                    city
                    zip
                    country
                    countryCodeV2
                  }
                  shippingAddress {
                    firstName
                    lastName
                    company
                    address1
                    address2
                    city
                    zip
                    country
                    countryCodeV2
                  }
                }
              }
            }
          }
        """
      ) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  // بدء العملية المجمعة
  const bulkResponse = await RateLimiter.withRetry(async () => {
    const res = await fetch(`https://${settings.shop_domain}/admin/api/${settings.api_version}/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': settings.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query }),
      signal: abortSignal
    })

    if (!res.ok) {
      throw new Error(`GraphQL API error: ${res.status} ${res.statusText}`)
    }

    return res.json()
  })

  const bulkOperation = bulkResponse.data?.bulkOperationRunQuery?.bulkOperation
  if (!bulkOperation) {
    throw new Error('Failed to start bulk operation')
  }

  const bulkOperationId = bulkOperation.id
  console.log(`🚀 Started bulk operation: ${bulkOperationId}`)

  // تحديث الوظيفة مع معرف العملية المجمعة
  BackgroundJobManager.updateJob(jobId, {
    data: {
      ...BackgroundJobManager.getJob(jobId)!.data,
      bulkOperationId
    }
  })

  // مراقبة حالة العملية المجمعة
  await monitorBulkOperation(jobId, bulkOperationId, settings, abortSignal)
}

// مراقبة العملية المجمعة
async function monitorBulkOperation(
  jobId: string,
  bulkOperationId: string,
  settings: any,
  abortSignal: AbortSignal
): Promise<void> {
  const statusQuery = `
    query {
      node(id: "${bulkOperationId}") {
        ... on BulkOperation {
          id
          status
          errorCode
          createdAt
          completedAt
          objectCount
          fileSize
          url
          partialDataUrl
        }
      }
    }
  `

  while (!abortSignal.aborted) {
    const statusResponse = await RateLimiter.withRetry(async () => {
      const res = await fetch(`https://${settings.shop_domain}/admin/api/${settings.api_version}/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': settings.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: statusQuery }),
        signal: abortSignal
      })

      return res.json()
    })

    const operation = statusResponse.data?.node
    if (!operation) {
      throw new Error('Failed to get bulk operation status')
    }

    console.log(`📊 Bulk operation status: ${operation.status}`)

    // تحديث التقدم
    BackgroundJobManager.updateJob(jobId, {
      progress: {
        current: operation.objectCount || 0,
        total: operation.objectCount || 0,
        percentage: operation.status === 'COMPLETED' ? 100 : 50
      }
    })

    if (operation.status === 'COMPLETED') {
      if (operation.url) {
        console.log(`📥 Downloading bulk operation results from: ${operation.url}`)
        await processBulkResults(jobId, operation.url, abortSignal)
      }
      break
    } else if (operation.status === 'FAILED' || operation.status === 'CANCELED') {
      throw new Error(`Bulk operation ${operation.status}: ${operation.errorCode}`)
    }

    // انتظار قبل الفحص التالي
    await RateLimiter.sleep(5000)
  }
}

// معالجة نتائج العملية المجمعة
async function processBulkResults(jobId: string, downloadUrl: string, abortSignal: AbortSignal): Promise<void> {
  console.log(`📥 Downloading bulk results...`)
  
  const response = await fetch(downloadUrl, { signal: abortSignal })
  if (!response.ok) {
    throw new Error(`Failed to download bulk results: ${response.status}`)
  }

  const jsonlData = await response.text()
  const lines = jsonlData.trim().split('\n')
  
  let totalImported = 0
  let totalFailed = 0

  console.log(`📦 Processing ${lines.length} orders from bulk operation`)

  for (const line of lines) {
    if (abortSignal.aborted) break

    try {
      const order = JSON.parse(line)
      
      // تحويل من GraphQL format إلى REST format
      const restOrder = convertGraphQLToREST(order)
      
      await processOrderToInvoice(restOrder.id.toString(), restOrder)
      totalImported++

      // تحديث التقدم
      BackgroundJobManager.updateJob(jobId, {
        progress: {
          current: totalImported,
          total: lines.length,
          percentage: (totalImported / lines.length) * 100
        },
        results: {
          imported: totalImported,
          failed: totalFailed,
          duplicates: 0,
          errors: []
        }
      })

    } catch (error) {
      totalFailed++
      console.error(`❌ Failed to process bulk order:`, error)
      
      const job = BackgroundJobManager.getJob(jobId)
      if (job) {
        job.results.errors.push(`Bulk order: ${error instanceof Error ? error.message : String(error)}`)
        BackgroundJobManager.updateJob(jobId, { results: job.results })
      }
    }
  }

  console.log(`🎉 Bulk processing completed: ${totalImported} imported, ${totalFailed} failed`)
}

// تحويل طلب من GraphQL إلى REST format
function convertGraphQLToREST(graphqlOrder: any): ShopifyOrder {
  return {
    id: parseInt(graphqlOrder.id.replace('gid://shopify/Order/', '')),
    order_number: graphqlOrder.orderNumber,
    name: graphqlOrder.name,
    email: graphqlOrder.email,
    created_at: graphqlOrder.createdAt,
    updated_at: graphqlOrder.updatedAt,
    total_price: graphqlOrder.totalPriceSet?.shopMoney?.amount || '0',
    currency: graphqlOrder.totalPriceSet?.shopMoney?.currencyCode || 'EUR',
    financial_status: graphqlOrder.financialStatus?.toLowerCase(),
    fulfillment_status: graphqlOrder.fulfillmentStatus?.toLowerCase(),
    line_items: graphqlOrder.lineItems?.edges?.map((edge: any) => ({
      id: parseInt(edge.node.id.replace('gid://shopify/LineItem/', '')),
      title: edge.node.title,
      quantity: edge.node.quantity,
      price: edge.node.originalUnitPriceSet?.shopMoney?.amount || '0',
      total_discount: '0',
      tax_lines: edge.node.taxLines?.map((tax: any) => ({
        title: tax.title,
        price: tax.priceSet?.shopMoney?.amount || '0',
        rate: tax.rate
      })) || []
    })) || [],
    customer: {
      id: parseInt(graphqlOrder.customer?.id?.replace('gid://shopify/Customer/', '') || '0'),
      first_name: graphqlOrder.customer?.firstName || '',
      last_name: graphqlOrder.customer?.lastName || '',
      email: graphqlOrder.customer?.email || '',
      phone: graphqlOrder.customer?.phone
    },
    billing_address: graphqlOrder.billingAddress ? {
      first_name: graphqlOrder.billingAddress.firstName,
      last_name: graphqlOrder.billingAddress.lastName,
      company: graphqlOrder.billingAddress.company,
      address1: graphqlOrder.billingAddress.address1,
      address2: graphqlOrder.billingAddress.address2,
      city: graphqlOrder.billingAddress.city,
      zip: graphqlOrder.billingAddress.zip,
      country: graphqlOrder.billingAddress.country,
      country_code: graphqlOrder.billingAddress.countryCodeV2
    } : undefined,
    shipping_address: graphqlOrder.shippingAddress ? {
      first_name: graphqlOrder.shippingAddress.firstName,
      last_name: graphqlOrder.shippingAddress.lastName,
      company: graphqlOrder.shippingAddress.company,
      address1: graphqlOrder.shippingAddress.address1,
      address2: graphqlOrder.shippingAddress.address2,
      city: graphqlOrder.shippingAddress.city,
      zip: graphqlOrder.shippingAddress.zip,
      country: graphqlOrder.shippingAddress.country,
      country_code: graphqlOrder.shippingAddress.countryCodeV2
    } : undefined
  }
}

// بناء query للعملية المجمعة
function buildBulkQuery(filters: ShopifyFilters): string {
  const conditions: string[] = []

  if (filters.created_at_min) {
    conditions.push(`created_at:>='${filters.created_at_min}'`)
  }
  
  if (filters.created_at_max) {
    conditions.push(`created_at:<='${filters.created_at_max}'`)
  }

  if (filters.financial_status) {
    conditions.push(`financial_status:${filters.financial_status}`)
  }

  if (filters.fulfillment_status) {
    conditions.push(`fulfillment_status:${filters.fulfillment_status}`)
  }

  if (filters.status) {
    conditions.push(`status:${filters.status}`)
  }

  return conditions.join(' AND ')
}

// معالجة طلب واحد وتحويله إلى فاتورة
const processOrderToInvoice = withIdempotency(async (shopifyOrderId: string, orderData: ShopifyOrder) => {
  console.log(`🔄 Processing order ${shopifyOrderId}`)

  // تحويل بيانات الطلب إلى فاتورة
  const invoiceData = {
    // بيانات العميل
    customer: {
      name: `${orderData.customer.first_name} ${orderData.customer.last_name}`.trim(),
      email: orderData.customer.email,
      phone: orderData.customer.phone,
      address: orderData.billing_address?.address1 || orderData.shipping_address?.address1 || '',
      city: orderData.billing_address?.city || orderData.shipping_address?.city || '',
      zipCode: orderData.billing_address?.zip || orderData.shipping_address?.zip || '',
      country: orderData.billing_address?.country || orderData.shipping_address?.country || 'Deutschland',
      companyName: orderData.billing_address?.company || orderData.shipping_address?.company || '',
      isCompany: !!(orderData.billing_address?.company || orderData.shipping_address?.company)
    },
    
    // بيانات الفاتورة
    number: `SH-${orderData.order_number}`,
    date: new Date(orderData.created_at).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 يوم
    
    // البنود
    items: orderData.line_items.map(item => ({
      description: item.title,
      quantity: item.quantity,
      unitPrice: parseFloat(item.price),
      total: parseFloat(item.price) * item.quantity
    })),
    
    // الحسابات
    subtotal: parseFloat(orderData.total_price),
    taxRate: 19, // يمكن حسابها من tax_lines
    taxAmount: 0, // يمكن حسابها من tax_lines
    total: parseFloat(orderData.total_price),
    
    // الحالة
    status: mapShopifyStatusToInvoiceStatus(orderData.financial_status),
    
    // معلومات إضافية
    shopifyOrderId: orderData.id.toString(),
    shopifyOrderNumber: orderData.order_number,
    currency: orderData.currency
  }

  // إنشاء الفاتورة
  const response = await fetch('/api/invoices', {
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
  console.log(`✅ Created invoice ${result.id} for order ${shopifyOrderId}`)
  
  return { invoiceId: result.id }
})

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

// POST - بدء استيراد جديد
export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json()
    
    // التحقق من صحة الطلب
    if (!body.mode || !['rest', 'bulk'].includes(body.mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "rest" or "bulk"' },
        { status: 400 }
      )
    }

    // التحقق من فلاتر التاريخ
    let dateRange
    if (body.dateFrom && body.dateTo) {
      const validation = DateFilterManager.validateDateRange(body.dateFrom, body.dateTo)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error, suggestion: validation.correctedRange },
          { status: 400 }
        )
      }
      dateRange = { from: body.dateFrom, to: body.dateTo, label: 'مخصص' }
    } else {
      // استخدام آخر 30 يوم كافتراضي
      dateRange = DateFilterManager.getPresetRanges()[5]
    }

    // بناء فلاتر Shopify
    const shopifyFilters = DateFilterManager.toShopifyFilters(dateRange, {
      financialStatus: body.financialStatus as any,
      fulfillmentStatus: body.fulfillmentStatus as any,
      status: body.status as any
    })

    // إنشاء مهمة جديدة
    const jobId = BackgroundJobManager.createJob('shopify_import', {
      mode: body.mode,
      filters: {
        dateFrom: body.dateFrom,
        dateTo: body.dateTo,
        status: body.status,
        search: body.search
      }
    })

    console.log(`🚀 Starting ${body.mode.toUpperCase()} import job: ${jobId}`)

    // بدء المعالجة في الخلفية
    const abortController = new AbortController()
    global.activeJobControllers!.set(jobId, abortController)

    // تشغيل المهمة
    BackgroundJobManager.updateJob(jobId, { status: 'running' })

    const importPromise = body.mode === 'bulk' 
      ? importWithBulk(jobId, shopifyFilters, abortController.signal)
      : importWithREST(jobId, shopifyFilters, abortController.signal)

    importPromise
      .then(() => {
        BackgroundJobManager.updateJob(jobId, { 
          status: 'completed',
          progress: { ...BackgroundJobManager.getJob(jobId)!.progress, percentage: 100 }
        })
        global.activeJobControllers!.delete(jobId)
        console.log(`🎉 Import job ${jobId} completed successfully`)
      })
      .catch((error) => {
        BackgroundJobManager.updateJob(jobId, { 
          status: 'failed',
          results: {
            ...BackgroundJobManager.getJob(jobId)!.results,
            errors: [error.message]
          }
        })
        global.activeJobControllers!.delete(jobId)
        console.error(`❌ Import job ${jobId} failed:`, error)
      })

    return NextResponse.json({
      success: true,
      jobId,
      message: `${body.mode.toUpperCase()} import started`,
      estimatedDuration: body.mode === 'bulk' ? '5-10 minutes' : '2-5 minutes per 1000 orders'
    })

  } catch (error) {
    console.error('❌ Import API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET - الحصول على حالة المهمة
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    // إرجاع جميع المهام
    const jobs = BackgroundJobManager.getAllJobs()
    return NextResponse.json({ jobs })
  }

  const job = BackgroundJobManager.getJob(jobId)
  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ job })
}

// PATCH - التحكم في المهمة (pause/resume/cancel)
export async function PATCH(request: NextRequest) {
  try {
    const { jobId, action } = await request.json()

    if (!jobId || !action) {
      return NextResponse.json(
        { error: 'Missing jobId or action' },
        { status: 400 }
      )
    }

    let success = false
    let message = ''

    switch (action) {
      case 'pause':
        success = BackgroundJobManager.pauseJob(jobId)
        message = success ? 'Job paused' : 'Failed to pause job'
        break
      
      case 'cancel':
        success = BackgroundJobManager.cancelJob(jobId)
        message = success ? 'Job cancelled' : 'Failed to cancel job'
        break
      
      case 'resume':
        // إعادة تشغيل المهمة من checkpoint
        const job = BackgroundJobManager.getJob(jobId)
        if (job && job.status === 'paused') {
          // يمكن إضافة منطق إعادة التشغيل هنا
          BackgroundJobManager.updateJob(jobId, { status: 'running' })
          success = true
          message = 'Job resumed'
        } else {
          message = 'Job cannot be resumed'
        }
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be pause, resume, or cancel' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success, message })

  } catch (error) {
    console.error('❌ Job control error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
