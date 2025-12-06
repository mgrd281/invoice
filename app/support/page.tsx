'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Search, Mail, User, ShoppingBag, Key, MessageSquare, Send, Trash2, Sparkles, Plus, RefreshCw, Clock, Archive, Reply, Bot, Edit, X, Check, AlertCircle } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SupportPage() {
    const [activeTab, setActiveTab] = useState('search')
    const [templates, setTemplates] = useState<any[]>([])
    const [tickets, setTickets] = useState<any[]>([])
    const [newTemplate, setNewTemplate] = useState({ title: '', content: '', keywords: '' })
    const [editingId, setEditingId] = useState<string | null>(null)

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
            if (editingId) {
                // Update existing
                await fetch('/api/support/templates', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...newTemplate, id: editingId })
                })
                alert('Vorlage aktualisiert!')
            } else {
                // Create new
                await fetch('/api/support/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTemplate)
                })
                alert('Vorlage gespeichert!')
            }
            setNewTemplate({ title: '', content: '', keywords: '' })
            setEditingId(null)
            loadTemplates()
        } catch (e) { alert('Fehler beim Speichern') }
    }

    const handleEditTemplate = (template: any) => {
        setNewTemplate({
            title: template.title,
            content: template.content,
            keywords: template.autoReplyKeywords || ''
        })
        setEditingId(template.id)
    }

    const handleCancelEdit = () => {
        setNewTemplate({ title: '', content: '', keywords: '' })
        setEditingId(null)
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Wirklich löschen?')) return
        try {
            await fetch(`/api/support/templates?id=${id}`, { method: 'DELETE' })
            loadTemplates()
        } catch (e) { alert('Fehler beim Löschen') }
    }

    const handleDeleteTicket = async (id: string) => {
        if (!confirm('Möchten Sie dieses Ticket wirklich löschen?')) return

        try {
            const res = await fetch(`/api/support/tickets/${id}`, { method: 'DELETE' })
            if (res.ok) {
                setTickets(tickets.filter(t => t.id !== id))
            } else {
                alert('Fehler beim Löschen.')
            }
        } catch (error) {
            console.error(error)
            alert('Ein Fehler ist aufgetreten.')
        }
    }

    const handleUpdateTicket = async (id: string, updates: any) => {
        try {
            const res = await fetch(`/api/support/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            })
            if (res.ok) {
                loadTickets()
            } else {
                alert('Fehler beim Aktualisieren.')
            }
        } catch (error) {
            console.error(error)
            alert('Ein Fehler ist aufgetreten.')
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                    <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Kundensupport Center</h1>
                    <p className="text-gray-500 font-medium">Verwalten Sie Anfragen und Bestellungen an einem Ort</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-white p-1 border border-gray-200 rounded-xl shadow-sm inline-flex h-auto">
                    <TabsTrigger value="search" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-medium transition-all">
                        <Search className="w-4 h-4 mr-2" />
                        Suche & Manuell
                    </TabsTrigger>
                    <TabsTrigger value="tickets" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-medium transition-all">
                        <Mail className="w-4 h-4 mr-2" />
                        Posteingang
                        {tickets.length > 0 && (
                            <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                {tickets.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-medium transition-all">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Automatische Antworten
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="search">
                    {/* Search Section */}
                    <div className="max-w-2xl mx-auto mb-8">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <Input
                                placeholder="Bestellnummer, E-Mail oder Key suchen..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="h-12 text-lg shadow-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                            />
                            <Button type="submit" disabled={loading} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-200 transition-all">
                                {loading ? 'Suchen...' : <><Search className="w-4 h-4 mr-2" /> Suchen</>}
                            </Button>
                        </form>
                    </div>

                    {/* Results Display */}
                    {results.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* List of Results */}
                            <div className="md:col-span-1 space-y-4">
                                {results.map((result, index) => (
                                    <Card
                                        key={index}
                                        className={`cursor-pointer transition-all hover:shadow-md border-transparent ${selectedResult === result ? 'ring-2 ring-blue-500 shadow-md bg-blue-50/50' : 'hover:bg-white bg-white/80'}`}
                                        onClick={() => setSelectedResult(result)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                    {result.type === 'order' ? <ShoppingBag className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{result.order?.orderNumber || result.key}</p>
                                                    <p className="text-xs text-gray-500">{new Date(result.order?.createdAt || new Date()).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 truncate">{result.customer?.email}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Detail View & Reply */}
                            <div className="md:col-span-2 space-y-6">
                                {selectedResult ? (
                                    <>
                                        <Card className="border-none shadow-sm bg-white">
                                            <CardHeader className="pb-3 border-b border-gray-50">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <User className="w-5 h-5 text-gray-400" />
                                                    Kundeninformationen
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">Name</p>
                                                    <p className="font-medium">{selectedResult.customer?.name || 'Unbekannt'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">E-Mail</p>
                                                    <p className="font-medium">{selectedResult.customer?.email || 'Keine E-Mail'}</p>
                                                </div>
                                                {selectedResult.keys && (
                                                    <div className="col-span-2 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                        <p className="text-sm font-medium text-gray-500 mb-2">Lizenzschlüssel:</p>
                                                        {selectedResult.keys.map((k: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center text-sm font-mono bg-white p-2 rounded border border-gray-200 mb-1 last:mb-0">
                                                                <span>{k.key}</span>
                                                                <Badge variant={k.isUsed ? 'destructive' : 'outline'} className={k.isUsed ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}>
                                                                    {k.isUsed ? 'Benutzt' : 'Aktiv'}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card className="border-none shadow-sm bg-white">
                                            <CardHeader className="pb-3 border-b border-gray-50">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Send className="w-5 h-5 text-gray-400" />
                                                    Antwort senden
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4 space-y-4">
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    <Button variant="outline" size="sm" onClick={handleAiGenerate} className="bg-gradient-to-r from-purple-50 to-blue-50 border-blue-100 text-blue-700 hover:from-purple-100 hover:to-blue-100">
                                                        <Sparkles className="w-3 h-3 mr-2 text-purple-500" />
                                                        AI Antwort generieren
                                                    </Button>
                                                    {templates.map(t => (
                                                        <Button key={t.id} variant="ghost" size="sm" onClick={() => setReplyText(t.content)} className="whitespace-nowrap border border-gray-200 hover:bg-gray-50">
                                                            {t.title}
                                                        </Button>
                                                    ))}
                                                </div>
                                                <Textarea
                                                    placeholder="Schreiben Sie Ihre Antwort hier..."
                                                    className="min-h-[200px] p-4 text-base leading-relaxed border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl resize-none"
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                />
                                                <div className="flex justify-end">
                                                    <Button onClick={handleSendReply} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl shadow-md shadow-blue-200 transition-all">
                                                        {loading ? 'Sendet...' : 'Antwort senden'}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                        <Search className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="font-medium">Wählen Sie eine Bestellung aus, um Details zu sehen.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="tickets" className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Posteingang</h2>
                            <p className="text-gray-500 mt-1">Verwalten Sie Kundenanfragen und automatische Antworten.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={loadTickets} className="gap-2">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                Aktualisieren
                            </Button>
                        </div>
                    </div>

                    {tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Mail className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Alles erledigt!</h3>
                            <p className="text-gray-500 text-sm mt-1">Keine neuen Nachrichten im Posteingang.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {tickets.map((ticket, i) => (
                                <div key={i} className="group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden">
                                    {/* Ticket Header */}
                                    <div className="p-5 flex justify-between items-start gap-4">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 ${['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'][ticket.customerEmail?.length % 5]
                                                }`}>
                                                {ticket.customerEmail?.substring(0, 2).toUpperCase() || 'KD'}
                                            </div>

                                            {/* Info */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-gray-900 text-lg leading-tight">{ticket.subject || 'Kein Betreff'}</h4>
                                                    <Badge variant={ticket.status === 'OPEN' ? 'default' : 'secondary'} className={`uppercase text-[10px] tracking-wider font-bold ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600'}`}>
                                                        {ticket.status === 'OPEN' ? 'OFFEN' : ticket.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                                    <span className="font-medium text-gray-700">{ticket.customerEmail}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(ticket.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions (Visible on Hover) */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Bearbeiten">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Ticket bearbeiten</DialogTitle>
                                                        <DialogDescription>
                                                            Ändern Sie den Status oder den Betreff des Tickets.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="subject" className="text-right">
                                                                Betreff
                                                            </Label>
                                                            <Input
                                                                id="subject"
                                                                defaultValue={ticket.subject}
                                                                className="col-span-3"
                                                                onChange={(e) => handleUpdateTicket(ticket.id, { subject: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="status" className="text-right">
                                                                Status
                                                            </Label>
                                                            <Select defaultValue={ticket.status} onValueChange={(val) => handleUpdateTicket(ticket.id, { status: val })}>
                                                                <SelectTrigger className="col-span-3">
                                                                    <SelectValue placeholder="Status wählen" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="OPEN">Offen</SelectItem>
                                                                    <SelectItem value="CLOSED">Geschlossen</SelectItem>
                                                                    <SelectItem value="PENDING">Wartend</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDeleteTicket(ticket.id)}
                                                title="Löschen"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => {
                                                setActiveTab('search')
                                                setQuery(ticket.customerEmail)
                                            }}>
                                                <Reply className="w-4 h-4" />
                                                Antworten
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Conversation Thread */}
                                    <div className="bg-gray-50/50 border-t border-gray-100 p-5 space-y-4">
                                        {/* Customer Message */}
                                        {ticket.messages[0] && (
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                                                        {ticket.messages[0].content}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Auto-Reply */}
                                        {ticket.messages.slice(1).map((msg: any, m: number) => (
                                            <div key={m} className="flex gap-4 justify-end">
                                                <div className="flex-1 flex justify-end">
                                                    <div className="bg-blue-50/80 p-4 rounded-2xl rounded-tr-none border border-blue-100 text-blue-900 text-sm leading-relaxed max-w-[90%] shadow-sm">
                                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-100 pb-2">
                                                            <Bot className="w-3 h-3" />
                                                            Automatische Antwort
                                                        </div>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Automatische Antworten</h2>
                            <p className="text-gray-500 mt-1">Konfigurieren Sie intelligente Regeln für automatische E-Mail-Antworten.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column: Create New Rule */}
                        <div className="lg:col-span-7 space-y-6">
                            <Card className="border-none shadow-md bg-white overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Bot className="w-6 h-6 text-blue-100" />
                                        <h3 className="text-lg font-bold">{editingId ? 'Regel bearbeiten' : 'Neue Regel erstellen'}</h3>
                                    </div>
                                    <p className="text-blue-100 text-sm opacity-90">
                                        {editingId ? 'Passen Sie die bestehende Regel an.' : 'Definieren Sie Schlüsselwörter, auf die das System automatisch reagieren soll.'}
                                    </p>
                                </div>
                                <CardContent className="p-6 space-y-6">
                                    {/* Quick Templates */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Schnell-Vorlagen (Digitale Produkte)</label>
                                        <div className="flex gap-2 flex-wrap">
                                            <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100" onClick={() => setNewTemplate({
                                                title: 'Kein Lizenzschlüssel erhalten',
                                                keywords: 'key, schlüssel, code, nicht erhalten, fehlt',
                                                content: 'Guten Tag,\n\nvielen Dank für Ihre Nachricht. Ihr Lizenzschlüssel wurde automatisch an Ihre E-Mail-Adresse gesendet. Bitte prüfen Sie auch Ihren Spam-Ordner.\n\nFalls er dort nicht zu finden ist, senden wir ihn Ihnen gerne erneut zu.\n\nMit freundlichen Grüßen,\nIhr Support-Team'
                                            })}>
                                                🔑 Key fehlt
                                            </Button>
                                            <Button variant="outline" size="sm" className="bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100" onClick={() => setNewTemplate({
                                                title: 'Download funktioniert nicht',
                                                keywords: 'download, herunterladen, link, fehler, geht nicht',
                                                content: 'Hallo,\n\nes tut uns leid, dass Sie Probleme beim Download haben. Bitte versuchen Sie es mit einem anderen Browser (z.B. Chrome oder Firefox) und deaktivieren Sie kurzzeitig Ihren VPN/Adblocker.\n\nHier ist ein direkter Alternativ-Link für Sie: [LINK]\n\nBeste Grüße'
                                            })}>
                                                ⬇️ Download Problem
                                            </Button>
                                            <Button variant="outline" size="sm" className="bg-green-50 text-green-700 border-green-100 hover:bg-green-100" onClick={() => setNewTemplate({
                                                title: 'Aktivierung fehlgeschlagen',
                                                keywords: 'aktivierung, aktivieren, ungültig, error, fehlercode',
                                                content: 'Guten Tag,\n\nbitte stellen Sie sicher, dass Sie die Software als Administrator ausführen und keine Leerzeichen beim Kopieren des Codes mitnehmen.\n\nSollte der Fehler weiterhin bestehen, senden Sie uns bitte einen Screenshot der Fehlermeldung.\n\nViele Grüße'
                                            })}>
                                                ⚠️ Aktivierung
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 border-t border-gray-100 pt-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Regel-Name (Intern)</label>
                                                <Input
                                                    placeholder="z.B. Lizenzschlüssel Hilfe"
                                                    value={newTemplate.title}
                                                    onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                                    className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                                />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Schlüsselwörter</label>
                                                <Input
                                                    placeholder="key, code, aktivieren"
                                                    value={newTemplate.keywords}
                                                    onChange={e => setNewTemplate({ ...newTemplate, keywords: e.target.value })}
                                                    className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1">Mit Komma trennen</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Automatische Antwort</label>
                                            <Textarea
                                                placeholder="Schreiben Sie hier die automatische Antwort..."
                                                className="min-h-[200px] p-4 text-base leading-relaxed bg-gray-50 border-gray-200 focus:bg-white transition-colors resize-none"
                                                value={newTemplate.content}
                                                onChange={e => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {editingId && (
                                                <Button variant="outline" onClick={handleCancelEdit} className="flex-1 py-6 text-lg">
                                                    <X className="w-5 h-5 mr-2" />
                                                    Abbrechen
                                                </Button>
                                            )}
                                            <Button onClick={handleSaveTemplate} className={`flex-1 bg-gray-900 hover:bg-black text-white py-6 text-lg shadow-lg hover:shadow-xl transition-all ${editingId ? 'bg-blue-600 hover:bg-blue-700' : ''}`}>
                                                {editingId ? <><Edit className="w-5 h-5 mr-2" /> Regel aktualisieren</> : <><Plus className="w-5 h-5 mr-2" /> Neue Regel speichern</>}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Active Rules List */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-yellow-500" />
                                        Aktive Regeln
                                    </h3>
                                    <Badge variant="secondary" className="bg-white border border-gray-200 text-gray-600">
                                        {templates.length} Aktiv
                                    </Badge>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                                    {templates.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400">
                                            <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>Keine Regeln definiert.</p>
                                        </div>
                                    ) : (
                                        templates.map((t, i) => (
                                            <div key={i} className="p-4 hover:bg-gray-50 transition-colors group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-gray-800">{t.title}</h4>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditTemplate(t)}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTemplate(t.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {t.autoReplyKeywords && (
                                                    <div className="flex gap-1.5 flex-wrap mb-3">
                                                        {t.autoReplyKeywords.split(',').map((k: string, j: number) => (
                                                            <span key={j} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                                {k.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                    <p className="text-xs text-gray-500 line-clamp-3 italic leading-relaxed">
                                                        "{t.content}"
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Pro Tip Card */}
                            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                                        <Sparkles className="w-6 h-6 text-yellow-300" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Pro Tipp</h4>
                                        <p className="text-purple-100 text-sm leading-relaxed opacity-90">
                                            Verwenden Sie spezifische Schlüsselwörter wie "Bestellnummer" oder "Tracking", um Fehlalarme zu vermeiden. Je präziser die Keywords, desto besser die Automatisierung.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
