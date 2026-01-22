import { NextRequest, NextResponse } from 'next/server'
import { KauflandAPI } from '@/lib/kaufland-api'
import { getKauflandSettings, KauflandSettings } from '@/lib/kaufland-settings'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Kaufland connection (POST)...')

    const body = await request.json()
    // Use provided settings or fallback to stored settings
    const settings = (body.settings as KauflandSettings) || getKauflandSettings()

    console.log('⚙️ Testing with settings:', {
      enabled: settings.enabled,
      hasClientKey: !!settings.clientKey,
      hasSecretKey: !!settings.secretKey,
      apiBaseUrl: settings.apiBaseUrl
    })

    if (!settings.clientKey || !settings.secretKey) {
      return NextResponse.json({
        success: false,
        error: 'Client Key oder Secret Key fehlt'
      }, { status: 400 })
    }

    const api = new KauflandAPI(settings)
    const result = await api.testConnection()

    console.log('🔍 Connection test result:', result)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
        debug: {
          hasClientKey: !!settings.clientKey,
          hasSecretKey: !!settings.secretKey,
          apiBaseUrl: settings.apiBaseUrl
        }
      }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ Error testing Kaufland connection:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Testen der Kaufland-Verbindung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 })
  }
}

