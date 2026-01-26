'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Search, Edit3, Image as ImageIcon,
    Sparkles, Save, Check, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SeoProductScore } from '@/types/seo-types'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

interface SeoProductTableProps {
    products: SeoProductScore[]
    onUpdateProduct: (productId: string, data: any) => void
}

export function SeoProductTable({ products, onUpdateProduct }: SeoProductTableProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<SeoProductScore | null>(null)

    const filtered = products.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.handle.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-in fade-in duration-500 overflow-hidden">
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        className="pl-10 h-10 bg-white border-slate-200 rounded-xl text-xs font-medium"
                        placeholder="Produkt oder Kategorie suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Name / Item</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Score</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Titel</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Meta</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Bilder</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Schema</th>
                                <th className="px-8 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((item) => (
                                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedProduct(item)}>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{item.title}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.handle}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-xs font-black",
                                                item.score > 80 ? "text-emerald-600" : item.score > 50 ? "text-orange-500" : "text-red-500"
                                            )}>{item.score}</span>
                                            <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden">
                                                <div className={cn(
                                                    "h-full rounded-full",
                                                    item.score > 80 ? "bg-emerald-500" : item.score > 50 ? "bg-orange-500" : "bg-red-500"
                                                )} style={{ width: `${item.score}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] border-none font-black uppercase",
                                            item.titleOptimal ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                        )}>
                                            {item.titleLength} Chars
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-5">
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] border-none font-black uppercase",
                                            item.metaQuality === 'good' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                        )}>
                                            {item.metaQuality}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-5">
                                        {item.missingAlts > 0 ? (
                                            <Badge className="bg-orange-50 text-orange-600 border-none text-[9px] font-black uppercase">
                                                {item.missingAlts} Fehler
                                            </Badge>
                                        ) : (
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        )}
                                    </td>
                                    <td className="px-4 py-5">
                                        <Badge className={cn(
                                            "text-[9px] font-black uppercase border-none",
                                            item.hasSchema ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {item.hasSchema ? 'Active' : 'Missing'}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 group-hover:text-slate-900 transition-colors">
                                            <Edit3 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* SEO Editor Drawer */}
            <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
                <SheetContent className="w-full sm:max-w-xl p-0 border-none shadow-2xl bg-white flex flex-col">
                    <SheetHeader className="p-8 bg-slate-900 text-white">
                        <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">{selectedProduct?.title}</SheetTitle>
                        <SheetDescription className="text-white/60 font-medium text-xs uppercase tracking-widest">
                            Detailierte SEO Analyse & Optimierung
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {/* Title Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">SEO Titel</label>
                                <span className="text-[10px] font-bold text-slate-400">{selectedProduct?.title.length} / 60</span>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                <Input
                                    className="bg-white border-slate-200 rounded-xl text-sm font-medium"
                                    defaultValue={selectedProduct?.title}
                                />
                                <Button variant="outline" className="w-full border-slate-200 text-slate-600 font-bold text-[10px] uppercase h-10 rounded-xl bg-white">
                                    <Sparkles className="w-3 h-3 mr-2" /> KI VORSCHLAG GENERIEREN
                                </Button>
                            </div>
                        </div>

                        {/* Meta Section */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Meta Beschreibung Preview</label>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                <p className="text-blue-700 text-lg font-medium hover:underline cursor-pointer truncate">
                                    {selectedProduct?.title}
                                </p>
                                <p className="text-emerald-800 text-xs truncate">
                                    https://yourstore.com{selectedProduct?.handle}
                                </p>
                                <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                                    Kaufen Sie {selectedProduct?.title} online zum besten Preis. Schneller Versand und 30 Tage Rückgaberecht. Jetzt entdecken und sparen!
                                </p>
                            </div>
                        </div>

                        {/* Image Alts */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bilder & Alt-Texte</label>
                            <div className="space-y-2">
                                {[1, 2].map((i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                                        <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                className="h-8 bg-white border-slate-200 rounded-lg text-[10px] font-medium"
                                                placeholder="Alt-Text eingeben..."
                                            />
                                        </div>
                                        <Button size="icon" variant="ghost" className="text-emerald-600">
                                            <Sparkles className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-slate-100 bg-white sticky bottom-0 flex gap-4">
                        <Button className="flex-1 h-12 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl">
                            <Save className="w-4 h-4 mr-2" /> ANWENDEN
                        </Button>
                        <Button variant="outline" className="flex-1 h-12 border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl">
                            DRAFT SPEICHERN
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
