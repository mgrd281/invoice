'use client'

import { HeaderNavIcons } from '@/components/navigation/header-nav-icons'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, RefreshCcw } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

import { RecoveryDashboard } from '@/components/settings/recovery/recovery-dashboard'
import { TimelineBuilder } from '@/components/settings/recovery/timeline-builder'
import { TemplateManager } from '@/components/settings/recovery/template-manager'
import { RulesPerformance } from '@/components/settings/recovery/rules-performance'

export default function PaymentRemindersSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { showToast, ToastContainer } = useToast()

    const [vorkasse, setVorkasse] = useState<any>({})
    const [rechnung, setRechnung] = useState<any>({})
    const [stats, setStats] = useState<any>({ openAmount: 0, recoveredAmount: 0, activeRuns: 0, successRate: 0 })
    const [funnel, setFunnel] = useState<any[]>([])

    useEffect(() => {
        loadSettings()
        loadStats()
    }, [])

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/settings/payment-reminders')
            if (res.ok) {
                const data = await res.json()
                setVorkasse(data.vorkasse || {})
                setRechnung(data.rechnung || {})
            }
        } catch (error) {
            console.error('Failed to load settings', error)
            showToast('Fehler beim Laden der Einstellungen', 'error')
        } finally {
            setLoading(false)
        }
    }

    const loadStats = async () => {
        try {
            const res = await fetch('/api/settings/recovery/stats')
            if (res.ok) {
                const data = await res.json()
                if (data.stats) setStats(data.stats)
                if (data.funnel) setFunnel(data.funnel)
            }
        } catch (error) {
            console.error('Failed to load stats', error)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/settings/payment-reminders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vorkasse,
                    rechnung
                })
            })

            if (res.ok) {
                showToast('Strategie gespeichert und aktiviert', 'success')
            } else {
                throw new Error('Failed to save')
            }
        } catch (error) {
            console.error('Failed to save settings', error)
            showToast('Fehler beim Speichern', 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Sticky Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center gap-4">
                            <HeaderNavIcons />
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">
                                    Revenue Recovery Center
                                </h1>
                                <p className="text-xs text-slate-500 font-medium">
                                    Enterprise Dunning & Automation
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${rechnung.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${rechnung.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                {rechnung.enabled ? 'Recovery Active' : 'Recovery Paused'}
                            </div>
                            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Speichert...' : 'Strategie speichern'}
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Zone A: KPIs */}
                <section>
                    <RecoveryDashboard stats={stats} funnel={funnel} />
                </section>

                <Tabs defaultValue="rechnung" className="space-y-8">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-lg">
                            <TabsTrigger value="rechnung" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Kauf auf Rechnung</TabsTrigger>
                            <TabsTrigger value="vorkasse" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Vorkasse / Überweisung</TabsTrigger>
                        </TabsList>
                        <Button variant="ghost" size="sm" className="text-slate-500" onClick={loadStats}>
                            <RefreshCcw className="w-3 h-3 mr-2" />
                            Daten aktualisieren
                        </Button>
                    </div>

                    <TabsContent value="rechnung" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Zone B: Timeline */}
                        <section>
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-slate-900">Recovery Timeline</h2>
                                <p className="text-sm text-slate-500">Passen Sie den zeitlichen Ablauf Ihrer Mahnstufen an.</p>
                            </div>
                            <TimelineBuilder settings={rechnung} onUpdate={setRechnung} />
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Zone C: Templates */}
                            <div className="lg:col-span-2">
                                <TemplateManager settings={rechnung} onUpdate={setRechnung} type="rechnung" />
                            </div>

                            {/* Zone D: Rules */}
                            <div>
                                <RulesPerformance settings={rechnung} onUpdate={setRechnung} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="vorkasse" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Similar structure for Vorkasse */}
                        <section>
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-slate-900">Vorkasse Timeline</h2>
                                <p className="text-sm text-slate-500">Zeitplan für unbezahlte Vorkasse-Bestellungen.</p>
                            </div>
                            <TimelineBuilder settings={vorkasse} onUpdate={setVorkasse} />
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <TemplateManager settings={vorkasse} onUpdate={setVorkasse} type="vorkasse" />
                            </div>
                            <div>
                                <RulesPerformance settings={vorkasse} onUpdate={setVorkasse} />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            <ToastContainer />
        </div>
    )
}
