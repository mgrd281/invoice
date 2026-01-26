'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserCheck, ShieldAlert, Activity, ArrowUpRight } from "lucide-react"
import { useToast } from "@/components/ui/toast"

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { showToast } = useToast()

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="p-8">Lade Dashboard...</div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Overview</h1>
                <p className="text-slate-500 mt-2">Willkommen im Enterprise Control Center.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-sm font-medium">Gesamtbenutzer</span>
                            <Users className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900">{stats?.totalUsers || 0}</h3>
                            <span className="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center">
                                <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-sm font-medium">Verifiziert</span>
                            <UserCheck className="h-4 w-4 text-slate-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{stats?.verifiedUsers || 0}</h3>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-sm font-medium">Admins</span>
                            <ShieldAlert className="h-4 w-4 text-slate-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{stats?.adminUsers || 0}</h3>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-sm font-medium">Heute Aktiv</span>
                            <Activity className="h-4 w-4 text-slate-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900">{stats?.activeToday || 0}</h3>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-2 border-slate-200">
                    <CardHeader>
                        <CardTitle>Benutzerwachstum</CardTitle>
                        <CardDescription>Anmeldungen in den letzten 30 Tagen.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center bg-slate-50/50 rounded-lg mx-6 mb-6 border border-dashed border-slate-200 text-slate-400">
                        Chart Component Placeholder
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle>Letzte Aktivitäten</CardTitle>
                        <CardDescription>Echtzeit-Feed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-500">
                                        JD
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium text-slate-900">John Doe hat sich angemeldet.</p>
                                        <p className="text-xs text-slate-500">Vor {i * 15} Minuten • IP 192.168.1.{i}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
