'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Shield, ArrowLeft, Mail, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const authenticatedFetch = useAuthenticatedFetch()
    const router = useRouter()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

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

    if (authLoading || loading) {
        return <div className="p-8 text-center">Laden...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Admin Control Panel</h1>
                            <p className="text-gray-500">Systemverwaltung und Benutzerübersicht</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Registrierte Benutzer</CardTitle>
                            <Users className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Verifizierte Benutzer</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {users.filter(u => u.isVerified).length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Admins</CardTitle>
                            <Shield className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {users.filter(u => u.isAdmin).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Benutzerliste</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Rolle</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Provider</th>
                                        <th className="px-6 py-3">Erstellt am</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                                            <td className="px-6 py-4 flex items-center gap-2">
                                                <Mail className="w-3 h-3 text-gray-400" />
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.isAdmin ? (
                                                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">Admin</span>
                                                ) : (
                                                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">User</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.isVerified ? (
                                                    <span className="text-green-600 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Verifiziert
                                                    </span>
                                                ) : (
                                                    <span className="text-orange-500 flex items-center gap-1">
                                                        <XCircle className="w-3 h-3" /> Ausstehend
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 capitalize">{u.provider}</td>
                                            <td className="px-6 py-4">
                                                {new Date(u.createdAt).toLocaleDateString('de-DE')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
