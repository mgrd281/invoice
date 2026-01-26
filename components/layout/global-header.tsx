'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Home } from 'lucide-react'
import { SectionMeta } from '@/types/section-meta'
import { Button } from '@/components/ui/button'

interface GlobalHeaderProps {
    sectionMeta: SectionMeta
}

export function GlobalHeader({ sectionMeta }: GlobalHeaderProps) {
    const router = useRouter()

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back()
        } else {
            router.push('/dashboard')
        }
    }

    const handleHome = () => {
        router.push('/dashboard')
    }

    const IconComponent = sectionMeta.icon
    const iconColor = sectionMeta.color || '#64748B'

    return (
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-200">
            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-9 w-9 rounded-full hover:bg-slate-100 transition-colors"
                    title="Zurück"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHome}
                    className="h-9 w-9 rounded-full hover:bg-slate-100 transition-colors"
                    title="Zur Startseite"
                >
                    <Home className="h-5 w-5 text-slate-600" />
                </Button>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200" />

            {/* Section Info */}
            <div className="flex items-center gap-3">
                <div
                    className="flex items-center justify-center h-10 w-10 rounded-lg"
                    style={{ backgroundColor: `${iconColor}15` }}
                >
                    <IconComponent
                        className="h-5 w-5"
                        style={{ color: iconColor }}
                    />
                </div>

                <div>
                    <h1 className="text-xl font-bold text-slate-900 leading-none">
                        {sectionMeta.title}
                    </h1>
                    {sectionMeta.description && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            {sectionMeta.description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
