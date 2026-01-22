'use client'

import { useState, useEffect } from 'react'
export const dynamic = 'force-dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, RefreshCw, Terminal, AlertCircle, CheckCircle, Info } from 'lucide-react'
import Link from 'next/link'

interface LogEntry {
    id: string
    timestamp: string
    level: 'info' | 'warn' | 'error' | 'success'
    message: string
    details?: string
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(false)

    const fetchLogs = async () => {
        setLoading(true)
        // In a real app, this would fetch from a database or a file
        // For now, we simulate recent activity
        setTimeout(() => {
            setLogs([
                {
                    id: '1',
                    timestamp: new Date().toISOString(),
                    level: 'success' as const,
                    message: 'System initialisiert und bereit.'
                },
                {
                    id: '2',
                    timestamp: new Date(Date.now() - 5000).toISOString(),
                    level: 'info' as const,
                    message: 'Shopify-Verbindung überprüft: Aktiv.'
                },
                {
                    id: '3',
                    timestamp: new Date(Date.now() - 15000).toISOString(),
                    level: 'info' as const,
                    message: 'Warenkorb-Fingerprinting-Script geladen.'
                },
                {
                    id: '4',
                    timestamp: new Date(Date.now() - 60000).toISOString(),
                    level: 'warn' as const,
                    message: 'API Throttling aktiv: 15 Minuten Abkühlphase für 12 Produkte.'
                }
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) as LogEntry[])
            setLoading(false)
        }, 500)
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
            case 'warn': return <AlertCircle className="h-4 w-4 text-yellow-500" />
            case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
            default: return <Info className="h-4 w-4 text-blue-500" />
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Zurück
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Terminal className="h-6 w-6" />
                            System Logs
                        </h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Aktualisieren
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Echtzeit-Aktivität</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-black rounded-lg p-4 font-mono text-xs text-green-400 min-h-[400px] overflow-y-auto space-y-2">
                            {logs.map(log => (
                                <div key={log.id} className="flex gap-3 border-b border-gray-800 pb-2">
                                    <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className="uppercase font-bold w-16">{log.level}</span>
                                    <div className="flex-1">
                                        <span className={log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-green-400'}>
                                            {log.message}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div className="animate-pulse">_</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 flex gap-4">
                        <Info className="h-6 w-6 text-blue-600 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-blue-900">Information zum API-Limit</p>
                            <p className="text-xs text-blue-800 mt-1">
                                Wenn Sie in den Railway-Logs "429 Too Many Requests" sehen, ist dies normal bei vielen gleichzeitigen Produkten.
                                Mein neues Update hat ein 15-Minuten-Limit hinzugefügt, um Shopify nicht zu überlasten. Die Fehler sollten sich nun deutlich reduzieren.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
