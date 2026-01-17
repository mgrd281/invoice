'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ShoppingBag, Store, RefreshCw, Zap, Settings as SettingsIcon } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  variants: Array<{
    id: number
    title: string
    price: string
    sku: string | null
    barcode: string | null
    inventory_quantity: number
  }>
  images?: Array<{ src: string }>
}

export default function KauflandSyncPage() {
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [syncResults, setSyncResults] = useState<any[]>([])
  const [kauflandEnabled, setKauflandEnabled] = useState(false)
  const [checkingIntegration, setCheckingIntegration] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const { showToast, ToastContainer } = useToast()

  useEffect(() => {
    checkKauflandIntegration()
  }, [])

  const checkKauflandIntegration = async () => {
    try {
      setCheckingIntegration(true)
      const response = await fetch('/api/kaufland/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          // Check if credentials exist (even if masked in response)
          // The API returns masked keys, so we check if the masked version exists
          const hasClientKey = data.settings.clientKey && data.settings.clientKey.length > 0
          const hasSecretKey = data.settings.secretKey && data.settings.secretKey === '***'

          // Also try to test the connection to verify credentials work
          const testResponse = await fetch('/api/kaufland/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: data.settings })
          })

          const testData = await testResponse.json()
          const enabled = (hasClientKey || hasSecretKey) && testData.success !== false

          setKauflandEnabled(enabled)

          if (enabled) {
            loadShopifyProducts()
          } else {
            setLoading(false)
            if (!hasClientKey && !hasSecretKey) {
              showToast('Kaufland Integration nicht konfiguriert. Bitte fügen Sie die API-Schlüssel hinzu.', 'error')
            }
          }
        } else {
          setKauflandEnabled(false)
          setLoading(false)
        }
      } else {
        setKauflandEnabled(false)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking Kaufland integration:', error)
      setKauflandEnabled(false)
      setLoading(false)
    } finally {
      setCheckingIntegration(false)
    }
  }

  const loadShopifyProducts = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true)
      }
      // Load only 25 products per page to reduce data size
      const limit = 25
      const response = await fetch(`/api/shopify/products?limit=${limit}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const products = data.data || []
          if (append) {
            setShopifyProducts(prev => [...prev, ...products])
          } else {
            setShopifyProducts(products)
          }
          // Check if there might be more products
          setHasMore(products.length === limit)
          setCurrentPage(page)
        }
      }
    } catch (error) {
      console.error('Error loading Shopify products:', error)
      showToast('Fehler beim Laden der Shopify-Produkte', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreProducts = () => {
    loadShopifyProducts(currentPage + 1, true)
  }

  const toggleSelectProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === shopifyProducts.length) {
      setSelectedProducts(new Set())
    } else {
      const allIds = new Set(shopifyProducts.map(p => p.id))
      setSelectedProducts(allIds)
    }
  }

  const syncSingleProduct = async (productId: number) => {
    try {
      setSyncing(true)
      const response = await fetch('/api/kaufland/sync-from-shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      const data = await response.json()

      if (data.success) {
        showToast(`Produkt "${data.data.shopifyProduct.title}" erfolgreich synchronisiert`, 'success')
        return { success: true, productId, ...data }
      } else {
        showToast(`Fehler: ${data.error}`, 'error')
        return { success: false, productId, error: data.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
      showToast(`Fehler beim Synchronisieren: ${message}`, 'error')
      return { success: false, productId, error: message }
    } finally {
      setSyncing(false)
    }
  }

  const syncSelectedProducts = async () => {
    if (selectedProducts.size === 0) {
      showToast('Bitte wählen Sie mindestens ein Produkt aus', 'error')
      return
    }

    try {
      setSyncing(true)
      setSyncResults([])

      const results = []
      const productIds = Array.from(selectedProducts)

      for (const productId of productIds) {
        const result = await syncSingleProduct(productId)
        results.push(result)
        setSyncResults([...results])

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const successCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length

      showToast(
        `${successCount} Produkte erfolgreich synchronisiert, ${failedCount} fehlgeschlagen`,
        successCount > 0 ? 'success' : 'error'
      )
    } catch (error) {
      console.error('Error syncing products:', error)
      showToast('Fehler beim Synchronisieren der Produkte', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const syncAllProducts = async () => {
    if (!confirm('Möchten Sie wirklich alle Produkte synchronisieren? Dies kann einige Zeit dauern.')) {
      return
    }

    try {
      setSyncing(true)
      setSyncResults([])

      const response = await fetch('/api/kaufland/sync-from-shopify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 250 })
      })

      const data = await response.json()

      if (data.success) {
        showToast(data.message, 'success')
        setSyncResults(data.data.results || [])
      } else {
        showToast(`Fehler: ${data.error}`, 'error')
      }
    } catch (error) {
      console.error('Error syncing all products:', error)
      showToast('Fehler beim Synchronisieren der Produkte', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const hasEAN = (product: ShopifyProduct) => {
    return product.variants?.some(v => v.barcode) || false
  }

  if (checkingIntegration) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!kauflandEnabled) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link href="/settings/kaufland">
                  <Button variant="ghost" size="sm" className="mr-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Zurück
                  </Button>
                </Link>
                <Store className="h-8 w-8 text-orange-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Shopify → Kaufland Synchronisierung
                </h1>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-6 w-6 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">
                    Kaufland Integration nicht aktiviert
                  </h3>
                  <p className="text-sm text-red-800 mb-4">
                    Um Produkte von Shopify zu Kaufland zu synchronisieren, müssen Sie zuerst die Kaufland Integration aktivieren und konfigurieren.
                  </p>
                  <Link href="/settings/kaufland">
                    <Button className="bg-red-600 hover:bg-red-700">
                      <SettingsIcon className="h-4 w-4 mr-2" />
                      Zu Kaufland-Einstellungen gehen
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/settings/kaufland">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <Store className="h-8 w-8 text-orange-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Shopify → Kaufland Synchronisierung
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => loadShopifyProducts()}
                disabled={loading}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aktualisieren
              </Button>
              <Button
                onClick={syncAllProducts}
                disabled={syncing || shopifyProducts.length === 0}
                variant="outline"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Synchronisiere...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Alle synchronisieren
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <ShoppingBag className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Wie funktioniert es?</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Wählen Sie Produkte aus Ihrem Shopify-Shop aus</li>
                  <li>Klicken Sie auf "Ausgewählte synchronisieren"</li>
                  <li>Die Produkte werden automatisch zu Kaufland übertragen</li>
                  <li><strong>Wichtig:</strong> Produkte benötigen eine EAN/Barcode für Kaufland</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Shopify Produkte ({shopifyProducts.length})</CardTitle>
                <CardDescription>
                  Wählen Sie Produkte aus, die zu Kaufland synchronisiert werden sollen
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={toggleSelectAll}
                  variant="outline"
                  size="sm"
                >
                  {selectedProducts.size === shopifyProducts.length ? 'Alle abwählen' : 'Alle auswählen'}
                </Button>
                <Button
                  onClick={syncSelectedProducts}
                  disabled={syncing || selectedProducts.size === 0}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Synchronisiere...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Ausgewählte synchronisieren ({selectedProducts.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {shopifyProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Keine Produkte in Shopify gefunden</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {shopifyProducts.map((product) => {
                    const hasBarcode = hasEAN(product)
                    const isSelected = selectedProducts.has(product.id)
                    const variant = product.variants?.[0]

                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : ''
                          } ${!hasBarcode ? 'opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(product.id)}
                          disabled={!hasBarcode || syncing}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{product.title}</h4>
                            {!hasBarcode && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                Keine EAN
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span>Preis: {variant?.price || 'N/A'} €</span>
                            {variant?.sku && <span className="ml-4">SKU: {variant.sku}</span>}
                            {variant?.barcode && <span className="ml-4">EAN: {variant.barcode}</span>}
                          </div>
                        </div>
                        <Button
                          onClick={() => syncSingleProduct(product.id)}
                          disabled={!hasBarcode || syncing}
                          size="sm"
                          variant="outline"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Synchronisieren
                        </Button>
                      </div>
                    )
                  })}
                </div>
                {hasMore && (
                  <div className="mt-4 text-center">
                    <Button
                      onClick={loadMoreProducts}
                      variant="outline"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Lade...
                        </>
                      ) : (
                        <>
                          Mehr Produkte laden ({shopifyProducts.length} geladen)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Sync Results */}
        {syncResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Synchronisierungsergebnisse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {syncResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 border rounded-lg ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.title || `Produkt ID: ${result.productId}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {result.message || result.error}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <ToastContainer />
      </div>
    </div>
  )
}

