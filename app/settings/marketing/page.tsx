'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Gift, Save, Loader2, History, Mail } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface MarketingSettings {
    fpdEnabled: boolean
    fpdPercentage: number
    fpdValidityDays: number
    fpdEmailSubject: string
    fpdEmailBody: string
}

interface DiscountHistoryItem {
    id: string
    name: string
    email: string
    firstPurchaseDiscountCode: string
    firstPurchaseDiscountSentAt: string
}

export default function MarketingSettingsPage() {
    const [settings, setSettings] = useState<MarketingSettings>({
        fpdEnabled: false,
        fpdPercentage: 10,
        fpdValidityDays: 30,
        fpdEmailSubject: '',
        fpdEmailBody: ''
    })
    const [history, setHistory] = useState<DiscountHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { showToast, ToastContainer } = useToast()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [settingsRes, historyRes] = await Promise.all([
                fetch('/api/settings/marketing'),
                fetch('/api/settings/marketing/history')
            ])

            if (settingsRes.ok) {
                setSettings(await settingsRes.json())
            }
            if (historyRes.ok) {
                setHistory(await historyRes.json())
            }
        } catch (error) {
            console.error('Error loading marketing data:', error)
            showToast('Fehler beim Laden der Daten', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const response = await fetch('/api/settings/marketing', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })

            if (!response.ok) throw new Error('Failed to save')

            showToast('Einstellungen erfolgreich gespeichert', 'success')
        } catch (error) {
            console.error('Error saving settings:', error)
            showToast('Fehler beim Speichern', 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto p-6 flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Link href="/settings">
                                <Button variant="ghost" size="sm" className="mr-4">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Zurück
                                </Button>
                            </Link>
                            <Gift className="h-8 w-8 text-pink-600 mr-3" />
                            <h1 className="text-2xl font-bold text-gray-900">
                                Marketing & Automatisierung
                            </h1>
                        </div>
                        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Speichern
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Automation Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Gift className="h-5 w-5 mr-2 text-pink-600" />
                            Erstkauf-Rabatt (10%)
                        </CardTitle>
                        <CardDescription>
                            Senden Sie automatisch einen Rabattcode an Kunden nach ihrem ersten Kauf.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div className="space-y-0.5">
                                <Label className="text-base">Automatisierung aktivieren</Label>
                                <p className="text-sm text-muted-foreground">
                                    Wenn aktiviert, erhalten Neukunden nach dem ersten Kauf (Status "Paid") automatisch einen Rabattcode.
                                </p>
                            </div>
                            <Switch
                                checked={settings.fpdEnabled}
                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, fpdEnabled: checked }))}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Rabattwert (%)</Label>
                                <Input
                                    type="number"
                                    value={settings.fpdPercentage}
                                    onChange={(e) => setSettings(prev => ({ ...prev, fpdPercentage: parseInt(e.target.value) || 10 }))}
                                    min="1"
                                    max="100"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Gültigkeitsdauer (Tage)</Label>
                                <Input
                                    type="number"
                                    value={settings.fpdValidityDays}
                                    onChange={(e) => setSettings(prev => ({ ...prev, fpdValidityDays: parseInt(e.target.value) || 30 }))}
                                    min="1"
                                    max="365"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Template */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Mail className="h-5 w-5 mr-2 text-blue-600" />
                            E-Mail Vorlage
                        </CardTitle>
                        <CardDescription>
                            Passen Sie den Inhalt der E-Mail an, die an Ihre Kunden gesendet wird.
                            Verfügbare Platzhalter: {'{{ customer_name }}'}, {'{{ discount_code }}'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Betreff</Label>
                            <Input
                                value={settings.fpdEmailSubject}
                                onChange={(e) => setSettings(prev => ({ ...prev, fpdEmailSubject: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nachricht</Label>
                            <Textarea
                                value={settings.fpdEmailBody}
                                onChange={(e) => setSettings(prev => ({ ...prev, fpdEmailBody: e.target.value }))}
                                className="min-h-[200px] font-mono text-sm"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <History className="h-5 w-5 mr-2 text-gray-600" />
                            Versandhistorie
                        </CardTitle>
                        <CardDescription>
                            Die letzten 50 versendeten Rabattcodes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="p-4">Datum</th>
                                        <th className="p-4">Kunde</th>
                                        <th className="p-4">Code</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-gray-500">
                                                Noch keine Rabattcodes versendet.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((item) => (
                                            <tr key={item.id}>
                                                <td className="p-4">
                                                    {format(new Date(item.firstPurchaseDiscountSentAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-gray-500 text-xs">{item.email}</div>
                                                </td>
                                                <td className="p-4 font-mono">{item.firstPurchaseDiscountCode}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <ToastContainer />
        </div>
    )
}
