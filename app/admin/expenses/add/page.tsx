'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, UploadCloud, FileText, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
                if (Array.isArray(data)) setCategories(data);
            });
    }, []);

    const handleDescriptionChange = (val: string) => {
        setDescription(val);
        // Smart Suggestion Logic
        if (categories.length > 0 && val.length > 2) {
            const lowerDesc = val.toLowerCase();
            const match = categories.find(cat => {
                if (!cat.rulesKeywords) return false;
                // rulesKeywords is string "a,b,c"
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
        formData.append('type', 'receipt'); // Tag as receipt

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
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/admin/expenses">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Neue Ausgabe</h1>
                    <p className="text-muted-foreground text-sm">Beleg erfassen und zuordnen</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* LEFT: MAIN FORM */}
                <Card className="md:col-span-2 shadow-md border-violet-100">
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Amount & Date Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Betrag (€) *</Label>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0.00" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                    className="text-2xl font-bold h-14"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Datum *</Label>
                                <Input 
                                    type="date" 
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                    className="h-14"
                                />
                            </div>
                        </div>

                        {/* Description & Smart Suggestion */}
                        <div className="space-y-2 relative">
                            <Label>Beschreibung / Händler *</Label>
                            <Input 
                                placeholder="z.B. Edeka Einkauf oder Webhosting" 
                                value={description}
                                onChange={e => handleDescriptionChange(e.target.value)}
                                required
                                className="h-12"
                            />
                            {suggestedCategory && suggestedCategory.id !== categoryId && (
                                <div 
                                    onClick={applySuggestion}
                                    className="absolute right-2 top-9 bg-violet-100 text-violet-700 text-xs px-3 py-1.5 rounded-full cursor-pointer hover:bg-violet-200 flex items-center gap-1 animate-in fade-in slide-in-from-left-2"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Vorschlag: <strong>{suggestedCategory.name}</strong>
                                </div>
                            )}
                        </div>

                        {/* Category & Payment */}
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Kategorie *</Label>
                                <Select value={categoryId} onValueChange={setCategoryId} required>
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Wählen..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{background: cat.color}}></div>
                                                    {cat.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Zahlart</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="h-12">
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
                        </div>

                        {/* Recurring Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                            <div className="space-y-0.5">
                                <Label className="text-base">Wiederkehrende Ausgabe?</Label>
                                <p className="text-xs text-muted-foreground">z.B. Miete oder Abos</p>
                            </div>
                            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                        </div>
                        
                        {isRecurring && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Intervall</Label>
                                <Select value={recurringInterval} onValueChange={setRecurringInterval}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="WEEKLY">Wöchentlich</SelectItem>
                                        <SelectItem value="MONTHLY">Monatlich</SelectItem>
                                        <SelectItem value="YEARLY">Jährlich</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* RIGHT: RECEIPT UPLOAD */}
                <div className="space-y-6">
                    <Card className="h-full border-dashed border-2 shadow-none hover:bg-slate-50/50 transition-colors">
                         <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={handleFileChange}
                            />
                            
                            {file ? (
                                <div className="space-y-4 w-full">
                                    {previewUrl ? (
                                        <img src={previewUrl} className="w-full h-48 object-contain rounded-md border bg-white" alt="Preview" />
                                    ) : (
                                        <div className="w-full h-48 flex items-center justify-center bg-slate-100 rounded-md border">
                                            <FileText className="w-12 h-12 text-slate-400" />
                                        </div>
                                    )}
                                    <div className="text-sm font-medium truncate px-2">{file.name}</div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => { setFile(null); setPreviewUrl(null); }} className="w-full">
                                        Entfernen
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                                        <UploadCloud className="w-8 h-8 text-violet-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Beleg hochladen</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Bild oder PDF hier ablegen</p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        Datei auswählen
                                    </Button>
                                </>
                            )}
                         </CardContent>
                    </Card>

                    <Button type="submit" disabled={loading || uploading} className="w-full h-12 text-lg bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200">
                        {loading || uploading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Speichere...</>
                        ) : (
                            <><Save className="w-5 h-5 mr-2" /> Speichern</>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
