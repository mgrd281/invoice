'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Plus, Download, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, PieChart } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function ExpensesDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/expenses/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            });
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
    };

    if (loading) return <div className="p-8 text-center">Lade Finanzdaten...</div>;

    const profitColor = stats?.profit >= 0 ? 'text-emerald-600' : 'text-red-600';
    const profitIcon = stats?.profit >= 0 ? ArrowUpRight : ArrowDownRight;
    const ProfitIcon = profitIcon; // capitalization for component usage

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Finanzübersicht</h1>
                    <p className="text-muted-foreground">Einnahmen, Ausgaben und Gewinn im Blick.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/api/expenses/reports?format=csv" target="_blank">
                        <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
                    </Link>
                    <Link href="/admin/expenses/add">
                        <Button className="bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200">
                            <Plus className="w-4 h-4 mr-2" /> Neue Ausgabe
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Einnahmen (Monat)</p>
                                <h3 className="text-2xl font-bold mt-2 text-slate-900">{formatCurrency(stats?.revenue || 0)}</h3>
                             </div>
                             <div className="p-2 bg-emerald-100 rounded-full">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                             </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Ausgaben (Monat)</p>
                                <h3 className="text-2xl font-bold mt-2 text-slate-900">{formatCurrency(stats?.expenses || 0)}</h3>
                             </div>
                             <div className="p-2 bg-red-100 rounded-full">
                                <TrendingDown className="w-4 h-4 text-red-600" />
                             </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${stats?.profit >= 0 ? 'border-l-violet-500' : 'border-l-orange-500'} shadow-sm`}>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Netto Gewinn</p>
                                <h3 className={`text-2xl font-bold mt-2 ${profitColor}`}>{formatCurrency(stats?.profit || 0)}</h3>
                             </div>
                             <div className={`p-2 rounded-full ${stats?.profit >= 0 ? 'bg-violet-100' : 'bg-orange-100'}`}>
                                <ProfitIcon className={`w-4 h-4 ${stats?.profit >= 0 ? 'text-violet-600' : 'text-orange-600'}`} />
                             </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                     <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Budget Status</p>
                             </div>
                             <Wallet className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-4">
                            <div className="flex justify-between text-xs mb-1">
                                <span>{Math.round(stats?.budgetConsumedPercent || 0)}% verbraucht</span>
                                <span className="text-muted-foreground">{formatCurrency(stats?.budget || 0)} Limit</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all ${stats?.budgetConsumedPercent > 100 ? 'bg-red-500' : stats?.budgetConsumedPercent > 80 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                    style={{width: `${Math.min(stats?.budgetConsumedPercent || 0, 100)}%`}}
                                ></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <Card className="md:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle>Ausgaben Trend</CardTitle>
                        <CardDescription>Tägliche Ausgaben der letzten 30 Tage</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {stats?.dailyTrend?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.dailyTrend}>
                                    <defs>
                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fontSize: 12}} minTickGap={30} />
                                    <YAxis tickLine={false} axisLine={false} tick={{fontSize: 12}} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        formatter={(val: any) => [formatCurrency(val as number), 'Betrag']}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                Keine Daten verfügbar
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Category Chart */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Top Kategorien</CardTitle>
                        <CardDescription>Verteilung diesen Monat</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                         {stats?.categoryStats?.length > 0 ? (
                            <div className="w-full h-full space-y-4 overflow-auto pr-2 custom-scrollbar">
                                {stats.categoryStats.map((cat: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{background: cat.color}}></div>
                                            <span className="font-medium truncate max-w-[120px]">{cat.category}</span>
                                        </div>
                                        <span>{formatCurrency(cat.total)}</span>
                                    </div>
                                ))}
                            </div>
                         ) : (
                             <div className="text-muted-foreground text-sm">Keine Ausgaben</div>
                         )}
                    </CardContent>
                </Card>
            </div>
            
            <div className="flex gap-4">
                 <Link href="/admin/expenses/list" className="w-full">
                     <Button variant="secondary" className="w-full">Alle Ausgaben anzeigen</Button>
                 </Link>
                 <Link href="/admin/expenses/categories" className="w-full">
                     <Button variant="ghost" className="w-full">Kategorien verwalten</Button>
                 </Link>
                 <Link href="/admin/expenses/budget" className="w-full">
                     <Button variant="ghost" className="w-full">Budgets anpassen</Button>
                 </Link>
            </div>
        </div>
    );
}
