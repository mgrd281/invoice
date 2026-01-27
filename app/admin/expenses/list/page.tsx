'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { ArrowLeft, Filter, Download } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExpensesListPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [categoryId, setCategoryId] = useState("ALL");
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        loadCategories();
        loadExpenses();
    }, []);

    const loadCategories = () => {
        fetch('/api/expenses/categories')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCategories(data);
            });
    };

    const loadExpenses = () => {
        setLoading(true);
        let url = `/api/expenses?`;
        if (dateFrom) url += `from=${dateFrom}&`;
        if (dateTo) url += `to=${dateTo}&`;
        if (categoryId && categoryId !== "ALL") url += `categoryId=${categoryId}&`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setExpenses(data);
                setLoading(false);
            });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <Link href="/admin/expenses">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Alle Ausgaben</h1>
                </div>
                <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" /> Export CSV (BETA)
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filter
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Von</label>
                            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bis</label>
                            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Kategorie</label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Alle" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Alle Kategorien</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={loadExpenses} className="w-full">Anwenden</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                                <tr>
                                    <th className="p-4">Datum</th>
                                    <th className="p-4">Beschreibung</th>
                                    <th className="p-4">Kategorie</th>
                                    <th className="p-4">Zahlart</th>
                                    <th className="p-4 text-right">Betrag</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={5} className="p-8 text-center">Lade Daten...</td></tr>}
                                {!loading && expenses.length === 0 && <tr><td colSpan={5} className="p-8 text-center">Keine Ausgaben gefunden</td></tr>}
                                {expenses.map(exp => (
                                    <tr key={exp.id} className="border-t hover:bg-slate-50">
                                        <td className="p-4">{new Date(exp.date).toLocaleDateString()}</td>
                                        <td className="p-4 font-medium">{exp.description} <span className="text-xs text-muted-foreground block">{exp.supplier}</span></td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100">
                                                <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{background: exp.expenseCategory?.color || '#000'}}></div>
                                                {exp.expenseCategory?.name || 'Allgemein'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-muted-foreground">{exp.paymentMethod}</td>
                                        <td className="p-4 text-right font-bold">-€{parseFloat(exp.totalAmount).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
