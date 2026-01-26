'use client'

import { useState, useEffect, Suspense } from 'react'
import { EnterpriseHeader } from '@/components/layout/enterprise-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
    Activity, Search, Zap, Layout,
    ListFilter, Settings, Box, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Sub-components
import { SeoOverview } from '@/components/seo/seo-overview'
import { SeoScanWizard } from '@/components/seo/seo-scan-wizard'
import { SeoIssueCenter } from '@/components/seo/seo-issue-center'
import { SeoProductTable } from '@/components/seo/seo-product-table'
import { SeoAutopilotSettings } from '@/components/seo/seo-autopilot-settings'

// Types
import {
    SeoScan, SeoIssue, SeoProductScore,
    SeoStats, AutopilotConfig, SeoScanOptions
} from '@/types/seo-types'

type SeoTab = 'overview' | 'results' | 'products' | 'autopilot'

function SEOIntelligencePage() {
    const [activeTab, setActiveTab] = useState<SeoTab>('overview')
    const [isWizardOpen, setIsWizardOpen] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [scanProgress, setScanProgress] = useState<SeoScan | undefined>()

    const [stats, setStats] = useState<SeoStats>({
        healthScore: 74,
        criticalErrors: 12,
        warnings: 24,
        opportunities: 42,
        lastScan: {
            timestamp: '24. Jan 2026, 14:12',
            duration: 12400,
            pagesScanned: 542
        }
    })

    const [issues, setIssues] = useState<SeoIssue[]>([
        {
            id: 'iss_1',
            url: '/products/premium-leather-bag',
            title: 'Titel-Tag zu kurz',
            issue: 'Titel ist nur 28 Zeichen lang, empfohlen sind 50-60.',
            resourceType: 'Product',
            severity: 'High',
            category: 'On-Page',
            fixType: 'auto',
            status: 'pending',
            impact: 7,
            recommendation: 'Erweitern Sie den Titel um relevante Keywords.',
            createdAt: new Date().toISOString()
        },
        {
            id: 'iss_2',
            url: '/collections/spring-2024',
            title: 'H1 Überschrift fehlt',
            issue: 'Keine H1 Überschrift auf dieser Kategorieseite gefunden.',
            resourceType: 'Collection',
            severity: 'Critical',
            category: 'Technical',
            fixType: 'manual',
            status: 'pending',
            impact: 10,
            recommendation: 'Fügen Sie eine aussagekräftige H1 Überschrift hinzu.',
            createdAt: new Date().toISOString()
        }
    ])

    const [products, setProducts] = useState<SeoProductScore[]>([
        {
            id: 'p_1',
            handle: '/products/leather-bag',
            title: 'Premium Leather Bag',
            type: 'product',
            score: 45,
            titleLength: 28,
            titleOptimal: false,
            metaQuality: 'poor',
            contentDepth: 120,
            missingAlts: 4,
            hasSchema: true,
            lastChecked: new Date().toISOString()
        },
        {
            id: 'p_2',
            handle: '/products/silk-scarf',
            title: 'Silk Scarf Limited',
            type: 'product',
            score: 88,
            titleLength: 54,
            titleOptimal: true,
            metaQuality: 'good',
            contentDepth: 450,
            missingAlts: 0,
            hasSchema: true,
            lastChecked: new Date().toISOString()
        }
    ])

    const [autopilotConfig, setAutopilotConfig] = useState<AutopilotConfig>({
        mode: 'off',
        confidenceThreshold: 0.85,
        neverChangePrice: true,
        preserveBrandNames: true,
        uniquenessThreshold: 95,
        dailyLimit: 20,
        protectedPages: []
    })

    const { showToast, toasts, removeToast } = useToast()

    const handleStartScan = async (options: SeoScanOptions) => {
        setIsScanning(true)
        // Start polling or simulate progress
        let progress = 0
        const interval = setInterval(() => {
            progress += 5
            setScanProgress({
                id: 'scan_live',
                status: 'running',
                progress: progress,
                crawledUrls: Math.floor(progress * 5.4),
                totalUrls: 542,
                currentStage: progress < 30 ? 'crawl' : progress < 80 ? 'analyze' : 'score',
                options,
                startedAt: new Date().toISOString()
            })

            if (progress >= 100) {
                clearInterval(interval)
                setIsScanning(false)
                setIsWizardOpen(false)
                setActiveTab('results')
                showToast('SEO Scan erfolgreich abgeschlossen!', 'success')
            }
        }, 300)
    }

    const handleFixIssue = async (issueId: string) => {
        showToast('Fix wird angewendet...', 'info')
        await new Promise(r => setTimeout(r, 1000))
        setIssues(prev => prev.filter(i => i.id !== issueId))
        showToast('SEO Problem erfolgreich behoben!', 'success')
    }

    const handleBulkFix = async (ids: string[]) => {
        showToast(`${ids.length} Fixes werden angewendet...`, 'info')
        await new Promise(r => setTimeout(r, 2000))
        setIssues(prev => prev.filter(i => !ids.includes(i.id)))
        showToast('Batch-Optimierung abgeschlossen!', 'success')
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="pb-[56px]">
                <EnterpriseHeader />
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-[10px] uppercase tracking-widest px-2">
                                <Zap className="w-3 h-3 mr-1" /> SEO Command Center
                            </Badge>
                            {autopilotConfig.mode === 'auto' && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 shadow-sm animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[9px] font-black uppercase text-emerald-400">Autopilot Live</span>
                                </div>
                            )}
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">SEO Intelligence Center</h1>
                        <p className="text-slate-500 font-medium">Vollständiger SEO-Scan & automatische Optimierung für Shopify</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="h-12 px-6 font-black text-xs uppercase tracking-widest border-slate-200 bg-white"
                            onClick={() => setIsWizardOpen(true)}
                        >
                            <Search className="w-4 h-4 mr-2" />
                            Scan starten
                        </Button>
                        <Button
                            className={cn(
                                "h-12 px-8 font-black text-xs uppercase tracking-widest shadow-xl transition-all",
                                autopilotConfig.mode === 'auto' ? "bg-slate-900" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-100"
                            )}
                            onClick={() => setActiveTab('autopilot')}
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            {autopilotConfig.mode === 'auto' ? 'Autopilot aktiv' : 'Autopilot konfigurieren'}
                        </Button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
                    {(['overview', 'results', 'products', 'autopilot'] as const).map((tab) => (
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
                            {tab === 'overview' && <Layout className="w-3.5 h-3.5" />}
                            {tab === 'results' && <ListFilter className="w-3.5 h-3.5" />}
                            {tab === 'products' && <Box className="w-3.5 h-3.5" />}
                            {tab === 'autopilot' && <Settings className="w-3.5 h-3.5" />}
                            {tab === 'overview' ? 'Überblick' :
                                tab === 'results' ? 'Scan Ergebnisse' :
                                    tab === 'products' ? 'Produkte & Collections' : 'Einstellungen & Autopilot'}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[600px]">
                    {activeTab === 'overview' && (
                        <SeoOverview
                            stats={stats}
                            topIssues={issues.slice(0, 5)}
                            onFixIssue={handleFixIssue}
                            onStartScan={() => setIsWizardOpen(true)}
                        />
                    )}

                    {activeTab === 'results' && (
                        <SeoIssueCenter
                            issues={issues}
                            onFixIssue={handleFixIssue}
                            onBulkFix={handleBulkFix}
                        />
                    )}

                    {activeTab === 'products' && (
                        <SeoProductTable
                            products={products}
                            onUpdateProduct={(id, data) => showToast('Änderung gespeichert', 'success')}
                        />
                    )}

                    {activeTab === 'autopilot' && (
                        <SeoAutopilotSettings
                            config={autopilotConfig}
                            onUpdateConfig={setAutopilotConfig}
                            onEmergencyStop={() => {
                                setAutopilotConfig({ ...autopilotConfig, mode: 'off' })
                                showToast('AI Autopilot Not-Stopp ausgelöst!', 'error')
                            }}
                        />
                    )}
                </div>
            </main>

            {/* Scan Wizard Modal */}
            <SeoScanWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onStartScan={handleStartScan}
                scanProgress={scanProgress}
            />

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={cn(
                            "p-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 min-w-[300px]",
                            toast.type === 'success' ? "bg-white border-emerald-100 text-emerald-900" :
                                toast.type === 'error' ? "bg-red-900 text-white border-none" : "bg-white border-slate-100 text-slate-900"
                        )}
                    >
                        {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Activity className="w-5 h-5" />}
                        <span className="text-[11px] font-black uppercase tracking-tight">{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="ml-auto text-slate-400">
                            <Search className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin" />
            </div>
        }>
            <SEOIntelligencePage />
        </Suspense>
    )
}
