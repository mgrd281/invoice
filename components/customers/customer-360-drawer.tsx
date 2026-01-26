'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Mail, Phone, MapPin, Tag as TagIcon, Sparkles,
    ShoppingCart, MousePointer2, Brain, History,
    TrendingUp, ExternalLink, ArrowRight, UserMinus, ShieldCheck, Package, X,
    Copy, Plus, Search, MessageSquare, Calendar, MoreHorizontal, Filter,
    CreditCard, CheckCircle2, AlertCircle, Clock, ChevronRight, Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from 'sonner'

type ProfileTab = 'overview' | 'orders' | 'contact' | 'tags' | 'ai';

export function Customer360Drawer({ customer, open, onOpenChange }: any) {
    const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
    const [tags, setTags] = useState<string[]>(customer.tags || []);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newTag, setNewTag] = useState('');

    if (!customer) return null

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} kopiert`);
    }

    const handleUpdateField = async (field: string, value: any) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/customers/${customer.id}`, {
                method: 'PUT',
                body: JSON.stringify({ [field]: value })
            });
            if (res.ok) {
                toast.success('Änderung gespeichert');
            } else {
                toast.error('Fehler beim Speichern');
            }
        } catch (e) {
            toast.error('Netzwerkfehler');
        } finally {
            setIsLoading(false);
        }
    }

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        if (tags.includes(newTag.trim())) {
            toast.error('Tag existiert bereits');
            return;
        }
        const updatedTags = [...tags, newTag.trim()];
        setTags(updatedTags);
        handleUpdateField('tags', updatedTags);
        setNewTag('');
    }

    const handleRemoveTag = (tagToRemove: string) => {
        const updatedTags = tags.filter(t => t !== tagToRemove);
        setTags(updatedTags);
        handleUpdateField('tags', updatedTags);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[480px] p-0 overflow-hidden flex flex-col bg-slate-50 border-none shadow-2xl">
                {/* STICKY HEADER AREA */}
                <div className="bg-white border-b sticky top-0 z-30 flex-shrink-0">
                    {/* Header Top: Info + Avatar */}
                    <div className="p-6 pb-4">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-4 items-center min-w-0">
                                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-bold text-slate-900 border border-slate-200 uppercase flex-shrink-0">
                                    {customer.name?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl font-black text-slate-900 truncate tracking-tight pr-4">
                                        {customer.name}
                                    </h2>
                                    <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                                        {customer.email || 'Keine E-Mail'}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl -mt-2 -mr-2">
                                <X className="w-5 h-5 text-slate-400" />
                            </Button>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            <Badge variant="secondary" className={cn(
                                "text-[10px] font-bold px-2.5 py-0.5 rounded-lg border-none",
                                customer.segment === 'VIP' ? 'bg-amber-100 text-amber-700' :
                                    customer.segment === 'Neukunde' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                            )}>
                                {customer.segment || 'Kunde'}
                            </Badge>
                            {customer.source === 'shopify' && (
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg border-none">
                                    Shopify
                                </Badge>
                            )}
                            {customer.isRefunded && <Badge className="bg-red-50 text-red-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg border-none">Rückerstattung</Badge>}
                        </div>

                        {/* Quick Actions Row */}
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg border-slate-200 text-xs font-bold gap-2 flex-1 shadow-sm">
                                <Mail className="w-3.5 h-3.5" /> E-Mail
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg border-slate-200 text-xs font-bold gap-2 flex-1 shadow-sm">
                                <ShoppingCart className="w-3.5 h-3.5" /> Bestellungen
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg border-slate-200 text-xs font-bold gap-2 flex-1 shadow-sm">
                                <MessageSquare className="w-3.5 h-3.5" /> Notiz
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 px-2 rounded-lg border-slate-200 text-xs font-bold shadow-sm">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* STICKY TABS */}
                    <div className="px-2">
                        <ScrollArea className="w-full">
                            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v as ProfileTab)} className="w-full">
                                <TabsList className="bg-transparent h-12 w-full justify-start gap-1 p-0 px-4">
                                    {[
                                        { id: 'overview', label: 'Übersicht' },
                                        { id: 'orders', label: 'Bestellungen' },
                                        { id: 'contact', label: 'Kontakt' },
                                        { id: 'tags', label: 'Segmente & Tags' },
                                        { id: 'ai', label: 'KI-Insights' },
                                    ].map((tab) => (
                                        <TabsTrigger
                                            key={tab.id}
                                            value={tab.id}
                                            className={cn(
                                                "h-12 bg-transparent text-slate-400 font-bold text-[11px] uppercase tracking-wider px-4 border-b-2 border-transparent transition-all data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 rounded-none",
                                            )}
                                        >
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </ScrollArea>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT AREA */}
                <ScrollArea className="flex-1">
                    <div className="p-6 pb-32 space-y-8">
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {/* KPI Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Gültige Käufe</p>
                                        <p className="text-2xl font-black text-slate-900">{customer.orders}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Umsatz (Netto)</p>
                                        <p className="text-2xl font-black text-emerald-600">
                                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(customer.revenue)}
                                        </p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Rückerstattet</p>
                                        <p className="text-2xl font-black text-red-500">€{customer.refundedAmount?.toFixed(2) || '0,00'}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Kunde seit</p>
                                        <p className="text-lg font-black text-slate-900 leading-tight">
                                            {customer.createdAt ? format(new Date(customer.createdAt), 'MMM yyyy', { locale: de }) : 'Unbekannt'}
                                        </p>
                                    </div>
                                </div>

                                {/* Activity Timeline Mini-Block */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" /> Letzte Aktivität
                                    </h3>
                                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y">
                                        {customer.lastOrderDate ? (
                                            <div className="p-4 flex items-center justify-between">
                                                <div className="flex gap-3 items-center">
                                                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-900">Letzte Bestellung</p>
                                                        <p className="text-[10px] text-slate-400">{format(new Date(customer.lastOrderDate), 'dd. MMM yyyy HH:mm', { locale: de })}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-xs font-medium text-slate-400">
                                                Keine Aktivitäten verzeichnet
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-slate-400" /> Letzte 10 Bestellungen
                                    </h3>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white rounded-lg">Alle</Button>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 rounded-lg">Gültig</Button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {(customer.invoices && customer.invoices.length > 0) ? (
                                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden divide-y">
                                            {customer.invoices.slice(0, 10).map((inv: any) => (
                                                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-xs font-black text-slate-900">#{inv.invoiceNumber}</span>
                                                            <Badge className={cn(
                                                                "border-none text-[8px] font-black uppercase px-2 h-4 rounded-md",
                                                                inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                                                                    inv.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                            )}>
                                                                {inv.status === 'PAID' ? 'Bezahlt' : inv.status === 'CANCELLED' ? 'Storniert' : 'Offen'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            {format(new Date(inv.issueDate), 'dd. MMMM yyyy', { locale: de })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-slate-900">
                                                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(inv.totalGross))}
                                                        </p>
                                                        <ArrowRight className="w-4 h-4 text-slate-300 mt-1 inline-block" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                                            <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-xs font-bold text-slate-400 uppercase italic">Keine Bestellungen gefunden</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'contact' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 text-blue-600">
                                        <MapPin className="w-4 h-4" /> Kontakt- & Adressdaten
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="h-8 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200/50">
                                        {isEditing ? 'Abbrechen' : 'Bearbeiten'}
                                    </Button>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
                                    <div className="grid gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between group">
                                                <div className="flex-1 mr-4">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">E-Mail Adresse</p>
                                                    {isEditing ? (
                                                        <input
                                                            type="email"
                                                            defaultValue={customer.email}
                                                            onBlur={(e) => handleUpdateField('email', e.target.value)}
                                                            className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold"
                                                        />
                                                    ) : (
                                                        <p className="text-xs font-bold text-slate-900">{customer.email || 'Nicht angegeben'}</p>
                                                    )}
                                                </div>
                                                {!isEditing && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleCopy(customer.email, 'E-Mail')} className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                            <Separator className="bg-slate-50" />
                                            <div className="flex items-center justify-between group">
                                                <div className="flex-1 mr-4">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefonnummer</p>
                                                    {isEditing ? (
                                                        <input
                                                            type="tel"
                                                            defaultValue={customer.phone}
                                                            onBlur={(e) => handleUpdateField('phone', e.target.value)}
                                                            className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold"
                                                        />
                                                    ) : (
                                                        <p className="text-xs font-bold text-slate-900">{customer.phone || 'Nicht angegeben'}</p>
                                                    )}
                                                </div>
                                                {!isEditing && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleCopy(customer.phone, 'Telefon')} className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Hausanschrift</p>
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Straße & Hausnummer"
                                                        defaultValue={customer.address}
                                                        onBlur={(e) => handleUpdateField('address', e.target.value)}
                                                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold"
                                                    />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="PLZ"
                                                            defaultValue={customer.zipCode}
                                                            onBlur={(e) => handleUpdateField('zipCode', e.target.value)}
                                                            className="bg-slate-50 border border-slate-200 rounded-lg h-9 px-3 text-xs font-bold"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Stadt"
                                                            defaultValue={customer.city}
                                                            onBlur={(e) => handleUpdateField('city', e.target.value)}
                                                            className="bg-slate-50 border border-slate-200 rounded-lg h-9 px-3 text-xs font-bold"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group relative">
                                                    <div className="text-xs font-bold leading-relaxed text-slate-700">
                                                        {customer.address ? (
                                                            <>
                                                                <p className="text-slate-900">{customer.address}</p>
                                                                <p>{customer.zipCode} {customer.city}</p>
                                                                <p>{customer.country || 'Deutschland'}</p>
                                                            </>
                                                        ) : (
                                                            <p className="text-slate-400 italic">Keine Adresse hinterlegt</p>
                                                        )}
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => handleCopy(`${customer.address}, ${customer.zipCode} ${customer.city}`, 'Adresse')} className="h-8 w-8 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <Button
                                            onClick={() => {
                                                setIsEditing(false);
                                                toast.success('Modus beendet');
                                            }}
                                            className="w-full h-11 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-slate-200"
                                        >
                                            Fertig
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'tags' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 text-indigo-600 mb-6">
                                        <TagIcon className="w-4 h-4" /> Segmente & Tags
                                    </h3>

                                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-8">
                                        <div className="space-y-4">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aktive Tags</p>
                                            <div className="flex flex-wrap gap-2">
                                                {(tags && tags.length > 0) ? tags.map((tag: string) => (
                                                    <Badge key={tag} className="bg-indigo-50 text-indigo-600 border-none text-[9px] font-black uppercase px-2.5 h-7 rounded-lg gap-1.5 flex items-center group">
                                                        {tag}
                                                        <X
                                                            className="w-3 h-3 cursor-pointer hover:text-indigo-800"
                                                            onClick={() => handleRemoveTag(tag)}
                                                        />
                                                    </Badge>
                                                )) : (
                                                    <p className="text-[10px] font-medium text-slate-400 italic uppercase">Keine Tags zugewiesen</p>
                                                )}
                                            </div>

                                            <div className="pt-2 flex gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Tag hinzufügen..."
                                                        className="w-full h-9 pl-9 pr-4 bg-slate-50 border-none rounded-lg text-xs font-bold focus:ring-1 focus:ring-indigo-200 transition-all"
                                                        value={newTag}
                                                        onChange={(e) => setNewTag(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                                    />
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={handleAddTag}
                                                    className="h-9 px-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Hinzufügen
                                                </Button>
                                            </div>
                                        </div>

                                        <Separator className="bg-slate-50" />

                                        <div className="space-y-4">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Segment-Mitgliedschaft</p>
                                            <div className="flex gap-2">
                                                <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-black uppercase px-2.5 h-7 rounded-lg">
                                                    {customer.segment}
                                                </Badge>
                                                <Button variant="ghost" size="sm" className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-lg">Segment zuweisen</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 text-violet-600">
                                    <Sparkles className="w-4 h-4" /> KI-Insights & Empfehlungen
                                </h3>

                                <div className="space-y-4">
                                    <div className="p-5 bg-gradient-to-br from-indigo-50 to-violet-50 border border-violet-100 rounded-[2rem] space-y-4 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Upsell-Potenzial</p>
                                                <p className="text-xs font-black text-slate-900 italic">Smarte Empfehlung</p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                                            "Kunde zeigt hohes Interesse an Kategorie 'Digital'. Empfohlenes Upsell: Produkt 'Professional Pack'."
                                        </p>
                                    </div>

                                    <div className="p-5 bg-white border border-slate-200/60 rounded-[2rem] space-y-4 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-50 rounded-xl shadow-sm flex items-center justify-center text-red-500">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Risiko-ANALYSE</p>
                                                <p className="text-xs font-black text-slate-900 italic">Abwanderungs-Gefahr</p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                                            "Seit 45 Tagen inaktiv. Sende Re-Engagement E-Mail mit 10% Rabattcode."
                                        </p>
                                    </div>

                                    <Button className="w-full h-12 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all italic shadow-xl shadow-slate-200 mt-4">
                                        Vollständigen KI-Bericht anzeigen
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Fixed Footer Bar */}
                <div className="p-6 bg-white border-t sticky bottom-0 z-30 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.1)]">
                    <div className="flex gap-4">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12 w-12 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors flex-shrink-0 border border-slate-100">
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <Button className="h-12 flex-1 rounded-xl bg-slate-900 text-white font-black text-[12px] uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-slate-200">
                            Kundendaten speichern
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

