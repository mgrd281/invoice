'use client'

import { TelegramSettingsForm } from '@/components/telegram-settings-form'
import { ProtectedRoute } from '@/components/protected-route'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TelegramPage() {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 flex items-center mb-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Zurück zum Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">Telegram Automation</h1>
                        <p className="text-gray-600">Verwalten Sie Ihre Telegram-Integration und Berichte.</p>
                    </div>

                    <TelegramSettingsForm />
                </div>
            </div>
        </ProtectedRoute>
    )
}
