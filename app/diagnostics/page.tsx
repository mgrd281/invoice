'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Mail, Key, FileText, Search } from 'lucide-react'

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

                        {/* Missing Invoices Checker */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Search className="h-5 w-5" />
                                    Fehlende Rechnungen prüfen
                                </CardTitle>
                                <CardDescription>
                                    Suchen Sie nach Lücken in den Rechnungsnummern
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-end">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Start</label>
                                            <Input
                                                type="number"
                                                defaultValue="1001"
                                                id="start-range"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Ende</label>
                                            <Input
                                                type="number"
                                                defaultValue="3591"
                                                id="end-range"
                                            />
                                        </div>
                                        <Button
                                            onClick={async () => {
                                                const start = (document.getElementById('start-range') as HTMLInputElement).value;
                                                const end = (document.getElementById('end-range') as HTMLInputElement).value;

                                                try {
                                                    const res = await fetch(`/api/diagnostics/missing-invoices?start=${start}&end=${end}`);
                                                    const data = await res.json();

                                                    const resultDiv = document.getElementById('missing-results');
                                                    if (resultDiv) {
                                                        if (data.missingCount === 0) {
                                                            resultDiv.innerHTML = `<div class="p-4 bg-green-50 text-green-700 rounded-lg">Keine fehlenden Rechnungen gefunden!</div>`;
                                                        } else {
                                                            // Store missing numbers in a data attribute for the import button
                                                            resultDiv.dataset.missing = JSON.stringify(data.missingNumbers);

                                                            resultDiv.innerHTML = `
                                                                <div class="p-4 bg-yellow-50 text-yellow-800 rounded-lg space-y-4">
                                                                    <div>
                                                                        <p class="font-bold">${data.missingCount} fehlende Rechnungen gefunden:</p>
                                                                        <div class="text-sm font-mono bg-white p-2 rounded border max-h-40 overflow-y-auto mt-2">
                                                                            ${data.missingNumbers.join(', ')}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <button 
                                                                        onclick="importMissingInvoices()"
                                                                        class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                                                        Diese ${data.missingCount} Rechnungen importieren
                                                                    </button>
                                                                    <div id="import-status" class="text-sm mt-2 hidden"></div>
                                                                </div>
                                                            `;
                                                        }
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                }
                                            }}
                                            variant="outline"
                                        >
                                            Prüfen
                                        </Button>
                                    </div>
                                    <div id="missing-results"></div>

                                    {/* Hidden script for import function */}
                                    <script dangerouslySetInnerHTML={{
                                        __html: `
                                            async function importMissingInvoices() {
                                                const resultDiv = document.getElementById('missing-results');
                                                const statusDiv = document.getElementById('import-status');
                                                const btn = resultDiv.querySelector('button');
                                                
                                                if (!resultDiv.dataset.missing) return;
                                                
                                                const missingNumbers = JSON.parse(resultDiv.dataset.missing);
                                                
                                                if (!confirm('Möchten Sie ' + missingNumbers.length + ' Rechnungen aus Shopify importieren? Dies kann einen Moment dauern.')) return;
                                                
                                                btn.disabled = true;
                                                btn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Importiere...';
                                                statusDiv.classList.remove('hidden');
                                                statusDiv.innerHTML = 'Bitte warten, Import läuft...';
                                                
                                                try {
                                                    const res = await fetch('/api/diagnostics/import-missing', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ invoiceNumbers: missingNumbers })
                                                    });
                                                    
                                                    const data = await res.json();
                                                    
                                                    let statusHtml = '<div class="mt-4 space-y-2">';
                                                    
                                                    if (data.results.success.length > 0) {
                                                        statusHtml += '<div class="text-green-600">✅ ' + data.results.success.length + ' erfolgreich importiert</div>';
                                                    }
                                                    
                                                    if (data.results.notFound.length > 0) {
                                                        statusHtml += '<div class="text-orange-600">⚠️ ' + data.results.notFound.length + ' nicht in Shopify gefunden</div>';
                                                    }
                                                    
                                                    if (data.results.failed.length > 0) {
                                                        statusHtml += '<div class="text-red-600">❌ ' + data.results.failed.length + ' fehlgeschlagen</div>';
                                                    }
                                                    
                                                    statusHtml += '</div>';
                                                    
                                                    statusDiv.innerHTML = statusHtml;
                                                    btn.innerHTML = 'Import abgeschlossen';
                                                    
                                                } catch (err) {
                                                    console.error(err);
                                                    statusDiv.innerHTML = '<span class="text-red-600">Fehler beim Import: ' + err.message + '</span>';
                                                    btn.disabled = false;
                                                    btn.innerHTML = 'Erneut versuchen';
                                                }
                                            }
                                        `
                                    }} />
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
