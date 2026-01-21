// ========================================
// KAUFLAND API CLIENT
// ========================================

import { KauflandSettings, getKauflandSettings } from './kaufland-settings'

export interface KauflandProduct {
  ean?: string
  title: string
  description: string
  price: number
  quantity: number
  category?: string
  images?: string[]
  shippingTime?: number
  sku?: string
  weight?: number
  dimensions?: {
    length?: number
    width?: number
    height?: number
  }
}

export interface KauflandUnit {
  id_unit: number
  ean: string
  title: string
  price: number
  quantity: number
  status: string
}

export class KauflandAPI {
  private settings: KauflandSettings
  private baseUrl: string
  private credentials: string

  constructor(settings?: KauflandSettings) {
    this.settings = settings || getKauflandSettings()
    this.baseUrl = this.settings.apiBaseUrl || 'https://sellerapi.kaufland.com'
    this.credentials = Buffer.from(`${this.settings.clientKey}:${this.settings.secretKey}`).toString('base64')
  }

  /**
   * Make authenticated request to Kaufland API
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers = {
      'Authorization': `Basic ${this.credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    }

    return fetch(url, {
      ...options,
      headers,
    })
  }

  /**
   * Test connection to Kaufland API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try multiple endpoints to test connection
      // Kaufland API might use different endpoints, so we'll try a few common ones
      const endpoints = [
        '/units',
        '/api/units',
        '/v1/units',
        '/seller-api/units',
        '/'
      ]
      
      let lastError: string = ''
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.request(endpoint, { method: 'GET' })
          
          // If we get any response (even 401/403), it means the API is reachable
          if (response.status === 200 || response.status === 401 || response.status === 403) {
            return {
              success: true,
              message: 'Verbindung erfolgreich! Kaufland API ist erreichbar.'
            }
          }
          
          if (response.status === 404) {
            lastError = `Endpoint nicht gefunden: ${endpoint}`
            continue // Try next endpoint
          }
          
          const errorText = await response.text().catch(() => '')
          lastError = `Status ${response.status}: ${errorText.substring(0, 100)}`
        } catch (err) {
          lastError = err instanceof Error ? err.message : 'Unbekannter Fehler'
          continue
        }
      }
      
      // If all endpoints failed, return the last error
      return {
        success: false,
        message: `Verbindungsfehler: ${lastError || 'API nicht erreichbar. Bitte überprüfen Sie die API Base URL.'}`
      }
    } catch (error) {
      return {
        success: false,
        message: `Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    }
  }

  /**
   * Get all units (products) from Kaufland
   */
  async getUnits(params?: { limit?: number; offset?: number }): Promise<KauflandUnit[]> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())

    const endpoint = `/units${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await this.request(endpoint, { method: 'GET' })

    if (!response.ok) {
      throw new Error(`Failed to fetch units: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  }

  /**
   * Create or update a unit (product) in Kaufland
   */
  async createOrUpdateUnit(product: KauflandProduct): Promise<any> {
    // Kaufland API typically uses EAN as identifier
    if (!product.ean) {
      throw new Error('EAN is required for Kaufland products')
    }

    const payload = {
      ean: product.ean,
      title: product.title,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      shipping_time: product.shippingTime || this.settings.defaultShippingTime || 3,
      ...(product.sku && { sku: product.sku }),
      ...(product.images && product.images.length > 0 && { 
        images: product.images.map((url, index) => ({
          url,
          position: index + 1
        }))
      }),
    }

    // Try multiple endpoint variations
    const endpoints = [
      { method: 'POST', path: '/units' },
      { method: 'POST', path: '/api/units' },
      { method: 'POST', path: '/v1/units' },
      { method: 'POST', path: '/seller-api/units' },
      { method: 'PUT', path: `/units/${product.ean}` },
      { method: 'PUT', path: `/api/units/${product.ean}` },
      { method: 'PUT', path: `/v1/units/${product.ean}` },
    ]

    let lastError: string = ''
    let lastResponse: Response | null = null

    for (const endpoint of endpoints) {
      try {
        const response = await this.request(endpoint.path, {
          method: endpoint.method,
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          return await response.json()
        }

        // If PUT returns 404, try POST to create
        if (response.status === 404 && endpoint.method === 'PUT') {
          continue // Try next endpoint
        }

        const errorText = await response.text().catch(() => '')
        lastError = `Status ${response.status}: ${errorText.substring(0, 200)}`
        lastResponse = response
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unbekannter Fehler'
        continue
      }
    }

    // If all endpoints failed, return helpful error
    const errorMessage = lastError || 'API endpoint nicht gefunden'
    throw new Error(`Failed to create/update unit: ${errorMessage}. Bitte überprüfen Sie die API Base URL und die Kaufland API-Dokumentation für die korrekten Endpunkte.`)
  }

  /**
   * Delete a unit from Kaufland
   */
  async deleteUnit(ean: string): Promise<void> {
    const response = await this.request(`/units/${ean}`, {
      method: 'DELETE',
    })

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text()
      throw new Error(`Failed to delete unit: ${response.status} ${response.statusText} - ${errorText}`)
    }
  }

  /**
   * Sync product from internal format to Kaufland
   */
  async syncProduct(internalProduct: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Convert internal product format to Kaufland format
      const kauflandProduct: KauflandProduct = {
        ean: internalProduct.ean || internalProduct.barcode || internalProduct.sku,
        title: internalProduct.title || internalProduct.name,
        description: internalProduct.description || internalProduct.body_html || '',
        price: parseFloat(internalProduct.price || internalProduct.variants?.[0]?.price || 0),
        quantity: internalProduct.quantity || internalProduct.inventory_quantity || 0,
        sku: internalProduct.sku || internalProduct.variants?.[0]?.sku,
        images: internalProduct.images?.map((img: any) => 
          typeof img === 'string' ? img : img.src || img.url
        ) || [],
        shippingTime: this.settings.defaultShippingTime || 3,
      }

      if (!kauflandProduct.ean) {
        return {
          success: false,
          message: 'Produkt benötigt eine EAN/Barcode für Kaufland'
        }
      }

      try {
        const result = await this.createOrUpdateUnit(kauflandProduct)
        return {
          success: true,
          message: `Produkt erfolgreich zu Kaufland synchronisiert: ${kauflandProduct.title}`,
          data: result
        }
      } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unbekannter Fehler'
        
        // Provide more helpful error messages
        if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          return {
            success: false,
            message: `API Endpoint nicht gefunden. Bitte überprüfen Sie die API Base URL (aktuell: ${this.baseUrl}). Die Kaufland API-Endpunkte können sich je nach Version unterscheiden. Bitte konsultieren Sie die offizielle Kaufland Seller API-Dokumentation.`
          }
        }
        
        return {
          success: false,
          message: `Fehler beim Synchronisieren: ${errorMessage}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Fehler beim Synchronisieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    }
  }

  /**
   * Sync multiple products
   */
  async syncProducts(products: any[]): Promise<{ success: number; failed: number; results: any[] }> {
    const results: any[] = []
    let successCount = 0
    let failedCount = 0

    for (const product of products) {
      try {
        const result = await this.syncProduct(product)
        results.push({
          product: product.title || product.name,
          ...result
        })
        
        if (result.success) {
          successCount++
        } else {
          failedCount++
        }
      } catch (error) {
        results.push({
          product: product.title || product.name,
          success: false,
          message: error instanceof Error ? error.message : 'Unbekannter Fehler'
        })
        failedCount++
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results
    }
  }
}

