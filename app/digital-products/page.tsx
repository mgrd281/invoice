<<<<<<< HEAD
=======

>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
<<<<<<< HEAD
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Package,
    Search,
    Key,
    Settings,
    Loader2,
    ArrowRight,
    PlusCircle,
    CheckCircle2,
    BarChart,
    ShoppingBag,
    ArrowLeft,
    Zap,
    Trash2,
    AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ShopifyProduct {
    id: number
    title: string
    vendor?: string
    product_type?: string
    image?: { src: string }
    images?: { src: string }[]
}

interface DigitalProductData {
=======
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Package, ShoppingBag, CheckCircle, XCircle, Trash2, BarChart, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DigitalProduct {
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
    id: string
    title: string
    shopifyProductId: string
    image?: string | null
    _count: {
<<<<<<< HEAD
        keys: number
=======
        keys: number // This is actually the count of UNUSED keys based on my API query
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
    }
}

export default function DigitalProductsPage() {
<<<<<<< HEAD
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([])
    const [digitalProducts, setDigitalProducts] = useState<Map<string, DigitalProductData>>(new Map())
    const [search, setSearch] = useState('')
    const [activatingId, setActivatingId] = useState<number | null>(null)

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'all', id?: string, shopifyId?: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            try {
                // Parallel fetch
                const [shopifyRes, digitalRes] = await Promise.all([
                    fetch('/api/shopify/products'),
                    fetch('/api/digital-products')
                ])

                const shopifyData = await shopifyRes.json()
                const digitalData = await digitalRes.json()

                if (shopifyData.success) {
                    setShopifyProducts(shopifyData.data)
                }

                if (digitalData.success) {
                    const map = new Map<string, DigitalProductData>()
                    digitalData.data.forEach((p: DigitalProductData) => {
                        map.set(p.shopifyProductId, p)
                    })
                    setDigitalProducts(map)
                }

            } catch (error) {
                console.error('Failed to load data', error)
                toast.error('Fehler beim Laden der Produkte')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    const handleActivate = async (product: ShopifyProduct) => {
        setActivatingId(product.id)
        try {
            const res = await fetch('/api/digital-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: product.title,
                    shopifyProductId: String(product.id),
                    organizationId: 'default-org-id'
                })
            })

            const data = await res.json()

            if (res.ok) {
                toast.success('Produkt aktiviert! Sie finden es jetzt oben bei den aktiven Produkten.')
                // Update local state - this will cause it to move to the "Active" section automatically
                const newMap = new Map(digitalProducts)
                newMap.set(String(product.id), data.data)
                setDigitalProducts(newMap)
            } else {
                toast.error('Fehler beim Aktivieren')
            }
        } catch (error) {
            console.error('Activation failed', error)
            toast.error('Netzwerkfehler')
        } finally {
            setActivatingId(null)
        }
    }

    const initiateDelete = (e: React.MouseEvent, type: 'single' | 'all', id?: string, shopifyId?: string) => {
        e.preventDefault()
        e.stopPropagation()
        setDeleteTarget({ type, id, shopifyId })
        setDeleteDialogOpen(true)
    }

    const executeDelete = async () => {
        if (!deleteTarget) return

        setIsDeleting(true)
        try {
            if (deleteTarget.type === 'single' && deleteTarget.id) {
                const res = await fetch(`/api/digital-products/${deleteTarget.id}`, {
                    method: 'DELETE'
                })

                if (res.ok) {
                    toast.success('Produkt deaktiviert')
                    const newMap = new Map(digitalProducts)
                    if (deleteTarget.shopifyId) newMap.delete(deleteTarget.shopifyId)
                    setDigitalProducts(newMap)
                } else {
                    toast.error('Fehler beim Deaktivieren')
                }
            } else if (deleteTarget.type === 'all') {
                // Bulk delete - Frontend parallel fetch implementation
                const idsToDelete = Array.from(digitalProducts.values()).map(p => p.id)
                // We do this in parallel, simpler than adding backend endpoint right now and safe for <100 products
                const promises = idsToDelete.map(id =>
                    fetch(`/api/digital-products/${id}`, { method: 'DELETE' })
                )

                await Promise.all(promises)

                toast.success('Alle Produkte wurden deaktiviert')
                setDigitalProducts(new Map()) // Clear all locally
            }
        } catch (error) {
            console.error('Failed to delete', error)
            toast.error('Fehler beim Löschen')
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setDeleteTarget(null)
        }
    }

    const isMicrosoft = (p: ShopifyProduct) => {
        const text = (p.vendor + ' ' + p.title + ' ' + p.product_type).toLowerCase()
        return text.includes('microsoft') || text.includes('windows') || text.includes('office')
    }

    // Filter Logic
    const filteredProducts = shopifyProducts.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.vendor?.toLowerCase().includes(search.toLowerCase())
    )

    // Separate Active vs Inactive
    const activeProducts = filteredProducts.filter(p => digitalProducts.has(String(p.id)))
    const inactiveProducts = filteredProducts.filter(p => !digitalProducts.has(String(p.id)))

    // Sort Active Products: Microsoft first
    activeProducts.sort((a, b) => {
        const am = isMicrosoft(a)
        const bm = isMicrosoft(b)
        if (am && !bm) return -1
        if (!am && bm) return 1
        return 0
    })

    // Group Inactive Items by Vendor
    const inactiveByVendor = inactiveProducts.reduce((acc, product) => {
        const vendor = product.vendor || 'Andere'
        if (!acc[vendor]) {
            acc[vendor] = []
        }
        acc[vendor].push(product)
        return acc
    }, {} as Record<string, ShopifyProduct[]>)

    // Sort Vendors: Microsoft vendors first
    const sortedInactiveVendors = Object.keys(inactiveByVendor).sort((a, b) => {
        const am = a.toLowerCase().includes('microsoft')
        const bm = b.toLowerCase().includes('microsoft')
        if (am && !bm) return -1
        if (!am && bm) return 1
        return a.localeCompare(b)
    })

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Digitale Produkte</h1>
                                <p className="text-xs text-gray-500">Verwalten Sie Ihre Lizenzschlüssel und Downloads</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-1 md:justify-end min-w-0">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Suche nach Produkt oder Marke..."
                                    className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" onClick={() => router.push('/digital-products/reports')} className="hidden sm:flex">
                                <BarChart className="w-4 h-4 mr-2" />
                                Berichte
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                        <p className="text-gray-500">Lade Produkte aus Ihrem Shop...</p>
                    </div>
                ) : (
                    <>
                        {/* SECTION 1: ACTIVATED PRODUCTS */}
                        {activeProducts.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                        <h2 className="text-lg font-bold text-gray-900">Aktive Produkte</h2>
                                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {activeProducts.length}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => initiateDelete(e, 'all')}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs uppercase font-bold tracking-wider"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Alle entfernen
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {activeProducts.map(product => {
                                        const digitalData = digitalProducts.get(String(product.id))!
                                        const keyCount = digitalData._count.keys
                                        const imgSrc = product.image?.src || product.images?.[0]?.src
                                        const isMicrosoftProd = isMicrosoft(product)

                                        return (
                                            <div
                                                key={product.id}
                                                className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all relative group ${isMicrosoftProd ? 'border-blue-100 ring-1 ring-blue-50' : 'border-gray-200'}`}
                                            >
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={(e) => initiateDelete(e, 'single', digitalData.id, String(product.id))}
                                                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                        title="Produkt entfernen"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                <div className="p-5">
                                                    <div className="flex items-start gap-4">
                                                        <div className="h-16 w-16 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            {imgSrc ? (
                                                                <img src={imgSrc} alt="" className="w-full h-full object-contain p-1" />
                                                            ) : (
                                                                <ShoppingBag className="w-6 h-6 text-gray-300" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight" title={product.title}>
                                                                {product.title}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 font-mono mt-1">ID: {product.id}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-between">
                                                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${keyCount > 0
                                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                            }`}>
                                                            {keyCount} Keys verfügbar
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => router.push(`/digital-products/${digitalData.id}`)}
                                                            className="h-8 bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            Verwalten
                                                            <ArrowRight className="w-3 h-3 ml-1.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SECTION 2: INACTIVE PRODUCTS */}
                        <div className="space-y-6">
                            {activeProducts.length > 0 && inactiveProducts.length > 0 && (
                                <div className="flex items-center gap-2 pt-8 pb-2 border-b border-gray-200">
                                    <Package className="w-5 h-5 text-gray-500" />
                                    <h2 className="text-lg font-bold text-gray-600">Noch nicht aktiviert</h2>
                                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {inactiveProducts.length}
                                    </span>
                                </div>
                            )}

                            {activeProducts.length === 0 && inactiveProducts.length === 0 && (
                                <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">Keine Produkte gefunden.</p>
                                </div>
                            )}

                            {sortedInactiveVendors.map(vendor => (
                                <div key={vendor} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0">
                                        <h2 className="font-bold text-gray-800 uppercase tracking-wide text-sm flex items-center gap-2">
                                            {vendor}
                                        </h2>
                                        <span className="text-xs font-mono text-gray-400">
                                            {inactiveByVendor[vendor].length} Produkte
                                        </span>
                                    </div>

                                    <div className="divide-y divide-gray-50">
                                        {inactiveByVendor[vendor].map(product => {
                                            const imgSrc = product.image?.src || product.images?.[0]?.src

                                            return (
                                                <div
                                                    key={product.id}
                                                    className="group flex items-center p-4 hover:bg-blue-50/20 transition-colors"
                                                >
                                                    {/* Image */}
                                                    <div className="h-12 w-12 bg-white rounded-lg mr-4 overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center shadow-sm">
                                                        {imgSrc ? (
                                                            <img src={imgSrc} alt="" className="h-full w-full object-contain p-1" />
                                                        ) : (
                                                            <ShoppingBag className="w-5 h-5 text-gray-300" />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <h3 className="font-medium text-gray-900 truncate opacity-90 group-hover:opacity-100" title={product.title}>
                                                            {product.title}
                                                        </h3>
                                                        <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {product.id}</p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleActivate(product)}
                                                            disabled={activatingId === product.id}
                                                            className="text-gray-600 hover:text-blue-600 hover:border-blue-200 bg-white shadow-sm"
                                                        >
                                                            {activatingId === product.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                            ) : (
                                                                <>
                                                                    <PlusCircle className="w-4 h-4 mr-2" />
                                                                    Aktivieren
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* DELETE CONFIRMATION DIALOG */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {deleteTarget?.type === 'all'
                                    ? 'Alle aktiven Produkte entfernen?'
                                    : 'Produkt deaktivieren?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {deleteTarget?.type === 'all'
                                    ? `Möchten Sie wirklich alle ${activeProducts.length} aktiven Produkte deaktivieren? Die Produkte werden wieder in die Liste "Noch nicht aktiviert" verschoben.`
                                    : 'Möchten Sie dieses Produkt wirklich aus den aktiven digitalen Produkten entfernen? Es wird wieder in die Liste "Noch nicht aktiviert" verschoben.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault()
                                    executeDelete()
                                }}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Entfernen...
                                    </>
                                ) : (
                                    'Entfernen'
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
=======
    const [products, setProducts] = useState<DigitalProduct[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/digital-products')
            const data = await res.json()
            if (data.success) {
                setProducts(data.data)
            }
        } catch (error) {
            console.error('Failed to load products', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteProduct = async (e: React.MouseEvent, productId: string) => {
        e.preventDefault()
        e.stopPropagation()

        if (!confirm('Möchten Sie dieses Produkt und alle zugehörigen Keys wirklich löschen?')) return

        try {
            const res = await fetch(`/api/digital-products/${productId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                fetchProducts()
            } else {
                alert('Fehler beim Löschen des Produkts')
            }
        } catch (error) {
            console.error('Failed to delete product', error)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">Digitale Produkte</h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.push('/digital-products/reports')}>
                            <BarChart className="w-4 h-4 mr-2" />
                            Berichte
                        </Button>
                        <Button onClick={() => router.push('/digital-products/new')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Neues Produkt
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Keine digitalen Produkte</h3>
                        <p className="mt-2 text-gray-500 max-w-sm mx-auto">Starten Sie mit dem Hinzufügen Ihres ersten Produkts, um Lizenzschlüssel automatisch zu versenden.</p>
                        <div className="mt-8">
                            <Button onClick={() => router.push('/digital-products/new')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Produkt hinzufügen
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                        {products.map((product) => {
                            const availableKeys = product._count.keys
                            const isLowStock = availableKeys < 10

                            return (
                                <Link key={product.id} href={`/digital-products/${product.id}`} className="block h-full">
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col group overflow-hidden relative">

                                        {/* Delete Button - Top Right */}
                                        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleDeleteProduct(e, product.id)}
                                                className="bg-white/90 backdrop-blur-sm text-gray-400 hover:text-red-600 p-2 rounded-full shadow-sm border border-gray-100 hover:bg-red-50 transition-colors"
                                                title="Produkt löschen"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col">
                                            {/* Header with Image and Title */}
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center">
                                                    {product.image ? (
                                                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package className="h-8 w-8 text-gray-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                        {product.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 font-mono truncate">
                                                        ID: {product.shopifyProductId}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="mt-auto pt-4 flex items-center justify-between">
                                                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${isLowStock
                                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                    : 'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                    <div className={`w-2 h-2 rounded-full mr-2 ${isLowStock ? 'bg-yellow-500' : 'bg-green-500'
                                                        }`} />
                                                    {availableKeys} Keys verfügbar
                                                    {isLowStock && (
                                                        <span className="ml-1 font-bold hidden sm:inline">⚠️</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer / CTA */}
                                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center group-hover:bg-blue-50/50 transition-colors">
                                            <span className="text-xs text-gray-500 font-medium">
                                                {isLowStock ? 'Niedriger Bestand' : 'Bestand OK'}
                                            </span>
                                            <span className="text-sm font-semibold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                                                Verwalten <span className="ml-1">→</span>
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
            </main>
        </div>
    )
}
