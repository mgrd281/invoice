'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, ShoppingBag, ShoppingCart, RefreshCw, TrendingUp, Mail, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CustomerInsightsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/analytics/customer-insights')
            const json = await res.json()
            if (json.success) {
                setData(json.data)
            }
        } catch (error) {
            console.error('Failed to fetch insights', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
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
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Kundenanalyse & Insights</h1>
                            <p className="text-gray-500">Verstehen Sie Ihre Kunden und optimieren Sie Ihren Umsatz.</p>
                        </div>
                    </div>
                    <Button onClick={fetchData} disabled={loading} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Aktualisieren
                    </Button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="h-96 animate-pulse bg-gray-100" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

                        {/* Top Customers */}
                        <Card className="col-span-1 lg:col-span-2 xl:col-span-1 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Top Kunden (VIP)</CardTitle>
                                        <CardDescription>Die umsatzstärksten Kunden</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-auto max-h-[500px]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3">Kunde</th>
                                                <th className="px-6 py-3 text-center">Bestellungen</th>
                                                <th className="px-6 py-3 text-right">Umsatz</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {data?.topCustomers.map((customer: any, index: number) => (
                                                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                                    index === 1 ? 'bg-gray-100 text-gray-700' :
                                                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                                                            'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {index + 1}
                                                            </span>
                                                            <div>
                                                                <div>{customer.name}</div>
                                                                <div className="text-xs text-gray-500">{customer.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {customer.orderCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                        {formatCurrency(customer.totalSpent)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Popular Products */}
                        <Card className="col-span-1 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Beliebte Produkte</CardTitle>
                                        <CardDescription>Meistverkauft (letzte 30 Tage)</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-auto max-h-[500px]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3">Produkt</th>
                                                <th className="px-6 py-3 text-right">Verkäufe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {data?.popularProducts.map((product: any, index: number) => (
                                                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-gray-400 text-xs">#{index + 1}</span>
                                                            <span className="line-clamp-2" title={product.title}>{product.title}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-bold text-purple-600">{product.quantitySold}x</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Abandoned Checkouts */}
                        <Card className="col-span-1 lg:col-span-2 xl:col-span-3 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-red-500">
                            <CardHeader className="bg-gradient-to-r from-red-50 to-white border-b">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <ShoppingCart className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Abgebrochene Warenkörbe</CardTitle>
                                        <CardDescription>Potenzielle Kunden zurückgewinnen</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3">Datum</th>
                                                <th className="px-6 py-3">Kunde</th>
                                                <th className="px-6 py-3">Warenkorb</th>
                                                <th className="px-6 py-3 text-right">Wert</th>
                                                <th className="px-6 py-3 text-right">Aktion</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {data?.abandonedCarts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                        Keine abgebrochenen Warenkörbe gefunden.
                                                    </td>
                                                </tr>
                                            ) : (
                                                data?.abandonedCarts.map((cart: any) => (
                                                    <tr key={cart.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                                            {new Date(cart.createdAt).toLocaleDateString('de-DE')}
                                                            <br />
                                                            <span className="text-xs">{new Date(cart.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            <div>{cart.customer.name}</div>
                                                            <div className="text-xs text-gray-500">{cart.customer.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={cart.lineItems}>
                                                            {cart.lineItems}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                            {formatCurrency(cart.totalPrice)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <a
                                                                    href={`mailto:${cart.customer.email}?subject=Ihr Warenkorb bei uns&body=Hallo ${cart.customer.name},%0D%0A%0D%0ASie haben Produkte in Ihrem Warenkorb gelassen. Klicken Sie hier um den Kauf abzuschließen: ${cart.url}`}
                                                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
                                                                    title="E-Mail senden"
                                                                >
                                                                    <Mail className="w-4 h-4" />
                                                                </a>
                                                                <a
                                                                    href={cart.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                                                                >
                                                                    Checkout <ExternalLink className="ml-2 w-3 h-3" />
                                                                </a>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
