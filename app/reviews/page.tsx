'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Star,
    Download,
    Upload,
    Settings,
    MessageSquare,
    ThumbsUp,
    MoreHorizontal,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Eye,
    Trash2,
    Mail,
    Share2,
    Image as ImageIcon,
    Loader2,
    ArrowRight,
    Link as LinkIcon,
    PenTool,
    FileText
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Product {
    id: number
    title: string
    images: { src: string }[]
    handle: string
}

export default function ReviewsPage() {
    const [activeTab, setActiveTab] = useState('overview')

    // Import Flow State
    const [products, setProducts] = useState<Product[]>([])
    const [loadingProducts, setLoadingProducts] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState<number[]>([])
    const [importStep, setImportStep] = useState(1) // 1: Select Products, 2: Choose Source
    const [importSource, setImportSource] = useState<'csv' | 'url' | 'manual' | null>(null)
    const [importUrl, setImportUrl] = useState('')

    // Manual Review State
    const [manualReview, setManualReview] = useState({
        rating: 5,
        title: '',
        content: '',
        customer_name: '',
        customer_email: '',
        date: new Date().toISOString().split('T')[0],
        images: [] as string[]
    })
    const [isSubmittingManual, setIsSubmittingManual] = useState(false)

    // CSV State
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [isUploadingCsv, setIsUploadingCsv] = useState(false)

    useEffect(() => {
        if (activeTab === 'import' && products.length === 0) {
            fetchProducts()
        }
    }, [activeTab])

    const fetchProducts = async () => {
        setLoadingProducts(true)
        try {
            const res = await fetch('/api/shopify/products')
            const data = await res.json()
            if (data.success) {
                setProducts(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch products', error)
            toast.error('Fehler beim Laden der Produkte')
        } finally {
            setLoadingProducts(false)
        }
    }

    const toggleProduct = (id: number) => {
        setSelectedProducts(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        )
    }

    const toggleAll = () => {
        if (selectedProducts.length === products.length) {
            setSelectedProducts([])
        } else {
            setSelectedProducts(products.map(p => p.id))
        }
    }

    const downloadCsvTemplate = () => {
        const headers = ['rating', 'title', 'content', 'customer_name', 'customer_email', 'date', 'images']
        const example = ['5', 'Tolles Produkt', 'Bin sehr zufrieden mit der Qualität.', 'Max Mustermann', 'max@example.com', '2023-10-01', '']
        const csvContent = [headers.join(','), example.join(',')].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'reviews_template.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleManualSubmit = async () => {
        if (!manualReview.customer_name || !manualReview.content) {
            toast.error('Bitte füllen Sie alle Pflichtfelder aus.')
            return
        }

        setIsSubmittingManual(true)
        try {
            // Send requests for each selected product
            for (const productId of selectedProducts) {
                const product = products.find(p => p.id === productId)

                await fetch('/api/reviews/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: productId,
                        reviews: [{
                            ...manualReview,
                            product_title: product?.title
                        }]
                    })
                })
            }

            toast.success('Bewertung erfolgreich erstellt!')
            setImportStep(1)
            setImportSource(null)
            setManualReview({
                rating: 5,
                title: '',
                content: '',
                customer_name: '',
                customer_email: '',
                date: new Date().toISOString().split('T')[0],
                images: []
            })
            setSelectedProducts([])
            setActiveTab('reviews') // Go to reviews list
        } catch (error) {
            console.error('Error submitting review:', error)
            toast.error('Fehler beim Erstellen der Bewertung')
        } finally {
            setIsSubmittingManual(false)
        }
    }

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingCsv(true)
        const reader = new FileReader()
        reader.onload = async (event) => {
            const text = event.target?.result as string
            const lines = text.split('\n')
            const headers = lines[0].split(',').map(h => h.trim())

            const reviews = []
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue
                const values = lines[i].split(',')
                const review: any = {}
                headers.forEach((header, index) => {
                    review[header] = values[index]?.trim()
                })
                reviews.push(review)
            }

            try {
                for (const productId of selectedProducts) {
                    const product = products.find(p => p.id === productId)
                    await fetch('/api/reviews/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            productId: productId,
                            reviews: reviews.map(r => ({ ...r, product_title: product?.title }))
                        })
                    })
                }
                toast.success(`${reviews.length} Bewertungen erfolgreich importiert!`)
                setImportStep(1)
                setImportSource(null)
                setSelectedProducts([])
                setActiveTab('reviews')
            } catch (error) {
                console.error('CSV Import Error:', error)
                toast.error('Fehler beim Importieren der CSV')
            } finally {
                setIsUploadingCsv(false)
            }
        }
        reader.readAsText(file)
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                                Dashboard
                            </Link>
                            <span className="text-gray-300">/</span>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                Product Reviews
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline">
                                <Settings className="h-4 w-4 mr-2" />
                                Einstellungen
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setActiveTab('import')}>
                                <Upload className="h-4 w-4 mr-2" />
                                Importieren
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white border p-1 h-12 rounded-lg shadow-sm w-full justify-start overflow-x-auto">
                        <TabsTrigger value="overview" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Übersicht</TabsTrigger>
                        <TabsTrigger value="reviews" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Alle Reviews</TabsTrigger>
                        <TabsTrigger value="import" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Import & Export</TabsTrigger>
                        <TabsTrigger value="widgets" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Widgets & Design</TabsTrigger>
                        <TabsTrigger value="emails" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">E-Mail Automation</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Gesamt Reviews</p>
                                            <h3 className="text-3xl font-bold text-gray-900 mt-2">1,248</h3>
                                        </div>
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <MessageSquare className="h-5 w-5 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-sm text-green-600">
                                        <TrendingUp className="h-4 w-4 mr-1" />
                                        <span>+12% diesen Monat</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Durchschnitt</p>
                                            <h3 className="text-3xl font-bold text-gray-900 mt-2 flex items-center">
                                                4.8
                                                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 ml-2" />
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-yellow-50 rounded-lg">
                                            <Star className="h-5 w-5 text-yellow-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-sm text-gray-500">
                                        <span>Basierend auf allen Bewertungen</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Foto Reviews</p>
                                            <h3 className="text-3xl font-bold text-gray-900 mt-2">342</h3>
                                        </div>
                                        <div className="p-2 bg-purple-50 rounded-lg">
                                            <ImageIcon className="h-5 w-5 text-purple-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-sm text-green-600">
                                        <TrendingUp className="h-4 w-4 mr-1" />
                                        <span>28% Conversion Rate</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Ausstehend</p>
                                            <h3 className="text-3xl font-bold text-gray-900 mt-2">5</h3>
                                        </div>
                                        <div className="p-2 bg-orange-50 rounded-lg">
                                            <CheckCircle className="h-5 w-5 text-orange-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-sm text-orange-600 cursor-pointer hover:underline">
                                        <span>Jetzt prüfen &rarr;</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Reviews Preview */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Neueste Bewertungen</CardTitle>
                                <CardDescription>Die letzten eingegangenen Bewertungen</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="w-16 h-16 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden">
                                                {/* Placeholder Image */}
                                                <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500">
                                                    <ImageIcon className="h-6 w-6" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex text-yellow-400">
                                                                {[...Array(5)].map((_, j) => (
                                                                    <Star key={j} className="h-4 w-4 fill-current" />
                                                                ))}
                                                            </div>
                                                            <span className="font-medium text-gray-900">Toller Service!</span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Das Produkt ist genau wie beschrieben. Der Versand war super schnell. Gerne wieder!
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                                            <span>Max Mustermann</span>
                                                            <span>•</span>
                                                            <span>vor 2 Stunden</span>
                                                            <span>•</span>
                                                            <span className="text-green-600 flex items-center gap-1">
                                                                <CheckCircle className="h-3 w-3" /> Verifizierter Kauf
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                                        </Button>
                                                        <Button size="sm" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 text-center">
                                    <Button variant="link" onClick={() => setActiveTab('reviews')}>Alle Bewertungen anzeigen</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ALL REVIEWS TAB */}
                    <TabsContent value="reviews" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Alle Bewertungen</CardTitle>
                                        <CardDescription>Verwalten Sie alle Kundenbewertungen an einem Ort</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input placeholder="Suchen..." className="pl-9 w-64" />
                                        </div>
                                        <Button variant="outline">
                                            <Filter className="h-4 w-4 mr-2" />
                                            Filter
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-gray-500">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-medium text-gray-900">Noch keine Bewertungen</h3>
                                    <p className="mb-6">Importieren Sie Bewertungen oder warten Sie auf die ersten Kundenfeedbacks.</p>
                                    <Button onClick={() => setActiveTab('import')}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Bewertungen importieren
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* IMPORT TAB - NEW DESIGN */}
                    <TabsContent value="import" className="space-y-6">
                        {importStep === 1 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Schritt 1: Produkte auswählen</CardTitle>
                                    <CardDescription>Wählen Sie die Produkte aus, für die Sie Bewertungen importieren möchten.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {loadingProducts ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={selectedProducts.length === products.length && products.length > 0}
                                                        onCheckedChange={toggleAll}
                                                    />
                                                    <span className="text-sm font-medium">Alle auswählen ({products.length})</span>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {selectedProducts.length} ausgewählt
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
                                                {products.map(product => (
                                                    <div
                                                        key={product.id}
                                                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${selectedProducts.includes(product.id) ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}
                                                        onClick={() => toggleProduct(product.id)}
                                                    >
                                                        <Checkbox
                                                            checked={selectedProducts.includes(product.id)}
                                                            onCheckedChange={() => toggleProduct(product.id)}
                                                        />
                                                        <div className="h-12 w-12 bg-white rounded border flex-shrink-0 overflow-hidden">
                                                            {product.images && product.images[0] ? (
                                                                <img src={product.images[0].src} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center bg-gray-100">
                                                                    <ImageIcon className="h-4 w-4 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate" title={product.title}>{product.title}</p>
                                                            <p className="text-xs text-gray-500">ID: {product.id}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-end pt-4 border-t">
                                                <Button
                                                    disabled={selectedProducts.length === 0}
                                                    onClick={() => setImportStep(2)}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    Weiter zu Schritt 2 <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {importStep === 2 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Button variant="ghost" size="sm" onClick={() => setImportStep(1)} className="-ml-2 text-gray-500">
                                            &larr; Zurück
                                        </Button>
                                    </div>
                                    <CardTitle>Schritt 2: Importquelle wählen</CardTitle>
                                    <CardDescription>
                                        Importieren Sie Bewertungen für <strong>{selectedProducts.length} ausgewählte Produkte</strong>.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div
                                            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${importSource === 'csv' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                                            onClick={() => setImportSource('csv')}
                                        >
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-3 bg-white rounded-full shadow-sm">
                                                    <FileText className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <h3 className="font-semibold text-lg">CSV Datei</h3>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Laden Sie eine CSV-Datei von Loox, Judge.me oder Shopify Reviews hoch.
                                            </p>
                                        </div>

                                        <div
                                            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${importSource === 'url' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                                            onClick={() => setImportSource('url')}
                                        >
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-3 bg-white rounded-full shadow-sm">
                                                    <LinkIcon className="h-6 w-6 text-green-600" />
                                                </div>
                                                <h3 className="font-semibold text-lg">URL Import</h3>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Importieren Sie direkt von AliExpress, Amazon oder anderen Shops via URL.
                                            </p>
                                        </div>

                                        <div
                                            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${importSource === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                                            onClick={() => setImportSource('manual')}
                                        >
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-3 bg-white rounded-full shadow-sm">
                                                    <PenTool className="h-6 w-6 text-purple-600" />
                                                </div>
                                                <h3 className="font-semibold text-lg">Manuell schreiben</h3>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Erstellen Sie Bewertungen manuell direkt hier im Dashboard.
                                            </p>
                                        </div>
                                    </div>

                                    {importSource === 'url' && (
                                        <div className="bg-white p-6 rounded-lg border animate-in fade-in slide-in-from-top-4">
                                            <h4 className="font-medium mb-4">URL eingeben</h4>
                                            <div className="flex gap-3">
                                                <Input
                                                    placeholder="https://aliexpress.com/item/..."
                                                    value={importUrl}
                                                    onChange={(e) => setImportUrl(e.target.value)}
                                                />
                                                <Button className="bg-green-600 hover:bg-green-700">
                                                    Import Starten
                                                </Button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Die Bewertungen werden automatisch auf alle {selectedProducts.length} ausgewählten Produkte verteilt.
                                            </p>
                                        </div>
                                    )}

                                    {importSource === 'csv' && (
                                        <div className="bg-white p-6 rounded-lg border animate-in fade-in slide-in-from-top-4 text-center">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-medium">CSV Upload</h4>
                                                <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Vorlage herunterladen
                                                </Button>
                                            </div>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:bg-gray-50 transition-colors cursor-pointer relative">
                                                <input
                                                    type="file"
                                                    accept=".csv"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={handleCsvUpload}
                                                />
                                                {isUploadingCsv ? (
                                                    <div className="flex flex-col items-center">
                                                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
                                                        <p className="font-medium">Wird hochgeladen...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                                                        <p className="font-medium">CSV Datei hier ablegen oder klicken</p>
                                                        <p className="text-xs text-gray-500 mt-1">Unterstützt: Loox, Judge.me, Shopify</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {importSource === 'manual' && (
                                        <div className="bg-white p-6 rounded-lg border animate-in fade-in slide-in-from-top-4">
                                            <h4 className="font-medium mb-4">Bewertung schreiben</h4>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Name des Kunden</Label>
                                                        <Input
                                                            placeholder="Max Mustermann"
                                                            value={manualReview.customer_name}
                                                            onChange={(e) => setManualReview({ ...manualReview, customer_name: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>E-Mail (Optional)</Label>
                                                        <Input
                                                            placeholder="max@example.com"
                                                            value={manualReview.customer_email}
                                                            onChange={(e) => setManualReview({ ...manualReview, customer_email: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Bewertung (Sterne)</Label>
                                                        <select
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                            value={manualReview.rating}
                                                            onChange={(e) => setManualReview({ ...manualReview, rating: parseInt(e.target.value) })}
                                                        >
                                                            <option value="5">5 Sterne</option>
                                                            <option value="4">4 Sterne</option>
                                                            <option value="3">3 Sterne</option>
                                                            <option value="2">2 Sterne</option>
                                                            <option value="1">1 Stern</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Datum</Label>
                                                        <Input
                                                            type="date"
                                                            value={manualReview.date}
                                                            onChange={(e) => setManualReview({ ...manualReview, date: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Titel der Bewertung</Label>
                                                    <Input
                                                        placeholder="Super Produkt!"
                                                        value={manualReview.title}
                                                        onChange={(e) => setManualReview({ ...manualReview, title: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Inhalt</Label>
                                                    <Textarea
                                                        placeholder="Ich bin sehr zufrieden mit..."
                                                        rows={4}
                                                        value={manualReview.content}
                                                        onChange={(e) => setManualReview({ ...manualReview, content: e.target.value })}
                                                    />
                                                </div>

                                                <div className="pt-2 flex justify-end">
                                                    <Button
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                        onClick={handleManualSubmit}
                                                        disabled={isSubmittingManual}
                                                    >
                                                        {isSubmittingManual ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Speichern...
                                                            </>
                                                        ) : (
                                                            'Bewertung hinzufügen'
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* WIDGETS TAB */}
                    <TabsContent value="widgets" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Widget Design</CardTitle>
                                <CardDescription>Passen Sie das Aussehen Ihrer Bewertungen an</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Settings Sidebar */}
                                    <div className="space-y-6 border-r pr-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Primärfarbe</label>
                                            <div className="flex gap-2">
                                                <div className="w-8 h-8 rounded-full bg-black cursor-pointer ring-2 ring-offset-2 ring-black"></div>
                                                <div className="w-8 h-8 rounded-full bg-blue-600 cursor-pointer"></div>
                                                <div className="w-8 h-8 rounded-full bg-red-500 cursor-pointer"></div>
                                                <div className="w-8 h-8 rounded-full bg-green-500 cursor-pointer"></div>
                                                <div className="w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer">
                                                    <Plus className="h-4 w-4 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Layout</label>
                                            <select className="w-full border rounded-md h-10 px-3">
                                                <option>Liste (Standard)</option>
                                                <option>Raster (Grid)</option>
                                                <option>Karussell (Slider)</option>
                                                <option>Masonry</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Preview Area */}
                                    <div className="col-span-2 bg-gray-50 p-6 rounded-lg border border-dashed">
                                        <h4 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Vorschau</h4>

                                        {/* Mock Widget */}
                                        <div className="bg-white p-6 rounded-lg shadow-sm max-w-md mx-auto">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="text-4xl font-bold text-gray-900">4.8</div>
                                                <div>
                                                    <div className="flex text-yellow-400 mb-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className="h-5 w-5 fill-current" />
                                                        ))}
                                                    </div>
                                                    <p className="text-sm text-gray-500">Basierend auf 128 Bewertungen</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="border-b pb-4">
                                                    <div className="flex justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                                            <span className="font-medium">Anna S.</span>
                                                        </div>
                                                        <span className="text-xs text-gray-400">vor 2 Tagen</span>
                                                    </div>
                                                    <div className="flex text-yellow-400 mb-2">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className="h-3 w-3 fill-current" />
                                                        ))}
                                                    </div>
                                                    <p className="text-sm text-gray-600">Super Qualität, bin sehr zufrieden!</p>
                                                    <div className="mt-3 flex gap-2">
                                                        <div className="w-16 h-16 bg-gray-100 rounded-md"></div>
                                                        <div className="w-16 h-16 bg-gray-100 rounded-md"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* EMAILS TAB */}
                    <TabsContent value="emails" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>E-Mail Automation</CardTitle>
                                <CardDescription>Senden Sie automatische Bewertungsanfragen nach dem Kauf</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-100">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-full shadow-sm">
                                                <Mail className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-blue-900">Automatische Anfragen sind aktiv</h4>
                                                <p className="text-sm text-blue-700">E-Mails werden 14 Tage nach Erfüllung versendet.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-blue-900">Status:</span>
                                            <Badge className="bg-green-500 hover:bg-green-600">Aktiv</Badge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="font-medium">Timing</h4>
                                            <div className="flex gap-4 items-center">
                                                <Input type="number" defaultValue={14} className="w-24" />
                                                <span className="text-gray-600">Tage nach Fulfillment senden</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-medium">Belohnung (Incentive)</h4>
                                            <div className="flex gap-4 items-center">
                                                <Input type="number" defaultValue={10} className="w-24" />
                                                <span className="text-gray-600">% Rabatt für Foto-Reviews</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}

function TrendingUp({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    )
}

function Plus({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    )
}
