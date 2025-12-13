'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Mail, Clock, CheckCircle, XCircle, ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface AbandonedCart {
    id: string
    email: string
    cartUrl: string
    lineItems: any
    totalPrice: string
    currency: string
    isRecovered: boolean
    recoverySent: boolean
    recoverySentAt: string | null
    createdAt: string
    updatedAt: string
}

export default function AbandonedCartsPage() {
    const authenticatedFetch = useAuthenticatedFetch()
    const knownCartIds = useRef<Set<string>>(new Set())
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [newCartAlert, setNewCartAlert] = useState<AbandonedCart | null>(null)

    useEffect(() => {
        // Cash register sound
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3")
    }, [])

    const fetchCarts = async () => {
        setLoading(true)
        try {
            const response = await authenticatedFetch('/api/abandoned-carts')
            if (response.ok) {
                const data = await response.json()
                const currentCarts: AbandonedCart[] = data.carts

                // Check for new carts
                if (knownCartIds.current.size > 0) {
                    const newCarts = currentCarts.filter((c: AbandonedCart) => !knownCartIds.current.has(c.id))
                    if (newCarts.length > 0) {
                        const latestCart = newCarts[0]
                        setNewCartAlert(latestCart)

                        // Play sound
                        if (audioRef.current) {
                            audioRef.current.currentTime = 0
                            audioRef.current.play().catch(e => console.log("Audio play failed", e))
                        }

                        // Auto hide after 8 seconds
                        setTimeout(() => setNewCartAlert(null), 8000)
                    }
                }

                // Update known IDs
                const newIds = new Set(currentCarts.map((c: AbandonedCart) => c.id))
                knownCartIds.current = newIds

                setCarts(currentCarts)
            }
        } catch (error) {
            console.error('Failed to fetch carts:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchSettings = async () => {
        try {
            const response = await authenticatedFetch('/api/marketing/settings')
            if (response.ok) {
                const data = await response.json()
                setExitIntentEnabled(data.exitIntentEnabled)
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
        } finally {
            setSettingsLoading(false)
        }
    }

    const toggleExitIntent = async (checked: boolean) => {
        setExitIntentEnabled(checked)
        try {
            await authenticatedFetch('/api/marketing/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exitIntentEnabled: checked })
            })
        } catch (error) {
            console.error('Failed to save settings:', error)
            // Revert on error
            setExitIntentEnabled(!checked)
        }
    }

    useEffect(() => {
        fetchCarts()
        fetchSettings()
        // Auto-refresh every 30 seconds to show "real-time" updates
        const interval = setInterval(fetchCarts, 30000)
        return () => clearInterval(interval)
    }, [authenticatedFetch])

    return (
        <div className="min-h-screen bg-gray-50 p-8 relative">
            {/* Notification Alert */}
            {newCartAlert && (
                <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-right-full duration-500">
                    <Card className="w-96 shadow-2xl border-l-4 border-l-emerald-500 bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-emerald-100 p-3 rounded-full animate-bounce">
                                    <ShoppingBag className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 flex items-center justify-between">
                                        Neuer Warenkorb!
                                        <span className="text-xs font-normal text-gray-500">Gerade eben</span>
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Ein Kunde hat Waren im Wert von <span className="font-bold text-emerald-600">{Number(newCartAlert.totalPrice).toLocaleString('de-DE', { style: 'currency', currency: newCartAlert.currency || 'EUR' })}</span> zurückgelassen.
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setNewCartAlert(null)}>
                                            Ausblenden
                                        </Button>
                                        <Button size="sm" className="w-full text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => window.open(newCartAlert.cartUrl, '_blank')}>
                                            Ansehen
                                        </Button>
                                    </div>
                                </div>
                                <button onClick={() => setNewCartAlert(null)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-2">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Zurück zum Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-lg">
                                <ShoppingBag className="w-8 h-8 text-emerald-600" />
                            </div>
                            Warenkorb Wiederherstellung
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Verfolgen Sie verlorene Warenkörbe in Echtzeit und sehen Sie, welche gerettet wurden.
                        </p>
                    </div>
                    <Button onClick={fetchCarts} variant="outline" className="flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Aktualisieren
                    </Button>
                </div>

                {/* Settings Card */}
                <Card className="mb-8 border-emerald-100 bg-emerald-50/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="font-medium text-emerald-900">Exit-Intent Popup</h3>
                                <p className="text-sm text-emerald-700">
                                    Zeigt Besuchern ein Popup mit Rabattcode, wenn sie versuchen, die Seite zu verlassen.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="exit-intent-mode"
                                    checked={exitIntentEnabled}
                                    onCheckedChange={toggleExitIntent}
                                    disabled={settingsLoading}
                                />
                                <Label htmlFor="exit-intent-mode" className="text-emerald-900 font-medium">
                                    {exitIntentEnabled ? 'Aktiviert' : 'Deaktiviert'}
                                </Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* ... existing stats cards ... */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Gefundene Warenkörbe</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{carts.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">E-Mails gesendet</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {carts.filter(c => c.recoverySent).length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Gerettet (Recovered)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {carts.filter(c => c.isRecovered).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Carts List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Aktuelle Warenkörbe</CardTitle>
                        <CardDescription>Liste aller erfassten abgebrochenen Checkouts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && carts.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                                <p className="text-gray-500">Lade Daten...</p>
                            </div>
                        ) : carts.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">Keine abgebrochenen Warenkörbe</h3>
                                <p className="text-gray-500 mt-1">Sobald ein Kunde den Checkout verlässt, erscheint er hier.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3">Kunde / E-Mail</th>
                                            <th className="px-6 py-3">Warenkorb</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Zeitpunkt</th>
                                            <th className="px-6 py-3">Aktion</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {carts.map((cart) => (
                                            <tr key={cart.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-blue-100 p-1.5 rounded-full">
                                                            <Mail className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        {cart.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium">
                                                        {Number(cart.totalPrice).toLocaleString('de-DE', { style: 'currency', currency: cart.currency || 'EUR' })}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {cart.lineItems && Array.isArray(cart.lineItems) ? (
                                                            <div className="flex flex-col gap-1">
                                                                {cart.lineItems.map((item: any, i: number) => (
                                                                    <span key={i} className="block truncate max-w-[250px]" title={item.title}>
                                                                        {item.quantity}x {item.title}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            'Details laden...'
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        {cart.isRecovered ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-fit">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Bestellt
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 w-fit">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                Offen
                                                            </span>
                                                        )}

                                                        {cart.recoverySent ? (
                                                            <span className="text-xs text-green-600 flex items-center mt-1">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                E-Mail gesendet
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 flex items-center mt-1">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                Wartet auf Cronjob
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {formatDistanceToNow(new Date(cart.updatedAt), { addSuffix: true, locale: de })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <a
                                                        href={cart.cartUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                    >
                                                        Ansehen <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
