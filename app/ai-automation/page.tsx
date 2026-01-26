'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Bot, Zap, Activity, TrendingUp, DollarSign,
    Plus, History, ShieldAlert, Play, Pause,
    Settings2, ChevronRight, Sparkles, Brain, Layout
} from 'lucide-react'
import { EnterpriseHeader } from '@/components/layout/enterprise-header'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast, Toast } from '@/components/ui/toast'
import { AutomationCanvas } from '@/components/ai/automation-canvas'

import { ErrorBoundary } from '@/components/error-boundary'

function AIAutomationPage() {
    const [automation, setAutomation] = useState<any>(null)
    const [isAutonomous, setIsAutonomous] = useState(true)
    const [status, setStatus] = useState<'active' | 'paused'>('active')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { showToast, toasts, removeToast } = useToast()

    // Environment Validation
    const [envValid, setEnvValid] = useState(true)
    useEffect(() => {
        // Only run on client
        if (typeof window !== 'undefined') {
            // Check for critical production env vars if needed
            // For now, it's just a placeholder for the logic requested
        }
    }, [])

    const kpis = [
        { label: 'Generierte Inhalte', value: '142', trend: '+12%', color: 'text-violet-600', icon: Brain },
        { label: 'Veröffentlichte Blogs', value: '89', trend: '+8%', color: 'text-blue-600', icon: Layout },
        { label: 'Organischer Traffic', value: '12.4k', trend: '+24%', color: 'text-emerald-600', icon: TrendingUp },
        { label: 'Content Umsatz', value: '€4.290', trend: '+18%', color: 'text-fuchsia-600', icon: DollarSign }
    ]

    useEffect(() => {
        const loadAutomation = async () => {
            try {
                const response = await fetch('/api/ai/automation')
                if (!response.ok) {
                    throw new Error(`Server antwortete mit Status ${response.status}`)
                }
                const data = await response.json()
                if (data.success && data.automation) {
                    setAutomation(data.automation)
                    setIsAutonomous(data.automation.isAutonomous)
                    setStatus(data.automation.status === 'ACTIVE' ? 'active' : 'paused')
                } else {
                    throw new Error(data.error || 'Automatisierungs-Daten konnten nicht geladen werden.')
                }
            } catch (err: any) {
                console.error('Failed to load automation:', err)
                setError(err.message || 'Ein unbekannter Fehler ist aufgetreten.')
                showToast(err.message || 'Fehler beim Laden', 'error')
            } finally {
                setLoading(false)
            }
        }
        loadAutomation()
    }, [showToast])

    const toggleStatus = async () => {
        const nextStatus = status === 'active' ? 'paused' : 'active'
        setStatus(nextStatus)
        showToast(`AI Automation ${nextStatus === 'active' ? 'aktiviert' : 'pausiert'}`, 'info')
        try {
            const res = await fetch('/api/ai/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'STATUS', value: nextStatus })
            })
            if (!res.ok) throw new Error('Status konnte nicht aktualisiert werden')
        } catch (err) {
            showToast('Verbindungsfehler beim Aktualisieren', 'error')
        }
    }

    const killSwitch = async () => {
        setStatus('paused')
        showToast('NOTFALL-STOPP: Alle Automatisierungen gestoppt.', 'error')
        try {
            await fetch('/api/ai/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'KILL_SWITCH' })
            })
        } catch (err) {
            console.error('Kill switch failed', err)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading AI Core...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-none shadow-2xl bg-white rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase">Fehler bei Initialisierung</h2>
                    <p className="text-sm text-slate-500 mt-2 mb-6">{error}</p>
                    <Button
                        onClick={() => window.location.reload()}
                        className="h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl w-full"
                    >
                        Neu laden
                    </Button>
                </Card>
            </div>
        )
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
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-100 font-black text-[10px] uppercase tracking-widest px-2">
                                <Bot className="w-3 h-3 mr-1" /> Autonomous Mode
                            </Badge>
                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-white border border-slate-100 shadow-sm">
                                <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-[10px] font-black uppercase text-slate-500">{status === 'active' ? 'AI Aktiv' : 'Pausiert'}</span>
                            </div>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">AI Automation Center</h1>
                        <p className="text-slate-500 font-medium">KI arbeitet rund um die Uhr für Ihr Wachstum.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="h-10 px-4 font-black text-xs uppercase tracking-widest border-slate-200">
                            <History className="w-4 h-4 mr-2" /> Logs
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={killSwitch}
                            className="h-10 px-4 font-black text-xs uppercase tracking-widest bg-red-600 hover:bg-red-700 shadow-xl shadow-red-100"
                        >
                            <ShieldAlert className="w-4 h-4 mr-2" /> Kill Switch
                        </Button>
                        <Button className="h-10 px-6 font-black text-xs uppercase tracking-widest bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200">
                            <Plus className="w-4 h-4 mr-2" /> Neue Automation
                        </Button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpis.map((kpi, i) => (
                        <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden bg-white">
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
                                    <div className={`h-full opacity-50 ${kpi.color.replace('text', 'bg')}`} style={{ width: '70%' }} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content Areas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Automation Control & Builder Preview */}
                    <div className="lg:col-span-2 space-y-8">
                        <ErrorBoundary>
                            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-200">
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-black uppercase">{automation?.name || 'Active Workflow'}</CardTitle>
                                                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    AI Blog + SEO + Shopify Publisher
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2 px-3">
                                                <span className="text-[10px] font-black uppercase text-slate-500">Autonomous</span>
                                                <Switch checked={isAutonomous} onCheckedChange={async (val) => {
                                                    setIsAutonomous(val)
                                                    try {
                                                        await fetch('/api/ai/automation', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ action: 'TOGGLE_AUTONOMOUS', value: val })
                                                        })
                                                    } catch (e) {
                                                        showToast('Änderung konnte nicht gespeichert werden', 'error')
                                                    }
                                                }} />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={toggleStatus} className={`rounded-xl ${status === 'active' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {status === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <AutomationCanvas />
                                </CardContent>
                            </Card>
                        </ErrorBoundary>

                        {/* Recent Logs/Activity */}
                        <Card className="border-none shadow-sm bg-white rounded-3xl">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <History className="w-4 h-4" /> Letzte Aktivitäten
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50">
                                    {automation?.logs?.map((log: any, i: number) => (
                                        <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                    <StatusCheck className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 uppercase">{log.event}: {log.detail}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {new Date(log.time).toLocaleDateString('de-DE')} {new Date(log.time).toLocaleTimeString('de-DE')} • Status: {log.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-[10px] font-black text-blue-600">ANSEHEN</Button>
                                        </div>
                                    ))}
                                    {(!automation?.logs || automation.logs.length === 0) && (
                                        <div className="p-12 text-center">
                                            <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase text-slate-400">Keine Aktivitäten gefunden</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Settings & AI Memory */}
                    <div className="space-y-8">
                        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl overflow-hidden">
                            <CardHeader className="bg-white/5 border-b border-white/5">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4" /> Brand Voice Lock
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase text-slate-500">Tonfall</span>
                                        <Badge className="bg-violet-600 text-white border-none text-[9px] font-black uppercase">Professional</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase text-slate-500">Zielgruppe</span>
                                        <Badge className="bg-slate-700 text-white border-none text-[9px] font-black uppercase">Enterprise</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase text-slate-500">Emoji-Usage</span>
                                        <Badge className="bg-red-500/20 text-red-400 border-none text-[9px] font-black uppercase">Blocked</Badge>
                                    </div>
                                </div>
                                <div className="h-px w-full bg-white/5" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">AI MEMORY STATUS</p>
                                    <div className="flex items-center justify-between gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="text-center flex-1">
                                            <p className="text-xl font-black">2.4k</p>
                                            <p className="text-[8px] font-black text-slate-500 uppercase">Keywords</p>
                                        </div>
                                        <div className="text-center flex-1">
                                            <p className="text-xl font-black">1.1k</p>
                                            <p className="text-[8px] font-black text-slate-500 uppercase">Topics</p>
                                        </div>
                                    </div>
                                </div>
                                <Button className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 font-black text-xs uppercase tracking-widest rounded-2xl">
                                    Brand Profile Edit
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-white rounded-3xl">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Smart Rules
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-4">
                                {[
                                    { label: 'Avoid Duplicate Topics', status: true },
                                    { label: 'Auto-Link Products', status: true },
                                    { label: 'Only Score > 80', status: true },
                                    { label: 'Competitor Analysis', status: false }
                                ].map((rule, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-600">{rule.label}</span>
                                        <Switch checked={rule.status} className="scale-75" />
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full h-10 border-slate-100 mt-4 text-[10px] font-black uppercase tracking-widest">
                                    Alle Regeln Verwalten
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
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
