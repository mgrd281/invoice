'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Mail, Clock, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export default function PaymentRemindersSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { showToast, ToastContainer } = useToast()

    const [vorkasse, setVorkasse] = useState<any>({})
    const [rechnung, setRechnung] = useState<any>({})

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/settings/payment-reminders')
            if (res.ok) {
                const data = await res.json()
                setVorkasse(data.vorkasse || {})
                setRechnung(data.rechnung || {})
            }
        } catch (error) {
            console.error('Failed to load settings', error)
            showToast('Fehler beim Laden der Einstellungen', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/settings/payment-reminders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vorkasse,
                    rechnung
                })
            })

            if (res.ok) {
                showToast('Einstellungen erfolgreich gespeichert', 'success')
            } else {
                throw new Error('Failed to save')
            }
        } catch (error) {
            console.error('Failed to save settings', error)
            showToast('Fehler beim Speichern', 'error')
        } finally {
            setSaving(false)
        }
    }

    const SettingsForm = ({ data, setData, type }: { data: any, setData: (d: any) => void, type: 'vorkasse' | 'rechnung' }) => (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Aktivierung
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Automatische Erinnerungen aktivieren</Label>
                            <p className="text-sm text-muted-foreground">
                                Schaltet das gesamte Erinnerungssystem für {type === 'vorkasse' ? 'Vorkasse' : 'Rechnung'} ein oder aus.
                            </p>
                        </div>
                        <Switch
                            checked={data.enabled ?? true}
                            onCheckedChange={(checked) => setData({ ...data, enabled: checked })}
                        />
                    </div>
                </CardContent>
            </Card>

            {type === 'rechnung' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-600" />
                            Initiale E-Mail (Sofort nach Bestellung)
                        </CardTitle>
                        <CardDescription>
                            Wird ca. 3 Minuten nach Eingang der Bestellung gesendet.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Betreff</Label>
                            <Input
                                value={data.initialEmailSubject || ''}
                                onChange={(e) => setData({ ...data, initialEmailSubject: e.target.value })}
                                placeholder="Rechnung für Ihre Bestellung..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Inhalt</Label>
                            <Textarea
                                value={data.initialEmailText || ''}
                                onChange={(e) => setData({ ...data, initialEmailText: e.target.value })}
                                className="min-h-[150px] font-mono text-sm"
                                placeholder="Sehr geehrte Damen und Herren..."
                            />
                            <p className="text-xs text-muted-foreground">Verfügbare Variablen: keine (aktuell statisch)</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        1. Erinnerung (Zahlungserinnerung)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tage nach Bestellung (Werktage)</Label>
                            <Input
                                type="number"
                                value={data.reminder1Days || 3}
                                onChange={(e) => setData({ ...data, reminder1Days: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Betreff</Label>
                        <Input
                            value={data.reminder1Subject || ''}
                            onChange={(e) => setData({ ...data, reminder1Subject: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Inhalt</Label>
                        <Textarea
                            value={data.reminder1Text || ''}
                            onChange={(e) => setData({ ...data, reminder1Text: e.target.value })}
                            className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">Variable: {'{orderNumber}'}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        2. Erinnerung (Letzte Mahnung)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tage nach Bestellung (Werktage)</Label>
                            <Input
                                type="number"
                                value={data.reminder2Days || 10}
                                onChange={(e) => setData({ ...data, reminder2Days: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Betreff</Label>
                        <Input
                            value={data.reminder2Subject || ''}
                            onChange={(e) => setData({ ...data, reminder2Subject: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Inhalt</Label>
                        <Textarea
                            value={data.reminder2Text || ''}
                            onChange={(e) => setData({ ...data, reminder2Text: e.target.value })}
                            className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">Variable: {'{orderNumber}'}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        Automatische Stornierung
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tage nach Bestellung (Werktage)</Label>
                            <Input
                                type="number"
                                value={data.cancellationDays || 14}
                                onChange={(e) => setData({ ...data, cancellationDays: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Betreff (Storno-E-Mail)</Label>
                        <Input
                            value={data.cancellationSubject || ''}
                            onChange={(e) => setData({ ...data, cancellationSubject: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Inhalt (Storno-E-Mail)</Label>
                        <Textarea
                            value={data.cancellationText || ''}
                            onChange={(e) => setData({ ...data, cancellationText: e.target.value })}
                            className="min-h-[100px]"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <Link href="/settings">
                                <Button variant="ghost" size="sm" className="mr-4">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Zurück
                                </Button>
                            </Link>
                            <h1 className="text-xl font-bold text-gray-900">
                                Zahlungserinnerungen (Vorkasse & Rechnung)
                            </h1>
                        </div>
                        <Button onClick={handleSave} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Speichern...' : 'Speichern'}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs defaultValue="rechnung" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="rechnung">Rechnung (Kauf auf Rechnung)</TabsTrigger>
                        <TabsTrigger value="vorkasse">Vorkasse (Banküberweisung)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="rechnung">
                        <SettingsForm data={rechnung} setData={setRechnung} type="rechnung" />
                    </TabsContent>

                    <TabsContent value="vorkasse">
                        <SettingsForm data={vorkasse} setData={setVorkasse} type="vorkasse" />
                    </TabsContent>
                </Tabs>
            </main>

            <ToastContainer />
        </div>
    )
}
