'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Trash2, Plus, Tag, Save, Info, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PREDEFINED_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
    '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#000000'
];

const CATEGORY_TYPES = [
    { value: 'OPERATIONAL', label: 'Betrieblich' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'PERSONNEL', label: 'Personal' },
    { value: 'FINANCIAL', label: 'Finanzen/Steuer' },
    { value: 'OTHER', label: 'Sonstiges' }
];

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // New Category Form
    const [name, setName] = useState("");
    const [color, setColor] = useState("#000000");
    const [type, setType] = useState("OPERATIONAL");
    const [rulesKeywords, setRulesKeywords] = useState(""); // Comma separated

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = () => {
        fetch('/api/expenses/categories')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCategories(data);
            });
    };

    const handleAdd = async () => {
        if (!name) return;
        setLoading(true);
        try {
            const res = await fetch('/api/expenses/categories', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ 
                    name, 
                    color, 
                    type,
                    rulesKeywords 
                 })
            });
            if (res.ok) {
                toast.success("Kategorie erstellt");
                setName("");
                setRulesKeywords("");
                loadCategories();
            } else {
                toast.error("Fehler beim Erstellen");
            }
        } catch (e) {
            toast.error("Netzwerkfehler");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                     <h1 className="text-2xl font-bold">Kategorien verwalten</h1>
                     <p className="text-muted-foreground">Definieren Sie Ausgabenkategorien für eine saubere Buchhaltung.</p>
                </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-12">
                {/* CREATE CARD */}
                <Card className="md:col-span-4 h-fit">
                    <CardHeader>
                        <CardTitle>Neue Kategorie</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Software Abos" />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Typ</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORY_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Farbe</Label>
                            <div className="flex flex-wrap gap-2">
                                {PREDEFINED_COLORS.map(c => (
                                    <div 
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={`w-6 h-6 rounded-full cursor-pointer border-2 ${color === c ? 'border-primary' : 'border-transparent'}`}
                                        style={{backgroundColor: c}}
                                    />
                                ))}
                                <Input 
                                    type="color" 
                                    value={color} 
                                    onChange={e => setColor(e.target.value)}
                                    className="w-8 h-8 p-0 border-0"
                                />
                            </div>
                        </div>

                         <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                Auto-Zuweisung (Keywords)
                                {/* Tooltip workaround */}
                                <Info className="w-3 h-3 text-muted-foreground" />
                            </Label>
                            <Input 
                                value={rulesKeywords} 
                                onChange={e => setRulesKeywords(e.target.value)} 
                                placeholder="z.B. Adobe, Netflix, Hosting" 
                            />
                            <p className="text-xs text-muted-foreground">Kommagetrennt. Wenn diese Wörter in der Beschreibung vorkommen, wird diese Kategorie vorgeschlagen.</p>
                        </div>

                        <Button onClick={handleAdd} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
                            <Plus className="w-4 h-4 mr-2" /> Erstellen
                        </Button>
                    </CardContent>
                </Card>

                {/* LIST CARD */}
                <Card className="md:col-span-8">
                    <CardHeader>
                        <CardTitle>Vorhandene Kategorien</CardTitle>
                        <CardDescription>{categories.length} Kategorien definiert</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{backgroundColor: cat.color}}>
                                            {cat.name.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-semibold flex items-center gap-2">
                                                {cat.name}
                                                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                                                    {CATEGORY_TYPES.find(t => t.value === cat.type)?.label || cat.type}
                                                </Badge>
                                            </div>
                                            {(cat.rulesKeywords) && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {cat.rulesKeywords.split(',').map((k: string, i: number) => (
                                                        <span key={i} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                            {k.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Noch keine Kategorien erstellt.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
