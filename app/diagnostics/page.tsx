'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Database, Server, ShoppingBag } from 'lucide-react'

export default function DiagnosticsPage() {
    const [report, setReport] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const fetchDiagnostics = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/diagnostics/system')
            const data = await res.json()
            setReport(data)
        } catch (error) {
            console.error('Failed to load diagnostics', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDiagnostics()
    }, [])

    const StatusIcon = ({ status }: { status: boolean }) => {
        return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />
    }

    if (loading && !report) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">System Diagnostics</h1>
                        <p className="text-gray-500">Überprüfen Sie den Status Ihres Systems und Ihrer Daten.</p>
                    </div>
                    <Button onClick={fetchDiagnostics} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Aktualisieren
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Storage Health */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="w-5 h-5" />
                                Datenspeicher (Local JSON)
                            </CardTitle>
                            <CardDescription>Status der lokalen JSON-Dateien</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {report?.storage && Object.entries(report.storage).map(([key, val]: [string, any]) => {
                                if (key === 'error') return null
                                return (
                                    <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <StatusIcon status={val.exists} />
                                            <div>
                                                <p className="font-medium capitalize">{key}</p>
                                                <p className="text-xs text-gray-500">{val.path}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{val.count !== undefined ? val.count : '-'} Einträge</p>
                                            <p className="text-xs text-gray-500">{val.stats?.size || '0 KB'}</p>
                                        </div>
                                    </div>
                                )
                            })}
                            {report?.storage?.error && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                    Error: {report.storage.error}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Shopify Connection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5" />
                                Shopify Verbindung
                            </CardTitle>
                            <CardDescription>Status der API-Verbindung</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className={`p-4 rounded-lg border flex items-start gap-3 ${report?.shopify?.status === 'connected' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                {report?.shopify?.status === 'connected' ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                                )}
                                <div>
                                    <p className={`font-medium ${report?.shopify?.status === 'connected' ? 'text-green-900' : 'text-red-900'}`}>
                                        {report?.shopify?.status === 'connected' ? 'Verbunden' : 'Verbindungsfehler'}
                                    </p>
                                    <p className={`text-sm mt-1 ${report?.shopify?.status === 'connected' ? 'text-green-700' : 'text-red-700'}`}>
                                        {report?.shopify?.message}
                                    </p>
                                    {report?.shopify?.shop && (
                                        <p className="text-xs mt-2 text-gray-500">Shop: {report.shopify.shop}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="w-5 h-5" />
                                System Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-500">Environment</span>
                                <span className="font-mono">{report?.system?.nodeEnv}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-500">Working Directory</span>
                                <span className="font-mono text-xs max-w-[200px] truncate" title={report?.system?.cwd}>{report?.system?.cwd}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-500">Timestamp</span>
                                <span className="font-mono">{new Date(report?.timestamp).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
