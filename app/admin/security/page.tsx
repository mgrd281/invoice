'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { SecurityHeader } from "@/components/admin/security/security-header"
import { ThreatDashboard } from "@/components/admin/security/threat-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Download, UserX, Shield, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export default function AdminSecurityPage() {
    const [stats, setStats] = useState<any>(null)
    const [feed, setFeed] = useState<any[]>([])
    const [blocklist, setBlocklist] = useState<{ users: any[], ips: any[] }>({ users: [], ips: [] })
    const [liveEvents, setLiveEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const loadData = useCallback(async () => {
        try {
            const [statsRes, feedRes, blocklistRes, liveRes] = await Promise.all([
                fetch('/api/admin/security/stats'),
                fetch('/api/admin/security/feed'),
                fetch('/api/admin/security/blocklist'),
                fetch('/api/admin/security/live')
            ])

            if (statsRes.ok) setStats(await statsRes.json())
            if (feedRes.ok) setFeed(await feedRes.json())
            if (blocklistRes.ok) setBlocklist(await blocklistRes.json())
            if (liveRes.ok) setLiveEvents(await liveRes.json())

        } catch (error) {
            console.error('Failed to load security data', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const handleUnblock = async (id: string, type: 'ip' | 'user') => {
        if (!confirm(`Möchten Sie dieses ${type === 'ip' ? 'IP' : 'Kunden'} wirklich entsperren?`)) return;
        try {
            const res = await fetch(`/api/admin/security/blocklist?id=${id}&type=${type}`, { method: 'DELETE' });
            if (res.ok) loadData();
        } catch (e) {
            alert('Entsperren fehlgeschlagen');
        }
    }

    const handleBlockIp = async (ip: string) => {
        const reason = prompt(`Grund für die Sperre von ${ip}:`, 'Suspicious Activity');
        if (!reason) return;
        try {
            const res = await fetch('/api/admin/security/blocklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, reason })
            });
            if (res.ok) loadData();
        } catch (e) {
            alert('Sperren fehlgeschlagen');
        }
    }

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, 10000)
        return () => clearInterval(interval)
    }, [loadData])

    if (loading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <SecurityHeader
                riskLevel={stats?.riskLevel || 'Low'}
                onBlockUser={() => { }}
            />

            <ThreatDashboard stats={stats} feed={feed} />

            <div className="space-y-4">
                <Tabs defaultValue="live" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-white border border-slate-200">
                            <TabsTrigger value="blocklist">Blockliste</TabsTrigger>
                            <TabsTrigger value="live">Live Events</TabsTrigger>
                            <TabsTrigger value="automation">Automatisierung</TabsTrigger>
                            <TabsTrigger value="audit">Audit Log</TabsTrigger>
                        </TabsList>

                        <div className="flex gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input placeholder="Suchen..." className="pl-9 bg-white border-slate-200" />
                            </div>
                            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    <TabsContent value="blocklist" className="space-y-6">
                        {blocklist.users.length === 0 && blocklist.ips.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {blocklist.users.map((user: any) => (
                                    <Card key={user.id} className="border-slate-200 shadow-sm">
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                                                        <UserX className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 line-clamp-1">{user.email}</p>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                                            Risk Score: High
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-sm text-slate-500 mb-4">
                                                <div className="flex justify-between">
                                                    <span>Grund:</span>
                                                    <span className="font-medium text-slate-700">{user.reason || 'Sicherheitsverstoß'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Seit:</span>
                                                    <span>{formatDistanceToNow(new Date(user.blockedAt), { locale: de, addSuffix: true })}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                                <Button variant="ghost" size="sm" className="w-full text-slate-600">Details</Button>
                                                <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleUnblock(user.id, 'user')}>Entsperren</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {blocklist.ips.map((ip: any) => (
                                    <Card key={ip.id} className="border-slate-200 shadow-sm">
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                                                        <Shield className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{ip.ipAddress}</p>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                                                            IP Blocked
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-sm text-slate-500 mb-4">
                                                <div className="flex justify-between">
                                                    <span>Grund:</span>
                                                    <span className="font-medium text-slate-700">{ip.reason || 'Suspicious Activity'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Dauer:</span>
                                                    <span>{ip.type === 'PERMANENT' ? 'Permanent' : 'Temporär'}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                                <Button variant="ghost" size="sm" className="w-full text-slate-600">Details</Button>
                                                <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleUnblock(ip.id, 'ip')}>Entsperren</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="live">
                        <Card className="border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3">IP Adresse</th>
                                            <th className="px-6 py-3">Seite / Event</th>
                                            <th className="px-6 py-3">Zeitpunkt</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Aktion</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {liveEvents.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Keine Live-Events gefunden</td>
                                            </tr>
                                        ) : (
                                            liveEvents.map((event) => (
                                                <tr key={event.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono font-medium text-slate-900">{event.ip}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium truncate max-w-[200px]">{event.page}</span>
                                                            <span className="text-[10px] opacity-50 uppercase">{event.type}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                                        {formatDistanceToNow(new Date(event.time), { locale: de, addSuffix: true })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${event.status === 'BLOCKED' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                                            }`}>
                                                            {event.status === 'BLOCKED' ? 'Gesperrt' : 'Aktiv'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {event.status !== 'BLOCKED' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => handleBlockIp(event.ip)}
                                                            >
                                                                IP Sperren
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="automation">
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle>Automatisierungsregeln</CardTitle>
                                <CardDescription>Erstellen Sie Regeln zur automatischen Abwehr von Angriffen.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                                    <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                    <h3 className="text-lg font-medium text-slate-900">Keine Regeln aktiv</h3>
                                    <p className="text-slate-500 mb-6">Starten Sie mit einer Vorlage oder erstellen Sie eine eigene Regel.</p>
                                    <Button>+ Regel erstellen</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="audit">
                        <Card className="border-slate-200">
                            <CardContent className="p-12 text-center text-slate-500">
                                Audit Log Placeholder
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50">
                <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Keine blockierten Benutzer</h3>
            <p className="text-slate-500 text-center max-w-md mb-8">
                Ihr Shop ist aktuell sauber. Blockieren Sie verdächtige Kunden manuell oder aktivieren Sie den automatischen Schutz.
            </p>
            <div className="flex gap-4">
                <Button variant="outline">Simulation starten</Button>
                <Button className="bg-slate-900 text-white hover:bg-slate-800">+ Benutzer blockieren</Button>
            </div>
        </div>
    )
}
