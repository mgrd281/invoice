
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Plus, Trash2, Copy, RefreshCw } from 'lucide-react'

export default function DigitalProductDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [product, setProduct] = useState<any>(null)
    const [keys, setKeys] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newKeys, setNewKeys] = useState('')
    const [template, setTemplate] = useState('')
    const [savingTemplate, setSavingTemplate] = useState(false)
    const [addingKeys, setAddingKeys] = useState(false)

    useEffect(() => {
        loadData()
    }, [params.id])

    const loadData = async () => {
        setLoading(true)
        try {
            const [prodRes, keysRes] = await Promise.all([
                fetch(`/api/digital-products/${params.id}`),
                fetch(`/api/digital-products/${params.id}/keys`)
            ])

            const prodData = await prodRes.json()
            const keysData = await keysRes.json()

            if (prodData.success) {
                setProduct(prodData.data)
                setTemplate(prodData.data.emailTemplate || getDefaultTemplate())
            }
            if (keysData.success) {
                setKeys(keysData.data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddKeys = async () => {
        if (!newKeys.trim()) return
        setAddingKeys(true)
        try {
            const keyList = newKeys.split('\n').map(k => k.trim()).filter(k => k)
            const res = await fetch(`/api/digital-products/${params.id}/keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keys: keyList })
            })

            if (res.ok) {
                setNewKeys('')
                loadData() // Reload to see new keys
            } else {
                alert('Fehler beim Hinzufügen der Keys')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setAddingKeys(false)
        }
    }

    const handleSaveTemplate = async () => {
        setSavingTemplate(true)
        try {
            const res = await fetch(`/api/digital-products/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailTemplate: template })
            })

            if (res.ok) {
                alert('Template gespeichert')
            } else {
                alert('Fehler beim Speichern')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSavingTemplate(false)
        }
    }

    const [uploadProgress, setUploadProgress] = useState(0)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setAddingKeys(true)
        setUploadProgress(0)

        const reader = new FileReader()
        reader.onload = async (event) => {
            const text = event.target?.result as string
            if (!text) return

            const allKeys = text.split(/\r?\n/).map(k => k.trim()).filter(k => k)
            const totalKeys = allKeys.length
            const chunkSize = 1000
            let processed = 0

            for (let i = 0; i < totalKeys; i += chunkSize) {
                const chunk = allKeys.slice(i, i + chunkSize)

                try {
                    await fetch(`/api/digital-products/${params.id}/keys`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ keys: chunk })
                    })

                    processed += chunk.length
                    setUploadProgress(Math.round((processed / totalKeys) * 100))
                } catch (err) {
                    console.error('Error uploading chunk:', err)
                    // Continue with next chunk or stop? For now continue
                }
            }

            setAddingKeys(false)
            setUploadProgress(0)
            loadData()
            alert(`${totalKeys} Keys wurden verarbeitet.`)
            // Reset file input
            e.target.value = ''
        }
        reader.readAsText(file)
    }

    const getDefaultTemplate = () => {
        return `Hallo {{ customer_name }},

Vielen Dank für Ihre Bestellung!

Hier ist Ihr Produktschlüssel für {{ product_title }}:
{{ license_key }}

Anleitung:
1. ...
2. ...

Viel Spaß!`
    }

    if (loading) return <div className="p-8 text-center">Laden...</div>
    if (!product) return <div className="p-8 text-center">Produkt nicht gefunden</div>

    const availableKeys = keys.filter(k => !k.isUsed).length
    const usedKeys = keys.filter(k => k.isUsed).length

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/digital-products')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Zurück
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{product.title}</h1>
                            <p className="text-xs text-gray-500">ID: {product.shopifyProductId}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadData}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Aktualisieren
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Stats Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                    <span className="text-green-700 font-medium">Verfügbar</span>
                                    <span className="text-2xl font-bold text-green-700">{availableKeys}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                                    <span className="text-gray-700 font-medium">Verbraucht</span>
                                    <span className="text-2xl font-bold text-gray-700">{usedKeys}</span>
                                </div>
                                <div className="pt-4 border-t">
                                    <p className="text-sm text-gray-500">
                                        Gesamt: {keys.length} Keys
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <CardHeader>
                            <CardTitle>Keys hinzufügen</CardTitle>
                            <CardDescription>
                                Fügen Sie neue Produktschlüssel hinzu (Text oder Datei).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Text-Eingabe (kleine Mengen)</Label>
                                <Textarea
                                    placeholder="XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY"
                                    className="min-h-[100px] font-mono"
                                    value={newKeys}
                                    onChange={e => setNewKeys(e.target.value)}
                                />
                                <Button
                                    className="w-full mt-2"
                                    onClick={handleAddKeys}
                                    disabled={addingKeys || !newKeys.trim()}
                                >
                                    {addingKeys ? 'Fügt hinzu...' : 'Text-Keys speichern'}
                                </Button>
                            </div>

                            <div className="border-t pt-4">
                                <Label className="mb-2 block">Datei-Upload (große Mengen)</Label>
                                <Input
                                    type="file"
                                    accept=".txt,.csv"
                                    onChange={handleFileUpload}
                                    disabled={addingKeys}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Unterstützt .txt und .csv (ein Key pro Zeile).
                                </p>
                                {uploadProgress > 0 && uploadProgress < 100 && (
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                        <p className="text-xs text-center mt-1">{uploadProgress}% hochgeladen</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Column */}
                <div className="lg:col-span-2">
                    <Tabs defaultValue="keys">
                        <TabsList className="mb-4">
                            <TabsTrigger value="keys">Produktschlüssel Liste</TabsTrigger>
                            <TabsTrigger value="template">E-Mail Nachricht</TabsTrigger>
                        </TabsList>

                        <TabsContent value="keys">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Alle Keys</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3">Key</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3">Verwendet am</th>
                                                    <th className="px-4 py-3">Bestellung</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {keys.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                                            Keine Keys vorhanden
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    keys.map((key) => (
                                                        <tr key={key.id} className="border-b hover:bg-gray-50">
                                                            <td className="px-4 py-3 font-mono">{key.key}</td>
                                                            <td className="px-4 py-3">
                                                                {key.isUsed ? (
                                                                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">Verbraucht</span>
                                                                ) : (
                                                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Verfügbar</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {key.usedAt ? new Date(key.usedAt).toLocaleDateString() + ' ' + new Date(key.usedAt).toLocaleTimeString() : '-'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {key.shopifyOrderId ? (
                                                                    key.shopifyOrderId.startsWith('#') || key.shopifyOrderId.startsWith('TEST')
                                                                        ? key.shopifyOrderId
                                                                        : `#${key.shopifyOrderId}`
                                                                ) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="template">
                            <Card>
                                <CardHeader>
                                    <CardTitle>E-Mail Vorlage</CardTitle>
                                    <CardDescription>
                                        Passen Sie die Nachricht an, die der Kunde erhält.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
                                            <strong>Verfügbare Variablen:</strong><br />
                                            {'{{ customer_name }}'} - Name des Kunden<br />
                                            {'{{ product_title }}'} - Name des Produkts<br />
                                            {'{{ license_key }}'} - Der zugewiesene Key
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Nachrichtentext</Label>
                                            <Textarea
                                                value={template}
                                                onChange={e => setTemplate(e.target.value)}
                                                className="min-h-[300px] font-mono"
                                            />
                                        </div>

                                        <div className="flex justify-end">
                                            <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                                                <Save className="w-4 h-4 mr-2" />
                                                {savingTemplate ? 'Speichert...' : 'Vorlage speichern'}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
        </div>
            </main >
        </div >
    )
}
