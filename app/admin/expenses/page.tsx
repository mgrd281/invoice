'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Plus, Download, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, MoreHorizontal, FileText, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ExpensesDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
             try {
                const [statsRes, recentRes] = await Promise.all([
                    fetch('/api/expenses/stats'),
                    fetch('/api/expenses?take=5') // Fetch 5 recent
                ]);
                const statsData = await statsRes.json();
                const recentData = await recentRes.json();
                
                setStats(statsData);
                setRecentExpenses(Array.isArray(recentData) ? recentData : []);
             } catch (e) {
                console.error(e);
             } finally {
                setLoading(false);
             }
        };
        loadData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
            </div>
        </div>
    );

    const profitPositive = (stats?.profit || 0) >= 0;

    return (
        <div className="min-h-screen bg-[#F8FAFC] w-full max-w-none p-4 md:p-8 space-y-8 font-sans text-[#0F172A]">
            {/* BACK BUTTON */}
            <div>
                 <Link href="/admin/dashboard" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Zurück zum Dashboard
                 </Link>
            </div>

            {/* 3) PAGE HEADER */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-semibold tracking-tight text-[#0F172A]">FINANZÜBERSICHT</h1>
                        <p className="text-sm font-medium text-[#64748B] mt-1 uppercase tracking-wider">
                            Einnahmen • Ausgaben • Gewinn • Budgets
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/api/expenses/reports?format=csv" target="_blank">
                            <Button variant="outline" className="rounded-full border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-white shadow-sm">
                                <Download className="w-4 h-4 mr-2" /> Export
                            </Button>
                        </Link>
                        <Link href="/admin/expenses/add">
                            <Button className="rounded-full bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] hover:shadow-lg hover:shadow-[#6D28D9]/20 transition-all duration-300 border-0 px-6">
                                <Plus className="w-5 h-5 mr-2" /> Neue Ausgabe
                            </Button>
                        </Link>
                    </div>
                </div>
                {/* Thin divider */}
                <div className="h-[1px] w-full bg-[#E2E8F0]"></div>
            </div>

            {/* 2) KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Revenue */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 cursor-default">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-emerald-100/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Einnahmen</p>
                            <h3 className="text-3xl font-semibold mt-2 tabular-nums text-[#0F172A]">
                                {formatCurrency(stats?.revenue || 0)}
                            </h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-emerald-100/20 flex items-center justify-center text-emerald-600">
                             <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Expenses */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-red-100/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Ausgaben</p>
                            <h3 className="text-3xl font-semibold mt-2 tabular-nums text-[#0F172A]">
                                {formatCurrency(stats?.expenses || 0)}
                            </h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-red-100/20 flex items-center justify-center text-red-600">
                             <TrendingDown className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Profit */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-indigo-100/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Netto Gewinn</p>
                            <h3 className={`text-3xl font-semibold mt-2 tabular-nums ${profitPositive ? 'text-[#6D28D9]' : 'text-orange-500'}`}>
                                {formatCurrency(stats?.profit || 0)}
                            </h3>
                        </div>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${profitPositive ? 'bg-violet-100/20 text-[#6D28D9]' : 'bg-orange-100/20 text-orange-600'}`}>
                             {profitPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                    </div>
                </div>

                {/* Budget (Repurposed as simple KPI here, detailed view in Insights) */}
                <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-blue-100/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Budget Verfügbar</p>
                            <h3 className="text-3xl font-semibold mt-2 tabular-nums text-[#0F172A]">
                                {formatCurrency((stats?.budget || 0) - (stats?.expenses || 0))}
                            </h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-cyan-100/20 flex items-center justify-center text-cyan-600">
                             <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN GRID */}
            {/* MAIN GRID */}
            {/* ROW 1: Chart (2/3) + Insights (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 4) CHART SECTION (Left 2/3) */}
                <div className="lg:col-span-2">
                    {/* Trend Chart */}
                    <div className="rounded-[20px] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-semibold text-[#0F172A]">Ausgaben Trend</h3>
                                <p className="text-sm text-[#64748B]">Tägliche Entwicklung (30 Tage)</p>
                            </div>
                            {/* Filter Placeholder */}
                            <Button variant="ghost" size="sm" className="text-[#64748B] hover:text-[#0F172A] rounded-full">
                                Letzte 30 Tage
                            </Button>
                        </div>
                        <div className="h-[320px] w-full">
                            {stats?.dailyTrend?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.dailyTrend}>
                                    <defs>
                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#6D28D9" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis 
                                        dataKey="date" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fontSize: 12, fill: '#94A3B8'}} 
                                        minTickGap={30}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})}
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fontSize: 12, fill: '#94A3B8'}} 
                                        tickFormatter={(val) => `€${val}`}
                                    />
                                    <Tooltip 
                                        cursor={{ stroke: '#6D28D9', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                                        formatter={(val: any) => [formatCurrency(val as number), 'Betrag']}
                                        labelStyle={{ color: '#64748B', marginBottom: '4px' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="amount" 
                                        stroke="#6D28D9" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorAmount)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
                                    <p className="text-sm">Noch keine Ausgaben im Zeitraum</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div>
                    {/* 5) SMART INSIGHTS CARD (Dark Theme) */}
                    <div className="rounded-[20px] bg-gradient-to-br from-[#0F172A] to-[#020617] p-8 text-white shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] relative overflow-hidden h-full">
                        {/* Glassmorphism details */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold tracking-wide">Budget Insights</h3>
                                <p className="text-slate-400 text-sm mt-1">Monatliche Analyse</p>
                            </div>

                            <div className="space-y-4">
                                 <div className="rounded-xl bg-white/5 p-4 border border-white/5 backdrop-blur-sm">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-300">Gesamtverbrauch</span>
                                        <span className="font-semibold">{Math.round(stats?.budgetConsumedPercent || 0)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${stats?.budgetConsumedPercent > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`}
                                            style={{width: `${Math.min(stats?.budgetConsumedPercent || 0, 100)}%`}}
                                        ></div>
                                    </div>
                                    {stats?.budgetConsumedPercent > 80 && (
                                        <p className="text-xs text-orange-300 mt-2 flex items-center">
                                            <Search className="w-3 h-3 mr-1" /> Budget fast aufgebraucht
                                        </p>
                                    )}
                                 </div>

                                 <div className="grid grid-cols-2 gap-3">
                                     <div className="rounded-xl bg-white/5 p-3 border border-white/5 backdrop-blur-sm">
                                         <p className="text-xs text-slate-400">Verbleibend</p>
                                         <p className="text-lg font-semibold mt-1">
                                            {formatCurrency((stats?.budget || 0) - (stats?.expenses || 0))}
                                         </p>
                                     </div>
                                     <div className="rounded-xl bg-white/5 p-3 border border-white/5 backdrop-blur-sm">
                                         <p className="text-xs text-slate-400">Tages-Schnitt</p>
                                         <p className="text-lg font-semibold mt-1">
                                            {formatCurrency((stats?.expenses || 0) / Math.max(new Date().getDate(), 1))}
                                         </p>
                                     </div>
                                 </div>
                            </div>

                            <Button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all border-0 text-white font-medium h-12">
                                Detaillierter Report
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: Categories (1/2) + Recent (1/2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 6) TOP CATEGORIES LIST */}
                <div className="rounded-[20px] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-[#0F172A]">Top Kategorien</h3>
                        <button className="text-slate-400 hover:text-slate-600">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        {stats?.categoryStats?.length > 0 ? stats.categoryStats.slice(0, 5).map((cat: any, i: number) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:border-[#6D28D9]/20 group-hover:bg-[#6D28D9]/5 transition-colors">
                                       <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: cat.color}}></div>
                                    </div>
                                    <span className="font-medium text-sm text-[#334155]">{cat.category}</span>
                                </div>
                                <span className="font-semibold text-sm tabular-nums text-[#0F172A]">
                                    {formatCurrency(cat.total)}
                                </span>
                            </div>
                        )) : (
                            <div className="text-center text-sm text-slate-400 py-4">Keine Kategorien</div>
                        )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100">
                         <Link href="/admin/expenses/categories">
                            <Button variant="ghost" className="w-full text-sm text-[#64748B] hover:text-[#6D28D9]">
                                Kategorien verwalten
                            </Button>
                         </Link>
                    </div>
                </div>

                {/* 6) RECENT EXPENSES LIST */}
                <div className="rounded-[20px] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-[#0F172A]">Letzte Ausgaben</h3>
                        <Link href="/admin/expenses/list">
                            <Button variant="link" className="text-[#6D28D9] h-auto p-0 hover:no-underline hover:opacity-80">
                                Alle anzeigen &rarr;
                            </Button>
                        </Link>
                    </div>
                    <div className="space-y-1">
                        {recentExpenses.length > 0 ? recentExpenses.map((expense, i) => (
                            <div key={expense.id} className="group flex items-center justify-between p-4 rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer border border-transparent">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-[#0F172A] group-hover:text-[#6D28D9] transition-colors">
                                            {expense.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                             <div className={`w-2 h-2 rounded-full`} style={{backgroundColor: expense.expenseCategory?.color || '#94A3B8'}}></div>
                                             <p className="text-xs text-[#64748B]">{expense.expenseCategory?.name || 'Allgemein'}</p>
                                             <span className="text-[10px] text-slate-300">•</span>
                                             <p className="text-xs text-[#64748B]">{new Date(expense.date).toLocaleDateString('de-DE')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="font-semibold tabular-nums text-[#0F172A]">
                                    -{formatCurrency(expense.totalAmount)}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-muted-foreground">Keine kürzlichen Ausgaben</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
