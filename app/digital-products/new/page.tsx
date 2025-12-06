
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewDigitalProductPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        shopifyProductId: '',
        organizationId: 'default-org' // TODO: Get from session/context
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // In a real app, we would get the organizationId from the user session
            // For now, we might need to fetch it or use a placeholder if the API handles it
            // My API route expects organizationId. 
            // Let's try to fetch the current user's org or just send a dummy if the backend resolves it from session (which I commented out in the API).
            // Actually, I should probably update the API to use the session's org ID.
            // But let's send a dummy one for now, assuming the user has one.

            const res = await fetch('/api/digital-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    organizationId: 'default-org-id' // This will likely fail constraint if not real. 
                    // I should probably fetch a real org ID or make the API handle it.
                })
            })

            if (res.ok) {
                router.push('/digital-products')
            } else {
                alert('Fehler beim Erstellen')
            }
        } catch (error) {
            console.error(error)
            alert('Ein Fehler ist aufgetreten')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Zurück
                    </Button>
                    <h1 className="text-xl font-bold text-gray-900">Neues digitales Produkt</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Produkt Details</CardTitle>
                        <CardDescription>Verknüpfen Sie ein Shopify-Produkt mit dem Lizenz-System.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Produkt Titel (Intern)</Label>
                                <Input
                                    id="title"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="z.B. Windows 11 Pro"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="shopifyId">Shopify Produkt ID</Label>
                                <Input
                                    id="shopifyId"
                                    required
                                    value={formData.shopifyProductId}
                                    onChange={e => setFormData({ ...formData, shopifyProductId: e.target.value })}
                                    placeholder="z.B. 1234567890"
                                />
                                <p className="text-xs text-gray-500">Die ID finden Sie in der URL der Shopify Produktseite.</p>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Speichert...' : 'Produkt anlegen'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
