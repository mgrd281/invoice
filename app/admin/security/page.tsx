'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Lock, Globe, Smartphone } from "lucide-react"
import { SecurityList } from "@/components/security/security-list" // Reuse
import { SecurityKpiCards } from "@/components/security/kpi-cards" // Reuse

export default function AdminSecurityPage() {
    // Mock data for display purposes
    const stats = { blockedEmails: 12, blockedIps: 5, recentAttempts: 140 }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sicherheitscenter</h1>
                <p className="text-slate-500">Globale Sicherheitsüberwachung und Session Management.</p>
            </div>

            {/* Reuse KPI Cards */}
            <SecurityKpiCards stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Sessions */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-violet-600" /> Aktive Admin Sessions
                        </CardTitle>
                        <CardDescription>Geräte, die aktuell Zugriff auf das Admin Panel haben.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded border border-slate-200 flex items-center justify-center">
                                    💻
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">MacBook Pro (dieses Gerät)</p>
                                    <p className="text-xs text-slate-500">Chrome • Frankfurt, DE • IP 192.168.1.1</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="text-green-600 border-green-200 bg-green-50 pointer-events-none">Aktiv</Button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-50 rounded border border-slate-200 flex items-center justify-center">
                                    📱
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">iPhone 14 Pro</p>
                                    <p className="text-xs text-slate-500">Safari • Berlin, DE • Vor 2 Std.</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">Revoke</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 2FA Status */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-emerald-600" /> Authentifizierung
                        </CardTitle>
                        <CardDescription>Sicherheitsstandards für Administratoren.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-900">2-Faktor-Authentifizierung (2FA)</p>
                                <p className="text-sm text-slate-500">Für alle Admins erzwungen</p>
                            </div>
                            <Button variant="outline" disabled className="text-emerald-600 bg-emerald-50 border-emerald-200">Aktiviert</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-900">Passwort Policy</p>
                                <p className="text-sm text-slate-500">Min. 12 Zeichen, Sonderzeichen erforderlich</p>
                            </div>
                            <Button variant="outline">Bearbeiten</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
