'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageSquare, ShoppingBag } from "lucide-react"

interface TemplateManagerProps {
    settings: any
    onUpdate: (settings: any) => void
    type: 'rechnung' | 'vorkasse'
}

export function TemplateManager({ settings, onUpdate, type }: TemplateManagerProps) {
    const updateField = (field: string, value: any) => {
        onUpdate({ ...settings, [field]: value })
    }

    return (
        <Card className="border-slate-200">
            <CardHeader>
                <CardTitle>Kommunikations-Vorlagen</CardTitle>
                <CardDescription>Verwalten Sie die Inhalte für E-Mail, SMS und WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="email">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="email" className="flex items-center gap-2">
                            <Mail className="w-4 h-4" /> E-Mail
                        </TabsTrigger>
                        <TabsTrigger value="sms" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> SMS / WhatsApp
                        </TabsTrigger>
                        <TabsTrigger value="shopify" className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" /> Shopify Automation
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="space-y-6">
                        {type === 'rechnung' && (
                            <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-900">Initiale E-Mail (Rechnung)</h4>
                                    <Badge variant="outline">Sofort nach Kauf</Badge>
                                </div>
                                <div className="space-y-2">
                                    <Label>Betreff</Label>
                                    <Input
                                        value={settings.initialEmailSubject || ''}
                                        onChange={(e) => updateField('initialEmailSubject', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Inhalt</Label>
                                    <Textarea
                                        value={settings.initialEmailText || ''}
                                        onChange={(e) => updateField('initialEmailText', e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 border p-4 rounded-lg bg-white">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-900">1. Erinnerung (Zahlungserinnerung)</h4>
                                <Badge variant="outline">{settings.reminder1Days} Tage nach Fälligkeit</Badge>
                            </div>
                            <div className="space-y-2">
                                <Label>Betreff</Label>
                                <Input
                                    value={settings.reminder1Subject || ''}
                                    onChange={(e) => updateField('reminder1Subject', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Inhalt</Label>
                                <Textarea
                                    value={settings.reminder1Text || ''}
                                    onChange={(e) => updateField('reminder1Text', e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 border p-4 rounded-lg bg-white">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-900">2. Erinnerung (Letzte Mahnung)</h4>
                                <Badge variant="outline">{settings.reminder2Days} Tage nach 1. Erinnerung</Badge>
                            </div>
                            <div className="space-y-2">
                                <Label>Betreff</Label>
                                <Input
                                    value={settings.reminder2Subject || ''}
                                    onChange={(e) => updateField('reminder2Subject', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Inhalt</Label>
                                <Textarea
                                    value={settings.reminder2Text || ''}
                                    onChange={(e) => updateField('reminder2Text', e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="sms">
                        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                            <MessageSquare className="w-12 h-12 mb-4 text-slate-300" />
                            <h3 className="text-lg font-medium text-slate-900">SMS & WhatsApp in Kürze verfügbar</h3>
                            <p className="max-w-sm mx-auto mt-2">
                                Erreichen Sie Ihre Kunden direkt auf dem Smartphone. Diese Funktion wird im nächsten Update freigeschaltet.
                            </p>
                            <Button className="mt-6" variant="outline" disabled>Warteliste beitreten</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="shopify">
                        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                            <ShoppingBag className="w-12 h-12 mb-4 text-slate-300" />
                            <h3 className="text-lg font-medium text-slate-900">Shopify Flow Integration</h3>
                            <p className="max-w-sm mx-auto mt-2">
                                Synchronisieren Sie den Mahnstatus direkt mit Ihren Shopify Bestellungen und Tags.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

function Button({ className, variant, disabled, children }: any) {
    return <button className={`px-4 py-2 rounded text-sm font-medium ${variant === 'outline' ? 'border border-slate-300 text-slate-700' : 'bg-slate-900 text-white'} ${className}`} disabled={disabled}>{children}</button>
}
