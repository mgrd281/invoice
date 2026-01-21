'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { ShieldAlert, Trash2, Search, Plus, UserX, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { Suspense } from 'react'

interface BlockedUser {
    id: string
    email: string
    name: string | null
    reason: string | null
    blockedBy: string | null
    blockedAt: string
}

function BlockedUsersContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const authenticatedFetch = useAuthenticatedFetch()
    const { showToast } = useToast()

    // Form State
    const [newEmail, setNewEmail] = useState('')
    const [newName, setNewName] = useState('')
    const [newReason, setNewReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const fetchBlockedUsers = async () => {
        setLoading(true)
        try {
            const queryParams = new URLSearchParams()
            if (searchQuery) queryParams.append('search', searchQuery)

            const res = await authenticatedFetch(`/api/blocked-users?${queryParams.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setBlockedUsers(data)
            } else {
                showToast('Fehler beim Laden der blockierten Nutzer', 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Netzwerkfehler', 'error')
        } finally {
            setLoading(false)
        }
    }

    // Handle Back Button and URL Sync
    useEffect(() => {
        const search = searchParams.get('search') || ''
        if (searchQuery !== search) setSearchQuery(search)
    }, [searchParams])

    useEffect(() => {
        fetchBlockedUsers()

        // Sync to URL
        const params = new URLSearchParams()
        if (searchQuery) params.set('search', searchQuery)

        const newUrl = `${window.location.pathname}?${params.toString()}`
        const currentUrl = `${window.location.pathname}${window.location.search}`

        if (currentUrl !== newUrl) {
            router.replace(newUrl, { scroll: false })
        }
    }, [searchQuery, router, searchParams])

    const handleBlockUser = async () => {
        if (!newEmail) {
            showToast('E-Mail ist erforderlich', 'error')
            return
        }

        setSubmitting(true)
        try {
            const res = await authenticatedFetch('/api/blocked-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    name: newName,
                    reason: newReason
                })
            })

            if (res.ok) {
                showToast('Nutzer erfolgreich blockiert', 'success')
                setIsAddDialogOpen(false)
                setNewEmail('')
                setNewName('')
                setNewReason('')
                fetchBlockedUsers()
            } else {
                const msg = await res.text()
                showToast(msg || 'Fehler beim Blockieren', 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Fehler beim Senden', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleUnblock = async (id: string, email: string) => {
        if (!confirm(`Möchten Sie ${email} wirklich entsperren?`)) return

        try {
            const res = await authenticatedFetch(`/api/blocked-users/${id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                showToast('Blockierung aufgehoben', 'success')
                fetchBlockedUsers()
            } else {
                showToast('Fehler beim Entsperren', 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Fehler', 'error')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Zurück
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <ShieldAlert className="h-6 w-6 mr-2 text-red-600" />
                                Blockierte Benutzer
                            </h1>
                            <p className="text-sm text-gray-500">Verwalten Sie hier die Blacklist für Bestellungen</p>
                        </div>
                    </div>

                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-red-600 hover:bg-red-700 text-white">
                                <UserX className="h-4 w-4 mr-2" />
                                Benutzer blockieren
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Neuen Benutzer blockieren</DialogTitle>
                                <DialogDescription>
                                    Dieser Benutzer kann keine neuen Bestellungen mehr aufgeben.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">E-Mail (Erforderlich)</label>
                                    <Input
                                        placeholder="beispiel@domain.com"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name (Optional)</label>
                                    <Input
                                        placeholder="Max Mustermann"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Grund (Optional)</label>
                                    <Input
                                        placeholder="Z.B. Chargeback Missbrauch"
                                        value={newReason}
                                        onChange={(e) => setNewReason(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Abbrechen</Button>
                                <Button
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={handleBlockUser}
                                    disabled={submitting || !newEmail}
                                >
                                    {submitting ? 'Blockiere...' : 'Blockieren'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Liste gesperrter E-Mails</CardTitle>
                                <CardDescription>
                                    Diese E-Mails werden bei neuen Bestellungen markiert oder blockiert.
                                </CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Suche..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>E-Mail</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Grund</TableHead>
                                    <TableHead>Blockiert am</TableHead>
                                    <TableHead>Von</TableHead>
                                    <TableHead className="text-right">Aktionen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">Laden...</TableCell>
                                    </TableRow>
                                ) : blockedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">Keine blockierten Benutzer gefunden.</TableCell>
                                    </TableRow>
                                ) : (
                                    blockedUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium text-red-600 font-mono text-xs">{user.email}</TableCell>
                                            <TableCell>{user.name || '-'}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={user.reason || ''}>{user.reason || '-'}</TableCell>
                                            <TableCell>{new Date(user.blockedAt).toLocaleDateString('de-DE')}</TableCell>
                                            <TableCell className="text-xs text-gray-500">{user.blockedBy || 'Admin'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-400 hover:text-green-600 hover:bg-green-50"
                                                    onClick={() => handleUnblock(user.id, user.email)}
                                                    title="Entsperren"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function BlockedUsersPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <ShieldAlert className="h-12 w-12 animate-pulse text-red-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Lade Blockliste...</p>
                </div>
            </div>
        }>
            <BlockedUsersContent />
        </Suspense>
    )
}
