'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
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
    const [receiptUrl, setReceiptUrl] = useState("");
    
    // Smart suggestion logic
    const handleDescriptionChange = (val: string) => {
        setDescription(val);
        // Simple heuristic for suggestion
        const lower = val.toLowerCase();
        let suggestedCat = "";
        
        if (categories.length > 0) {
             if (lower.includes("edeka") || lower.includes("aldi") || lower.includes("lidl")) suggestedCat = "Supermarkt"; // needs matching ID
             else if (lower.includes("tankstelle") || lower.includes("shell") || lower.includes("aral")) suggestedCat = "Tankstelle";
             // Map to ID
             if (suggestedCat) {
                 const cat = categories.find(c => c.name.toLowerCase().includes(suggestedCat.toLowerCase()));
                 if (cat) setCategoryId(cat.id);
             }
        }
    };

    useEffect(() => {
        fetch('/api/expenses/categories')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCategories(data);
            });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/expenses', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     amount,
                     date, // YYYY-MM-DD
                     description,
                     categoryId,
                     paymentMethod,
                     receiptUrl
                 })
            });

            if (res.ok) {
                toast.success("Ausgabe gespeichert!");
                router.push('/admin/expenses');
            } else {
                toast.error("Fehler beim Speichern");
            }
        } catch (e) {
            toast.error("Ein Fehler ist aufgetreten");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/expenses">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <h1 className="text-2xl font-bold">Neue Ausgabe erfassen</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Betrag (€)</Label>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0.00" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                    className="text-lg font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Datum</Label>
                                <Input 
                                    type="date" 
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Beschreibung / Zweck</Label>
                            <Input 
                                placeholder="z.B. Einkauf Edeka oder Tanken" 
                                value={description}
                                onChange={e => handleDescriptionChange(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">Tipp: Wir schlagen die Kategorie automatisch vor.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Kategorie</Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger>
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
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Bar (Kasse)</SelectItem>
                                        <SelectItem value="CARD">Karte (Bank)</SelectItem>
                                        <SelectItem value="PAYPAL">PayPal</SelectItem>
                                        <SelectItem value="TRANSFER">Überweisung</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* File Upload Placeholder */}
                        <div className="space-y-2">
                            <Label>Beleg (Optional)</Label>
                            <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground hover:bg-slate-50 cursor-pointer">
                                Hier klicken um Bild/PDF hochzuladen (Coming Soon)
                            </div>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
                            {loading ? 'Speichere...' : <><Save className="w-4 h-4 mr-2" /> Ausgabe speichern</>}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
