'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Search, Globe, Trash2, ShieldX, Clock, ArrowRight, MoreHorizontal, CheckCircle2, Activity } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export function IpManagement() {
    const [ip, setIp] = useState('')
    const [reason, setReason] = useState('Abuse')
    const [duration, setDuration] = useState('permanent')
    const [search, setSearch] = useState('')

    // Mock data for the list
    const [blocks, setBlocks] = useState([
        { id: '1', ip: '45.12.89.231', country: 'CN', attempts: 12, reason: 'Brute-Force', blockedAt: '2024-03-24', expiresAt: 'Permanent', status: 'Aktiv' },
        { id: '2', ip: '192.168.1.102', country: 'DE', attempts: 5, reason: 'Spam', blockedAt: '2024-03-23', expiresAt: '2024-03-30', status: 'Aktiv' },
        { id: '3', ip: '8.8.8.8', country: 'US', attempts: 0, reason: 'Whitelisted', blockedAt: '2024-01-01', expiresAt: '-', status: 'Inaktiv' },
    ])

    return (
        <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
            {/* Create Block Form */}
            <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ShieldX className="w-4 h-4 text-red-600" /> Sperre erstellen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ip">IP-Adresse</Label>
                            <Input
                                id="ip"
                                placeholder="z.B. 192.168.1.1"
                                value={ip}
                                onChange={(e) => setIp(e.target.value)}
                                className="border-slate-200 focus:ring-slate-900"
                            />
                            <p className="text-[10px] text-slate-400">IPv4 oder IPv6 werden unterstützt.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Grund</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger className="border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Abuse">Verstoß gegen Nutzungsbedingungen</SelectItem>
                                    <SelectItem value="Brute-Force">Brute-Force Angriffe</SelectItem>
                                    <SelectItem value="Spam">Spam-Verdacht</SelectItem>
                                    <SelectItem value="Suspicious">Verdächtiges Verhalten</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Dauer</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {['1h', '24h', '7d', 'permanent'].map((d) => (
                                    <Button
                                        key={d}
                                        variant={duration === d ? 'default' : 'outline'}
                                        size="sm"
                                        className="text-xs h-8"
                                        onClick={() => setDuration(d)}
                                    >
                                        {d === 'permanent' ? 'Permanent' : d}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <Label className="text-xs text-slate-600">Global blockieren</Label>
                            <Switch />
                        </div>

                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-100 mt-2">
                            Sperre aktivieren <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 text-blue-700">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-tight">Pro-Tipp</p>
                        <p className="text-xs mt-1 leading-relaxed opacity-90">Nutzen Sie Regeln, um Brute-Force Angriffe automatisch zu erkennen.</p>
                    </div>
                </div>
            </div>

            {/* IP List Table */}
            <Card className="border-slate-200 shadow-sm flex flex-col h-[calc(100vh-320px)] min-h-[500px]">
                <CardHeader className="border-b flex flex-row items-center justify-between py-4">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Sperrliste durchsuchen..."
                            className="pl-9 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-slate-300 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-bold border-slate-200">Export</Button>
                        <Button variant="ghost" size="sm" className="h-9 px-3 text-xs font-bold text-red-600 hover:bg-red-50">Bulk Unblock</Button>
                    </div>
                </CardHeader>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b">
                            <tr>
                                <th className="px-6 py-3 w-10">
                                    <Checkbox />
                                </th>
                                <th className="px-6 py-3">IP / Land</th>
                                <th className="px-6 py-3">Versuche</th>
                                <th className="px-6 py-3 text-center">Grund</th>
                                <th className="px-6 py-3">Blockiert am</th>
                                <th className="px-6 py-3">Läuft ab</th>
                                <th className="px-6 py-3 text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {blocks.map((block) => (
                                <tr key={block.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <Checkbox />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 font-mono">{block.ip}</span>
                                            <Badge variant="outline" className="text-[10px] font-bold h-4 px-1">{block.country}</Badge>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{block.attempts}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge className={`rounded-full text-[10px] font-bold ${block.status === 'Aktiv' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            {block.reason}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{block.blockedAt}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            {block.expiresAt}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900"><MoreHorizontal className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-900 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
