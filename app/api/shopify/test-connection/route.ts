import { NextRequest, NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Shopify connection...')
    
    const settings = getShopifySettings()
    console.log('⚙️ Current settings:', {
      enabled: settings.enabled,
      shopDomain: settings.shopDomain,
      apiVersion: settings.apiVersion,
      hasAccessToken: !!settings.accessToken
    })
    
    if (!settings.enabled) {
      return NextResponse.json({
        success: false,
        error: 'Shopify Integration ist nicht aktiviert'
      }, { status: 400 })
    }

    if (!settings.shopDomain || !settings.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Shop Domain oder Access Token fehlt'
      }, { status: 400 })
    }

    const api = new ShopifyAPI(settings)
    const result = await api.testConnection()
    
    console.log('🔍 Connection test result:', result)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        shop: result.shop
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ Error testing Shopify connection:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Testen der Shopify-Verbindung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 })
  }
}
