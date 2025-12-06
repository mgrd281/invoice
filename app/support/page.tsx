'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Search, Mail, User, ShoppingBag, Key, MessageSquare, Send, Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SupportPage() {
    const [activeTab, setActiveTab] = useState('search')
    const [templates, setTemplates] = useState<any[]>([])
    const [tickets, setTickets] = useState<any[]>([])
    const [newTemplate, setNewTemplate] = useState({ title: '', content: '', keywords: '' })

    // Search State
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedResult, setSelectedResult] = useState<any>(null)
    const [replyText, setReplyText] = useState('')

    // Load templates and tickets on mount
    useEffect(() => {
        loadTemplates()
        loadTickets()
    }, [])

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
        const templates = [
            "Sehr geehrter Kunde,\n\nvielen Dank für Ihre Nachricht. Wir haben Ihre Anfrage geprüft und können Ihnen mitteilen, dass...\n\nMit freundlichen Grüßen,\nIhr Support-Team",
            "Hallo,\n\nentschuldigen Sie bitte die Unannehmlichkeiten. Wir haben das Problem identifiziert und...\n\nBeste Grüße",
            "Guten Tag,\n\nvielen Dank für Ihren Einkauf. Hier sind weitere Informationen zu Ihrer Bestellung...\n\nViele Grüße"
        ]
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)]
        setReplyText(randomTemplate)
    }

    const loadTemplates = async () => {
        try {
            const res = await fetch('/api/support/templates')
            const json = await res.json()
            if (json.success) setTemplates(json.data)
        } catch (e) { console.error(e) }
    }

    const loadTickets = async () => {
        try {
            const res = await fetch('/api/support/tickets')
            const json = await res.json()
            if (json.success) setTickets(json.data)
        } catch (e) { console.error(e) }
    }

    const handleSaveTemplate = async () => {
        if (!newTemplate.title || !newTemplate.content) return
        try {
            await fetch('/api/support/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTemplate)
            })
            setNewTemplate({ title: '', content: '', keywords: '' })
            loadTemplates()
            alert('Vorlage gespeichert!')
        } catch (e) { alert('Fehler beim Speichern') }
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Wirklich löschen?')) return
        try {
            await fetch(`/api/support/templates?id=${id}`, { method: 'DELETE' })
            loadTemplates()
        } catch (e) { alert('Fehler beim Löschen') }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                        Kundensupport Center
                    </h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="search">🔍 Suche & Manuell</TabsTrigger>
                        <TabsTrigger value="tickets">📩 Posteingang ({tickets.length})</TabsTrigger>
                        <TabsTrigger value="settings">⚙️ Automatische Antworten</TabsTrigger>
                    </TabsList>

                    <TabsContent value="search">
                        {/* Search Section (Existing Code) */}
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
                                                    {templates.map(t => (
                                                        <Button key={t.id} variant="outline" size="sm" onClick={() => setReplyText(t.content)}>
                                                            {t.title}
                                                        </Button>
                                                    ))}
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
                    </TabsContent>

                    <TabsContent value="tickets" className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Posteingang</h2>
                                <p className="text-sm text-gray-500">Verwalten Sie hier alle eingehenden Kundenanfragen.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={loadTickets}>
                                🔄 Aktualisieren
                            </Button>
                        </div>

                        {tickets.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Keine Nachrichten vorhanden</p>
                                <p className="text-sm text-gray-400">Neue E-Mails erscheinen hier automatisch.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tickets.map((ticket, i) => (
                                    <div key={i} className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                                        {/* Ticket Header */}
                                        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                    {ticket.customerEmail?.substring(0, 2).toUpperCase() || 'KD'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 leading-tight">{ticket.subject || 'Kein Betreff'}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded border">{ticket.customerEmail}</span>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleString('de-DE')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant={ticket.status === 'OPEN' ? 'default' : 'secondary'} className={ticket.status === 'OPEN' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                {ticket.status}
                                            </Badge>
                                        </div>

                                        {/* Conversation View */}
                                        <div className="p-4 space-y-4 bg-white">
                                            {/* Customer Message */}
                                            {ticket.messages[0] && (
                                                <div className="flex gap-3">
                                                    <div className="flex-1">
                                                        <div className="bg-gray-50 text-gray-800 p-3.5 rounded-2xl rounded-tl-none inline-block max-w-[90%] text-sm leading-relaxed whitespace-pre-wrap border border-gray-100">
                                                            {ticket.messages[0].content}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Auto-Reply or System Messages */}
                                            {ticket.messages.slice(1).map((msg: any, m: number) => (
                                                <div key={m} className="flex gap-3 justify-end">
                                                    <div className="flex-1 flex justify-end">
                                                        <div className="bg-blue-50 text-blue-900 p-3.5 rounded-2xl rounded-tr-none inline-block max-w-[90%] text-sm leading-relaxed border border-blue-100 shadow-sm">
                                                            <div className="flex items-center gap-2 mb-1 text-xs font-bold text-blue-700 uppercase tracking-wider">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                                Automatische Antwort
                                                            </div>
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Quick Actions Footer */}
                                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                                                Archivieren
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => {
                                                setActiveTab('search')
                                                setQuery(ticket.customerEmail)
                                            }}>
                                                Antworten & Details
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="settings">
                        <div className="grid gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Neue Auto-Reply Regel erstellen</CardTitle>
                                    <CardDescription>
                                        Wenn eine E-Mail diese Schlüsselwörter enthält, wird automatisch die Antwort gesendet.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4">
                                        <div>
                                            <label className="text-sm font-medium">Titel (Intern)</label>
                                            <Input
                                                placeholder="z.B. Rückerstattung Info"
                                                value={newTemplate.title}
                                                onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Schlüsselwörter (kommagetrennt)</label>
                                            <Input
                                                placeholder="z.B. rückerstattung, refund, geld zurück"
                                                value={newTemplate.keywords}
                                                onChange={e => setNewTemplate({ ...newTemplate, keywords: e.target.value })}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Wichtig: Trennen Sie einzelne Begriffe mit einem Komma. Beispiel: "key, code, schlüssel".
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Antwort-Text</label>
                                            <Textarea
                                                placeholder="Sehr geehrter Kunde..."
                                                className="min-h-[150px]"
                                                value={newTemplate.content}
                                                onChange={e => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                            />
                                        </div>
                                        <Button onClick={handleSaveTemplate}>Regel Speichern</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Aktive Regeln & Vorlagen</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {templates.map((t, i) => (
                                            <div key={i} className="flex justify-between items-start border p-4 rounded-lg">
                                                <div>
                                                    <h4 className="font-bold">{t.title}</h4>
                                                    {t.autoReplyKeywords && (
                                                        <div className="flex gap-1 mt-1 flex-wrap">
                                                            {t.autoReplyKeywords.split(',').map((k: string, j: number) => (
                                                                <Badge key={j} variant="secondary" className="text-xs">{k.trim()}</Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{t.content}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(t.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
