'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, FileText, Upload } from 'lucide-react'

export default function DebugOCRPage() {
    const [file, setFile] = useState<File | null>(null)
    const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle')
    const [logs, setLogs] = useState<string[]>([])
    const [result, setResult] = useState<any>(null)

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setStatus('idle')
            setLogs([])
            setResult(null)
        }
    }

    const runDebug = async () => {
        if (!file) return
        setStatus('uploading')
        addLog(`Starting debug for file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)

        try {
            // Step 1: OCR Analysis
            addLog('Step 1: Sending to OCR API (/api/ocr/analyze)...')
            const formData = new FormData()
            formData.append('file', file)

            const ocrRes = await fetch('/api/ocr/analyze', {
                method: 'POST',
                body: formData,
                headers: {
                    'x-user-info': JSON.stringify({
                        id: 'debug-user',
                        email: 'debug@example.com',
                        firstName: 'Debug',
                        lastName: 'User',
                        isAdmin: true
                    })
                }
            })

            addLog(`OCR API Response Status: ${ocrRes.status} ${ocrRes.statusText}`)

            if (!ocrRes.ok) {
                const errorText = await ocrRes.text()
                addLog(`❌ OCR Failed: ${errorText}`)
                throw new Error(`OCR API failed: ${ocrRes.status}`)
            }

            const ocrData = await ocrRes.json()
            addLog('✅ OCR Success!')
            addLog(`OCR Data: ${JSON.stringify(ocrData, null, 2)}`)
            setResult(ocrData)

            if (!ocrData.success) {
                addLog(`❌ OCR Logical Error: ${ocrData.error || 'Unknown error'}`)
                return
            }

            // Step 2: Database Creation (Simulation)
            addLog('Step 2: Simulating Database Save (/api/accounting/receipts)...')

            const receiptPayload = {
                filename: file.name,
                url: `/uploads/${file.name}`,
                size: file.size,
                mimeType: file.type,
                description: ocrData.data.description || file.name,
                category: ocrData.data.category || 'EXPENSE',
                amount: ocrData.data.totalAmount ? parseFloat(ocrData.data.totalAmount) : undefined,
                supplier: ocrData.data.supplier,
                invoiceNumber: ocrData.data.invoiceNumber,
                date: ocrData.data.date, // Sending raw date from OCR to test validation
                ai_status: 'OK'
            }

            addLog(`Payload to Save: ${JSON.stringify(receiptPayload, null, 2)}`)

            const saveRes = await fetch('/api/accounting/receipts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-info': JSON.stringify({
                        id: 'debug-user',
                        email: 'debug@example.com',
                        firstName: 'Debug',
                        lastName: 'User',
                        isAdmin: true
                    })
                },
                body: JSON.stringify(receiptPayload)
            })

            addLog(`Save API Response Status: ${saveRes.status} ${saveRes.statusText}`)

            if (!saveRes.ok) {
                const saveError = await saveRes.text()
                addLog(`❌ Save Failed: ${saveError}`)
                throw new Error(`Save API failed: ${saveRes.status}`)
            }

            const saveData = await saveRes.json()
            addLog('✅ Save Success!')
            addLog(`Saved Receipt: ${JSON.stringify(saveData, null, 2)}`)
            setStatus('success')

        } catch (e: any) {
            addLog(`❌ CRITICAL ERROR: ${e.message}`)
            setStatus('error')
        }
    }

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">🔍 OCR & Upload Debugger</h1>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>1. Select File</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-center">
                        <Input type="file" onChange={handleFileChange} accept=".pdf,image/*" />
                        <Button onClick={runDebug} disabled={!file || status === 'uploading' || status === 'analyzing'}>
                            {status === 'uploading' || status === 'analyzing' ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
                            ) : (
                                <><Upload className="mr-2 h-4 w-4" /> Start Debug</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>2. Live Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-950 text-slate-50 p-4 rounded-md h-[400px] overflow-y-auto font-mono text-xs">
                            {logs.length === 0 ? <span className="text-slate-500">Waiting for logs...</span> : logs.map((log, i) => (
                                <div key={i} className={`mb-1 ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}`}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>3. Raw Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            readOnly
                            value={result ? JSON.stringify(result, null, 2) : ''}
                            className="h-[400px] font-mono text-xs"
                            placeholder="Result JSON will appear here..."
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
