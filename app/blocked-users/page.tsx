'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Filter, Download } from "lucide-react"
import { SecurityKpiCards } from "@/components/security/kpi-cards"
import { SecurityList } from "@/components/security/security-list"
import { BlockModal } from "@/components/security/block-modal"
import { AutomationSettings } from "@/components/security/automation-settings"
import { useToast } from "@/components/ui/toast"

export default function SecurityPage() {
    const [stats, setStats] = useState({ blockedEmails: 0, blockedIps: 0, recentAttempts: 0 })
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(true)
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
    const { showToast, ToastContainer } = useToast()

    const loadData = async () => {
        setLoading(true)
        try {
            const [statsRes, listRes] = await Promise.all([
                fetch('/api/security/stats'),
                fetch('/api/security/list')
            ])
            const statsData = await statsRes.json()
            const listData = await listRes.json()

            setStats(statsData)
            setList(listData.items || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleBlock = async (data: any) => {
        const res = await fetch('/api/security/block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        if (res.ok) {
            showToast("Erfolgreich blockiert", "success")
            loadData() // Refresh
        } else {
            showToast("Fehler beim Blockieren", "error")
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl space-y-8">
            <ToastContainer />

            <BlockModal
                isOpen={isBlockModalOpen}
                onClose={() => setIsBlockModalOpen(false)}
                onBlock={handleBlock}
            />

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Security Management Center</h1>
                <p className="text-slate-500 mt-2">Überwachen und verwalten Sie blockierte Benutzer, IPs und Sicherheitsregeln.</p>
            </div>

            {/* KPIs */}
            <SecurityKpiCards stats={stats} />

            {/* Main Content */}
            <Tabs defaultValue="list" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList>
                        <TabsTrigger value="list">Blockliste</TabsTrigger>
                        <TabsTrigger value="automation">Automatisierung</TabsTrigger>
                        <TabsTrigger value="audit">Audit Log</TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Suchen..." className="pl-9 w-64" />
                        </div>
                        <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
                        <Button onClick={() => setIsBlockModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-100">
                            <Plus className="mr-2 h-4 w-4" /> Benutzer blockieren
                        </Button>
                    </div>
                </div>

                <TabsContent value="list" className="mt-0">
                    <SecurityList
                        items={list}
                        isLoading={loading}
                        onUnblock={() => { }}
                        onOpenBlockModal={() => setIsBlockModalOpen(true)}
                    />
                </TabsContent>

                <TabsContent value="automation" className="mt-0">
                    <AutomationSettings />
                </TabsContent>

                <TabsContent value="audit" className="mt-0">
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                        Audit Log Integration coming soon...
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
