'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Trash2, Check, X, ShoppingBag, Package, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ShopifyProduct {
    id: string
    title: string
    handle: string
    price: string
    image: string | null
}

interface ProductBundle {
    id: string
    title: string
    mainProductId: string
    bundleProductIds: string[]
    active: boolean
    createdAt: string
}

export function BundleManager() {
    const [shop, setShop] = useState<string>('')
    const [products, setProducts] = useState<ShopifyProduct[]>([])
    const [bundles, setBundles] = useState<ProductBundle[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string>('')

    // New bundle form state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [bundleTitle, setBundleTitle] = useState('')
    const [selectedMainProduct, setSelectedMainProduct] = useState<string>('')
    const [selectedBundleProducts, setSelectedBundleProducts] = useState<string[]>([])

    useEffect(() => {
        loadShopAndData()
    }, [])

    const loadShopAndData = async () => {
        setLoading(true)
        setError('')
        try {
            // Get current user's shop from session
            const userRes = await fetch('/api/user/me')
            const userData = await userRes.json()

            let shopDomain = ''

            // Try to get shop from user's organization
            if (userData.success && userData.user?.organization?.shopifyConnection?.shopDomain) {
                shopDomain = userData.user.organization.shopifyConnection.shopDomain
            }
            // Fallback: Try to get from environment variables (for development/testing)
            else {
                const envRes = await fetch('/api/shopify/env-config')
                const envData = await envRes.json()
                if (envData.success && envData.shopDomain) {
                    shopDomain = envData.shopDomain
                } else {
                    setError('Keine Shopify-Verbindung gefunden. Bitte verbinden Sie zuerst Ihren Shop in den Einstellungen.')
                    setLoading(false)
                    return
                }
            }

            setShop(shopDomain)

            // Load products
            const productsRes = await fetch(`/api/shopify/products?shop=${shopDomain}`)
            const productsData = await productsRes.json()

            if (productsData.success) {
                setProducts(productsData.products)
            } else {
                setError(productsData.error || 'Fehler beim Laden der Produkte')
            }

            // Load existing bundles
            const bundlesRes = await fetch(`/api/shopify/bundles?shop=${shopDomain}`)
            const bundlesData = await bundlesRes.json()
            if (bundlesData.success) {
                setBundles(bundlesData.bundles)
            }
        } catch (error: any) {
            console.error('Error loading data:', error)
            setError('Fehler beim Laden der Daten: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const createBundle = async () => {
        if (!bundleTitle || !selectedMainProduct || selectedBundleProducts.length === 0) {
            alert('Bitte füllen Sie alle Felder aus')
            return
        }

        setCreating(true)
        try {
            const res = await fetch('/api/shopify/bundles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shop,
                    title: bundleTitle,
                    mainProductId: selectedMainProduct,
                    bundleProductIds: selectedBundleProducts
                })
            })

            const data = await res.json()
            if (data.success) {
                setBundles([data.bundle, ...bundles])
                setIsDialogOpen(false)
                // Reset form
                setBundleTitle('')
                setSelectedMainProduct('')
                setSelectedBundleProducts([])
            } else {
                alert('Fehler beim Erstellen des Bundles')
            }
        } catch (error) {
            console.error('Error creating bundle:', error)
            alert('Fehler beim Erstellen des Bundles')
        } finally {
            setCreating(false)
        }
    }

    const deleteBundle = async (bundleId: string) => {
        if (!confirm('Bundle wirklich löschen?')) return

        try {
            const res = await fetch(`/api/shopify/bundles?id=${bundleId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                setBundles(bundles.filter(b => b.id !== bundleId))
            }
        } catch (error) {
            console.error('Error deleting bundle:', error)
        }
    }

    const toggleBundleProduct = (productId: string) => {
        if (selectedBundleProducts.includes(productId)) {
            setSelectedBundleProducts(selectedBundleProducts.filter(id => id !== productId))
        } else {
            setSelectedBundleProducts([...selectedBundleProducts, productId])
        }
    }

    const getProductById = (id: string) => {
        return products.find(p => p.id === id)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="w-16 h-16 text-orange-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Shopify-Verbindung erforderlich</h3>
                    <p className="text-gray-600 text-center max-w-md mb-4">
                        {error}
                    </p>
                    <Button
                        onClick={() => window.location.href = '/settings'}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Zu den Einstellungen
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Bundle Verwaltung</h3>
                    <p className="text-sm text-gray-500">Erstellen Sie Product Bundles für Ihren Shop</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-purple-600 hover:bg-purple-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Neues Bundle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Neues Product Bundle erstellen</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Bundle Title */}
                            <div>
                                <Label htmlFor="bundle-title">Bundle Name</Label>
                                <Input
                                    id="bundle-title"
                                    value={bundleTitle}
                                    onChange={(e) => setBundleTitle(e.target.value)}
                                    placeholder="z.B. Sommer Outfit Bundle"
                                    className="mt-1"
                                />
                            </div>

                            {/* Main Product Selection */}
                            <div>
                                <Label>Hauptprodukt auswählen</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                    {products.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => setSelectedMainProduct(product.id)}
                                            className={`p-3 border rounded-lg text-left transition-all ${selectedMainProduct === product.id
                                                ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {product.image && (
                                                <img
                                                    src={product.image}
                                                    alt={product.title}
                                                    className="w-full h-24 object-cover rounded mb-2"
                                                />
                                            )}
                                            <p className="text-sm font-medium truncate">{product.title}</p>
                                            <p className="text-xs text-gray-500">{product.price} €</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bundle Products Selection */}
                            <div>
                                <Label>Bundle-Produkte auswählen (werden zusammen angezeigt)</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                    {products
                                        .filter(p => p.id !== selectedMainProduct)
                                        .map((product) => (
                                            <button
                                                key={product.id}
                                                onClick={() => toggleBundleProduct(product.id)}
                                                className={`p-3 border rounded-lg text-left transition-all relative ${selectedBundleProducts.includes(product.id)
                                                    ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                {selectedBundleProducts.includes(product.id) && (
                                                    <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                                {product.image && (
                                                    <img
                                                        src={product.image}
                                                        alt={product.title}
                                                        className="w-full h-24 object-cover rounded mb-2"
                                                    />
                                                )}
                                                <p className="text-sm font-medium truncate">{product.title}</p>
                                                <p className="text-xs text-gray-500">{product.price} €</p>
                                            </button>
                                        ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Abbrechen
                                </Button>
                                <Button
                                    onClick={createBundle}
                                    disabled={creating || !bundleTitle || !selectedMainProduct || selectedBundleProducts.length === 0}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {creating ? 'Erstelle...' : 'Bundle erstellen'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Bundles List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundles.length === 0 ? (
                    <Card className="col-span-full">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Package className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-gray-500 text-center">
                                Noch keine Bundles erstellt.<br />
                                Klicken Sie auf "Neues Bundle", um zu beginnen.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    bundles.map((bundle) => {
                        const mainProduct = getProductById(bundle.mainProductId)
                        const bundleProducts = bundle.bundleProductIds.map(id => getProductById(id)).filter(Boolean) as ShopifyProduct[]

                        return (
                            <Card key={bundle.id} className="overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">{bundle.title}</CardTitle>
                                            <CardDescription className="text-sm">
                                                {bundleProducts.length + 1} Produkte
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteBundle(bundle.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                        {/* Main Product */}
                                        {mainProduct && (
                                            <div className="flex-shrink-0 text-center">
                                                <div className="w-16 h-16 rounded border bg-white p-1 mb-1">
                                                    {mainProduct.image && (
                                                        <img
                                                            src={mainProduct.image}
                                                            alt={mainProduct.title}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium truncate w-16">{mainProduct.title}</p>
                                            </div>
                                        )}

                                        {/* Bundle Products */}
                                        {bundleProducts.map((product, idx) => (
                                            <div key={product.id} className="flex items-center gap-2">
                                                <Plus className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                <div className="flex-shrink-0 text-center">
                                                    <div className="w-16 h-16 rounded border bg-white p-1 mb-1">
                                                        {product.image && (
                                                            <img
                                                                src={product.image}
                                                                alt={product.title}
                                                                className="w-full h-full object-contain"
                                                            />
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-medium truncate w-16">{product.title}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
