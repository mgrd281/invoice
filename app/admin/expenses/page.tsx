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
        <div className="min-h-screen bg-[#F7F8FC] font-sans text-[#0F172A] selection:bg-[#6D28D9] selection:text-white pb-20">
            <div className="w-full max-w-[1440px] mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-500 will-change-transform">
                
                {/* 1) HERO SECTION */}
                <div className="relative rounded-[32px] overflow-hidden p-8 md:p-12">
                    {/* Subtle Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#6D28D9]/[0.03] to-transparent pointer-events-none"></div>

                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                        <div className="space-y-4">
                            {/* Back Navigation */}
                            <Link href="/admin/dashboard" className="inline-flex items-center group">
                                <div className="h-8 px-3 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-medium text-slate-500 group-hover:text-slate-900 group-hover:border-slate-300 transition-all duration-300">
                                    <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
                                    Zurück zum Dashboard
                                </div>
                            </Link>

                            <div className="space-y-1">
                                <h1 className="text-[42px] leading-tight font-bold tracking-tight text-[#0F172A]">
                                    FINANZÜBERSICHT
                                </h1>
                                <div className="flex flex-wrap gap-2">
                                    {['Einnahmen', 'Ausgaben', 'Gewinn', 'Budgets'].map((tag) => (
                                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/50 text-[10px] font-bold uppercase tracking-widest text-[#64748B] border border-slate-200/50">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link href="/api/expenses/reports?format=csv" target="_blank">
                                <Button variant="outline" className="h-11 rounded-xl border-[#E2E8F0] text-[#64748B] font-medium hover:text-[#0F172A] hover:bg-white hover:border-slate-300 shadow-sm bg-white/50 backdrop-blur-sm transition-all duration-300">
                                    <Download className="w-4 h-4 mr-2" /> 
                                    Export
                                </Button>
                            </Link>
                            <Link href="/admin/expenses/add">
                                <Button className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] hover:translate-y-[-1px] hover:shadow-[0_12px_30px_rgba(109,40,217,0.25)] transition-all duration-300 border-0 text-white font-semibold">
                                    <Plus className="w-5 h-5 mr-2" /> 
                                    Neue Ausgabe
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 2) KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Revenue */}
                    <div className="group relative overflow-hidden rounded-[18px] bg-white p-6 md:p-7 shadow-[0_10px_40px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-all duration-300 border border-slate-100">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-[18px]"></div>
                        <div className="relative flex justify-between items-start">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Einnahmen</p>
                                <h3 className="text-[32px] md:text-[36px] font-semibold tracking-tight tabular-nums text-[#0F172A]">
                                    {formatCurrency(stats?.revenue || 0)}
                                </h3>
                                <p className="text-xs text-slate-400 mt-2 font-medium flex items-center">
                                    <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold mr-2">Trend</span>
                                    vs. letzte Periode
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                 <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Expenses */}
                    <div className="group relative overflow-hidden rounded-[18px] bg-white p-6 md:p-7 shadow-[0_10px_40px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-all duration-300 border border-slate-100">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-[18px]"></div>
                        <div className="relative flex justify-between items-start">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Ausgaben</p>
                                <h3 className="text-[32px] md:text-[36px] font-semibold tracking-tight tabular-nums text-[#0F172A]">
                                    {formatCurrency(stats?.expenses || 0)}
                                </h3>
                                <p className="text-xs text-slate-400 mt-2 font-medium flex items-center">
                                    <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold mr-2">Trend</span>
                                    vs. letzte Periode
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600">
                                 <TrendingDown className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Profit */}
                    <div className="group relative overflow-hidden rounded-[18px] bg-white p-6 md:p-7 shadow-[0_10px_40px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-all duration-300 border border-slate-100">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${profitPositive ? 'bg-violet-500' : 'bg-orange-500'} rounded-l-[18px]`}></div>
                        <div className="relative flex justify-between items-start">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Netto Gewinn</p>
                                <h3 className={`text-[32px] md:text-[36px] font-semibold tracking-tight tabular-nums ${profitPositive ? 'text-[#6D28D9]' : 'text-orange-500'}`}>
                                    {formatCurrency(stats?.profit || 0)}
                                </h3>
                                <p className="text-xs text-slate-400 mt-2 font-medium flex items-center">
                                    <span className={`${profitPositive ? 'text-violet-600 bg-violet-50' : 'text-orange-600 bg-orange-50'} px-1.5 py-0.5 rounded text-[10px] uppercase font-bold mr-2`}>
                                        {profitPositive ? 'Positiv' : 'Achtung'}
                                    </span>
                                    vs. letzte Periode
                                </p>
                            </div>
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${profitPositive ? 'bg-violet-500/10 text-[#6D28D9]' : 'bg-orange-500/10 text-orange-600'}`}>
                                 {profitPositive ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                            </div>
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="group relative overflow-hidden rounded-[18px] bg-white p-6 md:p-7 shadow-[0_10px_40px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-all duration-300 border border-slate-100">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-l-[18px]"></div>
                        <div className="relative flex justify-between items-start">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Budget Verfügbar</p>
                                <h3 className="text-[32px] md:text-[36px] font-semibold tracking-tight tabular-nums text-[#0F172A]">
                                    {formatCurrency((stats?.budget || 0) - (stats?.expenses || 0))}
                                </h3>
                                <p className="text-xs text-slate-400 mt-2 font-medium flex items-center">
                                    <span className="text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold mr-2">Total</span>
                                    Verbleibender Rest
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600">
                                 <Wallet className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </div>

            {/* MAIN GRID */}
            {/* MAIN GRID */}
            {/* ROW 1: Chart (2/3) + Insights (1/3) */}
            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 4) CHART SECTION (Left 2/3) */}
                <div className="lg:col-span-2">
                    {/* Trend Chart */}
                    <div className="rounded-[24px] bg-white p-8 shadow-[0_10px_40px_rgba(15,23,42,0.06)] h-full border border-slate-100 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h3 className="text-[18px] font-bold text-[#0F172A] tracking-tight">Ausgaben Trend</h3>
                                <p className="text-sm font-medium text-[#64748B]">Tägliche Entwicklung</p>
                            </div>
                            {/* Filter Pill */}
                            <div className="relative">
                                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 text-xs font-semibold uppercase tracking-wide text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A] transition-colors border border-slate-200">
                                    Letzte 30 Tage
                                    <ArrowDownRight className="w-3 h-3 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-[320px]">
                            {stats?.dailyTrend?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.dailyTrend}>
                                    <defs>
                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.10}/>
                                            <stop offset="95%" stopColor="#6D28D9" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.6} />
                                    <XAxis 
                                        dataKey="date" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fontSize: 12, fill: '#94A3B8', fontWeight: 500}} 
                                        dy={10}
                                        minTickGap={30}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})}
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fontSize: 12, fill: '#94A3B8', fontWeight: 500}} 
                                        tickFormatter={(val) => `€${val}`}
                                    />
                                    <Tooltip 
                                        cursor={{ stroke: '#6D28D9', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                                        contentStyle={{ 
                                            borderRadius: '16px', 
                                            border: '1px solid #E2E8F0', 
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                                            padding: '16px',
                                            backgroundColor: '#ffffff'
                                        }}
                                        formatter={(val: any) => [
                                            <span className="text-[#0F172A] font-bold text-lg">{formatCurrency(val as number)}</span>, 
                                            <span className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Betrag</span>
                                        ]}
                                        labelStyle={{ color: '#64748B', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="amount" 
                                        stroke="#6D28D9" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorAmount)" 
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#6D28D9' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                                        <TrendingUp className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-[#0F172A]">Noch keine Ausgaben</h3>
                                    <p className="text-sm text-[#64748B] max-w-[250px] mt-2 mb-6">
                                        Füge deine erste Ausgabe hinzu, um hier Trends und Analysen zu sehen.
                                    </p>
                                    <Link href="/admin/expenses/add">
                                        <Button size="sm" className="rounded-full bg-slate-900 text-white hover:bg-slate-800">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Neue Ausgabe
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div>
                    {/* 5) SMART INSIGHTS CARD (Dark Theme) */}
                    <div className="rounded-[24px] bg-gradient-to-br from-[#0B1220] via-[#111A2E] to-[#0B1220] p-8 text-white shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] relative overflow-hidden h-full flex flex-col justify-between border border-white/5 group">
                        {/* Glassmorphism details */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-violet-600/30 transition-colors duration-700"></div>
                        
                        <div className="relative z-10 space-y-8">
                            <div>
                                <h3 className="text-[18px] font-bold tracking-wide">Budget Insights</h3>
                                <p className="text-slate-400 text-sm mt-1 font-medium">Monatliche Analyse</p>
                            </div>

                            <div className="space-y-4">
                                 <div className="rounded-[20px] bg-white/[0.03] p-5 border border-white/[0.08] backdrop-blur-md shadow-inner">
                                    <div className="flex justify-between text-sm mb-3">
                                        <span className="text-slate-300 font-medium">Gesamtverbrauch</span>
                                        <span className="font-bold tracking-tight">{Math.round(stats?.budgetConsumedPercent || 0)}%</span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden p-[2px]">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(109,40,217,0.4)] ${stats?.budgetConsumedPercent > 100 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500'}`}
                                            style={{width: `${Math.min(stats?.budgetConsumedPercent || 0, 100)}%`}}
                                        ></div>
                                    </div>
                                    {stats?.budgetConsumedPercent > 80 && (
                                        <p className="text-xs text-orange-300 mt-3 flex items-center font-medium animate-pulse">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-2"></div>
                                            Budget fast aufgebraucht
                                        </p>
                                    )}
                                 </div>

                                 <div className="grid grid-cols-2 gap-3">
                                     <div className="rounded-[20px] bg-white/[0.03] p-4 border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.06] transition-colors">
                                         <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Verbleibend</p>
                                         <p className="text-[18px] font-bold mt-1 tracking-tight">
                                            {formatCurrency((stats?.budget || 0) - (stats?.expenses || 0))}
                                         </p>
                                     </div>
                                     <div className="rounded-[20px] bg-white/[0.03] p-4 border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.06] transition-colors">
                                         <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tages-Schnitt</p>
                                         <p className="text-[18px] font-bold mt-1 tracking-tight">
                                            {formatCurrency((stats?.expenses || 0) / Math.max(new Date().getDate(), 1))}
                                         </p>
                                     </div>
                                 </div>
                            </div>
                        </div>

                        <div className="relative z-10 pt-6">
                            <Button className="w-full h-12 rounded-[16px] bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:-translate-y-0.5 transition-all duration-300 border-0 text-white font-semibold">
                                Detaillierter Report
                            </Button>
                        </div>
                </div>
            </div>

            {/* ROW 2: Categories (1/2) + Recent (1/2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 6) TOP CATEGORIES LIST */}
                <div className="rounded-[24px] bg-white p-8 shadow-[0_10px_40px_rgba(15,23,42,0.06)] border border-slate-100 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-[18px] font-bold text-[#0F172A] tracking-tight">Top Kategorien</h3>
                            <p className="text-sm font-medium text-[#64748B]">Verteilung nach Volumen</p>
                        </div>
                        <button className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="space-y-5 flex-1">
                        {stats?.categoryStats?.length > 0 ? stats.categoryStats.slice(0, 5).map((cat: any, i: number) => (
                            <div key={i} className="flex items-center justify-between group cursor-default">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:border-[#6D28D9]/20 group-hover:bg-[#6D28D9]/5 transition-colors shadow-sm">
                                       <div className="w-3 h-3 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.1)]" style={{backgroundColor: cat.color}}></div>
                                    </div>
                                    <span className="font-semibold text-[15px] text-[#334155] group-hover:text-[#0F172A] transition-colors">{cat.category}</span>
                                </div>
                                <span className="font-bold text-[15px] tabular-nums text-[#0F172A]">
                                    {formatCurrency(cat.total)}
                                </span>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-center py-8">
                                <p className="text-sm font-medium text-slate-400">Keine Kategorien vorhanden</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100/80">
                         <Link href="/admin/expenses/categories">
                            <Button variant="ghost" className="w-full h-12 rounded-xl text-sm font-semibold text-[#64748B] hover:text-[#6D28D9] hover:bg-slate-50 transition-all">
                                Alle Kategorien verwalten
                            </Button>
                         </Link>
                    </div>
                </div>

                {/* 6) RECENT EXPENSES LIST */}
                <div className="rounded-[24px] bg-white p-8 shadow-[0_10px_40px_rgba(15,23,42,0.06)] border border-slate-100 flex flex-col h-full">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-[18px] font-bold text-[#0F172A] tracking-tight">Letzte Ausgaben</h3>
                            <p className="text-sm font-medium text-[#64748B]">Kürzliche Transaktionen</p>
                        </div>
                        <Link href="/admin/expenses/list">
                            <Button variant="link" className="text-[#6D28D9] font-semibold h-auto p-0 hover:no-underline hover:text-[#5b21b6] transition-colors text-sm">
                                Alle anzeigen &rarr;
                            </Button>
                        </Link>
                    </div>
                    <div className="space-y-3 flex-1">
                        {recentExpenses.length > 0 ? recentExpenses.map((expense, i) => (
                            <div key={expense.id} className="group flex items-center justify-between p-4 rounded-[16px] hover:bg-[#F8FAFC] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-100 hover:shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-[14px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:scale-105 group-hover:text-[#6D28D9] group-hover:shadow-md transition-all duration-300 border border-slate-100">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[15px] text-[#0F172A] group-hover:text-[#6D28D9] transition-colors leading-tight mb-1">
                                            {expense.description}
                                        </p>
                                        <div className="flex items-center gap-2">
                                             <div className={`w-1.5 h-1.5 rounded-full`} style={{backgroundColor: expense.expenseCategory?.color || '#94A3B8'}}></div>
                                             <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">{expense.expenseCategory?.name || 'Allgemein'}</p>
                                             <span className="text-[10px] text-slate-300">•</span>
                                             <p className="text-[11px] font-medium text-[#94A3B8]">{new Date(expense.date).toLocaleDateString('de-DE')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="font-bold tabular-nums text-[15px] text-[#0F172A]">
                                    -{formatCurrency(expense.totalAmount)}
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-center py-8">
                                <FileText className="w-10 h-10 text-slate-200 mb-3" />
                                <p className="text-sm font-medium text-slate-400">Keine kürzlichen Ausgaben</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}
