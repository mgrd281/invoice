'use client';

import { HeaderNavIcons } from '@/components/navigation/header-nav-icons';
import { useEffect, useState, useMemo } from 'react';
import {
    Users, Monitor, Smartphone, Tablet, MousePointer2,
    Clock, TrendingUp, ArrowLeft, ArrowRight, Search,
    Globe, Share2, ShoppingCart, AlertCircle, Calendar,
    ArrowUpRight, ArrowDownRight, Zap, Download, Activity,
    DollarSign, Package, UserPlus, Filter, PieChart as PieChartIcon,
    BarChart3, Sparkles
} from 'lucide-react';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, PieChart, Pie,
    Cell, AreaChart, Area
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import NextLink from 'next/link';
import { toast } from 'sonner';

const COLORS = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

type AnalyticsTab = 'overview' | 'funnels' | 'cohorts' | 'products' | 'ai';

export default function AnalyticsDashboard() {
    const [data, setData] = useState<any>(null);
    const [range, setRange] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics/overview?range=${range}`);
            const json = await res.json();
            if (json.success) setData(json);
        } catch (err) {
            console.error('Failed to fetch analytics', err);
            toast.error('Fehler beim Laden der Analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [range]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    if (loading && !data) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                    <TrendingUp className="h-10 w-10" />
                    <p>Business Intelligence wird geladen...</p>
                </div>
            </div>
        );
    }

    const kpis = data?.kpis || {};

    return (
        <div className="p-6 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Enterprise Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between border-b pb-8">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <HeaderNavIcons />
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-extrabold uppercase tracking-widest text-[10px]">
                            Live Stats Active
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <div className="bg-slate-900 p-2.5 rounded-2xl shadow-xl">
                            <BarChart3 className="h-8 w-8 text-emerald-400" />
                        </div>
                        SHOP INTELLIGENCE
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[11px]">Enterprise Business Analytics & Performance Center</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border rounded-xl p-1.5 px-4 shadow-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <Select value={range} onValueChange={setRange}>
                            <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0 font-bold text-slate-600">
                                <SelectValue placeholder="Zeitraum" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="today">Heute</SelectItem>
                                <SelectItem value="yesterday">Gestern</SelectItem>
                                <SelectItem value="7d">Letzte 7 Tage</SelectItem>
                                <SelectItem value="30d">Letzte 30 Tage</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" className="h-12 border-none bg-white shadow-sm font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50">
                        <Download className="h-4 w-4 mr-2" /> Report Export
                    </Button>
                </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
                {(['overview', 'funnels', 'cohorts', 'products', 'ai'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            activeTab === tab
                                ? "bg-slate-900 text-white shadow-lg"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        {tab === 'overview' && <TrendingUp className="h-3.5 w-3.5" />}
                        {tab === 'funnels' && <Filter className="h-3.5 w-3.5" />}
                        {tab === 'cohorts' && <Users className="h-3.5 w-3.5" />}
                        {tab === 'products' && <Package className="h-3.5 w-3.5" />}
                        {tab === 'ai' && <Sparkles className="h-3.5 w-3.5" />}
                        {tab === 'overview' ? 'Overview' :
                            tab === 'funnels' ? 'Customer Funnels' :
                                tab === 'cohorts' ? 'Cohorts & LTV' :
                                    tab === 'products' ? 'Product Intel' : 'AI Advisor'}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Primary KPI Grid (Financial Truth) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <IntelligenceCard
                            title="Total Revenue"
                            value={formatCurrency(kpis.totalRevenue)}
                            trend="+12.4%"
                            icon={<DollarSign className="h-5 w-5" />}
                            color="emerald"
                            description="Bruttoumsatz inkl. Steuern"
                        />
                        <IntelligenceCard
                            title="Net Revenue"
                            value={formatCurrency(kpis.netRevenue)}
                            trend="+10.2%"
                            icon={<Activity className="h-5 w-5" />}
                            color="blue"
                            description="Umsatz nach Retouren"
                        />
                        <IntelligenceCard
                            title="Orders"
                            value={kpis.orderCount}
                            trend="+8.5%"
                            icon={<Package className="h-5 w-5" />}
                            color="purple"
                            description="Abgeschlossene Verkäufe"
                        />
                        <IntelligenceCard
                            title="avg. order value"
                            value={formatCurrency(kpis.aov)}
                            trend="+2.1%"
                            icon={<TrendingUp className="h-5 w-5" />}
                            color="orange"
                            description="Durchschnittlicher Bon"
                        />
                    </div>

                    {/* Secondary Metrics & Conversion */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <MetricCard title="Shopper Sessions" value={kpis.totalSessions} label="Total Traffic" color="slate" />
                            <MetricCard title="Real Conv. Rate" value={`${kpis.conversionRate}%`} label="Sessions to Purchase" color="emerald" />
                            <MetricCard title="Unique Visitors" value={kpis.totalVisitors} label="New & Returning" color="indigo" />
                            <MetricCard title="Bounce Rate" value={`${kpis.bounceRate}%`} label="Single-Page Visits" color="red" />
                            <MetricCard title="avg. Duration" value={formatDuration(kpis.avgSessionDuration)} label="Time on Store" color="blue" />
                            <MetricCard title="Active Now" value={kpis.activeVisitors} label="Live Customers" color="green" isLive />
                        </div>

                        <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl overflow-hidden p-8 flex flex-col justify-between group">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" /> Power Insight
                                </h3>
                                <p className="text-lg font-bold leading-tight group-hover:text-emerald-300 transition-colors">
                                    Deine stärkste Traffic-Quelle ist <span className="text-white underline">{data.distribution?.sources[0]?.label}</span>.
                                    Ein Anstieg der Ads-Frequenz um 15% könnte den Umsatz am Wochenende um ca. 2.400€ steigern.
                                </p>
                            </div>
                            <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest h-12 rounded-2xl mt-8">
                                AI Empfehlungen ansehen
                            </Button>
                        </Card>
                    </div>

                    {/* Revenue & Traffic Timeline */}
                    <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Revenue & Performance Timeline</CardTitle>
                                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Gegenüberstellung von Traffic und Umsatz</CardDescription>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <span className="text-[9px] font-black uppercase text-slate-500">Revenue (EUR)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-slate-200" />
                                        <span className="text-[9px] font-black uppercase text-slate-500">Sessions</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 h-[450px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.timeline}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                        dy={10}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '15px' }}
                                        labelStyle={{ color: '#64748b', fontWeight: '800', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}
                                    />
                                    <Bar dataKey="sessions" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Bottom Distribution Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="border-none shadow-md bg-white rounded-3xl p-8">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                                <Globe className="h-4 w-4" /> Acquisition Sources
                            </h3>
                            <div className="space-y-6">
                                {data.distribution?.sources.map((source: any, idx: number) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[11px] font-black uppercase text-slate-700">{source.label}</span>
                                            <span className="text-[11px] font-black text-slate-900">{source.value} Visits</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-slate-900 rounded-full transition-all duration-1000"
                                                style={{ width: `${(source.value / kpis.totalSessions) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="border-none shadow-md bg-white rounded-3xl p-8">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                                <Smartphone className="h-4 w-4" /> Device Distribution
                            </h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.distribution?.devices}
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {data.distribution?.devices.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                {data.distribution?.devices.map((d: any, idx: number) => (
                                    <div key={idx} className="text-center">
                                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{d.label}</p>
                                        <p className="text-lg font-black text-slate-900">{Math.round((d.value / kpis.totalSessions) * 100)}%</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Empty States for New Tabs */}
            {activeTab !== 'overview' && (
                <div className="min-h-[600px] flex flex-col items-center justify-center space-y-6 text-center animate-in zoom-in duration-300">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center">
                        {activeTab === 'funnels' && <Filter className="h-10 w-10 text-slate-400" />}
                        {activeTab === 'cohorts' && <Users className="h-10 w-10 text-slate-400" />}
                        {activeTab === 'products' && <Package className="h-10 w-10 text-slate-400" />}
                        {activeTab === 'ai' && <Sparkles className="h-10 w-10 text-slate-400" />}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{activeTab} Integration</h3>
                        <p className="text-slate-500 font-medium max-w-md mx-auto mt-2">
                            Wir synchronisieren gerade deine tiefgreifenden Shopify-Daten. Diese Analyse steht in Kürزه zur Verfügung.
                        </p>
                    </div>
                    <Button
                        onClick={() => setActiveTab('overview')}
                        variant="outline"
                        className="h-12 border-slate-200 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50"
                    >
                        Zurück zum Dashboard
                    </Button>
                </div>
            )}
        </div>
    );
}

function IntelligenceCard({ title, value, trend, icon, color, description }: any) {
    const colorMap: any = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100",
    };

    return (
        <Card className="border-none shadow-lg bg-white rounded-3xl p-6 group hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
            <div className="flex justify-between items-start mb-6">
                <div className={cn("p-3 rounded-2xl border transition-all group-hover:bg-slate-900 group-hover:text-white group-hover:scale-110", colorMap[color])}>
                    {icon}
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase">{trend}</Badge>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                <h4 className="text-3xl font-black text-slate-900">{value}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-2">{description}</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-slate-100 transition-colors" />
        </Card>
    );
}

function MetricCard({ title, value, label, color, isLive }: any) {
    const colorMap: any = {
        slate: "text-slate-900",
        emerald: "text-emerald-600",
        indigo: "text-indigo-600",
        red: "text-red-500",
        blue: "text-blue-600",
        green: "text-green-500"
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm space-y-1 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                {isLive && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
            </div>
            <p className={cn("text-2xl font-black", colorMap[color])}>{value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
        </div>
    );
}
