'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Search, Check, Loader2, ShoppingBag } from 'lucide-react'

interface ShopifyProduct {
    id: number
    title: string
    image?: { src: string }
}

export default function NewDigitalProductPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState<number | null>(null)
    const [products, setProducts] = useState<ShopifyProduct[]>([])
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchShopifyProducts()
    }, [])

    const fetchShopifyProducts = async () => {
        try {
            const res = await fetch('/api/shopify/products')
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

    const handleCreate = async (product: ShopifyProduct) => {
        setCreating(product.id)
        try {
            const res = await fetch('/api/digital-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: product.title,
                    shopifyProductId: String(product.id),
                    organizationId: 'default-org-id' // TODO: Get from session
                })
            })

            if (res.ok) {
                router.push('/digital-products')
            } else {
                const data = await res.json()
                alert(data.error || 'Fehler beim Aktivieren des Produkts')
            }
        } catch (error) {
            console.error(error)
            alert('Ein Fehler ist aufgetreten: ' + (error instanceof Error ? error.message : String(error)))
        } finally {
            setCreating(null)
        }
    }

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Zurück
                    </Button>
                    <h1 className="text-xl font-bold text-gray-900">Digitales Produkt hinzufügen</h1>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-2">Wählen Sie ein Produkt aus Ihrem Shop</h2>
                    <p className="text-gray-500 mb-6">
                        Diese Produkte werden automatisch importiert. Klicken Sie auf "Aktivieren", um Lizenzschlüssel hinzuzufügen.
                    </p>

                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Produkt suchen..."
                            className="pl-10"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map(product => (
                            <Card key={product.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <ShoppingBag className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-sm line-clamp-2" title={product.title}>
                                                    {product.title}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1">ID: {product.id}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <Button
                                            className="w-full"
                                            onClick={() => handleCreate(product)}
                                            disabled={creating === product.id}
                                            variant={creating === product.id ? "secondary" : "default"}
                                        >
                                            {creating === product.id ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Wird aktiviert...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4 mr-2" />
                                                    Als Digitalprodukt aktivieren
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {filteredProducts.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                Keine Produkte gefunden.
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
