import { NextRequest, NextResponse } from 'next/server'
import { KauflandAPI } from '@/lib/kaufland-api'
import { getKauflandSettings } from '@/lib/kaufland-settings'

export async function POST(request: NextRequest) {
  try {
    const product = await request.json()

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Kein Produkt zum Synchronisieren bereitgestellt'
      }, { status: 400 })
    }

    const settings = getKauflandSettings()
    
    if (!settings.enabled || !settings.clientKey || !settings.secretKey) {
      return NextResponse.json({
        success: false,
        error: 'Kaufland-Integration ist nicht aktiviert oder nicht konfiguriert'
      }, { status: 400 })
    }

    console.log(`🔄 Synchronisiere Produkt zu Kaufland: ${product.title || product.name}`)

    const api = new KauflandAPI(settings)
    const result = await api.syncProduct(product)

    if (result.success) {
      console.log(`✅ Produkt erfolgreich synchronisiert: ${product.title || product.name}`)
    } else {
      console.error(`❌ Fehler beim Synchronisieren: ${result.message}`)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error syncing product to Kaufland:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Synchronisieren des Produkts',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 })
  }
}

