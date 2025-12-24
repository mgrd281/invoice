
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Package, ShoppingBag, CheckCircle, XCircle, Trash2, BarChart, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DigitalProduct {
    id: string
    title: string
    shopifyProductId: string
    image?: string | null
    _count: {
        keys: number // This is actually the count of UNUSED keys based on my API query
    }
}

export default function DigitalProductsPage() {
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
            </main>
        </div>
    )
}
