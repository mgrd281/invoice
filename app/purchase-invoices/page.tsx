'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    FileText,
    ArrowLeft,
    Home,
    Plus,
    Upload,
    Search,
    Filter,
    MoreHorizontal,
    Download,
    Calendar,
    Euro,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react'

// Mock Data for UI Dev
const MOCK_INVOICES = [
    { id: '1', supplier: 'Adobe Systems', number: 'INV-2024-001', date: '2024-01-15', amount: 29.99, status: 'PAID', category: 'Software' },
    { id: '2', supplier: 'Google Cloud', number: 'G-778899', date: '2024-01-12', amount: 145.50, status: 'PENDING', category: 'Hosting' },
    { id: '3', supplier: 'Amazon Basics', number: 'DE-998877', date: '2024-01-10', amount: 45.20, status: 'PAID', category: 'Office' },
    { id: '4', supplier: 'Apple Store', number: 'R998877', date: '2023-12-28', amount: 1299.00, status: 'PAID', category: 'Hardware' },
]

export default function PurchaseInvoicesPage() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <div className="container mx-auto p-6 max-w-7xl space-y-8 pb-32">

            {/* Header with Navigation */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-9 w-9 rounded-full border-slate-200 bg-white/50 hover:bg-slate-50 shadow-sm transition-all"
                        title="Zurück"
                    >
                        <ArrowLeft className="h-[18px] w-[18px] text-slate-600" strokeWidth={2} />
                    </Button>
                    <Link href="/dashboard">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full border-slate-200 bg-white/50 hover:bg-slate-50 shadow-sm transition-all"
                            title="Dashboard"
                        >
                            <Home className="h-[18px] w-[18px] text-slate-600" strokeWidth={2} />
                        </Button>
                    </Link>
                    <div className="ml-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Einkaufsrechnungen</h1>
                        <p className="text-sm text-slate-500">Verwalten Sie Ihre Ausgaben und Belege zentral</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Upload className="h-4 w-4" /> Import (CSV)
                    </Button>
                    <Link href="/purchase-invoices/new">
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="h-4 w-4" /> Neue Rechnung
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Offene Rechnungen</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">145,50 €</h3>
                        </div>
                        <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Diesen Monat bezahlt</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">1.374,19 €</h3>
                        </div>
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-white to-slate-50">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Ausgaben Gesamt (YTD)</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">4.250,00 €</h3>
                        </div>
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Euro className="h-5 w-5 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Suchen nach Lieferant, Nr..."
                        className="pl-9 bg-slate-50 border-slate-200"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" /> Filter
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Calendar className="h-4 w-4" /> Zeitraum
                    </Button>
                </div>
            </div>

            {/* Invoices List */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-lg">Letzte Rechnungen</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Beleg #</th>
                                    <th className="px-6 py-3 font-medium">Lieferant</th>
                                    <th className="px-6 py-3 font-medium">Datum</th>
                                    <th className="px-6 py-3 font-medium">Kategorie</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Betrag</th>
                                    <th className="px-6 py-3 font-medium text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {MOCK_INVOICES.map((inv) => (
                                    <tr key={inv.id} className="bg-white hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-blue-600">
                                            {inv.number}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {inv.supplier}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(inv.date).toLocaleDateString('de-DE')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className="font-normal">
                                                {inv.category}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            {inv.status === 'PAID' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Bezahlt</Badge>
                                            ) : (
                                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200">Offen</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-slate-900">
                                            {inv.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
