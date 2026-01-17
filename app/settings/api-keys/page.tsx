'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Plus, Trash2, Copy, Check, AlertCircle, Key } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ApiKey {
    id: string
    name: string
    keyPrefix: string // We don't have this in the model yet, maybe just show name and dates
    lastUsedAt: string | null
    createdAt: string
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    // New Key Dialog State
    const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
    const [newKeyName, setNewKeyName] = useState('')
    const [newKeySecret, setNewKeySecret] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const { toast } = useToast()

    useEffect(() => {
        loadKeys()
    }, [])

    const loadKeys = async () => {
        try {
            const response = await fetch('/api/settings/api-keys')
            if (response.ok) {
                const data = await response.json()
                setKeys(data)
            }
        } catch (error) {
            console.error('Error loading API keys:', error)
            toast({
                title: 'Fehler',
                description: 'API-Schlüssel konnten nicht geladen werden.',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return

        setCreating(true)
        try {
            const response = await fetch('/api/settings/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName })
            })

            if (response.ok) {
                const data = await response.json()
                setNewKeySecret(data.key) // The full key is only returned here
                setKeys([...keys, data]) // Optimistic update (though data usually lacks the key prefix logic if not handled)
                loadKeys() // Reload to get consistent data structure
                toast({
                    title: 'Erfolg',
                    description: 'API-Schlüssel wurde erstellt.',
                })
            } else {
                throw new Error('Failed to create key')
            }
        } catch (error) {
            console.error('Error creating API key:', error)
            toast({
                title: 'Fehler',
                description: 'API-Schlüssel konnte nicht erstellt werden.',
                variant: 'destructive',
            })
            setShowNewKeyDialog(false) // Close on error
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteKey = async (id: string) => {
        if (!confirm('Sind Sie sicher? Dieser Schlüssel kann nicht wiederhergestellt werden.')) return

        setDeleting(id)
        try {
            const response = await fetch(`/api/settings/api-keys/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setKeys(keys.filter(k => k.id !== id))
                toast({
                    title: 'Gelöscht',
                    description: 'API-Schlüssel wurde entfernt.',
                })
            } else {
                throw new Error('Failed to delete key')
            }
        } catch (error) {
            console.error('Error deleting API key:', error)
            toast({
                title: 'Fehler',
                description: 'API-Schlüssel konnte nicht gelöscht werden.',
                variant: 'destructive',
            })
        } finally {
            setDeleting(null)
        }
    }

    const copyToClipboard = () => {
        if (newKeySecret) {
            navigator.clipboard.writeText(newKeySecret)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
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
                            <Key className="h-8 w-8 text-indigo-600 mr-3" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">API Zugang</h1>
                                <p className="text-sm text-gray-500">Verwalten Sie Zugriffsschlüssel für externe Anwendungen</p>
                            </div>
                        </div>
                        <Button onClick={() => {
                            setNewKeyName('')
                            setNewKeySecret(null)
                            setShowNewKeyDialog(true)
                        }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Neuer Schlüssel
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Alert className="mb-8 bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Entwickler Information</AlertTitle>
                    <AlertDescription className="text-blue-700">
                        Die API-Dokumentation finden Sie unter <code className="bg-blue-100 px-1 rounded">/api/docs</code> (bald verfügbar).
                        Aktuelle Endpunkte: <code className="bg-blue-100 px-1 rounded">GET /api/external/orders</code>
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle>Aktive API-Schlüssel</CardTitle>
                        <CardDescription>
                            Diese Schlüssel haben vollen Lesezugriff auf Ihre Daten. Teilen Sie sie nicht.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : keys.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Key className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Noch keine API-Schlüssel erstellt</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Erstellt am</TableHead>
                                        <TableHead>Zuletzt verwendet</TableHead>
                                        <TableHead className="text-right">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {keys.map((key) => (
                                        <TableRow key={key.id}>
                                            <TableCell className="font-medium">{key.name}</TableCell>
                                            <TableCell>
                                                {new Date(key.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                {key.lastUsedAt
                                                    ? new Date(key.lastUsedAt).toLocaleDateString() + ' ' + new Date(key.lastUsedAt).toLocaleTimeString()
                                                    : 'Nie'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    disabled={deleting === key.id}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    {deleting === key.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Create Key Dialog */}
                <Dialog open={showNewKeyDialog} onOpenChange={(open) => {
                    if (!open && newKeySecret) {
                        // Warning before closing if key is shown
                        if (confirm('Haben Sie den Schlüssel gesichert? Er wird nicht nochmal angezeigt.')) {
                            setShowNewKeyDialog(false)
                            setNewKeySecret(null)
                        }
                    } else {
                        setShowNewKeyDialog(open)
                    }
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Neuen API-Schlüssel erstellen</DialogTitle>
                            <DialogDescription>
                                Geben Sie einen Namen für den Schlüssel ein, z.B. "Shopify Sync" oder "Mobile App".
                            </DialogDescription>
                        </DialogHeader>

                        {!newKeySecret ? (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="key-name">Name</Label>
                                    <Input
                                        id="key-name"
                                        placeholder="z.B. Externe Buchhaltung"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                                    <div className="flex items-start">
                                        <Check className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-green-900">Schlüssel erstellt!</h4>
                                            <p className="text-sm text-green-800 mt-1">
                                                Dies ist das einzige Mal, dass dieser Schlüssel angezeigt wird. Kopieren Sie ihn jetzt.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Ihr API-Schlüssel</Label>
                                    <div className="flex gap-2">
                                        <Input readOnly value={newKeySecret} className="font-mono bg-gray-50" />
                                        <Button onClick={copyToClipboard} variant="outline" size="icon">
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {!newKeySecret ? (
                                <Button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
                                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Erstellen
                                </Button>
                            ) : (
                                <Button onClick={() => {
                                    setShowNewKeyDialog(false)
                                    setNewKeySecret(null)
                                }}>
                                    Fertig
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}
