'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingDown, TrendingUp, AlertTriangle, PieChart, Euro } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ExpensesDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch stats (current month default)
            const resStats = await fetch('/api/expenses/stats');
            const dataStats = await resStats.json();
            setStats(dataStats);

            // Fetch recent expenses
            const resRecent = await fetch('/api/expenses');
            const dataRecent = await resRecent.json();
            if (Array.isArray(dataRecent)) {
                setRecentExpenses(dataRecent.slice(0, 5));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8">Lade Daten...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                <div className="flex gap-4">
                    <Link href="/admin/expenses">
                         <Button variant={loading ? "ghost" : "secondary"}>Übersicht</Button>
                    </Link>
                    <Link href="/admin/expenses/list">
                         <Button variant="ghost">Alle Ausgaben</Button>
                    </Link>
                     <Link href="/admin/expenses/budget">
                         <Button variant="ghost">Mizanie (Budget)</Button>
                    </Link>
                     <Link href="/admin/expenses/categories">
                         <Button variant="ghost">Fategorien</Button>
                    </Link>
                </div>
                <Link href="/admin/expenses/add">
                    <Button className="bg-violet-600 hover:bg-violet-700">
                        <Plus className="mr-2 h-4 w-4" /> Ausgabe hinzufügen
                    </Button>
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gesamtausgaben (Monat)</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{stats?.expenses?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground">in diesem Monat</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
                        {stats?.budgetConsumedPercent > 80 ? (
                             <AlertTriangle className="h-4 w-4 text-orange-500" />
                        ) : (
                             <Euro className="h-4 w-4 text-muted-foreground" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.min(100, Math.round(stats?.budgetConsumedPercent || 0))}%</div>
                        <p className="text-xs text-muted-foreground">
                            von €{stats?.budget?.toFixed(0)} verbraucht
                        </p>
                        {/* Progress Bar could go here */}
                         <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${stats?.budgetConsumedPercent > 100 ? 'bg-red-500' : stats?.budgetConsumedPercent > 80 ? 'bg-orange-500' : 'bg-green-500'}`} 
                                style={{ width: `${Math.min(100, stats?.budgetConsumedPercent || 0)}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{stats?.revenue?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground">in diesem Monat</p>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Netto Gewinn</CardTitle>
                        <PieChart className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats?.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats?.profit >= 0 ? '+' : ''}€{stats?.profit?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">Einnahmen - Ausgaben</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Visual Chart / Categories */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Top Ausgaben-Kategorien</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats?.categoryStats?.length === 0 && <p className="text-muted-foreground">Keine Daten verfügbar</p>}
                            {stats?.categoryStats?.map((cat: any, i: number) => (
                                <div key={i} className="flex items-center">
                                    <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: cat.color }}></div>
                                    <div className="flex-1 font-medium text-sm">{cat.name}</div>
                                    <div className="text-sm font-bold">€{cat.total.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Expenses List */}
                <Card className="col-span-3">
                    <CardHeader>
                         <CardTitle>Letzte Ausgaben</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentExpenses.length === 0 && <p className="text-muted-foreground">Keine Ausgaben gefunden</p>}
                            {recentExpenses.map((exp: any) => (
                                <div key={exp.id} className="flex items-center justify-between border-b pb-2 last:border-0 hover:bg-slate-50 p-2 rounded cursor-pointer">
                                    <div>
                                        <p className="font-medium text-sm">{exp.description}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString()} • {exp.expenseCategory?.name || 'Allgemein'}</p>
                                    </div>
                                    <div className="text-red-600 font-bold text-sm">
                                        -€{Number(exp.totalAmount).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                         <div className="mt-4 pt-2 border-t">
                            <Link href="/admin/expenses/add">
                                <Button variant="outline" className="w-full text-xs">Neue Ausgabe erfassen</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
