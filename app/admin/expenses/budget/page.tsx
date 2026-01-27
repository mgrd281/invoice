'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function BudgetPage() {
    const [amount, setAmount] = useState("0");
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [alert80, setAlert80] = useState(true);
    const [alert100, setAlert100] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch budget for selected month
        fetch(`/api/expenses/budget?month=${month}`)
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setAmount(data.amount || "0");
                    setAlert80(data.alertThreshold80 !== false);
                    setAlert100(data.alertThreshold100 !== false);
                } else {
                     setAmount("0");
                }
            });
    }, [month]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/expenses/budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month,
                    amount,
                    alert80,
                    alert100
                })
            });
            if (res.ok) {
                toast.success("Budget Einstellungen gespeichert");
            } else {
                toast.error("Fehler beim Speichern");
            }
        } catch (e) {
            toast.error("Fehler");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Monatliches Budget & Limits</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Budget Ziel</CardTitle>
                    <CardDescription>Definieren Sie, wie viel Sie diesen Monat maximal ausgeben möchten.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Monat wählen</Label>
                        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Budget Limit (€)</Label>
                        <Input 
                            type="number" 
                            step="0.01" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="text-2xl font-bold"
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-medium">Benachrichtigungen</h3>
                        
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Warnung bei 80%</Label>
                                <p className="text-xs text-muted-foreground">Sie erhalten eine Info, wenn das Budget fast aufgebraucht ist.</p>
                            </div>
                            <Switch checked={alert80} onCheckedChange={setAlert80} />
                        </div>

                         <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Warnung bei 100% (Überzug)</Label>
                                <p className="text-xs text-muted-foreground">Sie erhalten eine Info, wenn das Budget überschritten wurde.</p>
                            </div>
                            <Switch checked={alert100} onCheckedChange={setAlert100} />
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
                        {loading ? 'Speichere...' : <><Save className="w-4 h-4 mr-2" /> Einstellungen speichern</>}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
