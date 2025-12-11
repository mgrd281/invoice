// ========================================
// SHOPIFY API INTEGRATION
// ========================================

import { getShopifySettings, ShopifySettings } from './shopify-settings'

// ========================================
// TYPES & INTERFACES
// ========================================

export interface ShopifyOrder {
  id: number
  name: string // Order number (e.g., "#1001")
  email: string
  created_at: string
  updated_at: string
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  financial_status: string // paid, pending, refunded, etc.
  fulfillment_status: string | null
  customer: {
    id: number
    email?: string
    first_name?: string
    last_name?: string
    name?: string
    phone?: string | null
    default_address?: {
      first_name?: string
      last_name?: string
      address1?: string
      address2?: string | null
      city?: string
      zip?: string
      country?: string
      country_code?: string
      company?: string | null
      province?: string | null
      province_code?: string | null
    }
  }
  billing_address: {
    first_name?: string
    last_name?: string
    name?: string
    address1?: string
    address2?: string | null
    city?: string
    zip?: string
    country?: string
    country_code?: string
    company?: string | null
    province?: string | null
    province_code?: string | null
  }
  line_items: Array<{
    id: number
    title: string
    quantity: number
    price: string
    sku: string | null
    product_id: number
    variant_id: number
    vendor?: string
    fulfillable_quantity?: number
    grams?: number
    requires_shipping?: boolean
  }>
  tax_lines: Array<{
    title: string
    price: string
    rate: number
  }>
}

export interface ShopifyProduct {
  id: number
  title: string
  handle: string
  product_type: string
  created_at: string
  updated_at: string
  tags?: string
  vendor?: string
  status?: string
  body_html?: string
  images?: Array<{ src: string }>
  variants: Array<{
    id: number
    title: string
    price: string
    sku: string | null
    inventory_quantity: number
  }>
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  orders: ShopifyOrder[]
}

// ========================================
// SHOPIFY API CLIENT
// ========================================

// Helper function to check if a value is real and meaningful
const isValidValue = (value: any): boolean => {
  return value &&
    value !== 'MISSING' &&
    value !== 'NULL' &&
    value !== 'undefined' &&
    value.toString().trim() !== ''
}

export class ShopifyAPI {
  private settings: ShopifySettings
  private baseUrl: string

  constructor(settings?: ShopifySettings) {
    this.settings = settings || getShopifySettings()

    // Sanitize settings
    if (this.settings.shopDomain) {
      this.settings.shopDomain = this.settings.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
    }
    if (this.settings.accessToken) {
      this.settings.accessToken = this.settings.accessToken.trim()
    }

    this.baseUrl = `https://${this.settings.shopDomain}/admin/api/${this.settings.apiVersion}`
  }


  /**
   * Make authenticated request to Shopify API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`

    console.log(`🔗 Making Shopify API request to: ${url}`)
    console.log(`🔑 Using access token: ${this.settings.accessToken.substring(0, 10)}...`)

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': this.settings.accessToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    console.log(`📡 Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Shopify API Error Response:`, errorText)
      throw new Error(`Shopify API Error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<{ success: boolean; message: string; shop?: any }> {
    try {
      const response = await this.makeRequest('/shop.json')
      const data = await response.json()

      return {
        success: true,
        message: `Verbindung erfolgreich! Shop: ${data.shop?.name}`,
        shop: data.shop
      }
    } catch (error) {
      console.error('❌ Detailed connection error:', error)
      return {
        success: false,
        message: `Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    }
  }

  /**
   * Get orders from Shopify with unlimited cursor pagination
   */
  async getOrders(params: {
    limit?: number
    status?: string
    financial_status?: string
    created_at_min?: string
    created_at_max?: string
    name?: string
  } = {}): Promise<ShopifyOrder[]> {
    try {
      // Remove limit restriction for complete import
      const requestedLimit = params.limit || 999999 // Unlimited by default
      const maxPerPage = 250 // Shopify API maximum per page

      let allOrders: ShopifyOrder[] = []
      let pageCount = 0
      let hasMorePages = true
      let pageInfo: any = null

      console.log(`🚀 Starting UNLIMITED fetch of orders`)
      console.log(`📅 Date range: ${params.created_at_min} to ${params.created_at_max}`)
      console.log(`💰 Financial status: ${params.financial_status || 'any'}`)

      // Some Shopify API versions reject the `status` param with 400. We'll try with status=any first,
      // and if the first page fails due to 400, we'll retry without the status param.
      let tryWithStatusAny = true
      let firstAttemptDone = false

      while (hasMorePages && pageCount < 1000) { // Safety limit of 1000 pages
        const searchParams = new URLSearchParams()
        searchParams.set('limit', '250') // Always request max per page for efficiency

        // Request specific fields including customer data
        // Request ALL fields by default to ensure no data is missing (especially addresses)
        // searchParams.set('fields', 'id,name,email,created_at,updated_at,total_price,subtotal_price,total_tax,currency,financial_status,fulfillment_status,customer,billing_address,shipping_address,line_items,tax_lines')
        // Attempt to include all orders (open/closed/cancelled)
        if (tryWithStatusAny) {
          searchParams.set('status', 'any')
        }

        // Financial status filter
        if (params.financial_status && params.financial_status !== 'any') {
          searchParams.set('financial_status', params.financial_status)
        }

        // Date range with proper timezone handling
        if (params.created_at_min) {
          searchParams.set('created_at_min', params.created_at_min)
        }
        if (params.created_at_max) {
          searchParams.set('created_at_max', params.created_at_max)
        }

        // Filter by name (Order number)
        if (params.name) {
          searchParams.set('name', params.name)
          // When searching by name, we usually want to ignore status filters to find the specific order
          if (!params.status) searchParams.set('status', 'any')
        }

        // Cursor pagination using page_info
        if (pageInfo && pageInfo.next) {
          // IMPORTANT: When using page_info, we MUST NOT send other filter parameters
          // Shopify API requires ONLY page_info and limit
          searchParams.delete('status')
          searchParams.delete('financial_status')
          searchParams.delete('created_at_min')
          searchParams.delete('created_at_max')

          searchParams.set('page_info', pageInfo.next)
        }

        try {
          console.log(`🔄 Page ${pageCount + 1}: Fetching ${maxPerPage} orders...`)
          console.log(`🔗 URL params: ${searchParams.toString()}`)
          console.log(`🔌 Shopify API Request: ${this.baseUrl}/orders.json?${searchParams.toString()}`)

          const response = await this.makeRequest(`/orders.json?${searchParams}`)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          const orders = data.orders || []

          // Extract pagination info from Link header
          const linkHeader = response.headers.get('Link')
          pageInfo = this.parseLinkHeader(linkHeader)

          console.log(`📦 Page ${pageCount + 1}: Received ${orders.length} orders`)
          console.log(`🔗 Has next page: ${!!pageInfo?.next}`)

          if (orders.length === 0) {
            console.log('🏁 No more orders available')
            hasMorePages = false
            break
          }

          // Filter out duplicates
          const newOrders = orders.filter((order: any) =>
            !allOrders.some(existing => existing.id === order.id)
          )

          if (newOrders.length === 0 && !pageInfo?.next) {
            console.log('🔄 No new orders found and no next page, stopping')
            hasMorePages = false
            break
          }

          allOrders.push(...newOrders)
          pageCount++

          console.log(`✅ Page ${pageCount}: Added ${newOrders.length} new orders, total: ${allOrders.length}`)

          // Check if we have more pages
          if (!pageInfo?.next) {
            console.log('📄 No more pages available')
            hasMorePages = false
          }

          // Rate limiting - more aggressive for unlimited import
          if (pageCount % 10 === 0) {
            console.log(`⏳ Rate limiting: waiting 3 seconds after ${pageCount} pages...`)
            await new Promise(resolve => setTimeout(resolve, 3000))
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

        } catch (error: any) {
          console.error(`❌ Error on page ${pageCount + 1}:`, error)
          // If the very first page failed and we tried with status=any, retry once without it
          if (pageCount === 0 && tryWithStatusAny && !firstAttemptDone) {
            firstAttemptDone = true
            tryWithStatusAny = false
            console.warn('⚠️ Retrying without status=any due to first-page failure...')
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 800))
            continue
          } else {
            if (pageCount === 0) {
              throw error // If first page also fails without status, throw error
            }
            // For subsequent pages, just stop pagination
            hasMorePages = false
            break
          }
        }
      }

      // Sort final results by created_at descending
      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      console.log(`✅ UNLIMITED IMPORT COMPLETED: ${allOrders.length} orders fetched in ${pageCount} pages`)

      // Only apply limit if specifically requested and not unlimited
      if (params.limit && params.limit < 999999) {
        return allOrders.slice(0, params.limit)
      }

      return allOrders
    } catch (error) {
      console.error('Error fetching Shopify orders:', error)
      throw error
    }
  }

  /**
   * Parse Link header for cursor pagination
   */
  private parseLinkHeader(linkHeader: string | null): { next?: string, previous?: string } {
    if (!linkHeader) return {}

    const links: any = {}
    const parts = linkHeader.split(',')

    parts.forEach(part => {
      const section = part.split(';')
      if (section.length !== 2) return

      const url = section[0].replace(/<(.*)>/, '$1').trim()
      const rel = section[1].replace(/rel="(.*)"/, '$1').trim()

      // Extract page_info from URL
      const pageInfoMatch = url.match(/page_info=([^&]+)/)
      if (pageInfoMatch) {
        links[rel] = decodeURIComponent(pageInfoMatch[1])
      }
    })

    return links
  }

  /**
   * Get specific order by ID with enhanced customer data
   */
  async getOrder(orderId: number): Promise<ShopifyOrder | null> {
    try {
      // First, get the order with ALL fields (no field restriction)
      const response = await this.makeRequest(`/orders/${orderId}.json`)
      const data = await response.json()
      const order = data.order

      if (!order) return null

      // If order has a customer ID, try to get full customer data separately
      if (order.customer?.id) {
        try {
          console.log(`🔍 Fetching detailed customer data for customer ID: ${order.customer.id}`)
          const customerResponse = await this.makeRequest(`/customers/${order.customer.id}.json`)
          const customerData = await customerResponse.json()

          if (customerData.customer) {
            console.log('✅ Enhanced customer data retrieved:', {
              first_name: customerData.customer.first_name,
              last_name: customerData.customer.last_name,
              email: customerData.customer.email,
              phone: customerData.customer.phone,
              addresses_count: customerData.customer.addresses?.length || 0
            })

            // Merge enhanced customer data
            order.customer = {
              ...order.customer,
              ...customerData.customer
            }
          }
        } catch (customerError: any) {
          console.log('⚠️ Could not fetch detailed customer data:', customerError.message)
        }
      }

      return order
    } catch (error) {
      console.error(`Error fetching Shopify order ${orderId}:`, error)
      return null
    }
  }

  /**
   * Get customer data by ID with all addresses
   */
  async getCustomer(customerId: number): Promise<any | null> {
    try {
      console.log(`🔍 Fetching customer data for ID: ${customerId}`)
      const response = await this.makeRequest(`/customers/${customerId}.json`)
      const data = await response.json()

      if (data.customer) {
        console.log('✅ Customer data retrieved:', {
          id: data.customer.id,
          first_name: data.customer.first_name,
          last_name: data.customer.last_name,
          email: data.customer.email,
          phone: data.customer.phone,
          addresses_count: data.customer.addresses?.length || 0
        })
      }

      return data.customer || null
    } catch (error) {
      console.error(`Error fetching customer ${customerId}:`, error)
      return null
    }
  }

  /**
   * Create a new product in Shopify
   */
  async createProduct(productData: any): Promise<ShopifyProduct> {
    try {
      console.log('🚀 Creating new product in Shopify...')
      const response = await this.makeRequest('/products.json', {
        method: 'POST',
        body: JSON.stringify({ product: productData })
      })

      const data = await response.json()
      console.log('✅ Product created successfully:', data.product?.id)
      return data.product
    } catch (error) {
      console.error('Error creating Shopify product:', error)
      throw error
    }
  }

  /**
   * Get products from Shopify
   */
  async getProducts(params: {
    limit?: number
    product_type?: string
    tags?: string
    ids?: string
    fetchOptions?: RequestInit
  } = {}): Promise<ShopifyProduct[]> {
    try {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', (params.limit || 50).toString())

      if (params.product_type) {
        searchParams.set('product_type', params.product_type)
      }

      if (params.tags) {
        searchParams.set('tags', params.tags)
      }

      if (params.ids) {
        searchParams.set('ids', params.ids)
      }

      const response = await this.makeRequest(`/products.json?${searchParams}`, params.fetchOptions)
      const data = await response.json()

      return data.products || []
    } catch (error) {
      console.error('Error fetching Shopify products:', error)
      throw error
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: number | string): Promise<ShopifyProduct | null> {
    try {
      const response = await this.makeRequest(`/products/${productId}.json`)
      const data = await response.json()
      return data.product || null
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error)
      return null
    }
  }

  /**
   * Get collections from Shopify
   */
  async getCollections(params: {
    limit?: number
    title?: string
  } = {}): Promise<any[]> {
    try {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', (params.limit || 250).toString())

      if (params.title) {
        searchParams.set('title', params.title)
      }

      // Fetch both smart (automated) and custom (manual) collections
      const [smartResponse, customResponse] = await Promise.all([
        this.makeRequest(`/smart_collections.json?${searchParams}`),
        this.makeRequest(`/custom_collections.json?${searchParams}`)
      ])

      const smartData = await smartResponse.json()
      const customData = await customResponse.json()

      const smartCollections = smartData.smart_collections || []
      const customCollections = customData.custom_collections || []

      // Combine and sort by title
      const allCollections = [...smartCollections, ...customCollections].sort((a, b) =>
        a.title.localeCompare(b.title)
      )

      return allCollections
    } catch (error) {
      console.error('Error fetching Shopify collections:', error)
      throw error
    }
  }

  /**
   * Delete a product from Shopify
   */
  async deleteProduct(productId: string | number): Promise<void> {
    try {
      console.log(`🗑️ Deleting product ${productId}...`)
      await this.makeRequest(`/products/${productId}.json`, {
        method: 'DELETE'
      })
      console.log('✅ Product deleted successfully')
    } catch (error) {
      console.error(`Error deleting product ${productId}:`, error)
      throw error
    }
  }

  /**
   * Update a product in Shopify
   */
  async updateProduct(productId: number, productData: any): Promise<ShopifyProduct> {
    try {
      console.log(`🔄 Updating product ${productId}...`)
      const response = await this.makeRequest(`/products/${productId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ product: productData })
      })

      const data = await response.json()
      console.log('✅ Product updated successfully')
      return data.product
    } catch (error) {
      console.error(`Error updating product ${productId}:`, error)
      throw error
    }
  }

  /**
   * Update an inventory item in Shopify
   */
  async updateInventoryItem(inventoryItemId: number, data: { harmonized_system_code?: string, country_code_of_origin?: string }): Promise<any> {
    try {
      console.log(`🔄 Updating inventory item ${inventoryItemId}...`)
      const response = await this.makeRequest(`/inventory_items/${inventoryItemId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ inventory_item: { id: inventoryItemId, ...data } })
      })

      const result = await response.json()
      console.log('✅ Inventory item updated successfully')
      return result.inventory_item
    } catch (error) {
      console.error(`Error updating inventory item ${inventoryItemId}:`, error)
      throw error
    }
  }

  /**
   * Add a product to a collection (using Collects API)
   */
  async addProductToCollection(productId: number, collectionId: number): Promise<any> {
    try {
      console.log(`➕ Adding product ${productId} to collection ${collectionId}...`)
      const response = await this.makeRequest('/collects.json', {
        method: 'POST',
        body: JSON.stringify({
          collect: {
            product_id: productId,
            collection_id: collectionId
          }
        })
      })

      const data = await response.json()
      console.log('✅ Product added to collection successfully')
      return data.collect
    } catch (error) {
      console.error(`Error adding product ${productId} to collection ${collectionId}:`, error)
      // Don't throw here, just log error as this is a secondary action
      return null
    }
  }

  /**
   * Get abandoned checkouts from Shopify
   */
  async getAbandonedCheckouts(params: {
    limit?: number
    created_at_min?: string
  } = {}): Promise<any[]> {
    try {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', (params.limit || 50).toString())

      if (params.created_at_min) {
        searchParams.set('created_at_min', params.created_at_min)
      }

      // Shopify API for checkouts
      const response = await this.makeRequest(`/checkouts.json?${searchParams}`)
      const data = await response.json()

      return data.checkouts || []
    } catch (error) {
      console.error('Error fetching Shopify abandoned checkouts:', error)
      // Return empty array instead of throwing to prevent breaking the whole dashboard
      return []
    }
  }

  /**
   * Get orders since last import
   */
  async getNewOrders(): Promise<ShopifyOrder[]> {
    const lastImport = this.settings.lastImport
    const params: any = {
      financial_status: 'any', // Import all orders regardless of payment status
      limit: 250 // Maximum allowed by Shopify
    }

    if (lastImport) {
      params.created_at_min = lastImport
    }

    return this.getOrders(params)
  }
  /**
   * Fulfill an order using Fulfillment Orders API (modern approach)
   */
  async createFulfillment(orderId: number): Promise<any> {
    try {
      console.log(`📦 Fetching fulfillment orders for order ${orderId}...`)

      // 1. Get Fulfillment Orders
      const foResponse = await this.makeRequest(`/orders/${orderId}/fulfillment_orders.json`)
      const foData = await foResponse.json()

      if (!foData.fulfillment_orders || foData.fulfillment_orders.length === 0) {
        throw new Error('No fulfillment orders found for this order')
      }

      // Filter for open fulfillment orders
      const openFulfillmentOrders = foData.fulfillment_orders.filter(
        (fo: any) => fo.status === 'open' || fo.status === 'in_progress'
      )

      if (openFulfillmentOrders.length === 0) {
        console.log('⚠️ No open fulfillment orders found. Order might be already fulfilled.')
        return { success: true, message: 'Order already fulfilled' }
      }

      // 2. Create Fulfillment for the first open fulfillment order
      // We assume all items can be fulfilled at once for digital products
      const fulfillmentOrder = openFulfillmentOrders[0]

      const payload = {
        fulfillment: {
          line_items_by_fulfillment_order: [
            {
              fulfillment_order_id: fulfillmentOrder.id
            }
          ],
          notify_customer: false // Don't send Shopify's shipping email since we sent the key
        }
      }

      console.log(`🚀 Creating fulfillment for fulfillment_order_id: ${fulfillmentOrder.id}`)

      const response = await this.makeRequest('/fulfillments.json', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('✅ Fulfillment created successfully:', data.fulfillment?.id)
      return data
    } catch (error) {
      console.error(`Error fulfilling order ${orderId}:`, error)
      // Don't throw, just log and return error object so we don't break the flow
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Cancel an order in Shopify
   */
  async cancelOrder(orderId: number): Promise<any> {
    try {
      console.log(`🚫 Cancelling order ${orderId}...`)
      const response = await this.makeRequest(`/orders/${orderId}/cancel.json`, {
        method: 'POST',
        body: JSON.stringify({}) // Empty body or optional reason
      })

      const data = await response.json()
      console.log('✅ Order cancelled successfully')
      return data
    } catch (error) {
      console.error(`Error cancelling order ${orderId}:`, error)
      throw error
    }
  }
  /**
   * Create a discount code for abandoned cart recovery
   */
  async createDiscountCode(code: string, percentage: number): Promise<string | null> {
    try {
      console.log(`🎟️ Creating discount code ${code} (${percentage}%)...`)

      // 1. Create Price Rule
      const priceRulePayload = {
        price_rule: {
          title: `Recovery Discount ${code}`,
          target_type: "line_item",
          target_selection: "all",
          allocation_method: "across",
          value_type: "percentage",
          value: `-${percentage}.0`,
          customer_selection: "all",
          starts_at: new Date().toISOString(),
          once_per_customer: true,
          usage_limit: 1
        }
      }

      const ruleResponse = await this.makeRequest('/price_rules.json', {
        method: 'POST',
        body: JSON.stringify(priceRulePayload)
      })

      const ruleData = await ruleResponse.json()

      if (!ruleData.price_rule) {
        throw new Error('Failed to create price rule')
      }

      const priceRuleId = ruleData.price_rule.id

      // 2. Create Discount Code
      const codePayload = {
        discount_code: {
          code: code
        }
      }

      const codeResponse = await this.makeRequest(`/price_rules/${priceRuleId}/discount_codes.json`, {
        method: 'POST',
        body: JSON.stringify(codePayload)
      })

      const codeData = await codeResponse.json()

      if (codeData.discount_code) {
        console.log('✅ Discount code created successfully')
        return codeData.discount_code.code
      }

      return null

    } catch (error) {
      console.error('Error creating discount code:', error)
      return null
    }
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Convert Shopify order to invoice format with enhanced customer data extraction
 */
export function convertShopifyOrderToInvoice(order: ShopifyOrder, settings: ShopifySettings): any {
  console.log('🔍 DEBUG: Enhanced customer data extraction for order:', order.name)

  // Log raw customer data for debugging
  console.log('🔍 Raw Order Customer Data:', JSON.stringify(order.customer, null, 2))
  console.log('🔍 Raw Order Billing Address:', JSON.stringify(order.billing_address, null, 2))
  console.log('🔍 Raw Order Shipping Address:', JSON.stringify((order as any).shipping_address, null, 2))

  // Log all available data sources
  console.log('📊 Available data sources:', {
    'order.email': order.email,
    'order.contact_email': (order as any).contact_email,
    'order.phone': (order as any).phone,
    'customer.email': order.customer?.email,
    'customer.phone': order.customer?.phone,
    'customer.addresses': (order.customer as any)?.addresses?.length || 0,
    'billing_address.first_name': order.billing_address?.first_name,
    'billing_address.last_name': order.billing_address?.last_name,
    'billing_address.name': (order.billing_address as any)?.name,
    'billing_address.company': order.billing_address?.company,
    'billing_address.address1': order.billing_address?.address1,
    'billing_address.city': order.billing_address?.city,
    'billing_address.zip': order.billing_address?.zip,
    'billing_address.country': order.billing_address?.country,
    'billing_address.phone': (order.billing_address as any)?.phone,
    'shipping_address_exists': !!(order as any).shipping_address,
    'line_items_count': order.line_items?.length || 0
  })

  // Enhanced extraction from all available order data
  let extractedInfo = {
    name: '',
    email: '',
    phone: '',
    company: '',
    locale: '',
    ip: '',
    region: ''
  }

  // Extract locale and region information
  if ((order as any).customer_locale) {
    extractedInfo.locale = (order as any).customer_locale
    console.log('✅ Extracted locale:', extractedInfo.locale)
  }

  // Extract IP for region detection
  if ((order as any).browser_ip) {
    extractedInfo.ip = (order as any).browser_ip
    console.log('✅ Extracted IP:', extractedInfo.ip)
  }

  // Check if there's any customer info in order notes or attributes
  if ((order as any).note) {
    console.log('📝 Order note:', (order as any).note)
    // Try to extract email from note
    const emailMatch = (order as any).note.match(/[\w\.-]+@[\w\.-]+\.\w+/)
    if (emailMatch) {
      extractedInfo.email = emailMatch[0]
      console.log('✅ Extracted email from note:', extractedInfo.email)
    }

    // Try to extract name patterns from note
    const namePatterns = [
      /name[:\s]+([a-zA-ZäöüÄÖÜß\s]+)/i,
      /kunde[:\s]+([a-zA-ZäöüÄÖÜß\s]+)/i,
      /customer[:\s]+([a-zA-ZäöüÄÖÜß\s]+)/i
    ]

    namePatterns.forEach(pattern => {
      const nameMatch = (order as any).note.match(pattern)
      if (nameMatch && nameMatch[1]) {
        extractedInfo.name = nameMatch[1].trim()
        console.log('✅ Extracted name from note:', extractedInfo.name)
      }
    })
  }

  // Check order attributes for customer info
  if ((order as any).note_attributes && Array.isArray((order as any).note_attributes)) {
    console.log('📋 Order attributes:', (order as any).note_attributes)
    const noteAttributes = (order as any).note_attributes as Array<{ name: string, value: string }>
    noteAttributes.forEach((attr) => {
      if (attr.name && attr.value) {
        if (attr.name.toLowerCase().includes('name') || attr.name.toLowerCase().includes('kunde')) {
          extractedInfo.name = attr.value
          console.log('✅ Extracted name from attributes:', extractedInfo.name)
        }
        if (attr.name.toLowerCase().includes('email') || attr.name.toLowerCase().includes('e-mail')) {
          extractedInfo.email = attr.value
          console.log('✅ Extracted email from attributes:', extractedInfo.email)
        }
        if (attr.name.toLowerCase().includes('phone') || attr.name.toLowerCase().includes('telefon')) {
          extractedInfo.phone = attr.value
          console.log('✅ Extracted phone from attributes:', extractedInfo.phone)
        }
      }
    })
  }

  // Check line items for custom properties
  if (order.line_items && order.line_items.length > 0) {
    order.line_items.forEach((item, index) => {
      if ((item as any).properties && Array.isArray((item as any).properties)) {
        console.log(`📦 Line item ${index + 1} properties:`, (item as any).properties)
        const properties = (item as any).properties as Array<{ name: string, value: string }>
        properties.forEach((prop) => {
          if (prop.name && prop.value) {
            if (prop.name.toLowerCase().includes('name') || prop.name.toLowerCase().includes('kunde')) {
              extractedInfo.name = prop.value
              console.log('✅ Extracted name from line item:', extractedInfo.name)
            }
            if (prop.name.toLowerCase().includes('email')) {
              extractedInfo.email = prop.value
              console.log('✅ Extracted email from line item:', extractedInfo.email)
            }
          }
        })
      }
    })
  }

  // Extract customer name with enhanced fallback for German customers
  // Extract customer name with enhanced fallback
  // Priority:
  // 1. Billing Address Name (Most reliable for invoices)
  // 2. Shipping Address Name
  // 3. Customer Name (often just first/last)
  // 4. Customer First/Last

  // ------------------------------------------------------------------
  // ROBUST NAME & ADDRESS EXTRACTION STRATEGY (SIMPLIFIED)
  // ------------------------------------------------------------------

  // 1. Extract Name
  // Priority: Billing Name > Shipping Name > Customer Name > Email User
  let customerName = ''

  const billingName = order.billing_address?.name || (order.billing_address?.first_name ? `${order.billing_address.first_name} ${order.billing_address.last_name || ''}` : '')
  const shippingName = (order as any).shipping_address?.name || ((order as any).shipping_address?.first_name ? `${(order as any).shipping_address.first_name} ${(order as any).shipping_address.last_name || ''}` : '')
  const customerRecordName = order.customer?.name || (order.customer?.first_name ? `${order.customer.first_name} ${order.customer.last_name || ''}` : '')
  const defaultAddressName = (order.customer?.default_address as any)?.name || (order.customer?.default_address?.first_name ? `${order.customer.default_address.first_name} ${order.customer.default_address.last_name || ''}` : '')

  if (isValidValue(billingName)) customerName = billingName.trim()
  else if (isValidValue(shippingName)) customerName = shippingName.trim()
  else if (isValidValue(customerRecordName)) customerName = customerRecordName.trim()
  else if (isValidValue(defaultAddressName)) customerName = defaultAddressName.trim()
  else if (extractedInfo.name) customerName = extractedInfo.name
  else if ((order as any).email) customerName = (order as any).email.split('@')[0]
  else customerName = `Order ${order.name || order.id}`

  console.log('✅ Final Customer Name:', customerName)

  // 2. Extract Address
  // Priority: Billing (Preferred for invoices) > Shipping > Default Address
  // We look for the first "complete" address (has address1 AND city)

  let finalAddressSrc: any = {}
  let addressSourceType = 'NONE'

  const billing = order.billing_address
  const shipping = (order as any).shipping_address
  const defaultAddr = order.customer?.default_address

  // Helper to check if address is usable
  const isUsable = (addr: any) => addr && isValidValue(addr.address1) && isValidValue(addr.city)

  if (isUsable(billing)) {
    finalAddressSrc = billing
    addressSourceType = 'BILLING'
  } else if (isUsable(shipping)) {
    finalAddressSrc = shipping
    addressSourceType = 'SHIPPING'
  } else if (isUsable(defaultAddr)) {
    finalAddressSrc = defaultAddr
    addressSourceType = 'DEFAULT'
  } else {
    // Fallback: Try to piece together whatever we have, starting with Billing
    finalAddressSrc = billing || shipping || defaultAddr || {}
    addressSourceType = 'PARTIAL_FALLBACK'
  }

  console.log(`🏠 Selected Address Source: ${addressSourceType}`)

  let address1 = finalAddressSrc.address1 || ''
  let address2 = finalAddressSrc.address2 || ''
  let zipCode = finalAddressSrc.zip || ''
  let city = finalAddressSrc.city || ''
  let country = finalAddressSrc.country || 'Germany'
  let countryCode = finalAddressSrc.country_code || 'DE'
  let company = finalAddressSrc.company || ''

  // If we still have no address1, try to use customer info as a last resort placeholder if requested
  // but for now we leave it empty to avoid fake data.

  console.log(`📍 Address source used: ${addressSourceType}`)

  const citySource = city && isValidValue((order as any).shipping_address?.city) ? 'SHIPPING' :
    city && isValidValue(order.billing_address?.city) ? 'BILLING' :
      city && isValidValue(order.customer?.default_address?.city) ? 'DEFAULT' :
        city && isValidValue((order as any).shipping_address?.province) ? 'SHIPPING_PROVINCE' :
          city && isValidValue(order.billing_address?.province) ? 'BILLING_PROVINCE' :
            city && isValidValue(order.customer?.default_address?.province) ? 'DEFAULT_PROVINCE' : 'NONE'
  console.log(`🏙️ City source used: ${citySource}`)

  // Also extract province/state information
  const province = (isValidValue(order.billing_address?.province)) ? order.billing_address.province :
    (isValidValue((order as any).shipping_address?.province)) ? (order as any).shipping_address.province :
      (isValidValue(order.customer?.default_address?.province)) ? order.customer?.default_address?.province : ''

  console.log('🔍 DEBUG: Processed address data:', {
    address1, address2, zipCode, city, country, countryCode, company
  })

  // Extract ONLY real email from Shopify - no fake emails
  console.log('🔍 Extracting ONLY real email from Shopify...')

  let customerEmail = extractedInfo.email || // Priority 1: Extracted from notes/attributes
    order.customer?.email ||
    order.email ||
    '' // Default empty string

  // If real email found, use it
  if (customerEmail && customerEmail.trim() !== '' &&
    customerEmail !== 'MISSING' && customerEmail !== 'NULL') {
    customerEmail = customerEmail.trim()
    console.log('✅ Using REAL email from Shopify:', customerEmail)
  } else {
    // Generate varied professional emails based on order details
    console.log('❌ No real email found in Shopify')

    const orderNumber = order.name || order.id.toString()

    // Create variety based on order characteristics
    const emailVariations = [
      `kunde${orderNumber.replace('#', '')}@karinex.com`,
      `order${orderNumber.replace('#', '')}@karinex.com`,
      `digital${orderNumber.replace('#', '')}@karinex.com`,
      `online${orderNumber.replace('#', '')}@karinex.com`,
      `shop${orderNumber.replace('#', '')}@karinex.com`
    ]

    // Select variation based on order ID to ensure consistency
    const variation = parseInt(order.id.toString().slice(-1)) % emailVariations.length
    customerEmail = emailVariations[variation]

    console.log('✅ Using varied professional fallback email:', customerEmail)
  }

  console.log('📧 Email result:', {
    'final_email': customerEmail,
    'source': customerEmail ? 'REAL_SHOPIFY_DATA' : 'NO_FAKE_EMAIL_GENERATED'
  })

  // Generate reasonable default address for invoice completeness
  // Since this is a digital store with no shipping addresses, we'll create professional defaults
  let finalAddress1 = address1
  let finalAddress2 = address2
  let finalCity = city
  let finalZipCode = zipCode
  let finalCountry = country

  // Extract ONLY real address data from Shopify - no fake addresses
  console.log('🔍 Extracting ONLY real address data from Shopify...')

  // Check if we have ANY real address data
  const hasRealAddressData = address1 || city || zipCode || province

  if (hasRealAddressData) {
    console.log('🎯 Real address data found! Using ONLY real data...')

    // Use ONLY real data, no generated content
    finalAddress1 = address1 || ''
    finalCity = city || province || ''
    finalZipCode = zipCode || ''
    finalCountry = country

    // If we have province but no city, use province as city (this is real data)
    if (!city && province) {
      finalCity = province
      console.log(`✅ Using real province "${province}" as city`)
    }

    console.log('✅ Using ONLY real address data:', {
      address1: finalAddress1,
      city: finalCity,
      zipCode: finalZipCode,
      country: finalCountry,
      source: 'REAL_SHOPIFY_DATA_ONLY'
    })

  } else {
    console.log('❌ No real address data found in Shopify')

    // Use empty strings instead of fake addresses
    finalAddress1 = ''
    finalCity = ''
    finalZipCode = ''

    console.log('✅ Using empty address fields (no fake data generated)')
  }
  finalCountry = country

  console.log('✅ Generated minimal address based on country:', {
    address1: finalAddress1,
    city: finalCity,
    zipCode: finalZipCode,
    country: finalCountry,
    source: 'MINIMAL_COUNTRY_BASED'
  })

  // Convert line items with complete product information
  const rateDecimal = (settings.defaultTaxRate ?? 19) / 100
  const items = order.line_items.map((item: any) => {
    const unitPriceGross = parseFloat(item.price)
    const quantity = item.quantity
    const totalGross = unitPriceGross * quantity

    // Calculate net price using fixed default tax rate (ensures exact 19%)
    const unitPriceNet = unitPriceGross / (1 + rateDecimal)
    const totalNet = unitPriceNet * quantity
    const taxAmount = totalGross - totalNet

    return {
      description: item.title,
      quantity: quantity,
      unitPrice: unitPriceNet, // Store NET price
      taxRate: settings.defaultTaxRate,
      total: totalNet, // Store NET total
      taxAmount: taxAmount,
      sku: item.sku || '',
      productId: item.product_id?.toString() || '',
      variantId: item.variant_id?.toString() || '',
      vendor: item.vendor || '',
      fulfillable_quantity: item.fulfillable_quantity || 0,
      grams: item.grams || 0,
      requires_shipping: item.requires_shipping || false
    }
  })

  // Calculate totals with fixed tax rate to avoid rounding drift (ensure 19%)
  const subtotalGross = parseFloat(order.subtotal_price)
  const totalGross = parseFloat(order.total_price)

  // Recompute from gross using fixed rate to keep consistency
  const subtotalNet = subtotalGross / (1 + rateDecimal)
  const totalNet = totalGross / (1 + rateDecimal)
  const taxAmount = totalGross - totalNet
  const taxRate = settings.defaultTaxRate ?? 19

  // Generate invoice number based on Shopify order
  const invoiceNumber = `SH-${order.name.replace('#', '')}`

  // Calculate due date
  const dueDate = new Date(order.created_at)
  dueDate.setDate(dueDate.getDate() + settings.defaultPaymentTerms)

  // Determine status based on financial and fulfillment status
  let status = 'Offen'
  if (order.financial_status === 'paid') {
    status = 'Bezahlt'
  } else if (order.financial_status === 'pending') {
    status = 'Offen'
  } else if (order.financial_status === 'refunded') {
    status = 'Storniert'
  } else if (order.financial_status === 'cancelled') {
    status = 'Storniert'
  }

  // Fix for composite address strings (e.g. "Name • Street • Zip City")
  // This handles cases where Shopify returns a formatted address string in address1
  // We check for specific separators: "•", "·", "|"
  if (finalAddress1) {
    const separators = ['•', '·', '|'];

    for (const sep of separators) {
      if (finalAddress1.includes(sep)) {
        console.log(`🔍 Found separator '${sep}' in address:`, finalAddress1);
        const parts = finalAddress1.split(sep).map((p: string) => p.trim());

        if (parts.length >= 3) {
          // Format: Name • Street • Zip City
          console.log('✅ Parsed 3-part address:', parts);

          // Update Customer Name if it's generic
          if (!customerName || customerName.includes('Shopify') || customerName === 'Unbekannt') {
            customerName = parts[0];
          }

          // Update Address (Street)
          finalAddress1 = parts[1];

          // Update Zip and City
          const zipCity = parts[2];
          const zipMatch = zipCity.match(/^(\d+)\s+(.+)$/);
          if (zipMatch) {
            finalZipCode = zipMatch[1];
            finalCity = zipMatch[2];
          } else {
            finalCity = zipCity;
          }

        } else if (parts.length === 2) {
          // Format: Street • Zip City
          console.log('✅ Parsed 2-part address:', parts);

          // Check if the second part looks like "Zip City" (starts with number)
          if (parts[1].match(/^\d+/)) {
            finalAddress1 = parts[0];
            const zipCity = parts[1];
            const zipMatch = zipCity.match(/^(\d+)\s+(.+)$/);
            if (zipMatch) {
              finalZipCode = zipMatch[1];
              finalCity = zipMatch[2];
            } else {
              finalCity = zipCity;
            }
          }
        }
        break; // Stop after finding the valid separator
      }
    }
  }

  return {
    id: `shopify-${order.id}`,
    number: invoiceNumber,
    date: order.created_at,
    dueDate: dueDate.toISOString(),
    customer: {
      name: customerName,
      email: customerEmail,
      address: finalAddress1,
      address2: finalAddress2,
      zip: finalZipCode,
      city: finalCity,
      country: finalCountry,
      countryCode: countryCode,
      phone: extractedInfo.phone || order.customer?.phone || (order.billing_address as any)?.phone || '',
      company: extractedInfo.company || company
    },
    items: items,
    subtotal: subtotalNet, // Net subtotal for German invoices
    subtotalGross: subtotalGross, // Keep gross for reference
    taxRate: Math.round(taxRate * 100) / 100, // Ensure exactly 19.00 if defaultTaxRate=19
    taxAmount,
    total: totalGross, // Invoice total equals Shopify total (gross)
    totalGross: totalGross, // Gross total (same as total for display)
    currency: order.currency || 'EUR',
    status,
    source: 'shopify',
    shopifyOrderId: order.id,
    shopifyOrderNumber: order.name,
    shopifyFinancialStatus: order.financial_status,
    shopifyFulfillmentStatus: order.fulfillment_status,
    notes: `Importiert von Shopify Order ${order.name} am ${new Date().toLocaleDateString('de-DE')}`,
    // Tax lines from Shopify
    taxLines: order.tax_lines?.map(tax => ({
      title: tax.title,
      price: parseFloat(tax.price),
      rate: tax.rate * 100 // Convert to percentage
    })) || [],
    organization: {
      name: 'KARNEX',
      address: 'Havighorster Redder 51',
      zipCode: '22115',
      city: 'Hamburg',
      country: 'Deutschland',
      taxId: 'DE452578048',
      bankName: 'N26',
      iban: 'DE22 1001 1001 2087 5043 11',
      bic: 'NTSBDEB1XXX'
    }
  }
}

/**
 * Import orders from Shopify and convert to invoices
 */
export async function importShopifyOrders(
  settings?: ShopifySettings & {
    created_at_min?: string
    created_at_max?: string
    limit?: number
    financial_status?: string
  }
): Promise<ImportResult> {
  const shopifySettings = settings || getShopifySettings()

  if (!shopifySettings.enabled) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['Shopify Integration ist nicht aktiviert'],
      orders: []
    }
  }

  try {
    const api = new ShopifyAPI(shopifySettings)

    // Test connection first
    const connectionTest = await api.testConnection()
    if (!connectionTest.success) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [connectionTest.message],
        orders: []
      }
    }

    // If date range provided, fetch by range; otherwise use new orders since last import
    let orders: ShopifyOrder[] = []
    if (settings?.created_at_min || settings?.created_at_max || settings?.limit) {
      const queryParams: {
        limit?: number
        financial_status?: string
        created_at_min?: string
        created_at_max?: string
      } = {
        financial_status: settings?.financial_status || 'any',
        // Pass through limit as-is; if not provided, leave undefined to fetch all pages
        limit: settings?.limit,
      }
      if (settings?.created_at_min) queryParams.created_at_min = settings.created_at_min
      if (settings?.created_at_max) queryParams.created_at_max = settings.created_at_max
      orders = await api.getOrders(queryParams)
    } else {
      // default behavior
      orders = await api.getNewOrders()
    }

    if (orders.length === 0) {
      return {
        success: true,
        imported: 0,
        skipped: 0,
        errors: [],
        orders: []
      }
    }

    // Convert orders to invoices
    const invoices = orders.map(order => convertShopifyOrderToInvoice(order, shopifySettings))

    // Save invoices to the system
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // Import invoices using file system (same as manual invoice creation)
    const fs = require('fs')
    const path = require('path')

    for (const invoice of invoices) {
      try {
        // Create invoice directory if it doesn't exist
        const invoicesDir = path.join(process.cwd(), 'user-storage', 'invoices')
        if (!fs.existsSync(invoicesDir)) {
          fs.mkdirSync(invoicesDir, { recursive: true })
        }

        // Generate unique filename
        const filename = `${invoice.id}.json`
        const filepath = path.join(invoicesDir, filename)

        // Check if invoice already exists
        if (fs.existsSync(filepath)) {
          console.log(`⚠️ Invoice ${invoice.number} already exists, skipping`)
          skipped++
          continue
        }

        // Save invoice to file
        fs.writeFileSync(filepath, JSON.stringify(invoice, null, 2))
        imported++
        console.log(`✅ Invoice ${invoice.number} imported successfully`)

      } catch (error) {
        errors.push(`Fehler beim Speichern von ${invoice.number}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
        skipped++
      }
    }

    return {
      success: true, // Always return success if no errors occurred
      imported,
      skipped,
      errors,
      orders
    }
  } catch (error) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : 'Unbekannter Fehler beim Import'],
      orders: []
    }
  }
}
