'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, CheckCircle, Shield, Zap, FileText, Download, Send } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth-compat'

export default function UStVAPage() {
    const { user } = useAuth()
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = () => {
        setIsSubmitting(true)
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false)
            setIsSubmitted(true)
        }, 2000)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="mr-4">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Zurück
                                </Button>
                            </Link>
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg mr-3">
                                <FileText className="h-6 w-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Umsatzsteuervoranmeldung
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                    {/* Left Side: Info & Status */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                Automatische UStVA für Dezember 2025
                            </h2>
                            <p className="text-lg text-gray-600 mb-6">
                                Basierend auf Ihren erfassten Einnahmen und Ausgaben haben wir Ihre Umsatzsteuervoranmeldung vorbereitet.
                            </p>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                                <div className="flex items-start">
                                    <Shield className="w-6 h-6 text-blue-600 mr-3 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-blue-900 mb-1">Elster Secure Integration</h3>
                                        <p className="text-blue-700 text-sm">
                                            Ihre Daten werden verschlüsselt und sicher direkt an das Finanzamt übermittelt.
                                            Unser Zertifikat ist aktuell und gültig.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <ul className="space-y-4">
                                {[
                                    "Automatische Berechnung der Zahllast",
                                    "Berücksichtigung aller erfassten Belege",
                                    "Direkter Versand ohne Elster-Formular",
                                    "Sofortige Übermittlungsbestätigung"
                                ].map((item, index) => (
                                    <li key={index} className="flex items-center">
                                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                                        <span className="text-gray-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right Side: The Form/Card */}
                    <div className="relative">
                        {/* Decorative background blob */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl transform rotate-3 opacity-50 blur-lg"></div>

                        <Card className="relative border-0 shadow-2xl bg-white overflow-hidden">
                            <CardHeader className="bg-gray-50 border-b px-8 py-6 flex flex-row items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="text-xs text-gray-500 font-mono flex items-center bg-white px-2 py-1 rounded border">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Elster Secure
                                </div>
                            </CardHeader>

                            <CardContent className="p-8">
                                {isSubmitted ? (
                                    <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle className="w-10 h-10 text-green-600" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Erfolgreich übermittelt!</h3>
                                        <p className="text-gray-600 mb-8">
                                            Ihre Umsatzsteuervoranmeldung für Dezember 2025 wurde erfolgreich an das Finanzamt gesendet.
                                        </p>
                                        <div className="flex justify-center space-x-4">
                                            <Button variant="outline" className="flex items-center">
                                                <Download className="w-4 h-4 mr-2" />
                                                Protokoll herunterladen
                                            </Button>
                                            <Link href="/dashboard">
                                                <Button>Zurück zum Dashboard</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center border-b pb-6">
                                            <div>
                                                <div className="text-sm text-gray-500 mb-1">Voranmeldungszeitraum</div>
                                                <div className="font-bold text-xl text-gray-900">Dezember 2025</div>
                                            </div>
                                            <div className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center">
                                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                                Bereit zur Übermittlung
                                            </div>
                                        </div>

                                        <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Umsatzsteuer (19%)</span>
                                                <span className="font-mono font-bold text-lg">1.245,50 €</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Vorsteuer (Abziehbar)</span>
                                                <span className="font-mono font-bold text-lg text-red-500">- 450,20 €</span>
                                            </div>
                                            <div className="h-px bg-gray-300 my-2"></div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-gray-900 text-lg">Zahllast</span>
                                                <span className="font-mono font-bold text-2xl text-blue-600">795,30 €</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Button
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg shadow-lg transition-all hover:scale-[1.02]"
                                                onClick={handleSubmit}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                                        Wird übermittelt...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-5 h-5 mr-2" />
                                                        Jetzt an Finanzamt senden
                                                    </>
                                                )}
                                            </Button>
                                            <p className="text-xs text-center text-gray-500">
                                                Durch Klicken bestätigen Sie die Richtigkeit der Angaben gemäß § 18 UStG.
                                            </p>
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 text-center">
                                                <strong>Hinweis:</strong> Dies ist eine Demo-Version. Es werden keine echten Daten an das Finanzamt übermittelt.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
