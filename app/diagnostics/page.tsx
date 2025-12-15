'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Mail, Key, FileText } from 'lucide-react'

export default function DiagnosticPage() {
    const [isChecking, setIsChecking] = useState(false)
    const [results, setResults] = useState<any>(null)

    const runDiagnostics = async () => {
        setIsChecking(true)
        try {
            const response = await fetch('/api/diagnostics/shopify')
            const data = await response.json()
            setResults(data)
        } catch (error) {
            console.error('Diagnostic error:', error)
        } finally {
            setIsChecking(false)
        }
    }

    const StatusIcon = ({ status }: { status: boolean }) => {
        return status ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
            <XCircle className="h-5 w-5 text-red-600" />
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold text-gray-900">System Diagnostics</h1>
                    <p className="text-gray-600">Überprüfen Sie die Shopify-Integration und Automatisierung</p>
                </div>

                {/* Run Diagnostics Button */}
                <Card>
                    <CardContent className="pt-6">
                        <Button
                            onClick={runDiagnostics}
                            disabled={isChecking}
                            className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {isChecking ? (
                                <>
                                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                    Überprüfe System...
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-5 w-5 mr-2" />
                                    Diagnose starten
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results */}
                {results && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Shopify Connection */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <StatusIcon status={results.shopifyConnection} />
                                    Shopify Verbindung
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Shop Domain:</span>
                                    <Badge variant="outline">{results.shopDomain || 'Nicht konfiguriert'}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Access Token:</span>
                                    <Badge variant={results.hasAccessToken ? 'default' : 'destructive'}>
                                        {results.hasAccessToken ? 'Konfiguriert' : 'Fehlt'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Email Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5" />
                                    E-Mail Einstellungen
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Auto-Send Email:</span>
                                    <Badge variant={results.autoSendEmail ? 'default' : 'secondary'}>
                                        {results.autoSendEmail ? 'Aktiviert ✓' : 'Deaktiviert'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">SMTP Konfiguriert:</span>
                                    <Badge variant={results.smtpConfigured ? 'default' : 'destructive'}>
                                        {results.smtpConfigured ? 'Ja' : 'Nein'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Resend API:</span>
                                    <Badge variant={results.resendConfigured ? 'default' : 'secondary'}>
                                        {results.resendConfigured ? 'Konfiguriert' : 'Nicht konfiguriert'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Digital Products */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Key className="h-5 w-5" />
                                    Digitale Produkte
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Produkte mit Keys:</span>
                                    <Badge variant="outline">{results.digitalProductsCount || 0}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Verfügbare Keys:</span>
                                    <Badge variant="outline">{results.availableKeysCount || 0}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Orders */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Letzte Bestellungen
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Rechnungen (Gesamt):</span>
                                        <Badge variant="outline">{results.totalInvoices || 0}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Letzte 24h:</span>
                                        <Badge variant="outline">{results.invoicesLast24h || 0}</Badge>
                                    </div>
                                </div>

                                {results.recentOrders && results.recentOrders.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        <p className="text-sm font-semibold text-gray-700">Letzte 5 Bestellungen:</p>
                                        {results.recentOrders.map((order: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                                <span className="text-sm">{order.number}</span>
                                                <div className="flex gap-2">
                                                    <Badge variant={order.emailSent ? 'default' : 'secondary'}>
                                                        {order.emailSent ? 'Email ✓' : 'Kein Email'}
                                                    </Badge>
                                                    <Badge variant={order.keySent ? 'default' : 'secondary'}>
                                                        {order.keySent ? 'Key ✓' : 'Kein Key'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recommendations */}
                        {results.recommendations && results.recommendations.length > 0 && (
                            <Card className="border-orange-200 bg-orange-50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-orange-900">
                                        <AlertCircle className="h-5 w-5" />
                                        Empfehlungen
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {results.recommendations.map((rec: string, i: number) => (
                                            <li key={i} className="text-sm text-orange-800 flex items-start gap-2">
                                                <span className="text-orange-600">•</span>
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
