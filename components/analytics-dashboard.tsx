'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Users, CreditCard, TrendingUp, DollarSign } from 'lucide-react'

export function AnalyticsDashboard() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/analytics')
            .then(res => res.json())
            .then(data => {
                setData(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    if (loading) return (
        <div className="w-full h-48 flex items-center justify-center bg-white rounded-lg border border-gray-100 mb-8">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-sm text-gray-500">Lade Analysen...</p>
            </div>
        </div>
    )

    if (!data) return null

    // Format currency
    const formatCurrency = (val: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val)

    return (
        <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Alle Zeiten</p>
                    </CardContent>
                </Card>

                {/* Paid Invoices */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bezahlte Rechnungen</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.paidInvoicesCount}</div>
                        <p className="text-xs text-muted-foreground">Anzahl</p>
                    </CardContent>
                </Card>

                {/* Average Value */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ø Rechnungswert</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.averageInvoiceValue)}</div>
                        <p className="text-xs text-muted-foreground">Durchschnitt</p>
                    </CardContent>
                </Card>

                {/* Active Customers (Placeholder or from top customers count) */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Kunde</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{data.topCustomers[0]?.name || '-'}</div>
                        <p className="text-xs text-muted-foreground">
                            {data.topCustomers[0] ? formatCurrency(data.topCustomers[0].totalSpent) : '-'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {/* Chart */}
                <Card className="col-span-1 lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Umsatzentwicklung (Letzte 12 Monate)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.monthlyIncome}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => {
                                            const [year, month] = value.split('-')
                                            return `${month}/${year.slice(2)}`
                                        }}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}€`}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        labelFormatter={(label) => {
                                            const [year, month] = label.split('-')
                                            return `${month}/${year}`
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#3b82f6"
                                        fillOpacity={1}
                                        fill="url(#colorTotal)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Customers List */}
                <Card className="col-span-1 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Top Kunden</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.topCustomers.map((customer: any, i: number) => (
                                <div key={i} className="flex items-center">
                                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-3">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none truncate w-[150px]">{customer.name}</p>
                                        <p className="text-xs text-muted-foreground truncate w-[150px]">{customer.email}</p>
                                    </div>
                                    <div className="font-medium text-sm">
                                        {formatCurrency(customer.totalSpent)}
                                    </div>
                                </div>
                            ))}
                            {data.topCustomers.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">Keine Daten verfügbar</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
