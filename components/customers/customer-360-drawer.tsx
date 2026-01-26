'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Mail, Phone, MapPin, Calendar, CreditCard,
    MessageSquare, ShieldCheck, UserMinus, Plus,
    ExternalLink, FileText, Tag as TagIcon
} from "lucide-react"

export function Customer360Drawer({ customer, open, onOpenChange }: any) {
    if (!customer) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[600px] border-l-0 p-0 overflow-y-auto">
                {/* Header Section */}
                <div className="bg-slate-900 text-white p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl font-black border border-white/10">
                            {customer.name?.charAt(0)}
                        </div>
                        <div className="flex gap-2">
                            <Badge className="bg-emerald-500 border-none text-[10px] uppercase font-black">{customer.status}</Badge>
                            <Badge className="bg-white/10 border-white/20 text-[10px] uppercase font-black">ID: {customer.id.split('_').pop()}</Badge>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">{customer.name}</h2>
                        <div className="flex items-center gap-4 mt-2 text-slate-400">
                            <div className="flex items-center gap-1 text-[11px] font-bold">
                                <Mail className="w-3.5 h-3.5" /> {customer.email}
                            </div>
                            {customer.phone && (
                                <div className="flex items-center gap-1 text-[11px] font-bold">
                                    <Phone className="w-3.5 h-3.5" /> {customer.phone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-10">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Value</p>
                            <h4 className="text-lg font-black text-slate-900">€{customer.ltv?.toFixed(2)}</h4>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bestellungen</p>
                            <h4 className="text-lg font-black text-slate-900">{customer.orderCount}</h4>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Seit</p>
                            <h4 className="text-lg font-black text-slate-900">{new Date(customer.createdAt).getFullYear()}</h4>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Details */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kunden-Details</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-slate-300 mt-0.5" />
                                        <div className="text-xs font-bold text-slate-600">
                                            {customer.address}<br />
                                            {customer.zipCode} {customer.city}<br />
                                            {customer.country}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <TagIcon className="w-4 h-4 text-slate-300" />
                                        <div className="flex flex-wrap gap-1">
                                            {customer.tags?.map((tag: string) => (
                                                <Badge key={tag} variant="secondary" className="text-[9px] font-bold h-5 uppercase tracking-tighter">{tag}</Badge>
                                            ))}
                                            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] font-black text-blue-600">+ ADD</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Letzte Historie</h3>
                            <div className="space-y-4">
                                {[1, 2].map(i => (
                                    <div key={i} className="flex gap-3 relative">
                                        {i === 1 && <div className="absolute top-6 bottom-0 left-[7px] w-px bg-slate-100" />}
                                        <div className="w-3.5 h-3.5 rounded-full bg-slate-100 border-2 border-white ring-1 ring-slate-200 mt-1" />
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900">Rechnung #INV-2024-{i}</p>
                                            <p className="text-[10px] font-bold text-slate-400">Vor {i * 2} Tagen • Bezhalt</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-8 border-t space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Button className="font-black text-[11px] h-10 bg-slate-900 hover:bg-slate-800"><Mail className="w-3.5 h-3.5 mr-2" /> E-MAIL SENDEN</Button>
                            <Button variant="outline" className="font-black text-[11px] h-10 border-slate-200"><Plus className="w-3.5 h-3.5 mr-2" /> RECHNUNG ERSTELLEN</Button>
                            <Button variant="outline" className="font-black text-[11px] h-10 border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-100 hover:text-red-700"><UserMinus className="w-3.5 h-3.5 mr-2" /> KUNDE SPERREN</Button>
                            <Button variant="outline" className="font-black text-[11px] h-10 border-slate-200"><ShieldCheck className="w-3.5 h-3.5 mr-2" /> SICHERHEITS-CHECK</Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
