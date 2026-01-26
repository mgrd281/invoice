'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Bot, Zap, Activity, TrendingUp, DollarSign,
    Plus, History, ShieldAlert, Play, Pause,
    Settings2, ChevronRight, Sparkles, Brain, Layout,
    Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnterpriseHeader } from '@/components/layout/enterprise-header'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast, Toast } from '@/components/ui/toast'
import { AutomationCanvas } from '@/components/ai/automation-canvas'

import { ErrorBoundary } from '@/components/error-boundary'

function AIAutomationPage() {
    const [automation, setAutomation] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'automations' | 'content' | 'settings'>('overview')
    const [status, setStatus] = useState<'active' | 'paused'>('active')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { showToast, toasts, removeToast } = useToast()

    // Environment Validation
    useEffect(() => {
        const loadAutomation = async () => {
            try {
                const response = await fetch('/api/ai/automation')
                if (!response.ok) throw new Error(`Server Status ${response.status}`)
                const data = await response.json()
                if (data.success && data.automation) {
                    setAutomation(data.automation)
                    setStatus(data.automation.status === 'ACTIVE' ? 'active' : 'paused')
                }
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        loadAutomation()
    }, [])

    if (loading) return <LoadingState />
    if (error) return <ErrorCard message={error} onRetry={() => window.location.reload()} />

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="pb-[56px]">
                <EnterpriseHeader />
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-in fade-in duration-500">
                {/* Enterprise Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">AI Automation Center</h1>
                        <p className="text-slate-500 font-medium mt-1">Ihre KI erstellt und veröffentlicht Inhalte automatisch.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="h-10 px-4 font-black text-[10px] uppercase tracking-widest border-slate-200">
                            Logs
                        </Button>
                        <Button className="h-10 px-6 font-black text-[10px] uppercase tracking-widest bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200">
                            Neue Automation
                        </Button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
                    {[
                        { id: 'overview', label: 'Überblick' },
                        { id: 'automations', label: 'Automationen' },
                        { id: 'content', label: 'Inhalte' },
                        { id: 'settings', label: 'Einstellungen' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === tab.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="pt-2">
                    {activeTab === 'overview' && <OverviewTab automation={automation} status={status} />}
                    {activeTab === 'automations' && <AutomationsTab automation={automation} />}
                    {activeTab === 'content' && <ContentTab automation={automation} showToast={showToast} setAutomation={setAutomation} />}
                    {activeTab === 'settings' && <SettingsTab automation={automation} />}
                </div>
            </main>

            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
            </div>
        </div>
    )
}

// --- SUB-COMPONENTS ---

function OverviewTab({ automation, status }: any) {
    const kpis = [
        { label: 'Veröffentlichte Artikel', value: '142', trend: '+12%', icon: Layout },
        { label: 'Aktive Automationen', value: '3', trend: 'Stabil', icon: Zap },
        { label: 'Organischer Traffic', value: '12.4k', trend: '+24%', icon: TrendingUp },
        { label: 'Content Umsatz', value: '€4.290', trend: '+18%', icon: DollarSign }
    ]

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <Card key={i} className="border-none shadow-sm bg-white rounded-3xl p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-900 border border-slate-100">
                                <kpi.icon className="w-5 h-5" />
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px]">{kpi.trend}</Badge>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <h3 className="text-3xl font-black text-slate-900">{kpi.value}</h3>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-12 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-6">
                        <div className={cn(
                            "w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl",
                            status === 'active' ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500"
                        )}>
                            <Bot className="w-10 h-10" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className={cn(
                                    "text-[9px] font-black uppercase border-none",
                                    status === 'active' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500"
                                )}>
                                    Status: {status === 'active' ? 'Aktiv' : 'Pausiert'}
                                </Badge>
                                {status === 'active' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight italic">KI Content-Zentrale</h2>
                            <p className="text-slate-400 text-sm font-medium">Ihre KI analysiert Trends und erstellt automatisch Fachartikel.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8 bg-white/5 p-6 rounded-3xl border border-white/5">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Letzte Ausführung</p>
                            <p className="text-sm font-bold">{new Date(automation?.lastRun).toLocaleTimeString('de-DE')} Uhr</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Nächste Veröffentlichung</p>
                            <p className="text-sm font-bold text-emerald-400">In 4 Stunden</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function AutomationsTab({ automation }: any) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {['Name', 'Typ', 'Status', 'Zeitplan', 'Letzte Ausführung', 'Aktion'].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-6 text-sm font-black text-slate-900 uppercase">{automation?.name || 'Shopify Growth Bot'}</td>
                                <td className="px-6 py-6 text-xs text-slate-500 font-bold uppercase">Blog Marketing</td>
                                <td className="px-6 py-6"><Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase">Aktiv</Badge></td>
                                <td className="px-6 py-6 text-xs text-slate-500 font-bold uppercase">Täglich 09:00</td>
                                <td className="px-6 py-6 text-xs text-slate-500 font-bold">Vor 12 Min</td>
                                <td className="px-6 py-6">
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"><Settings2 className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600"><Play className="w-4 h-4" /></Button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Workflow Builder
                </h3>
                <Card className="border-none shadow-xl bg-white rounded-3xl p-10">
                    <div className="flex flex-col items-center gap-8">
                        <WorkflowStep number={1} icon={Activity} title="Quelle" detail="Marktplatz Trends & Konkurrenz" />
                        <div className="w-px h-10 bg-slate-100" />
                        <WorkflowStep number={2} icon={Search} title="Recherche" detail="Keywords + Trend-Analyse" />
                        <div className="w-px h-10 bg-slate-100" />
                        <WorkflowStep number={3} icon={Sparkles} title="Schreiben" detail="Blogartikel (Lock: DEUTSCH)" />
                        <div className="w-px h-10 bg-slate-100" />
                        <WorkflowStep number={4} icon={ShieldAlert} title="Optimieren" detail="SEO + Expert Quality Gate" />
                        <div className="w-px h-10 bg-slate-100" />
                        <WorkflowStep number={5} icon={Layout} title="Veröffentlichen" detail="Shopify Blogs (Auto-Post)" />
                    </div>
                </Card>
            </div>
        </div>
    )
}

function WorkflowStep({ number, icon: Icon, title, detail }: any) {
    return (
        <div className="flex items-center gap-6 w-full max-w-xl group">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xl relative z-10 group-hover:bg-violet-600 transition-colors">
                {number}
            </div>
            <div className="flex-1 p-6 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between group-hover:bg-white group-hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl text-slate-400 group-hover:text-violet-600 shadow-sm">
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase text-slate-900 tracking-tight">{title}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{detail}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-200 hover:text-slate-900 transition-colors">
                    <Settings2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}

function ContentTab({ automation, showToast, setAutomation }: any) {
    const [topic, setTopic] = useState('')
    const [isPublishing, setIsPublishing] = useState(false)

    const handleManualPublish = async () => {
        if (!topic.trim()) {
            showToast('Bitte ein Thema eingeben', 'error')
            return
        }

        setIsPublishing(true)
        try {
            const res = await fetch('/api/ai/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'GENERATE_BLOG', topic })
            })

            const data = await res.json()
            if (data.success) {
                showToast('Blog-Artikel erfolgreich veröffentlicht!', 'success')
                setTopic('')
                if (automation && setAutomation) {
                    setAutomation({
                        ...automation,
                        logs: [data.logEntry, ...(automation.logs || [])]
                    })
                }
            } else {
                throw new Error(data.error || 'Fehler beim Generieren')
            }
        } catch (err: any) {
            showToast(err.message, 'error')
        } finally {
            setIsPublishing(false)
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="border-none shadow-xl bg-white rounded-3xl p-10 mt-2">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-slate-900 rounded-2xl text-white">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Manueller Publisher</h3>
                        <p className="text-slate-500 font-medium text-sm">Sofortige Artikel-Generierung (Deutsch) zu jedem Thema.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Thema oder Keyword eingeben (z.B. Hausbau Trends 2026)..."
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualPublish()}
                        className="flex-1 h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                    />
                    <Button
                        onClick={handleManualPublish}
                        disabled={isPublishing || !topic.trim()}
                        className="h-14 px-10 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-100 disabled:opacity-50"
                    >
                        {isPublishing ? 'Generiere...' : 'Artikel Veröffentlichen'}
                    </Button>
                </div>
            </Card>

            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Layout className="w-4 h-4" /> Content Bibliothek
                </h3>
                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                    <CardContent className="p-0">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {['Titel', 'Status', 'SEO Score', 'Veröffentlichungsdatum', 'Aktion'].map(h => (
                                        <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                <tr className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-black">AI</div>
                                            <p className="text-sm font-black text-slate-900 uppercase">Zukunft des ERP Systems 2026</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6"><Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase">Veröffentlicht</Badge></td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-[94%]" />
                                            </div>
                                            <span className="text-[10px] font-black">94</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-xs text-slate-500 font-bold uppercase">24. Jan 2026</td>
                                    <td className="px-6 py-6">
                                        <Button variant="ghost" size="sm" className="text-[10px] font-black text-blue-600 hover:bg-blue-50">BEARBEITEN</Button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function SettingsTab({ automation }: any) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-10">
                <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] p-10 overflow-hidden relative">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
                        <Brain className="w-4 h-4" /> Brand Voice Einstellungen
                    </h3>
                    <div className="space-y-8 relative z-10">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Sprache</p>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase">Deutsch (Lock)</Badge>
                                </div>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tonfall</p>
                                <p className="text-sm font-black uppercase">Professionell</p>
                            </div>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Zielgruppe</p>
                            <p className="text-sm font-black uppercase">B2B / Enterprise Entscheider</p>
                        </div>
                        <Button className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 font-black text-xs uppercase tracking-widest rounded-2xl">
                            Markenprofil bearbeiten
                        </Button>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                </Card>
            </div>

            <div className="space-y-10">
                <Card className="border-none shadow-sm bg-white rounded-3xl p-10">
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 mb-8 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-500" /> Smart Autopilot Regeln
                    </h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Keine doppelten Themen', desc: 'Prüfhistorie vor Generierung', status: true },
                            { label: 'Produkte automatisch verlinken', desc: 'Shopify Product Search API', status: true },
                            { label: 'Nur veröffentlichen wenn SEO > 80', desc: 'Qualitäts-Gate aktiv', status: true },
                            { label: 'Content AI Expert-Mode', desc: 'Deep Research enabled', status: true }
                        ].map((rule, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="text-xs font-black uppercase text-slate-900">{rule.label}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{rule.desc}</p>
                                </div>
                                <Switch checked={rule.status} />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    )
}

function LoadingState() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">KI-Kern wird geladen...</p>
            </div>
        </div>
    )
}

function ErrorCard({ message, onRetry }: any) {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-none shadow-2xl bg-white rounded-[2.5rem] p-10 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <ShieldAlert className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Systemausfall</h2>
                <p className="text-sm text-slate-500 mt-2 mb-8 font-medium">Teil konnte nicht geladen werden.<br />{message}</p>
                <Button onClick={onRetry} className="h-14 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl w-full shadow-2xl shadow-slate-200 transition-all">
                    System Neu laden
                </Button>
            </Card>
        </div>
    )
}

const StatusCheck = ({ className }: { className?: string }) => <Zap className={className} />
const NodeSearch = ({ className }: { className?: string }) => <Bot className={className} />

export default function Page() {
    return (
        <ErrorBoundary>
            <Suspense fallback={
                <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                </div>
            }>
                <AIAutomationPage />
            </Suspense>
        </ErrorBoundary>
    )
}
