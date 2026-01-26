'use client'

import { useState } from 'react'
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Mail, Phone, MapPin, Tag as TagIcon, Sparkles,
    ShoppingCart, MousePointer2, Brain, History,
    TrendingUp, ExternalLink, ArrowRight, UserMinus, ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

type ProfileTab = 'overview' | 'orders' | 'behavior' | 'ai';

export function Customer360Drawer({ customer, open, onOpenChange }: any) {
    const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
    if (!customer) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[750px] border-l-0 p-0 overflow-hidden flex flex-col">
                {/* Header Section */}
                <div className="bg-slate-900 text-white p-10 flex-shrink-0">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex gap-6 items-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-3xl font-black border border-white/10 shadow-2xl">
                                {customer.name?.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight italic">{customer.name}</h2>
                                <div className="flex flex-col gap-1 mt-2">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                        <Mail className="w-3.5 h-3.5" /> {customer.email}
                                    </div>
                                    <Badge className={cn("w-fit mt-2 border-none text-[9px] font-black uppercase tracking-widest px-3 h-6",
                                        customer.segment === 'VIP' ? 'bg-amber-100 text-amber-600' : 'bg-blue-600 text-white'
                                    )}>{customer.segment}</Badge>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Lifetime Value</p>
                            <h3 className="text-3xl font-black text-emerald-400">€{customer.revenue?.toFixed(2)}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl w-fit">
                        {[
                            { id: 'overview', label: 'Overview', icon: History },
                            { id: 'orders', label: 'Bestellungen', icon: ShoppingCart },
                            { id: 'behavior', label: 'Verhalten', icon: MousePointer2 },
                            { id: 'ai', label: 'Empfehlungen', icon: Brain }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === t.id ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <t.icon className="w-3.5 h-3.5" />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-12 pb-20 scrollbar-hide">
                    {activeTab === 'overview' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                            {/* Identity Grid */}
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kontaktdaten</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                                            <div className="text-xs font-bold leading-relaxed text-slate-600">
                                                {customer.address || 'Keine Adresse'}<br />
                                                {customer.zip} {customer.city}<br />
                                                {customer.country}
                                            </div>
                                        </div>
                                        {customer.phone && (
                                            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                                                <Phone className="w-5 h-5 text-slate-400" />
                                                <span className="text-xs font-bold">{customer.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Klassifizierung</h3>
                                    <div className="space-y-4">
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                                            <p className="text-[9px] font-black uppercase text-slate-400 mb-3">CRM Tags</p>
                                            <div className="flex flex-wrap gap-2">
                                                {customer.tags?.map((tag: string) => (
                                                    <Badge key={tag} variant="secondary" className="text-[9px] font-bold h-6 uppercase tracking-tight">{tag}</Badge>
                                                ))}
                                                {customer.tags?.length === 0 && <span className="text-[10px] font-bold text-slate-300">Keine Tags</span>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                                <p className="text-[9px] font-black uppercase text-emerald-600 mb-1">AOV</p>
                                                <p className="text-sm font-black">€{customer.aov?.toFixed(2)}</p>
                                            </div>
                                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                                                <p className="text-[9px] font-black uppercase text-blue-600 mb-1">Bestellungen</p>
                                                <p className="text-sm font-black">{customer.orders}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue Timeline placeholder */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engagement & Revenue Flow</h3>
                                <div className="h-[200px] w-full bg-slate-50 rounded-[2rem] border border-slate-100/50 p-6 flex items-center justify-center">
                                    <div className="text-center">
                                        <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase text-slate-300">Revenue Timeline in development</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <History className="w-4 h-4 text-slate-900" /> Letzte Bestellungen (Shopify)
                            </h3>
                            <div className="space-y-3">
                                {customer.lastOrder ? (
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors group cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center">
                                                <Package className="w-5 h-5 text-slate-900" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase italic tracking-tight">{customer.lastOrder}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                    {customer.lastOrderDate ? format(new Date(customer.lastOrderDate), 'dd. MMMM yyyy') : 'Datum unbekannt'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black uppercase tracking-tight">€{customer.revenue?.toFixed(2)}</p>
                                            <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase border-none h-5 px-3 mt-1">Paid</Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-12 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                        <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase text-slate-400">Keine Bestellungen gefunden</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'behavior' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="grid grid-cols-2 gap-6">
                                <Card className="p-8 bg-slate-900 text-white border-none rounded-[2rem] shadow-xl">
                                    <MousePointer2 className="w-8 h-8 text-blue-400 mb-4" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Browsing Behavior</h4>
                                    <p className="text-3xl font-black">{customer.behavior?.pageViews || 0}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">PAGES VIEWED LAST 30 DAYS</p>
                                </Card>
                                <Card className="p-8 bg-white border-slate-100 rounded-[2rem] shadow-sm">
                                    <ShoppingCart className="w-8 h-8 text-slate-900 mb-4" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cart Abandonments</h4>
                                    <p className="text-3xl font-black">{customer.behavior?.checkouts || 0}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">ABANDONED CHECKOUTS</p>
                                </Card>
                            </div>

                            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top Visited Products</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-50">
                                        <span className="text-xs font-bold text-slate-600 truncate mr-4">Sample Product Title #124</span>
                                        <Badge className="bg-slate-100 text-slate-600 font-bold border-none text-[9px] uppercase">4 Views</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-50">
                                        <span className="text-xs font-bold text-slate-600">Sample Product Title #98</span>
                                        <Badge className="bg-slate-100 text-slate-600 font-bold border-none text-[9px] uppercase">2 Views</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Brain className="w-4 h-4 text-violet-600" /> Predictive CRM Recommendations
                            </h3>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="p-10 bg-gradient-to-br from-violet-600 to-indigo-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                    <Sparkles className="absolute top-10 right-10 w-24 h-24 text-white/5 group-hover:scale-110 transition-transform" />
                                    <div className="z-10 relative">
                                        <Badge className="bg-white/10 text-white border-white/20 text-[9px] font-black uppercase tracking-widest mb-6">Retention-Strategie</Badge>
                                        <h4 className="text-2xl font-black uppercase tracking-tight mb-4 italic">Next Purchase Prediction: {customer.aov > 100 ? 'High' : 'Medium'}</h4>
                                        <p className="text-sm font-medium leading-relaxed text-indigo-100 mb-8 max-w-sm">
                                            Basiert auf der Kaufhistorie und dem aktuellen Surfverhalten empfehlen wir ein personalisiertes Angebot für die Kategorie "Accessoires".
                                        </p>
                                        <Button className="w-full h-12 bg-white text-indigo-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100">
                                            PERSONALISIERTES ANGEBOT ERSTELLEN
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                                        <h5 className="text-[9px] font-black uppercase text-emerald-600 mb-2">Upsell-Chance</h5>
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed">Upgrade auf das Deluxe-Paket beim nächsten Kauf.</p>
                                    </div>
                                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                                        <h5 className="text-[9px] font-black uppercase text-amber-600 mb-2">Win-Back Aktion</h5>
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed">Letzte Interaktion vor 22 Tagen. Reaktivierungs-Mail empfohlen.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed Action Footer */}
                <div className="flex-shrink-0 p-8 border-t bg-white flex items-center justify-between gap-4 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-100 text-red-600 hover:bg-red-50 hover:border-red-100">
                            <UserMinus className="w-6 h-6" />
                        </Button>
                        <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-100 text-slate-400">
                            <ShieldCheck className="w-6 h-6" />
                        </Button>
                    </div>
                    <div className="flex gap-4 flex-1">
                        <Button variant="outline" className="h-14 flex-1 rounded-2xl border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">
                            E-Mail senden
                        </Button>
                        <Button className="h-14 flex-1 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 shadow-xl shadow-slate-200 transition-all">
                            CRM Notiz hinzufügen
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

import { Package } from 'lucide-react'
import { format } from 'date-fns'
