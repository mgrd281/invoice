'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Clock, CreditCard, ChevronRight, XCircle, GripVertical } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface TimelineBuilderProps {
    settings: any
    onUpdate: (steps: any) => void
}

export function TimelineBuilder({ settings, onUpdate }: TimelineBuilderProps) {
    const [selectedStep, setSelectedStep] = useState<string | null>(null)

    // Helper to update specific field
    const updateField = (field: string, value: any) => {
        onUpdate({ ...settings, [field]: value })
    }

    const steps = [
        {
            id: 'invoice',
            type: 'start',
            label: 'Rechnung fällig',
            day: 0,
            icon: Clock,
            color: 'bg-slate-100 text-slate-500'
        },
        {
            id: 'reminder1',
            type: 'action',
            label: '1. Erinnerung',
            day: settings.reminder1Days || 3,
            fieldPrefix: 'reminder1',
            icon: Mail,
            color: 'bg-blue-100 text-blue-600',
            hasFee: false
        },
        {
            id: 'reminder2',
            type: 'action',
            label: '2. Erinnerung',
            day: settings.reminder2Days || 10,
            fieldPrefix: 'reminder2',
            icon: AlertIcon,
            color: 'bg-amber-100 text-amber-600',
            hasFee: true
        },
        {
            id: 'cancellation',
            type: 'end',
            label: 'Stornierung',
            day: settings.cancellationDays || 14,
            fieldPrefix: 'cancellation',
            icon: XCircle,
            color: 'bg-red-100 text-red-600',
            isFinal: true
        }
    ]

    return (
        <div className="relative py-8 overflow-x-auto min-h-[300px]">
            {/* Connection Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 transform -translate-y-1/2" />

            <div className="flex items-center gap-8 min-w-max px-4">
                {steps.map((step, index) => (
                    <div key={step.id} className="relative group">
                        {/* Day Indicator */}
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Tag {step.day}
                        </div>

                        <Card
                            className={`w-64 cursor-pointer transition-all hover:shadow-md border-slate-200 ${selectedStep === step.id ? 'ring-2 ring-violet-600' : ''}`}
                            onClick={() => step.type !== 'start' && setSelectedStep(step.id)}
                        >
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step.color}`}>
                                        <step.icon className="w-4 h-4" />
                                    </div>
                                    {step.type === 'action' && (
                                        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab active:cursor-grabbing" />
                                    )}
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm mb-1">{step.label}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2">
                                    {step.type === 'start' ? 'Automatisch bei Fälligkeit' :
                                        step.type === 'end' ? 'Letzte Maßnahme' :
                                            settings[`${step.fieldPrefix}Subject`] || 'Kein Betreff'}
                                </p>

                                {step.hasFee && (
                                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded px-2 py-1 w-fit">
                                        <CreditCard className="w-3 h-3" />
                                        +3% Gebühr
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Edit Panel for Selected Step */}
                        <Sheet open={selectedStep === step.id} onOpenChange={(open) => !open && setSelectedStep(null)}>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Schritt bearbeiten: {step.label}</SheetTitle>
                                    <SheetDescription>Konfigurieren Sie Zeitabstand und Inhalt.</SheetDescription>
                                </SheetHeader>

                                {step.type !== 'start' && (
                                    <div className="space-y-6 py-6">
                                        <div className="space-y-2">
                                            <Label>Ausführung nach (Tagen)</Label>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-slate-500" />
                                                <Input
                                                    type="number"
                                                    value={settings[`${step.fieldPrefix}Days`] || step.day}
                                                    onChange={(e) => updateField(`${step.fieldPrefix}Days`, parseInt(e.target.value))}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500">Tage nach dem vorherigen Schritt.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Betreff</Label>
                                            <Input
                                                value={settings[`${step.fieldPrefix}Subject`] || ''}
                                                onChange={(e) => updateField(`${step.fieldPrefix}Subject`, e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Inhalt</Label>
                                            <Input
                                                value={settings[`${step.fieldPrefix}Text`] || ''}
                                                onChange={(e) => updateField(`${step.fieldPrefix}Text`, e.target.value)}
                                                className="h-20"
                                            />
                                        </div>
                                    </div>
                                )}
                            </SheetContent>
                        </Sheet>
                    </div>
                ))}

                {/* Add Step Button (Disabled/Placeholder) */}
                <div className="relative group opacity-50 cursor-not-allowed">
                    <div className="w-64 h-[140px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50">
                        <span className="text-sm font-medium text-slate-400">+ Schritt hinzufügen</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function AlertIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    )
}
