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
    FileText,
    TrendingUp
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

    // Stats State
    const [stats, setStats] = useState({
        totalReviews: 0,
        averageRating: 0,
        photoReviews: 0,
        pendingReviews: 0,
        recentReviews: [] as any[]
    })
    const [loadingStats, setLoadingStats] = useState(false)

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchStats()
        } else if (activeTab === 'reviews') {
            fetchAllReviews()
        }
    }, [activeTab])

    // All Reviews State
    const [allReviews, setAllReviews] = useState<any[]>([])
    const [loadingAllReviews, setLoadingAllReviews] = useState(false)
    const [reviewsPage, setReviewsPage] = useState(1)
    const [reviewsTotal, setReviewsTotal] = useState(0)

    const fetchAllReviews = async () => {
        setLoadingAllReviews(true)
        try {
            const res = await fetch(`/api/reviews?page=${reviewsPage}&limit=20`)
            const data = await res.json()
            if (data.reviews) {
                setAllReviews(data.reviews)
                setReviewsTotal(data.pagination.total)
            }
        } catch (error) {
            console.error('Failed to fetch all reviews', error)
            toast.error('Fehler beim Laden der Bewertungen')
        } finally {
            setLoadingAllReviews(false)
        }
    }

    const fetchStats = async () => {
        setLoadingStats(true)
        try {
            const res = await fetch('/api/reviews/stats')
            const data = await res.json()
            if (!data.error) {
                setStats(data)
            }
        } catch (error) {
            console.error('Failed to fetch stats', error)
        } finally {
            setLoadingStats(false)
        }
    }

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

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
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
                                            <h3 className="text-3xl font-bold text-gray-900 mt-2">
                                                {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalReviews.toLocaleString()}
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <MessageSquare className="h-5 w-5 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-sm text-green-600">
                                        <TrendingUp className="h-4 w-4 mr-1" />
                                        <span>Aktualisiert gerade eben</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Durchschnitt</p>
                                            <h3 className="text-3xl font-bold text-gray-900 mt-2 flex items-center">
                                                {loadingStats ? '...' : stats.averageRating}
                                                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 ml-2" />
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
                                            <p className="text-sm font-medium text-gray-500">Mit Fotos</p>
                                            <h3 className="text-3xl font-bold text-gray-900 mt-2">
                                                {loadingStats ? '...' : stats.photoReviews}
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-purple-50 rounded-lg">
                                            <ImageIcon className="h-5 w-5 text-purple-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-sm text-purple-600">
                                        <ImageIcon className="h-4 w-4 mr-1" />
                                        <span>{loadingStats ? '...' : Math.round((stats.photoReviews / stats.totalReviews) * 100)}% aller Reviews</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Ausstehend</p>
                                            <h3 className="text-3xl font-bold text-gray-900 mt-2">
                                                {loadingStats ? '...' : stats.pendingReviews}
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-orange-50 rounded-lg">
                                            <CheckCircle className="h-5 w-5 text-orange-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-sm text-orange-600">
                                        <ArrowRight className="h-4 w-4 mr-1" />
                                        <span>Jetzt prüfen</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Reviews */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Neueste Bewertungen</CardTitle>
                                <CardDescription>Die letzten eingegangenen Bewertungen</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {loadingStats ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        </div>
                                    ) : stats.recentReviews.length > 0 ? (
                                        stats.recentReviews.map((review: any) => (
                                            <div key={review.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                    {review.customerName?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{review.customerName}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className="flex">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <Star
                                                                            key={i}
                                                                            className={`h-3 w-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Badge variant={review.status === 'APPROVED' ? 'default' : 'secondary'}>
                                                            {review.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-2">{review.content}</p>
                                                    {review.status === 'PENDING' && (
                                                        <div className="mt-3 flex gap-2">
                                                            <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={async () => {
                                                                try {
                                                                    await fetch(`/api/reviews/${review.id}/approve`, { method: 'POST' });
                                                                    toast.success('Bewertung freigegeben');
                                                                    fetchStats(); // Refresh stats
                                                                } catch (e) {
                                                                    toast.error('Fehler beim Freigeben');
                                                                }
                                                            }}>
                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                Freigeben
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            Keine Bewertungen vorhanden
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* REVIEWS LIST TAB */}
                    <TabsContent value="reviews">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Alle Bewertungen</CardTitle>
                                        <CardDescription>Verwalten Sie alle Kundenbewertungen</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                            <Input placeholder="Suchen..." className="pl-9 w-[200px]" />
                                        </div>
                                        <Button variant="outline">
                                            <Filter className="h-4 w-4 mr-2" />
                                            Filter
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingAllReviews ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    </div>
                                ) : allReviews.length > 0 ? (
                                    <div className="space-y-4">
                                        {allReviews.map((review: any) => (
                                            <div key={review.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                                                    {review.customerName?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <h4 className="font-medium">{review.customerName}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className="flex">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <Star
                                                                            key={i}
                                                                            className={`h-3 w-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={review.status === 'APPROVED' ? 'default' : 'secondary'}>
                                                                {review.status}
                                                            </Badge>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-2">{review.content}</p>
                                                    {review.productTitle && (
                                                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                                            <LinkIcon className="h-3 w-3" />
                                                            {review.productTitle}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900">Keine Bewertungen gefunden</h3>
                                        <p className="text-gray-500 mt-1">Es wurden noch keine Bewertungen abgegeben.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* IMPORT TAB */}
                    <TabsContent value="import" className="space-y-6">
                        {/* Step 1: Select Products */}
                        {importStep === 1 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>1. Produkte auswählen</CardTitle>
                                    <CardDescription>Wählen Sie die Produkte aus, für die Sie Bewertungen importieren möchten</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {loadingProducts ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="text-sm text-gray-500">
                                                    {selectedProducts.length} Produkte ausgewählt
                                                </div>
                                                <Button variant="outline" size="sm" onClick={toggleAll}>
                                                    {selectedProducts.length === products.length ? 'Alle abwählen' : 'Alle auswählen'}
                                                </Button>
                                            </div>
                                            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                                                {products.map(product => (
                                                    <div key={product.id} className="flex items-center p-3 hover:bg-gray-50">
                                                        <Checkbox
                                                            checked={selectedProducts.includes(product.id)}
                                                            onCheckedChange={() => toggleProduct(product.id)}
                                                            className="mr-4"
                                                        />
                                                        <div className="h-10 w-10 bg-gray-100 rounded-md mr-4 overflow-hidden">
                                                            {product.images[0] && (
                                                                <img src={product.images[0].src} alt="" className="h-full w-full object-cover" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-sm font-medium">{product.title}</h4>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <Button
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                    disabled={selectedProducts.length === 0}
                                                    onClick={() => setImportStep(2)}
                                                >
                                                    Weiter zu Schritt 2
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 2: Choose Source */}
                        {importStep === 2 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <Button variant="ghost" size="icon" onClick={() => setImportStep(1)}>
                                            <ArrowRight className="h-4 w-4 rotate-180" />
                                        </Button>
                                        <div>
                                            <CardTitle>2. Quelle wählen</CardTitle>
                                            <CardDescription>Woher möchten Sie die Bewertungen importieren?</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div
                                            className={`border-2 rounded-xl p-6 cursor-pointer transition-all hover:border-blue-500 ${importSource === 'csv' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                                            onClick={() => setImportSource('csv')}
                                        >
                                            <FileText className="h-8 w-8 text-blue-600 mb-4" />
                                            <h3 className="font-semibold mb-2">CSV Datei</h3>
                                            <p className="text-sm text-gray-500">Laden Sie eine CSV-Datei mit Bewertungen hoch</p>
                                        </div>

                                        <div
                                            className={`border-2 rounded-xl p-6 cursor-pointer transition-all hover:border-purple-500 ${importSource === 'url' ? 'border-purple-600 bg-purple-50' : 'border-gray-200'}`}
                                            onClick={() => setImportSource('url')}
                                        >
                                            <LinkIcon className="h-8 w-8 text-purple-600 mb-4" />
                                            <h3 className="font-semibold mb-2">AliExpress / Amazon</h3>
                                            <p className="text-sm text-gray-500">Importieren Sie per URL von anderen Marktplätzen</p>
                                        </div>

                                        <div
                                            className={`border-2 rounded-xl p-6 cursor-pointer transition-all hover:border-green-500 ${importSource === 'manual' ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}
                                            onClick={() => setImportSource('manual')}
                                        >
                                            <PenTool className="h-8 w-8 text-green-600 mb-4" />
                                            <h3 className="font-semibold mb-2">Manuell erstellen</h3>
                                            <p className="text-sm text-gray-500">Schreiben Sie eine Bewertung selbst</p>
                                        </div>
                                    </div>

                                    {/* Source Content */}
                                    <div className="mt-8">
                                        {importSource === 'url' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="https://aliexpress.com/item/..."
                                                        value={importUrl}
                                                        onChange={(e) => setImportUrl(e.target.value)}
                                                    />
                                                    <Button className="bg-purple-600 hover:bg-purple-700">
                                                        Importieren
                                                    </Button>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    Unterstützt aktuell AliExpress und Amazon Produkt-URLs.
                                                </p>
                                            </div>
                                        )}

                                        {importSource === 'csv' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors relative">
                                                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        CSV Datei hier ablegen oder klicken zum Auswählen
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Max. 5MB
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept=".csv"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        onChange={handleCsvUpload}
                                                    />
                                                    {isUploadingCsv ? (
                                                        <div className="flex flex-col items-center">
                                                            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mt-2" />
                                                            <span className="text-xs text-blue-600 mt-1">Wird hochgeladen...</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <Button variant="link" className="text-blue-600 p-0" onClick={downloadCsvTemplate}>
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Beispiel-CSV herunterladen
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {importSource === 'manual' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 max-w-2xl mx-auto">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Kundenname</Label>
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

                                                <div className="space-y-2">
                                                    <Label>Bewertung</Label>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                onClick={() => setManualReview({ ...manualReview, rating: star })}
                                                                className="focus:outline-none"
                                                            >
                                                                <Star
                                                                    className={`h-6 w-6 ${star <= manualReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Datum</Label>
                                                    <Input
                                                        type="date"
                                                        value={manualReview.date}
                                                        onChange={(e) => setManualReview({ ...manualReview, date: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Titel (Optional)</Label>
                                                    <Input
                                                        placeholder="Tolles Produkt!"
                                                        value={manualReview.title}
                                                        onChange={(e) => setManualReview({ ...manualReview, title: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Inhalt</Label>
                                                    <Textarea
                                                        placeholder="Ich bin sehr zufrieden mit..."
                                                        className="min-h-[100px]"
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
                                                            <>
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                Bewertung erstellen
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* WIDGETS TAB */}
                    <TabsContent value="widgets">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Widget Design</CardTitle>
                                    <CardDescription>Passen Sie das Aussehen Ihrer Widgets an</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Primärfarbe</Label>
                                        <div className="flex gap-2">
                                            {['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#000000'].map((color) => (
                                                <div
                                                    key={color}
                                                    className="h-8 w-8 rounded-full cursor-pointer border-2 border-white ring-1 ring-gray-200"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Layout</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="border-2 border-blue-600 bg-blue-50 rounded-lg p-4 cursor-pointer text-center">
                                                <div className="h-12 bg-white rounded mb-2 border border-blue-100"></div>
                                                <span className="text-sm font-medium text-blue-700">Liste</span>
                                            </div>
                                            <div className="border rounded-lg p-4 cursor-pointer text-center hover:bg-gray-50">
                                                <div className="grid grid-cols-2 gap-1 mb-2">
                                                    <div className="h-12 bg-gray-100 rounded"></div>
                                                    <div className="h-12 bg-gray-100 rounded"></div>
                                                </div>
                                                <span className="text-sm font-medium text-gray-600">Raster</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Preview */}
                            <Card className="bg-gray-50/50">
                                <CardHeader>
                                    <CardTitle>Vorschau</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="text-center">
                                                <div className="text-4xl font-bold text-gray-900">4.8</div>
                                                <div className="flex text-yellow-400 my-1">
                                                    <Star className="h-4 w-4 fill-current" />
                                                    <Star className="h-4 w-4 fill-current" />
                                                    <Star className="h-4 w-4 fill-current" />
                                                    <Star className="h-4 w-4 fill-current" />
                                                    <Star className="h-4 w-4 fill-current" />
                                                </div>
                                                <div className="text-xs text-gray-500">128 Reviews</div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                {[5, 4, 3, 2, 1].map((star) => (
                                                    <div key={star} className="flex items-center gap-2 text-xs">
                                                        <span className="w-3">{star}</span>
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-yellow-400 rounded-full"
                                                                style={{ width: star === 5 ? '70%' : star === 4 ? '20%' : '5%' }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="border-b pb-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                                                        <div>
                                                            <div className="font-medium text-sm">Max M.</div>
                                                            <div className="flex text-yellow-400 text-xs">
                                                                <Star className="h-3 w-3 fill-current" />
                                                                <Star className="h-3 w-3 fill-current" />
                                                                <Star className="h-3 w-3 fill-current" />
                                                                <Star className="h-3 w-3 fill-current" />
                                                                <Star className="h-3 w-3 fill-current" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400">vor 2 Tagen</span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    Super Produkt, bin sehr zufrieden mit der Qualität und dem schnellen Versand!
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* EMAILS TAB */}
                    <TabsContent value="emails">
                        <Card>
                            <CardHeader>
                                <CardTitle>E-Mail Automation</CardTitle>
                                <CardDescription>Senden Sie automatische Bewertungsanfragen</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-gray-500">
                                    <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <h3 className="text-lg font-medium text-gray-900">Bald verfügbar</h3>
                                    <p className="mt-1">Die E-Mail Automation wird in Kürze freigeschaltet.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
