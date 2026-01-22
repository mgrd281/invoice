import { NextRequest, NextResponse } from 'next/server'
import { KauflandAPI } from '@/lib/kaufland-api'
import { getKauflandSettings } from '@/lib/kaufland-settings'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { products } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Keine Produkte zum Synchronisieren bereitgestellt'
      }, { status: 400 })
    }

    const settings = getKauflandSettings()
    
    if (!settings.enabled || !settings.clientKey || !settings.secretKey) {
      return NextResponse.json({
        success: false,
        error: 'Kaufland-Integration ist nicht aktiviert oder nicht konfiguriert'
      }, { status: 400 })
    }

    console.log(`🔄 Synchronisiere ${products.length} Produkte zu Kaufland...`)

    const api = new KauflandAPI(settings)
    const result = await api.syncProducts(products)

    console.log(`✅ Synchronisierung abgeschlossen: ${result.success} erfolgreich, ${result.failed} fehlgeschlagen`)

    return NextResponse.json({
      success: true,
      message: `${result.success} Produkte erfolgreich synchronisiert, ${result.failed} fehlgeschlagen`,
      data: result
    })
  } catch (error) {
    console.error('❌ Error syncing products to Kaufland:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Synchronisieren der Produkte',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 })
  }
}

// GET: Get products from Kaufland
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const settings = getKauflandSettings()
    
    if (!settings.enabled || !settings.clientKey || !settings.secretKey) {
      return NextResponse.json({
        success: false,
        error: 'Kaufland-Integration ist nicht aktiviert oder nicht konfiguriert'
      }, { status: 400 })
    }

    const api = new KauflandAPI(settings)
    const units = await api.getUnits({ limit, offset })

    return NextResponse.json({
      success: true,
      data: units,
      count: units.length
    })
  } catch (error) {
    console.error('❌ Error fetching products from Kaufland:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Abrufen der Produkte',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 })
  }
}

