
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Search, Mail, User, ShoppingBag, Key, MessageSquare, Send } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export default function SupportPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedResult, setSelectedResult] = useState<any>(null)
    const [replyText, setReplyText] = useState('')

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setLoading(true)
        setSelectedResult(null)
        try {
            const res = await fetch(`/api/support/search?query=${encodeURIComponent(query)}`)
            const data = await res.json()
            if (data.success) {
                setResults(data.data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSendReply = async () => {
        if (!selectedResult?.customer?.email || !replyText.trim()) return

        setLoading(true)
        try {
            const res = await fetch('/api/support/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: selectedResult.customer.email,
                    subject: `Re: Bestellung ${selectedResult.order?.orderNumber || ''}`,
                    content: replyText
                })
            })

            if (res.ok) {
                alert('E-Mail erfolgreich gesendet!')
                setReplyText('')
            } else {
                alert('Fehler beim Senden der E-Mail.')
            }
        } catch (error) {
            console.error(error)
            alert('Ein Fehler ist aufgetreten.')
        } finally {
            setLoading(false)
        }
    }

    const handleAiGenerate = () => {
        // Simulation of AI generation
        const templates = [
            "Sehr geehrter Kunde,\n\nvielen Dank für Ihre Nachricht. Wir haben Ihre Anfrage geprüft und können Ihnen mitteilen, dass...\n\nMit freundlichen Grüßen,\nIhr Support-Team",
            "Hallo,\n\nentschuldigen Sie bitte die Unannehmlichkeiten. Wir haben das Problem identifiziert und...\n\nBeste Grüße",
            "Guten Tag,\n\nvielen Dank für Ihren Einkauf. Hier sind weitere Informationen zu Ihrer Bestellung...\n\nViele Grüße"
        ]
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)]
        setReplyText(randomTemplate)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                        Kundensupport
                    </h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search Section */}
                <div className="max-w-2xl mx-auto mb-8">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder="Bestellnummer, E-Mail oder Key suchen..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={loading}>
                            <Search className="w-4 h-4 mr-2" />
                            {loading ? 'Sucht...' : 'Suchen'}
                        </Button>
                    </form>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Results List */}
                    <div className="lg:col-span-1 space-y-4">
                        {results.length > 0 && <h3 className="font-medium text-gray-500 mb-2">Suchergebnisse</h3>}
                        {results.map((result, i) => (
                            <Card
                                key={i}
                                className={`cursor-pointer hover:border-blue-300 transition-colors ${selectedResult === result ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                                onClick={() => setSelectedResult(result)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-gray-900">
                                                {result.order ? `Bestellung ${result.order.orderNumber}` : 'Unbekannte Bestellung'}
                                            </p>
                                            <p className="text-sm text-gray-500">{result.customer?.name || result.customer?.email || 'Gast'}</p>
                                        </div>
                                        {result.order && (
                                            <Badge variant="outline">{result.order.shopifyOrderId}</Badge>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        {result.keys?.length || 0} Keys gefunden
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {results.length === 0 && !loading && query && (
                            <div className="text-center text-gray-500 py-8">Keine Ergebnisse gefunden</div>
                        )}
                    </div>

                    {/* Detail View */}
                    <div className="lg:col-span-2">
                        {selectedResult ? (
                            <div className="space-y-6">
                                {/* Customer & Order Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="w-5 h-5" />
                                            Kundeninformationen
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500">Name</label>
                                            <p className="font-medium">{selectedResult.customer?.name || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">E-Mail</label>
                                            <p className="font-medium">{selectedResult.customer?.email || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Bestelldatum</label>
                                            <p className="font-medium">
                                                {selectedResult.order?.orderDate ? new Date(selectedResult.order.orderDate).toLocaleDateString() : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Shopify ID</label>
                                            <p className="font-medium">{selectedResult.order?.shopifyOrderId || '-'}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Keys Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Key className="w-5 h-5" />
                                            Gekaufte Keys & Status
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedResult.keys && selectedResult.keys.length > 0 ? (
                                            <div className="space-y-4">
                                                {selectedResult.keys.map((key: any, k: number) => (
                                                    <div key={k} className="border rounded-lg p-3 bg-gray-50">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-bold text-sm">{key.digitalProduct?.title}</span>
                                                            {key.isUsed ? (
                                                                <Badge className="bg-green-600">Aktiviert / Versendet</Badge>
                                                            ) : (
                                                                <Badge variant="secondary">Noch nicht versendet</Badge>
                                                            )}
                                                        </div>
                                                        <code className="block bg-white p-2 rounded border font-mono text-sm mb-2">
                                                            {key.key}
                                                        </code>
                                                        <div className="text-xs text-gray-500">
                                                            Versendet am: {key.usedAt ? new Date(key.usedAt).toLocaleString() : '-'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">Keine Keys für diese Bestellung gefunden.</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Reply Section */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Mail className="w-5 h-5" />
                                            Antwort senden
                                        </CardTitle>
                                        <CardDescription>
                                            Senden Sie eine E-Mail direkt an den Kunden.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            <Button variant="outline" size="sm" onClick={() => setReplyText("Hallo,\n\nhier ist Ihr Key noch einmal:\n[KEY]\n\nViele Grüße")}>
                                                Vorlage: Key erneut senden
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setReplyText("Hallo,\n\nbitte prüfen Sie Ihren Spam-Ordner.\n\nViele Grüße")}>
                                                Vorlage: Spam prüfen
                                            </Button>
                                            <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 bg-purple-50" onClick={handleAiGenerate}>
                                                ✨ AI Antwort generieren
                                            </Button>
                                        </div>
                                        <Textarea
                                            placeholder="Ihre Nachricht an den Kunden..."
                                            className="min-h-[150px]"
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                        />
                                        <div className="flex justify-end">
                                            <Button onClick={handleSendReply}>
                                                <Send className="w-4 h-4 mr-2" />
                                                Senden
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg p-12">
                                Wählen Sie eine Bestellung aus, um Details zu sehen.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
