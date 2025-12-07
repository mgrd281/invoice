'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Users,
    Shield,
    ArrowLeft,
    Mail,
    CheckCircle,
    XCircle,
    Search,
    Trash2,
    MoreVertical,
    AlertTriangle,
    RefreshCw,
    Key
} from 'lucide-react'
import Link from 'next/link'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const authenticatedFetch = useAuthenticatedFetch()
    const router = useRouter()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [userToDelete, setUserToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [passwordResetUser, setPasswordResetUser] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [isResettingPassword, setIsResettingPassword] = useState(false)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login')
            return
        }

        if (user && !user.isAdmin) {
            router.push('/dashboard')
            return
        }

        if (user?.isAdmin) {
            fetchUsers()
        }
    }, [user, isAuthenticated, authLoading, router])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const response = await authenticatedFetch('/api/admin/users')
            if (response.ok) {
                const data = await response.json()
                setUsers(data.users || [])
            }
        } catch (error) {
            console.error('Failed to fetch users', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteUser = async () => {
        if (!userToDelete) return

        setIsDeleting(true)
        try {
            const response = await authenticatedFetch(`/api/admin/users?id=${userToDelete}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setUsers(users.filter(u => u.id !== userToDelete))
                setUserToDelete(null)
            } else {
                alert('Fehler beim Löschen des Benutzers')
            }
        } catch (error) {
            console.error('Failed to delete user', error)
        } finally {
            setIsDeleting(false)
        }
    }

    const toggleVerification = async (userId: string, currentStatus: boolean) => {
        try {
            const response = await authenticatedFetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isVerified: !currentStatus })
            })

            if (response.ok) {
                setUsers(users.map(u =>
                    u.id === userId ? { ...u, isVerified: !currentStatus } : u
                ))
            }
        } catch (error) {
            console.error('Failed to update user', error)
        }
    }

    const handlePasswordReset = async () => {
        if (!passwordResetUser || !newPassword) return
        if (newPassword.length < 6) {
            alert('Passwort muss mindestens 6 Zeichen lang sein')
            return
        }

        setIsResettingPassword(true)
        try {
            const response = await authenticatedFetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: passwordResetUser, newPassword })
            })

            if (response.ok) {
                alert('Passwort erfolgreich geändert')
                setPasswordResetUser(null)
                setNewPassword('')
            } else {
                const data = await response.json()
                alert(data.error || 'Fehler beim Ändern des Passworts')
            }
        } catch (error) {
            console.error('Failed to reset password', error)
        } finally {
            setIsResettingPassword(false)
        }
    }

    const toggleSuspension = async (userId: string, currentStatus: boolean) => {
        try {
            const response = await authenticatedFetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isSuspended: !currentStatus })
            })

            if (response.ok) {
                setUsers(users.map(u =>
                    u.id === userId ? { ...u, isSuspended: !currentStatus } : u
                ))
            } else {
                const data = await response.json()
                alert(data.error || 'Fehler beim Aktualisieren des Status')
            }
        } catch (error) {
            console.error('Failed to update user suspension', error)
        }
    }

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="h-8 w-8 text-blue-600" />
                                Admin Panel
                            </h1>
                            <p className="text-gray-500">Systemverwaltung & Benutzersteuerung</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Aktualisieren
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-blue-900">Registrierte Benutzer</CardTitle>
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-700">{users.length}</div>
                            <p className="text-xs text-blue-600 mt-1">Gesamt im System</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-green-900">Verifizierte Konten</CardTitle>
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-700">
                                {users.filter(u => u.isVerified).length}
                            </div>
                            <p className="text-xs text-green-600 mt-1">E-Mail bestätigt</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-red-900">Administratoren</CardTitle>
                            <div className="p-2 bg-red-100 rounded-lg">
                                <Shield className="h-5 w-5 text-red-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-700">
                                {users.filter(u => u.isAdmin).length}
                            </div>
                            <p className="text-xs text-red-600 mt-1">Voller Zugriff</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Users Table Section */}
                <Card className="shadow-md border-0">
                    <CardHeader className="border-b bg-white/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Benutzerliste</CardTitle>
                                <CardDescription>Verwalten Sie alle registrierten Benutzer im System</CardDescription>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Suchen nach Name oder E-Mail..."
                                    className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Benutzer</th>
                                        <th className="px-6 py-4 font-semibold">Rolle & Status</th>
                                        <th className="px-6 py-4 font-semibold">IP / Land</th>
                                        <th className="px-6 py-4 font-semibold">Anmeldung via</th>
                                        <th className="px-6 py-4 font-semibold">Mitglied seit</th>
                                        <th className="px-6 py-4 text-right">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Users className="h-12 w-12 text-gray-200 mb-3" />
                                                    <p>Keine Benutzer gefunden</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <tr key={u.id} className="bg-white hover:bg-gray-50/80 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm mr-3 shadow-sm">
                                                            {u.name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{u.name}</div>
                                                            <div className="text-gray-500 text-xs flex items-center mt-0.5">
                                                                <Mail className="w-3 h-3 mr-1" />
                                                                {u.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        {u.isAdmin ? (
                                                            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">
                                                                Admin
                                                            </span>
                                                        ) : (
                                                            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full border border-gray-200">
                                                                User
                                                            </span>
                                                        )}

                                                        {u.isSuspended && (
                                                            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                                                                <XCircle className="w-3 h-3" /> Gesperrt
                                                            </span>
                                                        )}

                                                        {u.isVerified ? (
                                                            <span className="text-green-600 text-xs flex items-center gap-1 font-medium">
                                                                <CheckCircle className="w-3 h-3" /> Verifiziert
                                                            </span>
                                                        ) : (
                                                            <span className="text-orange-500 text-xs flex items-center gap-1 font-medium">
                                                                <AlertTriangle className="w-3 h-3" /> Ausstehend
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">{u.lastIp || '-'}</div>
                                                    <div className="text-xs text-gray-500">{u.country || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="capitalize px-2 py-1 bg-gray-50 rounded text-gray-600 text-xs border border-gray-100">
                                                        {u.provider || 'credentials'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {new Date(u.createdAt).toLocaleDateString('de-DE', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => toggleVerification(u.id, u.isVerified)}>
                                                                {u.isVerified ? (
                                                                    <>
                                                                        <XCircle className="mr-2 h-4 w-4 text-orange-500" />
                                                                        <span>Verifizierung aufheben</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                                        <span>Manuell verifizieren</span>
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => toggleSuspension(u.id, !!u.isSuspended)}>
                                                                {u.isSuspended ? (
                                                                    <>
                                                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                                        <span>Benutzer entsperren</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                                                        <span>Benutzer sperren</span>
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setPasswordResetUser(u.id)}>
                                                                <Key className="mr-2 h-4 w-4 text-blue-500" />
                                                                <span>Passwort ändern</span>
                                                            </DropdownMenuItem>
                                                            {!u.isAdmin && (
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                    onClick={() => setUserToDelete(u.id)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    <span>Benutzer löschen</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden. Der Benutzer und alle zugehörigen Daten werden dauerhaft gelöscht.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? 'Lösche...' : 'Löschen bestätigen'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Password Reset Dialog */}
            <AlertDialog open={!!passwordResetUser} onOpenChange={(open) => !open && setPasswordResetUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Passwort ändern</AlertDialogTitle>
                        <AlertDialogDescription>
                            Geben Sie ein neues Passwort für den Benutzer ein.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Input
                            type="password"
                            placeholder="Neues Passwort (min. 6 Zeichen)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handlePasswordReset()
                            }}
                            disabled={isResettingPassword || newPassword.length < 6}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isResettingPassword ? 'Speichere...' : 'Passwort speichern'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
