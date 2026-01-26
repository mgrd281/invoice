'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Zap, History, Globe, ShieldAlert } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { SecurityKpis } from "@/components/security/security-kpis"
import { IpManagement } from "@/components/security/ip-management"
import { LiveEventsFeed } from "@/components/security/live-events-feed"
import { SecurityRuleBuilder } from "@/components/security/security-rule-builder"
import { AuditLogTable } from "@/components/security/audit-log-table"
import { useToast } from "@/components/ui/toast"

export default function SecurityPage() {
    const [stats, setStats] = useState({
        blockedToday: 12,
        failedLogins24h: 145,
        activeBlocks: 89,
        riskLevel: 'Low' as const,
        trends: { blockedToday: 15, failedLogins: -5 }
    })
    const [loading, setLoading] = useState(true)
    const { ToastContainer } = useToast()

    useEffect(() => {
        // Fetch stats if API is available, otherwise use defaults
        fetch('/api/security/stats')
            .then(res => res.json())
            .then(data => {
                if (data.blockedToday !== undefined) setStats(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="space-y-8 pb-12">
            <ToastContainer />

            {/* Top Zone: Header & Status */}
            <PageHeader
                title="Sicherheit & IP-Sperren"
                subtitle="Enterprise High-Level Security Monitoring & Access Control."
                actions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Echtzeitschutz Aktiv</span>
                        </div>
                        <Button className="bg-slate-900 text-white font-bold h-10 px-6">+ Sperre hinzufügen</Button>
                    </div>
                }
            />

            <div className="max-w-7xl mx-auto px-6 space-y-8">
                {/* Dashboard: KPIs */}
                <SecurityKpis stats={stats} />

                {/* Middle & Bottom Zone: Tabs & Context */}
                <Tabs defaultValue="ips" className="w-full space-y-6">
                    <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex">
                        <TabsList className="bg-transparent h-10 gap-1">
                            <TabsTrigger value="ips" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white h-8 px-4 font-bold transition-all">
                                <Globe className="w-4 h-4 mr-2" /> IP-Sperren
                            </TabsTrigger>
                            <TabsTrigger value="events" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white h-8 px-4 font-bold transition-all">
                                <ShieldAlert className="w-4 h-4 mr-2" /> Live-Events
                            </TabsTrigger>
                            <TabsTrigger value="rules" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white h-8 px-4 font-bold transition-all">
                                <Zap className="w-4 h-4 mr-2" /> Regeln
                            </TabsTrigger>
                            <TabsTrigger value="audit" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white h-8 px-4 font-bold transition-all">
                                <History className="w-4 h-4 mr-2" /> Audit-Log
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="ips" className="mt-0 outline-none">
                        <IpManagement />
                    </TabsContent>

                    <TabsContent value="events" className="mt-0 outline-none">
                        <LiveEventsFeed />
                    </TabsContent>

                    <TabsContent value="rules" className="mt-0 outline-none">
                        <SecurityRuleBuilder />
                    </TabsContent>

                    <TabsContent value="audit" className="mt-0 outline-none">
                        <AuditLogTable />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
