import { NextRequest, NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'
import { KauflandAPI } from '@/lib/kaufland-api'
import { getKauflandSettings } from '@/lib/kaufland-settings'

/**
 * POST /api/kaufland/sync-from-shopify
 * Sync a product from Shopify to Kaufland
 * 
 * Body: { productId: string | number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 })
    }

    // Check Shopify settings
    const shopifySettings = getShopifySettings()
    if (!shopifySettings.enabled || !shopifySettings.accessToken || !shopifySettings.shopDomain) {
      return NextResponse.json({
        success: false,
        error: 'Shopify Integration ist nicht aktiviert oder nicht konfiguriert'
      }, { status: 400 })
    }

    // Check Kaufland settings
    const kauflandSettings = getKauflandSettings()
    const hasValidCredentials = !!(kauflandSettings.clientKey && kauflandSettings.secretKey)
    
    if (!hasValidCredentials) {
      return NextResponse.json({
        success: false,
        error: 'Kaufland Integration ist nicht konfiguriert. Bitte fügen Sie KAUFLAND_CLIENT_KEY und KAUFLAND_SECRET_KEY zu den Environment Variables hinzu.'
      }, { status: 400 })
    }

    console.log(`🔄 Syncing Shopify product ${productId} to Kaufland...`)

    // 1. Fetch product from Shopify
    const shopifyApi = new ShopifyAPI(shopifySettings)
    const shopifyProduct = await shopifyApi.getProduct(productId)

    if (!shopifyProduct) {
      return NextResponse.json({
        success: false,
        error: `Produkt mit ID ${productId} nicht in Shopify gefunden`
      }, { status: 404 })
    }

    console.log(`✅ Shopify product fetched: ${shopifyProduct.title}`)

    // 2. Convert Shopify product to Kaufland format
    const kauflandProduct = convertShopifyToKaufland(shopifyProduct)

    if (!kauflandProduct.ean) {
      return NextResponse.json({
        success: false,
        error: 'Produkt benötigt eine EAN/Barcode für Kaufland. Bitte fügen Sie eine EAN zum Shopify-Produkt hinzu (als Barcode im Variant).'
      }, { status: 400 })
    }

    // 3. Sync to Kaufland
    const kauflandApi = new KauflandAPI(kauflandSettings)
    const result = await kauflandApi.syncProduct(kauflandProduct)

    if (result.success) {
      console.log(`✅ Product synced to Kaufland: ${kauflandProduct.title}`)
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          shopifyProduct: {
            id: shopifyProduct.id,
            title: shopifyProduct.title
          },
          kauflandProduct: result.data
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ Error syncing product from Shopify to Kaufland:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Synchronisieren des Produkts',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 })
  }
}

/**
 * Convert Shopify product format to Kaufland format
 */
function convertShopifyToKaufland(shopifyProduct: any): any {
  // Get the first variant (or you can loop through all variants)
  const variant = shopifyProduct.variants?.[0] || {}
  
  // Get EAN from barcode (required for Kaufland)
  const ean = variant.barcode || shopifyProduct.barcode || null

  // Get images
  const images = shopifyProduct.images?.map((img: any) => img.src) || []

  // Calculate total quantity (sum of all variants)
  const totalQuantity = shopifyProduct.variants?.reduce((sum: number, v: any) => {
    return sum + (v.inventory_quantity || 0)
  }, 0) || 0

  // Get price from first variant
  const price = parseFloat(variant.price || '0')

  // Get description (remove HTML tags for plain text)
  const description = shopifyProduct.body_html 
    ? shopifyProduct.body_html.replace(/<[^>]*>/g, '').trim() 
    : shopifyProduct.title

  return {
    ean: ean,
    title: shopifyProduct.title,
    description: description || shopifyProduct.title,
    price: price,
    quantity: totalQuantity,
    sku: variant.sku || shopifyProduct.handle,
    images: images,
    shippingTime: 3 // Default shipping time
  }
}

/**
 * POST /api/kaufland/sync-all-from-shopify
 * Sync all products from Shopify to Kaufland
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { limit = 50, tags } = body

    // Check Shopify settings
    const shopifySettings = getShopifySettings()
    if (!shopifySettings.enabled || !shopifySettings.accessToken || !shopifySettings.shopDomain) {
      return NextResponse.json({
        success: false,
        error: 'Shopify Integration ist nicht aktiviert oder nicht konfiguriert'
      }, { status: 400 })
    }

    // Check Kaufland settings
    const kauflandSettings = getKauflandSettings()
    const hasValidCredentials = !!(kauflandSettings.clientKey && kauflandSettings.secretKey)
    
    if (!hasValidCredentials) {
      return NextResponse.json({
        success: false,
        error: 'Kaufland Integration ist nicht konfiguriert. Bitte fügen Sie KAUFLAND_CLIENT_KEY und KAUFLAND_SECRET_KEY zu den Environment Variables hinzu.'
      }, { status: 400 })
    }

    console.log(`🔄 Syncing ${limit} products from Shopify to Kaufland...`)

    // 1. Fetch products from Shopify
    const shopifyApi = new ShopifyAPI(shopifySettings)
    const shopifyProducts = await shopifyApi.getProducts({ 
      limit, 
      tags: tags || undefined 
    })

    console.log(`✅ Fetched ${shopifyProducts.length} products from Shopify`)

    // 2. Convert and sync each product
    const kauflandApi = new KauflandAPI(kauflandSettings)
    const results = []
    let successCount = 0
    let failedCount = 0
    let skippedCount = 0

    for (const shopifyProduct of shopifyProducts) {
      try {
        const kauflandProduct = convertShopifyToKaufland(shopifyProduct)

        // Skip if no EAN
        if (!kauflandProduct.ean) {
          results.push({
            shopifyProductId: shopifyProduct.id,
            title: shopifyProduct.title,
            success: false,
            message: 'Keine EAN/Barcode gefunden'
          })
          skippedCount++
          continue
        }

        const result = await kauflandApi.syncProduct(kauflandProduct)
        
        results.push({
          shopifyProductId: shopifyProduct.id,
          title: shopifyProduct.title,
          ...result
        })

        if (result.success) {
          successCount++
        } else {
          failedCount++
        }
      } catch (error) {
        results.push({
          shopifyProductId: shopifyProduct.id,
          title: shopifyProduct.title,
          success: false,
          message: error instanceof Error ? error.message : 'Unbekannter Fehler'
        })
        failedCount++
      }
    }

    console.log(`✅ Sync completed: ${successCount} erfolgreich, ${failedCount} fehlgeschlagen, ${skippedCount} übersprungen`)

    return NextResponse.json({
      success: true,
      message: `${successCount} Produkte erfolgreich synchronisiert, ${failedCount} fehlgeschlagen, ${skippedCount} übersprungen`,
      data: {
        total: shopifyProducts.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        results
      }
    })
  } catch (error) {
    console.error('❌ Error syncing products from Shopify to Kaufland:', error)
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Synchronisieren der Produkte',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 })
  }
}

