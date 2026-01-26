'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    TrendingUp, Activity, AlertCircle, CheckCircle2, Search,
    Zap, Play, Pause, ShieldAlert, History, Settings2,
    Globe, BarChart3, Bot, Layout, Info, Sparkles,
    ChevronRight, ArrowUpRight, MessageSquare
} from 'lucide-react'
import { EnterpriseHeader } from '@/components/layout/enterprise-header'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

function SEOIntelligencePage() {
    const [isAutonomous, setIsAutonomous] = useState(false)
    const [status, setStatus] = useState<'active' | 'paused'>('paused')
    const [isScanning, setIsScanning] = useState(false)
    const [report, setReport] = useState<any>(null)
    const { showToast, ToastContainer } = useToast()

    const defaultKpis = [
        { label: 'SEO Health Score', value: '74', trend: '+12%', color: 'text-emerald-600', icon: Activity, sparkline: '70%' },
        { label: 'Kritische Fehler', value: '12', trend: '-4', color: 'text-red-500', icon: AlertCircle, sparkline: '30%' },
        { label: 'Optimierte Seiten', value: '1,248', trend: '+89', color: 'text-blue-600', icon: CheckCircle2, sparkline: '85%' },
        { label: 'Traffic Gewinn', value: '+24%', trend: '+3.2k', color: 'text-violet-600', icon: TrendingUp, sparkline: '60%' }
    ]

    const [kpis, setKpis] = useState(defaultKpis)

    const toggleStatus = () => {
        const nextStatus = status === 'active' ? 'paused' : 'active'
        setStatus(nextStatus)
        showToast(`Auto‑SEO ${nextStatus === 'active' ? 'aktiviert' : 'pausiert'}`, 'info')
    }

    const startScan = async () => {
        setIsScanning(true)
        showToast('Full Store SEO Scan gestartet...', 'success')

        try {
            const response = await fetch('/api/seo/scan', { method: 'POST' })
            const data = await response.json()

            if (data.success && data.report) {
                setReport(data.report)

                // Update KPIs with real data
                setKpis([
                    { label: 'SEO Health Score', value: data.report.healthScore.toString(), trend: 'NEW', color: 'text-emerald-600', icon: Activity, sparkline: `${data.report.healthScore}%` },
                    { label: 'Kritische Fehler', value: data.report.criticalErrors.toString(), trend: 'SCAN', color: 'text-red-500', icon: AlertCircle, sparkline: '30%' },
                    { label: 'Optimierte Seiten', value: '1,248', trend: 'LIVE', color: 'text-blue-600', icon: CheckCircle2, sparkline: '85%' },
                    { label: 'Traffic Gewinn', value: '+24%', trend: '+3.2k', color: 'text-violet-600', icon: TrendingUp, sparkline: '60%' }
                ])

                showToast('SEO Scan erfolgreich abgeschlossen!', 'success')
            } else {
                showToast('Scan fehlgeschlagen: ' + (data.error || 'Unbekannter Fehler'), 'error')
            }
        } catch (error) {
            console.error('Scan error:', error)
            showToast('Netzwerkfehler beim SEO Scan', 'error')
        } finally {
            setIsScanning(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="pb-[56px]">
                <EnterpriseHeader />
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-500">
                {/* Header & Status Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-[10px] uppercase tracking-widest px-2">
                                <TrendingUp className="w-3 h-3 mr-1" /> SEO Intelligence
                            </Badge>
                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-white border border-slate-100 shadow-sm">
                                <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-[10px] font-black uppercase text-slate-500">
                                    {status === 'active' ? 'Auto‑SEO Aktiv' : 'Pausiert'}
                                </span>
                            </div>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Autonomous SEO Intelligence Center</h1>
                        <p className="text-slate-500 font-medium">KI optimiert Ihren Shop automatisch für Google</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 font-black text-xs uppercase tracking-widest border-slate-200"
                            onClick={startScan}
                            disabled={isScanning}
                        >
                            <Search className={cn("w-4 h-4 mr-2", isScanning && "animate-spin")} />
                            {isScanning ? 'Scanne...' : 'SEO Scan starten'}
                        </Button>
                        <Button
                            className={cn(
                                "h-10 px-6 font-black text-xs uppercase tracking-widest shadow-xl transition-all",
                                isAutonomous ? "bg-slate-900 hover:bg-slate-800 shadow-slate-200" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-100"
                            )}
                            onClick={() => setIsAutonomous(!isAutonomous)}
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            {isAutonomous ? 'Auto-Optimierung Deaktivieren' : 'Auto‑Optimierung aktivieren'}
                        </Button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpis.map((kpi, i) => (
                        <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">
                            <CardContent className="p-6 relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white transition-all`}>
                                        <kpi.icon className="w-5 h-5" />
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px]">{kpi.trend}</Badge>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                                    <h3 className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</h3>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                                    <div className={`h-full opacity-50 ${kpi.color.replace('text', 'bg')}`} style={{ width: kpi.sparkline }} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content Areas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-2 space-y-8">
                        {/* Visual Issue Center */}
                        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-200">
                                            <ShieldAlert className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-black uppercase">Visual Issue Center</CardTitle>
                                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Identifizierte Probleme & Optimierungspotenziale
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="font-black text-[10px] uppercase tracking-widest border-slate-100">
                                        Alle ansehen ({12})
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-y border-slate-100">
                                                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">URL / Seite</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Problem</th>
                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Impact</th>
                                                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aktion</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(report?.issues || [
                                                { url: '/products/premium-leather-bag', issue: 'Titel-Tag zu kurz', impact: 'High', type: 'On-Page' },
                                                { url: '/collections/spring-2024', issue: 'H1 Überschrift fehlt', impact: 'Critical', type: 'SEO' },
                                                { url: '/', issue: 'Bilder ohne Alt-Text (14)', impact: 'Medium', type: 'Accessibility' }
                                            ]).map((row: any, i: number) => (
                                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{row.url}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{row.type}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-xs font-bold text-slate-600">{row.issue}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <Badge className={cn(
                                                            "text-[9px] font-black uppercase border-none",
                                                            row.impact === 'Critical' ? "bg-red-100 text-red-600" :
                                                                row.impact === 'High' ? "bg-orange-100 text-orange-600" :
                                                                    "bg-blue-100 text-blue-600"
                                                        )}>
                                                            {row.impact}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <Button variant="ghost" size="sm" className="text-[10px] font-black text-emerald-600 hover:bg-emerald-50">AUTO-FIX</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent SEO Logs/Activity */}
                        <Card className="border-none shadow-sm bg-white rounded-3xl">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <History className="w-4 h-4" /> SEO Optimierungs-Protokoll
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50">
                                    {[
                                        { event: 'Meta Rewrite', detail: 'Produkt: Premium Leather Bag', time: new Date(), status: 'SUCCESS' },
                                        { event: 'Alt Text Generation', detail: 'Homepage • 14 Bilder', time: new Date(Date.now() - 3600000), status: 'SUCCESS' }
                                    ].map((log, i) => (
                                        <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 uppercase">{log.event}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {log.detail} • {log.time.toLocaleTimeString('de-DE')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] font-black border-emerald-100 text-emerald-600 uppercase">Verifiziert</Badge>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-900">
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Settings, AI Safety & Monitoring */}
                    <div className="space-y-8">
                        {/* Autonomous Mode Toggle */}
                        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl overflow-hidden">
                            <CardHeader className="bg-white/5 border-b border-white/5">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Settings2 className="w-4 h-4" /> AI Fix Engine
                                    </CardTitle>
                                    <Switch checked={isAutonomous} onCheckedChange={setIsAutonomous} />
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                    Wenn aktiviert, behebt die KI identifizierte SEO-Fehler vollautomatisch nach Ihren Marken-Richtlinien.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase text-slate-500">Brand Voice</span>
                                        <Badge className="bg-violet-600 text-white border-none text-[9px] font-black uppercase">Professional</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase text-slate-500">Emergency Stop</span>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    </div>
                                </div>
                                <Button
                                    className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg border-none"
                                    onClick={toggleStatus}
                                >
                                    {status === 'active' ? 'KI PAUSIEREN' : 'KI AKTIVIEREN'}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Keyword Intelligence Overview */}
                        <Card className="border-none shadow-sm bg-white rounded-3xl">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Search className="w-4 h-4" /> Keyword Intelligence
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black uppercase text-emerald-800">Top Opportunity</span>
                                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                                        </div>
                                        <p className="text-sm font-black text-slate-900 lowercase">"nachhaltige ledertasche"</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[9px] border-emerald-200 text-emerald-700 font-bold uppercase">Volume: 3.2k</Badge>
                                            <Badge variant="outline" className="text-[9px] border-emerald-200 text-emerald-700 font-bold uppercase">Diff: Low</Badge>
                                        </div>
                                    </div>

                                    <div className="h-px w-full bg-slate-50" />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <p className="text-xl font-black text-slate-900">2.4k</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Keywords</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-black text-slate-900">84</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Top 10</p>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full h-12 border-slate-100 font-black text-xs uppercase tracking-widest rounded-2xl">
                                    Keyword Explorer
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Content AI module */}
                        <Card className="border-none shadow-sm bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-3xl overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" /> Content AI
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                <p className="text-xs font-medium text-white/80 leading-relaxed mb-6">
                                    Erstellen Sie hochoptimierte Blog-Beiträge und Produkt-FAQs basierend auf Ihren Top-Keywords.
                                </p>
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                        <span className="text-[10px] font-black uppercase text-white/80">Drafts bereit: 4</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                        <span className="text-[10px] font-black uppercase text-white/80">Regel: SEO Score {'>'} 80</span>
                                    </div>
                                </div>
                                <Button className="w-full h-12 bg-white text-indigo-700 hover:bg-slate-100 font-black text-xs uppercase tracking-widest rounded-2xl border-none">
                                    Content Planer
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <ToastContainer />
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        }>
            <SEOIntelligencePage />
        </Suspense>
    )
}
