'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, UploadCloud, FileText, Check, Loader2, Sparkles, Tag, Calendar, CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AddExpensePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    
    // Form state
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    
    // Advanced
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringInterval, setRecurringInterval] = useState("MONTHLY");
    
    // File Upload
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Smart Suggestion
    const [suggestedCategory, setSuggestedCategory] = useState<{id: string, name: string} | null>(null);

    useEffect(() => {
        fetch('/api/expenses/categories')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCategories(data);
                } else {
                    console.error("Categories fetch failed", data);
                    toast.error("Kategorien konnten nicht geladen werden");
                }
            })
            .catch(err => {
                console.error(err);
                toast.error("Netzwerkfehler beim Laden der Kategorien");
            });
    }, []);

    const handleDescriptionChange = (val: string) => {
        setDescription(val);
        // Smart Suggestion Logic
        if (categories.length > 0 && val.length > 2) {
            const lowerDesc = val.toLowerCase();
            const match = categories.find(cat => {
                if (!cat.rulesKeywords) return false;
                const keywords = cat.rulesKeywords.toLowerCase().split(',');
                return keywords.some((k: string) => k.trim() && lowerDesc.includes(k.trim()));
            });

            if (match) {
                setSuggestedCategory({ id: match.id, name: match.name });
            } else {
                setSuggestedCategory(null);
            }
        } else {
            setSuggestedCategory(null);
        }
    };

    const applySuggestion = () => {
        if (suggestedCategory) {
            setCategoryId(suggestedCategory.id);
            setSuggestedCategory(null);
            toast.info(`Kategorie "${suggestedCategory.name}" übernommen`);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            if (f.type.startsWith('image/')) {
                setPreviewUrl(URL.createObjectURL(f));
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const uploadFile = async (): Promise<string | null> => {
        if (!file) return null;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'receipt'); 

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) return data.url;
            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation
            if (!categoryId) {
                 toast.error("Bitte wähle eine Kategorie aus");
                 setLoading(false);
                 return;
            }

            let receiptUrl = "";
            if (file) {
                 setUploading(true);
                 const url = await uploadFile();
                 if (url) receiptUrl = url;
                 setUploading(false);
            }

            const res = await fetch('/api/expenses', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     amount: parseFloat(amount),
                     date, 
                     description,
                     categoryId,
                     paymentMethod,
                     receiptUrl,
                     isRecurring,
                     recurringInterval: isRecurring ? recurringInterval : null
                 })
            });

            if (res.ok) {
                toast.success("Ausgabe erfolgreich gespeichert!");
                router.push('/admin/expenses');
            } else {
                toast.error("Fehler beim Speichern");
            }
        } catch (e) {
            toast.error("Ein Fehler ist aufgetreten");
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F8FC] pb-20 animate-in fade-in duration-500">
            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin/expenses">
                        <Button variant="ghost" className="h-10 w-10 rounded-full bg-white border border-slate-200 shadow-sm p-0 hover:bg-slate-50 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A]">Neue Ausgabe erfassen</h1>
                        <p className="text-sm font-medium text-[#64748B]">Füge eine neue Transaktion zu deiner Finanzübersicht hinzu.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN: MAIN INPUTS */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 1. Amount Card */}
                        <div className="relative rounded-[24px] bg-white p-8 shadow-[0_10px_40px_rgba(15,23,42,0.06)] border border-slate-100 overflow-hidden group focus-within:ring-2 ring-[#6D28D9]/20 transition-all">
                             <div className="absolute top-0 left-0 w-1.5 h-full bg-[#6D28D9]"></div>
                             <Label className="uppercase text-xs font-bold text-[#64748B] tracking-widest mb-2 block">Betrag</Label>
                             <div className="flex items-center">
                                <span className="text-4xl md:text-5xl font-bold text-[#0F172A] mr-2">€</span>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0.00" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                    className="border-none shadow-none text-4xl md:text-5xl font-bold text-[#0F172A] p-0 h-auto placeholder:text-slate-200 focus-visible:ring-0"
                                    autoFocus
                                />
                             </div>
                        </div>

                        {/* 2. Details Card */}
                        <div className="rounded-[24px] bg-white p-8 shadow-[0_10px_40px_rgba(15,23,42,0.06)] border border-slate-100 space-y-8">
                             
                             {/* Description */}
                             <div className="space-y-3 relative z-10">
                                <Label className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#6D28D9]" />
                                    Beschreibung / Händler *
                                </Label>
                                <div className="relative">
                                    <Input 
                                        placeholder="z.B. Hosting Rechnung, Bürobedarf..." 
                                        value={description}
                                        onChange={e => handleDescriptionChange(e.target.value)}
                                        required
                                        className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-lg focus:bg-white focus:border-[#6D28D9] transition-all pl-4"
                                    />
                                    {suggestedCategory && suggestedCategory.id !== categoryId && (
                                        <div 
                                            onClick={applySuggestion}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#6D28D9]/10 text-[#6D28D9] text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer hover:bg-[#6D28D9]/20 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 border border-[#6D28D9]/10 shadow-sm"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            <span>Kategorie: <strong>{suggestedCategory.name}</strong></span>
                                        </div>
                                    )}
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Category Select */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-[#6D28D9]" />
                                        Kategorie *
                                    </Label>
                                    <Select value={categoryId} onValueChange={setCategoryId} required>
                                        <SelectTrigger className="h-14 rounded-xl border-slate-200 bg-white text-base focus:ring-[#6D28D9] focus:ring-offset-0">
                                            <SelectValue placeholder="Wählen..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]" align="start">
                                            {categories.length > 0 ? (
                                                categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id} className="cursor-pointer py-3 focus:bg-slate-50">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm" style={{background: cat.color}}></div>
                                                            <span className="font-medium">{cat.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center">
                                                    <p className="text-sm text-slate-500 mb-2">Keine Kategorien</p>
                                                    <Link href="/admin/expenses/categories">
                                                        <Button variant="outline" size="sm" className="w-full">Erstellen</Button>
                                                    </Link>
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Date Picker */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-[#6D28D9]" />
                                        Datum *
                                    </Label>
                                    <Input 
                                        type="date" 
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        required
                                        className="h-14 rounded-xl border-slate-200 bg-white text-base focus:border-[#6D28D9] transition-all"
                                    />
                                </div>
                             </div>

                             {/* Payment Method */}
                             <div className="space-y-3">
                                <Label className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-[#6D28D9]" />
                                    Zahlart
                                </Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="h-14 rounded-xl border-slate-200 bg-white text-base">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Bar (Kasse)</SelectItem>
                                        <SelectItem value="CARD">Karte (Bank)</SelectItem>
                                        <SelectItem value="PAYPAL">PayPal</SelectItem>
                                        <SelectItem value="TRANSFER">Überweisung</SelectItem>
                                        <SelectItem value="DIRECT_DEBIT">Lastschrift</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>

                             {/* Recurring Toggle */}
                             <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100/80">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4 text-slate-400" />
                                        Wiederkehrende Ausgabe?
                                    </Label>
                                    <p className="text-xs text-[#64748B] pl-6">Automatisch jeden Monat/Jahr erstellen</p>
                                </div>
                                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} className="data-[state=checked]:bg-[#6D28D9]" />
                             </div>
                            
                            {isRecurring && (
                                <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                                    <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Intervall</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['WEEKLY', 'MONTHLY', 'YEARLY'].map((interval) => (
                                            <div 
                                                key={interval}
                                                onClick={() => setRecurringInterval(interval)}
                                                className={cn(
                                                    "cursor-pointer rounded-xl border p-3 text-center transition-all",
                                                    recurringInterval === interval 
                                                        ? "bg-[#6D28D9]/5 border-[#6D28D9] text-[#6D28D9] font-bold shadow-sm" 
                                                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                                )}
                                            >
                                                <div className="text-xs uppercase tracking-wider">{interval === 'WEEKLY' ? 'Wöchentlich' : interval === 'MONTHLY' ? 'Monatlich' : 'Jährlich'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* RIGHT COLUMN: RECEIPT & ACTIONS */}
                    <div className="space-y-6">
                        {/* Receipt Card */}
                        <div className="rounded-[24px] bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] border border-slate-100 flex flex-col items-center text-center h-[340px] relative overflow-hidden group">
                             <div className="absolute inset-0 bg-slate-50/50 transition-colors group-hover:bg-slate-50/80"></div>
                             
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={handleFileChange}
                            />

                            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                                {file ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                                        {previewUrl ? (
                                            <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                                                <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                                                <FileText className="w-10 h-10" />
                                            </div>
                                        )}
                                        <p className="text-sm font-semibold text-[#0F172A] truncate max-w-[200px]">{file.name}</p>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(null); }}
                                            className="mt-3 text-xs font-bold text-red-500 hover:text-red-600 hover:underline"
                                        >
                                            Entfernen
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-20 h-20 bg-[#6D28D9]/5 rounded-[24px] flex items-center justify-center mb-4 cursor-pointer hover:scale-105 hover:shadow-lg hover:bg-[#6D28D9]/10 transition-all duration-300"
                                        >
                                            <UploadCloud className="w-8 h-8 text-[#6D28D9]" />
                                        </div>
                                        <h3 className="text-lg font-bold text-[#0F172A]">Beleg hochladen</h3>
                                        <p className="text-xs font-medium text-[#64748B] mt-2 mb-6 max-w-[180px]">
                                            Ziehe deine Datei hierher oder klicke zum Auswählen (PDF/JPG)
                                        </p>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            className="rounded-xl border-dashed border-slate-300 hover:border-[#6D28D9] hover:text-[#6D28D9]"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Datei auswählen
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button 
                            type="submit" 
                            disabled={loading || uploading} 
                            className="w-full h-14 rounded-[20px] bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] hover:shadow-[0_10px_30px_rgba(109,40,217,0.3)] hover:-translate-y-0.5 transition-all duration-300 text-white text-lg font-bold shadow-lg shadow-violet-200"
                        >
                            {loading || uploading ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Wird gespeichert...</>
                            ) : (
                                <><Save className="w-5 h-5 mr-2" /> Ausgabe speichern</>
                            )}
                        </Button>
                        <div className="text-center">
                            <Link href="/admin/expenses">
                                <button type="button" className="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors">Abbrechen</button>
                            </Link>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
