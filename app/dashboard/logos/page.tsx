'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, Trash2, Loader2, Star, Image as ImageIcon } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'

interface LogoAsset {
    id: string
    name: string
    url: string
    type: string
    size: string
}

export default function LogosPage() {
    const router = useRouter()
    const { showToast, ToastContainer } = useToast()
    const [loading, setLoading] = useState(false)
    const [logos, setLogos] = useState<LogoAsset[]>([
        {
            id: '1',
            name: 'Hauptlogo (Dunkel)',
            url: '/logo.png',
            type: 'PNG',
            size: '45 KB'
        }
    ])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'logo')

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) throw new Error('Upload fehlgeschlagen')

            const data = await response.json()

            const newLogo: LogoAsset = {
                id: Date.now().toString(),
                name: file.name,
                url: data.url,
                type: file.type.split('/')[1].toUpperCase(),
                size: `${Math.round(file.size / 1024)} KB`
            }

            setLogos(prev => [newLogo, ...prev])
            showToast('Logo erfolgreich hochgeladen', 'success')
        } catch (error) {
            console.error('Upload error:', error)
            showToast('Fehler beim Hochladen', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = (id: string) => {
        setLogos(prev => prev.filter(l => l.id !== id))
        showToast('Asset entfernt', 'success')
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <ToastContainer />

            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="mr-4">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Zurück
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Logos & Branding</h1>
                                <p className="text-xs text-gray-500">Ihre Marken-Assets für Rechnungen und E-Mails</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label htmlFor="logo-upload" className="cursor-pointer">
                                <Button variant="default" className="bg-blue-600 hover:bg-blue-700" asChild>
                                    <span>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Logo hochladen
                                    </span>
                                </Button>
                                <input
                                    id="logo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleUpload}
                                    disabled={loading}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {logos.map(logo => (
                        <Card key={logo.id} className="group overflow-hidden hover:shadow-md transition-shadow">
                            <div className="aspect-video bg-gray-100 flex items-center justify-center p-8 relative">
                                <img src={logo.url} alt={logo.name} className="max-w-full max-h-full object-contain" />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleDelete(logo.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-medium text-gray-900 truncate pr-4">{logo.name}</p>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                        {logo.type}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Größe: {logo.size}</span>
                                    <div className="flex gap-2">
                                        <Button variant="link" className="h-auto p-0 text-blue-600" asChild>
                                            <a href={logo.url} download>Download</a>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Upload Placeholder */}
                    <label
                        htmlFor="logo-upload-card"
                        className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-8 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                            <ImageIcon className="h-6 w-6 text-gray-400 group-hover:text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Neues Asset hinzufügen</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG oder SVG bis 5MB</p>
                        <input
                            id="logo-upload-card"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={loading}
                        />
                    </label>
                </div>

                {/* Branding Tip */}
                <div className="mt-8">
                    <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Star className="w-24 h-24 rotate-12" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                Profi-Tipp: Branding Konsistenz
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-indigo-50/90 max-w-3xl">
                                Stellen Sie sicher, dass Ihre Logos einen transparenten Hintergrund haben (PNG oder SVG), damit sie auf Rechnungen und in E-Mails auf jedem Hintergrund perfekt aussehen. Nutzen Sie die "Logos & Branding" Seite, um alle Ihre Marken-Varianten an einem Ort zu sichern.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
