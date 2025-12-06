
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Key, ShoppingBag, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DigitalProduct {
    id: string
    title: string
    shopifyProductId: string
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
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Key className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">Digitale Produkte</h1>
                    </div>
                    <Button onClick={() => router.push('/digital-products/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Neues Produkt
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="text-center py-12">Laden...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow border border-dashed border-gray-300">
                        <Key className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine digitalen Produkte</h3>
                        <p className="mt-1 text-sm text-gray-500">Starten Sie mit dem Hinzufügen Ihres ersten Microsoft-Produkts.</p>
                        <div className="mt-6">
                            <Button onClick={() => router.push('/digital-products/new')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Produkt hinzufügen
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product) => (
                            <Link key={product.id} href={`/digital-products/${product.id}`}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full relative group">
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-start">
                                            <span className="truncate pr-8">{product.title}</span>
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <button
                                                    onClick={(e) => handleDeleteProduct(e, product.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                                                    title="Produkt löschen"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </CardTitle>
                                        <CardDescription>ID: {product.shopifyProductId}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between mt-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${product._count.keys > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span className="text-sm font-medium text-gray-700">
                                                    {product._count.keys} Keys verfügbar
                                                </span>
                                            </div>
                                            <Button variant="ghost" size="sm">Verwalten &rarr;</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
