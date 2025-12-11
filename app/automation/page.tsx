'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
    Zap,
    ArrowLeft,
    Mail,
    Star,
    ShoppingBag,
    Users,
    AlertTriangle,
    ShoppingCart,
    CheckCircle,
    Plus,
    Settings,
    Play,
    Pause
} from 'lucide-react'

export default function AutomationPage() {
    // Mock state for now - in a real app this would come from an API
    const [automations, setAutomations] = useState([
        {
            id: 'invoice-auto-send',
            title: 'Rechnung automatisch senden',
            description: 'Sendet die Rechnung sofort nach Zahlungseingang an den Kunden.',
            icon: Mail,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            status: 'active',
            link: '/settings'
        },
        {
            id: 'review-request',
            title: 'Bewertungsanfrage',
            description: 'Fragt 5 Tage nach Lieferung automatisch nach einer Bewertung.',
            icon: Star,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100',
            status: 'active',
            link: '/reviews'
        },
        {
            id: 'review-incentive',
            title: 'Review Belohnung',
            description: 'Sendet automatisch einen Coupon bei 5-Sterne Bewertungen.',
            icon: GiftIcon,
            color: 'text-pink-600',
            bgColor: 'bg-pink-100',
            status: 'active',
            link: '/reviews'
        }
    ])

    const [newWorkflows, setNewWorkflows] = useState([
        {
            id: 'vip-tagging',
            title: 'VIP Kunden Markierung',
            description: 'Markiert Kunden mit > 500€ Umsatz automatisch als VIP.',
            icon: Users,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
            enabled: false
        },
        {
            id: 'inventory-alert',
            title: 'Lagerbestand Warnung',
            description: 'Benachrichtigung via Telegram wenn Bestand < 5 Stück.',
            icon: AlertTriangle,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
            enabled: false
        },
        {
            id: 'abandoned-cart',
            title: 'Warenkorb Wiederherstellung',
            description: 'Sendet WhatsApp/Email bei abgebrochenem Kauf.',
            icon: ShoppingCart,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            enabled: false
        }
    ])

    const toggleWorkflow = (id: string) => {
        setNewWorkflows(prev => prev.map(w =>
            w.id === id ? { ...w, enabled: !w.enabled } : w
        ))
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2 rounded-lg">
                                <Zap className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Automation Hub</h1>
                                <p className="text-sm text-gray-500">Verwalten Sie alle automatischen Prozesse an einem Ort</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Active Automations Overview */}
                <div className="mb-10">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Play className="h-5 w-5 text-green-600" />
                        Aktive Automatisierungen
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {automations.map(auto => (
                            <Card key={auto.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-lg ${auto.bgColor}`}>
                                            <auto.icon className={`h-6 w-6 ${auto.color}`} />
                                        </div>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            Aktiv
                                        </Badge>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{auto.title}</h3>
                                    <p className="text-sm text-gray-500 mb-4 h-10">{auto.description}</p>
                                    <Link href={auto.link}>
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Settings className="h-4 w-4 mr-2" />
                                            Konfigurieren
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* New Workflows Section */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-blue-600" />
                        Verfügbare Workflows
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {newWorkflows.map(workflow => (
                            <Card key={workflow.id} className={`hover:shadow-md transition-shadow ${workflow.enabled ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className={`p-3 rounded-lg ${workflow.bgColor}`}>
                                            <workflow.icon className={`h-6 w-6 ${workflow.color}`} />
                                        </div>
                                        <Switch
                                            checked={workflow.enabled}
                                            onCheckedChange={() => toggleWorkflow(workflow.id)}
                                        />
                                    </div>
                                    <CardTitle className="text-base mt-4">{workflow.title}</CardTitle>
                                    <CardDescription className="h-10">
                                        {workflow.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {workflow.enabled ? (
                                        <div className="flex items-center text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Aktiviert
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 flex items-center">
                                            <Pause className="h-4 w-4 mr-2" />
                                            Inaktiv
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Custom Automation Call to Action */}
                <div className="mt-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white text-center">
                    <h2 className="text-2xl font-bold mb-4">Benötigen Sie eine spezielle Automatisierung?</h2>
                    <p className="mb-6 opacity-90 max-w-2xl mx-auto">
                        Wir können individuelle Workflows für Ihren Shop erstellen. Verbinden Sie externe APIs, CRM-Systeme oder komplexe Logik.
                    </p>
                    <Button variant="secondary" size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
                        Anfrage senden
                    </Button>
                </div>

            </main>
        </div>
    )
}

function GiftIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M12 8v13" />
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
        </svg>
    )
}
