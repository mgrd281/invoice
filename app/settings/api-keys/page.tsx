'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, RefreshCw, Copy, Check, ShieldCheck, Key } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ApiKey {
    id: string
    name: string
    key: string
    lastUsedAt: string | null
    createdAt: string
}

export default function ApiKeysPage() {
    const [masterKey, setMasterKey] = useState<ApiKey | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [copied, setCopied] = useState(false)
    const { showToast, ToastContainer } = useToast()

    useEffect(() => {
        loadKeys()
    }, [])

    const loadKeys = async () => {
        try {
            const response = await fetch('/api/settings/api-keys')
            if (response.ok) {
                const data = await response.json()
                // Take the first key as Master Key or null
                if (data.length > 0) {
                    setMasterKey(data[0])
                } else {
                    setMasterKey(null)
                }
            }
        } catch (error) {
            console.error('Error loading API keys:', error)
            showToast('Laden fehlgeschlagen', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateKey = async () => {
        setProcessing(true)
        try {
            // First, delete existing keys if any (to enforce "One Key" policy roughly)
            // But for now, we just create a new one and set it as master
            const response = await fetch('/api/settings/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Master Key' })
            })

            if (response.ok) {
                const data = await response.json()
                setMasterKey(data)
                showToast('Master Key erstellt', 'success')
            } else {
                throw new Error('Failed')
            }
        } catch (error) {
            console.error('Error creating key:', error)
            showToast('Erstellung fehlgeschlagen', 'error')
        } finally {
            setProcessing(false)
        }
    }

    const handleRegenerateKey = async () => {
        if (!masterKey) return
        if (!confirm('Sind Sie sicher? Der alte Schlüssel wird sofort ungültig. Alle verbundenen Dienste verlieren den Zugriff.')) return

        setProcessing(true)
        try {
            // Delete old key
            await fetch(`/api/settings/api-keys/${masterKey.id}`, { method: 'DELETE' })

            // Create new key
            const response = await fetch('/api/settings/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Master Key' })
            })

            if (response.ok) {
                const data = await response.json()
                setMasterKey(data)
                showToast('Master Key neu generiert', 'success')
            }
        } catch (error) {
            console.error('Error regenerating key:', error)
            showToast('Fehler beim Neugenerieren', 'error')
        } finally {
            setProcessing(false)
        }
    }

    const copyToClipboard = () => {
        if (masterKey?.key) {
            navigator.clipboard.writeText(masterKey.key)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            showToast('In die Zwischenablage kopiert', 'success')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="mr-4">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Zurück
                                </Button>
                            </Link>
                            <div className="p-2 bg-indigo-50 rounded-lg mr-4">
                                <Key className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Master API Key</h1>
                                <p className="text-sm text-gray-500">Unbeschränkter Zugriff auf alle Ihre Daten</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <Alert className="bg-blue-50 border-blue-200">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Universeller Zugriff</AlertTitle>
                    <AlertDescription className="text-blue-700">
                        Dieser Master Key gewährt externen Anwendungen **vollen Zugriff** auf alle Ihre Daten. Geben Sie ihn nur an vertrauenswürdige Parteien weiter.
                    </AlertDescription>
                </Alert>

                <Card className="border-indigo-100 shadow-md overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-50">
                        <CardTitle className="text-indigo-900">Ihr Master Key</CardTitle>
                        <CardDescription>
                            Verwenden Sie diesen Schlüssel zur Authentifizierung Ihrer Anfragen.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                            </div>
                        ) : !masterKey ? (
                            <div className="text-center py-8">
                                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Key className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Kein aktiver Schlüssel</h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                    Generieren Sie einen Master Key, um externen Zugriff zu ermöglichen.
                                </p>
                                <Button
                                    onClick={handleGenerateKey}
                                    disabled={processing}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                                    Master Key generieren
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                        API Access Token
                                    </Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                readOnly
                                                value={masterKey.key}
                                                className="font-mono text-lg bg-gray-50 border-gray-200 h-12 pr-12 text-gray-700"
                                            />
                                            <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                                                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={copyToClipboard}
                                            className="h-12 w-12 shrink-0"
                                            size="icon"
                                            variant="outline"
                                        >
                                            {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Erstellt am {new Date(masterKey.createdAt).toLocaleDateString()}
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                                    <div className="text-sm text-gray-500">
                                        <p>Benötigen Sie einen neuen Schlüssel?</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={handleRegenerateKey}
                                        disabled={processing}
                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                        Neu generieren
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {masterKey && (
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Dokumentation</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-gray-600 space-y-2">
                                <p>Nutzen Sie den Header <code>x-api-key</code> für alle Anfragen.</p>
                                <div className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                                    curl -H "x-api-key: {masterKey.key.substring(0, 8)}..." https://api.example.com/v1/orders
                                </div>
                                <div className="pt-2">
                                    <Link href="/api/docs" className="text-indigo-600 hover:underline font-medium">
                                        Zur vollständigen Dokumentation &rarr;
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <Check className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">Aktiv</div>
                                        <div className="text-sm text-gray-500">
                                            Zuletzt genutzt: {masterKey.lastUsedAt ? new Date(masterKey.lastUsedAt).toLocaleString() : 'Noch nie'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <ToastContainer />
            </main>
        </div>
    )
}
