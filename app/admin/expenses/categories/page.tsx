'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Trash2, Plus, Tag } from "lucide-react";
import { toast } from "sonner";

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [newCatName, setNewCatName] = useState("");
    const [newCatColor, setNewCatColor] = useState("#000000");

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
        if (!newCatName) return;
        try {
            const res = await fetch('/api/expenses/categories', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ name: newCatName, color: newCatColor })
            });
            if (res.ok) {
                setNewCatName("");
                loadCategories();
                toast.success("Kategorie erstellt");
            }
        } catch (e) {
            toast.error("Fehler");
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Kategorien verwalten</h1>
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Neue Kategorie</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="z.B. Marketing" />
                        </div>
                        <div className="space-y-2">
                            <Label>Farbe</Label>
                            <div className="flex gap-2">
                                <Input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="w-12 h-10 p-1" />
                                <Input value={newCatColor} onChange={e => setNewCatColor(e.target.value)} />
                            </div>
                        </div>
                        <Button onClick={handleAdd} className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> Erstellen
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Vorhandene Kategorien</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full" style={{background: cat.color}}></div>
                                        <span className="font-medium">{cat.name}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {categories.length === 0 && <p className="text-muted-foreground text-center">Keine Kategorien</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
