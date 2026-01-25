'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Shield, ShieldAlert, Trash2, Plus, Search, Lock, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuthenticatedFetch } from '@/lib/api-client'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface BlockedIp {
    id: string
    ipAddress: string
    reason: string | null
    createdAt: string
}

export default function SecurityPage() {
    const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([])
    const [newIp, setNewIp] = useState('')
    const [newReason, setNewReason] = useState('')
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const authenticatedFetch = useAuthenticatedFetch()

    const fetchBlockedIps = async () => {
        setLoading(true)
        try {
            const res = await authenticatedFetch('/api/security/blocked-ips')
            if (res.ok) {
                const data = await res.json()
                setBlockedIps(data.blockedIps)
            }
        } catch (e) {
            console.error("Failed to fetch blocked IPs", e)
        } finally {
            setLoading(false)
        }
    }

    const addIp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newIp) return

        try {
            const res = await authenticatedFetch('/api/security/blocked-ips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ipAddress: newIp, reason: newReason })
            })
            if (res.ok) {
                setNewIp('')
                setNewReason('')
                fetchBlockedIps()
            }
        } catch (e) { }
    }

    const removeIp = async (id: string) => {
        try {
            const res = await authenticatedFetch(`/api/security/blocked-ips?id=${id}`, {
                method: 'DELETE'
            })
            if (res.ok) fetchBlockedIps()
        } catch (e) { }
    }

    useEffect(() => {
        fetchBlockedIps()
    }, [])

    const filteredIps = blockedIps.filter(item =>
        item.ipAddress.includes(searchTerm) || (item.reason && item.reason.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-2">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Zurück zum Dashboard
                    </Link>
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="bg-red-100 p-2 rounded-lg shadow-sm">
                                <Shield className="w-8 h-8 text-red-600" />
                            </div>
                            Sicherheit & IP-Sperren
                        </h1>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Echtzeitschutz Aktiv
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add IP Form */}
                    <div className="lg:col-span-1">
                        <Card className="shadow-xl border-none">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-red-500" /> Adresse Sperren
                                </CardTitle>
                                <CardDescription>Gesperrte IPs haben keinen Zugriff mehr auf Ihren Shopify Store.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={addIp} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">IP-Adresse</label>
                                        <Input
                                            placeholder="z.B. 192.168.1.1"
                                            value={newIp}
                                            onChange={(e) => setNewIp(e.target.value)}
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Grund (Optional)</label>
                                        <Input
                                            placeholder="z.B. Fraud Verdacht"
                                            value={newReason}
                                            onChange={(e) => setNewReason(e.target.value)}
                                            className="text-xs"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-10">
                                        <Plus className="w-4 h-4 mr-2" /> IP sperren
                                    </Button>
                                </form>

                                <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <div className="flex gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                        <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                                            VORSICHT: Das Sperren einer IP-Adresse verhindert jegliche Interaktion des Nutzers mit Ihrem Store. Stellen Sie sicher, dass die Adresse korrekt ist.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Blocklist Table */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-xl border-none min-h-[500px]">
                            <CardHeader className="border-b bg-gray-50/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold">Aktive Sperrliste</CardTitle>
                                        <CardDescription className="text-xs">Aktuell sind {blockedIps.length} Adressen gesperrt.</CardDescription>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <Input
                                            placeholder="Suchen..."
                                            className="pl-9 h-8 text-xs w-48 bg-white border-gray-200"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-100">
                                    {loading ? (
                                        <div className="p-20 text-center text-gray-400 text-sm">Lade Sperrliste...</div>
                                    ) : filteredIps.length === 0 ? (
                                        <div className="p-20 text-center">
                                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Shield className="w-10 h-10 text-gray-200" />
                                            </div>
                                            <h3 className="text-gray-900 font-bold">Keine Sperren</h3>
                                            <p className="text-gray-500 text-xs mt-1">Es sind aktuell keine IP-Adressen gesperrt.</p>
                                        </div>
                                    ) : (
                                        filteredIps.map((item) => (
                                            <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-all flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                                        <ShieldAlert className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 font-mono tracking-tighter">{item.ipAddress}</p>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{format(new Date(item.createdAt), 'dd. MMM HH:mm', { locale: de })}</span>
                                                            {item.reason && (
                                                                <>
                                                                    <span className="text-gray-200">|</span>
                                                                    <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">{item.reason}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => removeIp(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
