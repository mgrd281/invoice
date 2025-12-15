'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Trash2, Check, X, ShoppingBag, Package } from 'lucide-react'
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
    const searchParams = useSearchParams()
    const shop = searchParams.get('shop') || ''

    const [products, setProducts] = useState<ShopifyProduct[]>([])
    const [bundles, setBundles] = useState<ProductBundle[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)

    // New bundle form state
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [bundleTitle, setBundleTitle] = useState('')
    const [selectedMainProduct, setSelectedMainProduct] = useState<string>('')
    const [selectedBundleProducts, setSelectedBundleProducts] = useState<string[]>([])

    useEffect(() => {
        if (shop) {
            loadData()
        }
    }, [shop])

    const loadData = async () => {
        setLoading(true)
        try {
            // Load products
            const productsRes = await fetch(`/api/shopify/products?shop=${shop}`)
            const productsData = await productsRes.json()
            if (productsData.success) {
                setProducts(productsData.products)
            }

            // Load existing bundles
            const bundlesRes = await fetch(`/api/shopify/bundles?shop=${shop}`)
            const bundlesData = await bundlesRes.json()
            if (bundlesData.success) {
                setBundles(bundlesData.bundles)
            }
        } catch (error) {
            console.error('Error loading data:', error)
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

    if (!shop) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Shopify Shop erforderlich</h3>
                    <p className="text-gray-500 text-center max-w-md mb-4">
                        Um Product Bundles zu verwalten, müssen Sie diese Seite über Ihren Shopify Admin öffnen.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                        <p className="text-sm text-blue-900 font-medium mb-2">So öffnen Sie diese Seite:</p>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Gehen Sie zu Ihrem Shopify Admin</li>
                            <li>Öffnen Sie die RechnungsProfi App</li>
                            <li>Navigieren Sie zu "Storefront Widgets"</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
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
