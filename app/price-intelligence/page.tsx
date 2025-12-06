'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingDown, TrendingUp, Minus, RefreshCw, DollarSign, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Competitor {
    name: string
    price: number
    url: string
}

interface ProductPriceData {
    id: string
    name: string
    myPrice: number
    competitors: Competitor[]
    suggestion: {
        action: 'increase' | 'decrease' | 'hold'
        suggestedPrice: number
        reason: string
    }
    history: { date: string, price: number }[]
}

export default function PriceIntelligencePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<ProductPriceData[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/price-intelligence')
            const json = await res.json()
            if (json.success) {
                setProducts(json.data)
            }
        } catch (error) {
            console.error('Failed to fetch price data', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
    }

    const getSuggestionColor = (action: string) => {
        switch (action) {
            case 'decrease': return 'text-red-600 bg-red-50 border-red-200'
            case 'increase': return 'text-green-600 bg-green-50 border-green-200'
            default: return 'text-gray-600 bg-gray-50 border-gray-200'
        }
    }

    const getSuggestionIcon = (action: string) => {
        switch (action) {
            case 'decrease': return <TrendingDown className="w-5 h-5" />
            case 'increase': return <TrendingUp className="w-5 h-5" />
            default: return <Minus className="w-5 h-5" />
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Price Intelligence 🌍</h1>
                            <p className="text-gray-500">Marktüberwachung & Preisoptimierung</p>
                        </div>
                    </div>
                    <Button onClick={fetchData} disabled={loading} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Preise aktualisieren
                    </Button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 gap-6">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="h-48 animate-pulse bg-gray-100" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {products.map((product) => (
                            <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardHeader className="bg-white border-b pb-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl">{product.name}</CardTitle>
                                            <CardDescription>Aktueller Preis: <span className="font-bold text-gray-900">{formatCurrency(product.myPrice)}</span></CardDescription>
                                        </div>
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getSuggestionColor(product.suggestion.action)}`}>
                                            {getSuggestionIcon(product.suggestion.action)}
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-semibold uppercase tracking-wider">Empfehlung</span>
                                                <span className="font-bold">{formatCurrency(product.suggestion.suggestedPrice)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Competitor List */}
                                        <div className="lg:col-span-2 space-y-4">
                                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                <ExternalLink className="w-4 h-4" />
                                                Wettbewerber
                                            </h3>
                                            <div className="bg-gray-50 rounded-lg overflow-hidden border">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-100 text-gray-500">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left font-medium">Shop</th>
                                                            <th className="px-4 py-2 text-right font-medium">Preis</th>
                                                            <th className="px-4 py-2 text-right font-medium">Differenz</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {product.competitors.sort((a, b) => a.price - b.price).map((comp, idx) => {
                                                            const diff = comp.price - product.myPrice
                                                            const diffPercent = (diff / product.myPrice) * 100
                                                            return (
                                                                <tr key={idx} className="hover:bg-white transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-900">{comp.name}</td>
                                                                    <td className="px-4 py-3 text-right">{formatCurrency(comp.price)}</td>
                                                                    <td className={`px-4 py-3 text-right font-medium ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                        {diff > 0 ? '+' : ''}{formatCurrency(diff)} ({diff > 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Analysis & Suggestion */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                Analyse
                                            </h3>
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                                                <p className="font-medium mb-1">Strategie-Vorschlag:</p>
                                                <p>{product.suggestion.reason}</p>
                                            </div>

                                            <div className="pt-4 border-t">
                                                <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                                                    <span>Niedrigster Marktpreis:</span>
                                                    <span className="font-medium text-gray-900">{formatCurrency(Math.min(...product.competitors.map(c => c.price)))}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-gray-500">
                                                    <span>Durchschnittspreis:</span>
                                                    <span className="font-medium text-gray-900">{formatCurrency(product.competitors.reduce((a, b) => a + b.price, 0) / product.competitors.length)}</span>
                                                </div>
                                            </div>

                                            <Button className="w-full" variant={product.suggestion.action === 'hold' ? 'secondary' : 'default'}>
                                                Preis anpassen auf {formatCurrency(product.suggestion.suggestedPrice)}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
