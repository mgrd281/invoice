
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
    ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'

interface ShopifyProduct {
    id: number
    title: string
    vendor?: string
    product_type?: string
    image?: { src: string }
    images?: { src: string }[]
}

interface DigitalProductData {
    id: string
    title: string
    shopifyProductId: string
    image?: string | null
    _count: {
        keys: number
    }
}

export default function DigitalProductsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([])
    const [digitalProducts, setDigitalProducts] = useState<Map<string, DigitalProductData>>(new Map())
    const [search, setSearch] = useState('')
    const [activatingId, setActivatingId] = useState<number | null>(null)

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
                toast.success('Produkt aktiviert!')
                // Update local state
                const newMap = new Map(digitalProducts)
                newMap.set(String(product.id), data.data)
                setDigitalProducts(newMap)
                // Optional: navigate to details immediately? 
                // router.push(`/digital-products/${data.data.id}`)
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

    // Filter Logic
    const filteredProducts = shopifyProducts.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.vendor?.toLowerCase().includes(search.toLowerCase())
    )

    // Group items by Vendor
    const productsByVendor = filteredProducts.reduce((acc, product) => {
        const vendor = product.vendor || 'Andere'
        if (!acc[vendor]) {
            acc[vendor] = []
        }
        acc[vendor].push(product)
        return acc
    }, {} as Record<string, ShopifyProduct[]>)

    const sortedVendors = Object.keys(productsByVendor).sort()

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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                        <p className="text-gray-500">Lade Produkte aus Ihrem Shop...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {sortedVendors.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">Keine Produkte gefunden.</p>
                            </div>
                        ) : (
                            sortedVendors.map(vendor => (
                                <div key={vendor} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                        <h2 className="font-bold text-gray-800 uppercase tracking-wide text-sm flex items-center gap-2">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            {vendor}
                                        </h2>
                                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">
                                            {productsByVendor[vendor].length} Produkte
                                        </span>
                                    </div>

                                    <div className="divide-y divide-gray-50">
                                        {productsByVendor[vendor].map(product => {
                                            const digitalData = digitalProducts.get(String(product.id))
                                            const isActive = !!digitalData
                                            const keyCount = digitalData?._count.keys || 0
                                            const imgSrc = product.image?.src || product.images?.[0]?.src

                                            return (
                                                <div
                                                    key={product.id}
                                                    className={`group flex items-center p-4 hover:bg-blue-50/30 transition-colors ${isActive ? 'bg-white' : 'bg-gray-50/30'}`}
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
                                                        <h3 className="font-medium text-gray-900 truncate" title={product.title}>
                                                            {product.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-xs text-gray-400 font-mono">ID: {product.id}</p>
                                                            {isActive && (
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${keyCount > 0
                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                                    }`}>
                                                                    {keyCount} Keys
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center shrink-0">
                                                        {isActive ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.push(`/digital-products/${digitalData.id}`)}
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-100"
                                                            >
                                                                Verwalten
                                                                <ArrowRight className="w-4 h-4 ml-2" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleActivate(product)}
                                                                disabled={activatingId === product.id}
                                                                className="text-gray-600 hover:text-blue-600 hover:border-blue-200 bg-white"
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
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
