// Idempotency-System zur Vermeidung von Rechnungsduplikaten aus Shopify
export interface IdempotencyRecord {
  key: string
  shopifyOrderId: string
  invoiceId?: string
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  error?: string
  requestFingerprint: string
}

// Global Storage für Idempotency
declare global {
  var idempotencyRecords: Map<string, IdempotencyRecord> | undefined
  var orderToInvoiceMap: Map<string, string> | undefined
}

if (!global.idempotencyRecords) {
  global.idempotencyRecords = new Map()
}

if (!global.orderToInvoiceMap) {
  global.orderToInvoiceMap = new Map()
}

export class IdempotencyManager {
  // Eindeutigen Idempotency-Schlüssel erstellen
  static generateKey(shopifyOrderId: string, operation: string = 'create_invoice'): string {
    return `shopify_${operation}_${shopifyOrderId}`
  }

  // إنشاء بصمة الطلب
  static createRequestFingerprint(orderData: any): string {
    const relevantFields = {
      id: orderData.id,
      order_number: orderData.order_number,
      total_price: orderData.total_price,
      currency: orderData.currency,
      financial_status: orderData.financial_status,
      created_at: orderData.created_at,
      updated_at: orderData.updated_at
    }
    
    return Buffer.from(JSON.stringify(relevantFields)).toString('base64')
  }

  // فحص ما إذا كان الطلب معالج مسبقاً
  static checkIdempotency(shopifyOrderId: string, requestFingerprint: string): {
    exists: boolean
    record?: IdempotencyRecord
    invoiceId?: string
  } {
    const key = this.generateKey(shopifyOrderId)
    const record = global.idempotencyRecords!.get(key)
    
    if (record) {
      // فحص ما إذا كانت البصمة متطابقة
      if (record.requestFingerprint === requestFingerprint) {
        return {
          exists: true,
          record,
          invoiceId: record.invoiceId
        }
      } else {
        console.log(`🔄 Order ${shopifyOrderId} fingerprint changed, allowing reprocessing`)
      }
    }

    // فحص في order-to-invoice mapping
    const existingInvoiceId = global.orderToInvoiceMap!.get(shopifyOrderId)
    if (existingInvoiceId) {
      return {
        exists: true,
        invoiceId: existingInvoiceId
      }
    }

    return { exists: false }
  }

  // بدء معالجة جديدة
  static startProcessing(shopifyOrderId: string, requestFingerprint: string): string {
    const key = this.generateKey(shopifyOrderId)
    
    const record: IdempotencyRecord = {
      key,
      shopifyOrderId,
      status: 'processing',
      createdAt: new Date().toISOString(),
      requestFingerprint
    }

    global.idempotencyRecords!.set(key, record)
    return key
  }

  // إكمال المعالجة بنجاح
  static completeProcessing(key: string, invoiceId: string): void {
    const record = global.idempotencyRecords!.get(key)
    if (record) {
      record.status = 'completed'
      record.invoiceId = invoiceId
      record.completedAt = new Date().toISOString()
      
      // إضافة إلى order-to-invoice mapping
      global.orderToInvoiceMap!.set(record.shopifyOrderId, invoiceId)
      
      global.idempotencyRecords!.set(key, record)
    }
  }

  // فشل المعالجة
  static failProcessing(key: string, error: string): void {
    const record = global.idempotencyRecords!.get(key)
    if (record) {
      record.status = 'failed'
      record.error = error
      record.completedAt = new Date().toISOString()
      
      global.idempotencyRecords!.set(key, record)
    }
  }

  // تنظيف السجلات القديمة
  static cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge
    
    for (const [key, record] of global.idempotencyRecords!) {
      const recordTime = new Date(record.createdAt).getTime()
      if (recordTime < cutoff && record.status !== 'processing') {
        global.idempotencyRecords!.delete(key)
      }
    }
  }

  // الحصول على جميع السجلات
  static getAllRecords(): IdempotencyRecord[] {
    return Array.from(global.idempotencyRecords!.values())
  }

  // فحص تضارب المفاتيح
  static detectCollisions(): { collisions: string[], total: number } {
    const fingerprints = new Map<string, string[]>()
    
    for (const record of global.idempotencyRecords!.values()) {
      const fp = record.requestFingerprint
      if (!fingerprints.has(fp)) {
        fingerprints.set(fp, [])
      }
      fingerprints.get(fp)!.push(record.shopifyOrderId)
    }

    const collisions: string[] = []
    for (const [fingerprint, orderIds] of fingerprints) {
      if (orderIds.length > 1) {
        collisions.push(`Fingerprint ${fingerprint.substring(0, 10)}... used by orders: ${orderIds.join(', ')}`)
      }
    }

    return {
      collisions,
      total: global.idempotencyRecords!.size
    }
  }

  // إحصائيات الـ idempotency
  static getStats(): {
    total: number
    processing: number
    completed: number
    failed: number
    orderMappings: number
  } {
    const records = Array.from(global.idempotencyRecords!.values())
    
    return {
      total: records.length,
      processing: records.filter(r => r.status === 'processing').length,
      completed: records.filter(r => r.status === 'completed').length,
      failed: records.filter(r => r.status === 'failed').length,
      orderMappings: global.orderToInvoiceMap!.size
    }
  }
}

// Middleware للـ APIs
export function withIdempotency<T>(
  handler: (shopifyOrderId: string, orderData: any) => Promise<T>
) {
  return async (shopifyOrderId: string, orderData: any): Promise<T> => {
    const fingerprint = IdempotencyManager.createRequestFingerprint(orderData)
    const check = IdempotencyManager.checkIdempotency(shopifyOrderId, fingerprint)
    
    if (check.exists) {
      if (check.record?.status === 'completed' && check.invoiceId) {
        console.log(`✅ Order ${shopifyOrderId} already processed, returning existing invoice ${check.invoiceId}`)
        return { invoiceId: check.invoiceId, duplicate: true } as T
      } else if (check.record?.status === 'processing') {
        throw new Error(`Order ${shopifyOrderId} is currently being processed`)
      } else if (check.record?.status === 'failed') {
        console.log(`🔄 Retrying failed order ${shopifyOrderId}`)
        // السماح بإعادة المحاولة للطلبات الفاشلة
      }
    }

    const key = IdempotencyManager.startProcessing(shopifyOrderId, fingerprint)
    
    try {
      const result = await handler(shopifyOrderId, orderData)
      
      if (result && typeof result === 'object' && 'invoiceId' in result) {
        IdempotencyManager.completeProcessing(key, (result as any).invoiceId)
      }
      
      return result
    } catch (error) {
      IdempotencyManager.failProcessing(key, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

// تنظيف دوري للسجلات القديمة
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    IdempotencyManager.cleanup()
  }, 60 * 60 * 1000) // كل ساعة
}
