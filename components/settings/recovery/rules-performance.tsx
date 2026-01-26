'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Zap, Shield, BarChart3 } from "lucide-react"

interface RulesPerformanceProps {
    settings: any
    onUpdate: (settings: any) => void
}

export function RulesPerformance({ settings, onUpdate }: RulesPerformanceProps) {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Automation Rules
                    </CardTitle>
                    <CardDescription>Intelligente Regeln für den Mahnprozess.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Mahnwesen aktiv</Label>
                            <p className="text-sm text-muted-foreground">
                                Automatische E-Mails senden.
                            </p>
                        </div>
                        <Switch
                            checked={settings.enabled}
                            onCheckedChange={(checked) => onUpdate({ ...settings, enabled: checked })}
                        />
                    </div>

                    <div className="flex items-center justify-between opacity-50">
                        <div className="space-y-0.5">
                            <Label className="text-base">Bagatellgrenze</Label>
                            <p className="text-sm text-muted-foreground">
                                Keine Mahnung unter 5,00 €
                            </p>
                        </div>
                        <Switch disabled checked={true} />
                    </div>

                    <div className="flex items-center justify-between opacity-50">
                        <div className="space-y-0.5">
                            <Label className="text-base">Wochenende pausieren</Label>
                            <p className="text-sm text-muted-foreground">
                                Keine E-Mails Sa/So senden.
                            </p>
                        </div>
                        <Switch disabled />
                    </div>

                    <div className="rounded-lg bg-amber-50 p-3 mt-4 flex gap-2 items-start text-xs text-amber-800">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Weitere smarte Regeln (z.B. Kundengruppen-Logik) sind in Ihrem aktuellen Plan noch nicht freigeschaltet.
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Performance Optimierung
                    </CardTitle>
                    <CardDescription>Analysen zur Verbesserung der Zahlungsquote.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-700">Bester Zeitpunkt</span>
                                <Badge variant="secondary">Dienstag, 10:00</Badge>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full w-[70%]"></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                E-Mails am Dienstagmorgen haben eine 20% höhere Öffnungsrate.
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-700">Effektivste Stufe</span>
                                <Badge variant="secondary">1. Erinnerung</Badge>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full w-[45%]"></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                45% der Zahlungen erfolgen nach der ersten freundlichen Erinnerung.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
