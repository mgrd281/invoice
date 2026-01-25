'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    Users,
    Monitor,
    Smartphone,
    Tablet,
    MousePointer2,
    Clock,
    TrendingUp,
    ArrowLeft,
    ArrowRight,
    Search,
    Globe,
    Share2,
    ShoppingCart,
    AlertCircle,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Download,
    Activity
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import NextLink from 'next/link';
import { toast } from 'sonner';

const COLORS = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

export default function AnalyticsDashboard() {
    const [data, setData] = useState<any>(null);
    const [range, setRange] = useState('7d');
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics/overview?range=${range}`);
            const json = await res.json();
            if (json.success) {
                setData(json);
            }
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

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const smartInsights = useMemo(() => {
        if (!data) return [];
        const insights = [];
        const kpis = data.kpis;

        if (kpis.bounceRate > 60) {
            insights.push({
                type: 'warning',
                text: 'Deine Absprungrate ist über 60%. Überprüfe die Ladezeiten deiner Top-Seiten.'
            });
        }

        const topSource = data.distribution.sources.sort((a: any, b: any) => b.value - a.value)[0];
        if (topSource) {
            insights.push({
                type: 'success',
                text: `${topSource.label} ist deine stärkste Traffic-Quelle. Optimiere Werbebudgets für diesen Kanal.`
            });
        }

        const mobileShare = data.distribution.devices.find((d: any) => d.label === 'mobile')?.value || 0;
        const total = data.kpis.totalSessions;
        if (mobileShare > (total * 0.7)) {
            insights.push({
                type: 'info',
                text: 'Über 70% deiner Besucher nutzen Mobilgeräte. Prüfe das mobile Design deines Checkouts.'
            });
        }

        return insights;
    }, [data]);

    if (loading && !data) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                    <TrendingUp className="h-10 w-10" />
                    <p>Analysedaten werden geladen...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <NextLink href="/dashboard">
                            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-slate-900">
                                <ArrowLeft className="h-4 w-4" /> Zurück zum Dashboard
                            </Button>
                        </NextLink>
                        <NextLink href="/dashboard/live-analytics">
                            <Button variant="ghost" size="sm" className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Activity className="h-4 w-4" /> Live Monitor
                            </Button>
                        </NextLink>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-2xl shadow-sm">
                            <TrendingUp className="h-8 w-8 text-blue-600" />
                        </div>
                        Shop Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1">Vollständige Übersicht über Besucher, Traffic und Verhalten.</p>
                </div>

                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <div className="flex items-center gap-2 bg-white border rounded-lg p-1 px-3 shadow-sm">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <Select value={range} onValueChange={setRange}>
                            <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0">
                                <SelectValue placeholder="Zeitraum wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Heute</SelectItem>
                                <SelectItem value="yesterday">Gestern</SelectItem>
                                <SelectItem value="7d">Letzte 7 Tage</SelectItem>
                                <SelectItem value="30d">Letzte 30 Tage</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" className="gap-2 shadow-sm bg-white" onClick={() => toast.info('Export-Funktion wird vorbereitet')}>
                        <Download className="h-4 w-4" /> Export
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Gesamtbesucher"
                    value={data?.kpis.totalVisitors}
                    icon={<Users className="h-5 w-5" />}
                    color="blue"
                    description="Einzigartige Nutzer"
                    href="/dashboard/live-analytics"
                />
                <KPICard
                    title="Live Besucher"
                    value={data?.kpis.activeVisitors}
                    icon={<div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                    color="green"
                    description="Gerade aktiv"
                    href="/dashboard/live-analytics?filter=live"
                />
                <KPICard
                    title="Sitzungen"
                    value={data?.kpis.totalSessions}
                    icon={<MousePointer2 className="h-5 w-5" />}
                    color="purple"
                    description="Besuchsvorgänge"
                    href="/dashboard/live-analytics"
                />
                <KPICard
                    title="Conversion Rate"
                    value={`${data?.kpis?.conversionRate ?? 0}%`}
                    icon={<Zap className="h-5 w-5" />}
                    color="amber"
                    description="Bestellabschluss"
                    href="/dashboard/live-analytics?filter=purchase"
                />
            </div>

            {/* Row 2: Secondary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ø Sitzungsdauer</p>
                    <p className="text-2xl font-bold">{formatDuration(data?.kpis?.avgSessionDuration ?? 0)}</p>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Zeit pro Besuch
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seiten / Sitzung</p>
                    <p className="text-2xl font-bold">{data?.kpis?.pagesPerSession ?? 0}</p>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Monitor className="h-3 w-3" /> Browsing Tiefe
                    </div>
                </div>
                <div
                    className="bg-white p-6 rounded-2xl border shadow-sm space-y-2 flex flex-col justify-center cursor-pointer hover:border-red-200 transition-colors"
                    onClick={() => window.location.href = '/dashboard/live-analytics?filter=bounce'}
                >
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Absprungrate (Bounce)</p>
                    <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold">{data?.kpis?.bounceRate ?? 0}%</p>
                        <Badge variant={(data?.kpis?.bounceRate ?? 0) > 50 ? "destructive" : "secondary"} className="mb-1 text-[9px] h-4">
                            {(data?.kpis?.bounceRate ?? 0) > 50 ? 'Kritisch' : 'Gut'}
                        </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Sofortige Abbrüche
                    </div>
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline Chart */}
                <Card className="lg:col-span-2 border-none shadow-md overflow-hidden bg-white/80 backdrop-blur-md">
                    <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-600" /> Besucherfluss
                        </CardTitle>
                        <CardDescription>Sitzungen über den gewählten Zeitraum</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-10 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.timeline}>
                                <defs>
                                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748B' }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
                                />
                                <Area type="monotone" dataKey="sessions" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSessions)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Device Distribution */}
                <Card className="border-none shadow-md overflow-hidden bg-white/80 backdrop-blur-md">
                    <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-purple-600" /> Geräte
                        </CardTitle>
                        <CardDescription>Desktop vs. Mobile vs. Tablet</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 h-[350px] flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={data?.distribution.devices}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data?.distribution.devices.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-4 mt-6 w-full">
                            {data?.distribution.devices.map((d: any, idx: number) => (
                                <div key={d.label} className="flex items-center gap-2 text-xs">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <span className="text-muted-foreground uppercase font-bold">{d.label}:</span>
                                    <span className="font-bold">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 4: Sources & Top Pages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic Sources */}
                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <Globe className="h-5 w-5 text-blue-500" /> Traffic Quellen
                        </CardTitle>
                        <CardDescription>Woher kommen deine Besucher?</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.distribution.sources} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} hide />
                                <YAxis
                                    type="category"
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }}
                                />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Pages Table */}
                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <ArrowUpRight className="h-5 w-5 text-emerald-500" /> Top Seiten
                        </CardTitle>
                        <CardDescription>Die am meisten besuchten URLs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.topPages.map((page: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{page.url}</p>
                                            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground uppercase font-medium">
                                                <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {formatDuration(page.avgDuration)}</span>
                                                <span className="flex items-center gap-1"><ArrowDownRight className="h-2.5 w-2.5 text-red-400" /> {page.exitRate}% Exit</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-800">{page.views}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase py-0.5">Views</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Smart Insights Footer */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold flex items-center gap-2 mb-6 text-blue-400">
                        <Zap className="h-6 w-6" /> Smart Shop Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {smartInsights.length > 0 ? smartInsights.map((insight: any, i: number) => (
                            <div key={i} className={`p-4 rounded-2xl border flex gap-4 ${insight.type === 'warning' ? 'bg-red-500/10 border-red-500/30' :
                                insight.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
                                    'bg-blue-500/10 border-blue-500/30'
                                }`}>
                                <div className={`p-3 rounded-xl h-fit ${insight.type === 'warning' ? 'bg-red-500/20 text-red-300' :
                                    insight.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                                        'bg-blue-500/20 text-blue-300'
                                    }`}>
                                    {insight.type === 'warning' ? <AlertCircle className="h-5 w-5" /> :
                                        insight.type === 'success' ? <TrendingUp className="h-5 w-5" /> :
                                            <Monitor className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium leading-relaxed opacity-90">{insight.text}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-400 italic">Sammle mehr Daten für automatisierte Insights...</p>
                        )}
                    </div>
                </div>
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-32 -mb-32" />
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, color, description, href }: any) {
    const colorClasses: any = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-green-50 text-green-600 border-green-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
    };

    const content = (
        <Card className={`border-none shadow-md group hover:shadow-lg transition-all duration-300 bg-white ${href ? 'cursor-pointer' : ''}`}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                        <h4 className="text-3xl font-black text-slate-800">{value ?? 0}</h4>
                    </div>
                    <div className={`p-3 rounded-2xl border transition-all duration-300 group-hover:scale-110 ${colorClasses[color]}`}>
                        {icon}
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${color === 'green' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{description}</p>
                </div>
            </CardContent>
        </Card>
    );

    if (href) {
        return <NextLink href={href}>{content}</NextLink>;
    }

    return content;
}
