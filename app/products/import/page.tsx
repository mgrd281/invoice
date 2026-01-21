'use client'

<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react'
=======
import { useState, useEffect } from 'react'
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    ArrowRight,
    Download,
    Globe,
    Search,
    ShoppingCart,
    Tag,
    Box,
    CheckCircle2,
    AlertCircle,
    Package,
    Info,
    ExternalLink,
    Zap,
    ArrowLeft,
    RefreshCw,
    Plus,
    Trash2,
    Settings as SettingsIcon,
    DollarSign,
    FileText,
<<<<<<< HEAD
    Sparkles,
    Eye,
    Edit,
    Clock,
    CheckCircle,
    XCircle,
    Upload
=======
    Sparkles
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'

<<<<<<< HEAD
interface ImportedProduct {
    id: string
    title: string
    price: string
    image?: { src: string }
    variants?: Array<{ price: string }>
    status?: 'imported' | 'pending' | 'failed'
    importedAt?: string
    sourceUrl?: string
    sourceDomain?: string
}

=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
export default function ProductImportPage() {
    const { showToast, ToastContainer } = useToast()
    const [url, setUrl] = useState('')
    const [urls, setUrls] = useState<string[]>([''])
    const [isImporting, setIsImporting] = useState(false)
    const [importStep, setImportStep] = useState<'idle' | 'validating' | 'importing' | 'complete'>('idle')
    const [activeTab, setActiveTab] = useState('import')
<<<<<<< HEAD
    const [isDragging, setIsDragging] = useState(false)
=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9

    // Settings State
    const [settings, setSettings] = useState({
        skipValidation: true,
        acceptTerms: true,
        collection: '',
        priceMultiplier: '1',
        isActive: true,
        isPhysical: true,
        chargeTax: true,
        trackQuantity: true
    })

    // Preview State
    const [previewData, setPreviewData] = useState<any>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)

    // Collections State
    const [collections, setCollections] = useState<any[]>([])
    const [loadingCollections, setLoadingCollections] = useState(false)

    // Store State
<<<<<<< HEAD
    const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([])
    const [shopDomain, setShopDomain] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [sourceFilter, setSourceFilter] = useState<string>('all')
    const [uniqueSources, setUniqueSources] = useState<string[]>([])

    // Extract domain from URL
    const extractDomain = (url: string) => {
        try {
            const urlObj = new URL(url)
            return urlObj.hostname.replace('www.', '')
        } catch {
            return ''
        }
    }

    // Get favicon URL
    const getFaviconUrl = (domain: string) => {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    }
=======
    const [importedProducts, setImportedProducts] = useState<any[]>([])
    const [shopDomain, setShopDomain] = useState('')
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9

    // Load collections on mount
    useEffect(() => {
        const fetchCollections = async () => {
            setLoadingCollections(true)
            try {
                const response = await fetch('/api/shopify/collections')
                const data = await response.json()
                if (data.success) {
                    setCollections(data.collections)
                }
            } catch (error) {
                console.error('Error loading collections:', error)
            } finally {
                setLoadingCollections(false)
            }
        }
        fetchCollections()
    }, [])

    // Load imported products when tab changes to 'store'
    useEffect(() => {
        if (activeTab === 'store') {
            loadImportedProducts()
        }
    }, [activeTab])

<<<<<<< HEAD
    // Extract unique sources when products change
    useEffect(() => {
        const sources = Array.from(new Set(importedProducts.map(p => p.sourceDomain).filter(Boolean))) as string[]
        setUniqueSources(sources)
    }, [importedProducts])

=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
    const loadImportedProducts = async () => {
        try {
            const response = await fetch('/api/products/imported')
            const data = await response.json()
            if (data.success) {
<<<<<<< HEAD
                const productsWithSource = data.products.map((p: any) => ({
                    ...p,
                    image: p.image || (p.images && p.images[0]) || null,
                    sourceUrl: p.sourceUrl || '',
                    sourceDomain: p.sourceUrl ? extractDomain(p.sourceUrl) : '',
                    importedAt: p.created_at || p.createdAt || p.importedAt || new Date().toISOString(),
                    status: p.status || 'imported'
                }))
                setImportedProducts(productsWithSource)
=======
                setImportedProducts(data.products)
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                setShopDomain(data.shopDomain)
            }
        } catch (error) {
            console.error('Error loading store:', error)
        }
    }

    const handleAddUrl = () => {
        setUrls([...urls, ''])
    }

    const handleRemoveUrl = (index: number) => {
        if (urls.length > 1) {
            const newUrls = urls.filter((_, i) => i !== index)
            setUrls(newUrls)
        }
    }

    const handleUrlChange = (index: number, value: string) => {
        const newUrls = [...urls]
        newUrls[index] = value
        setUrls(newUrls)
    }

<<<<<<< HEAD
    // Drag & Drop Handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const text = e.dataTransfer.getData('text')
        if (text && text.startsWith('http')) {
            const existingUrls = urls.filter(u => u.trim())
            if (existingUrls.length > 0 && !existingUrls[existingUrls.length - 1]) {
                handleUrlChange(existingUrls.length - 1, text)
            } else {
                setUrls([...urls, text])
            }
        }
    }, [urls])

=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
    const handleStartImport = async () => {
        const validUrls = urls.filter(u => u.trim().length > 0)
        if (validUrls.length === 0 || !settings.acceptTerms) return

        setIsImporting(true)
        setImportStep('validating')
        setPreviewData(null)

        try {
            // For single URL, show preview
            if (validUrls.length === 1) {
                setIsLoadingPreview(true)
                const response = await fetch('/api/products/import/external', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: validUrls[0] })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Failed to import product')
                }

                setImportStep('importing')
                const data = await response.json()
                const product = data.product

<<<<<<< HEAD
                // Add source tracking
                product.sourceUrl = validUrls[0]
                product.sourceDomain = extractDomain(validUrls[0])

                // AI Enhancement (existing logic)
=======
                // AI Enhancement
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                try {
                    showToast("Analysiere Produktdaten mit AI...", "info")
                    await new Promise(resolve => setTimeout(resolve, 1500))

                    const aiRes = await fetch('/api/ai/enhance-product', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ product })
                    })

                    if (aiRes.ok) {
                        const aiData = await aiRes.json()
                        if (aiData.enhancedText) product.description = aiData.enhancedText
                        if (aiData.newTitle) product.title = aiData.newTitle
                        if (aiData.tags) product.tags = Array.isArray(aiData.tags) ? aiData.tags.join(', ') : aiData.tags
                        if (aiData.handle) product.handle = aiData.handle
                        if (aiData.metaTitle) product.metaTitle = aiData.metaTitle
                        if (aiData.metaDescription) product.metaDescription = aiData.metaDescription
                        showToast("AI-Optimierung erfolgreich!", "success")
                    }
                } catch (aiError) {
                    console.error('AI Enhancement failed:', aiError)
                }

                // Apply price multiplier
                const multiplier = parseFloat(settings.priceMultiplier) || 1
                if (product.price && multiplier !== 1) {
                    product.price = (parseFloat(product.price) * multiplier).toFixed(2)
                }

                setPreviewData(product)
                setImportStep('complete')
                setIsLoadingPreview(false)
                showToast("Produktdaten erfolgreich geladen", "success")
            } else {
<<<<<<< HEAD
                // Bulk import with source tracking
=======
                // Bulk import
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                for (const url of validUrls) {
                    try {
                        const scrapeRes = await fetch('/api/products/import/external', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url })
                        })

                        if (!scrapeRes.ok) continue
                        const scrapeData = await scrapeRes.json()
                        const product = scrapeData.product

<<<<<<< HEAD
                        // Add source tracking
                        product.sourceUrl = url
                        product.sourceDomain = extractDomain(url)

=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                        // Apply multiplier
                        const multiplier = parseFloat(settings.priceMultiplier) || 1
                        if (product.price && multiplier !== 1) {
                            product.price = (parseFloat(product.price) * multiplier).toFixed(2)
                        }

                        // Save immediately
                        await fetch('/api/products/import/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ product, settings })
                        })
                    } catch (error) {
                        console.error(`Failed to import ${url}:`, error)
                    }
                }

                showToast(`Bulk Import abgeschlossen (${validUrls.length} Produkte)`, "success")
                setUrls([''])
                setActiveTab('store')
            }
        } catch (error) {
            console.error('Import error:', error)
            showToast(error instanceof Error ? error.message : 'Import fehlgeschlagen', "error")
            setImportStep('idle')
        } finally {
            setIsImporting(false)
            setIsLoadingPreview(false)
        }
    }

    const handleSaveProduct = async () => {
        if (!previewData) return

        setIsSaving(true)
        try {
            const response = await fetch('/api/products/import/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product: previewData,
                    settings: settings
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to save product')
            }

            showToast("Produkt erfolgreich importiert!", "success")
            setActiveTab('store')
            setPreviewData(null)
            setUrls([''])
            setImportStep('idle')

        } catch (error) {
            console.error('Save error:', error)
            showToast(error instanceof Error ? error.message : 'Speichern fehlgeschlagen', "error")
        } finally {
            setIsSaving(false)
        }
    }

<<<<<<< HEAD
    // Filter products
    const filteredProducts = importedProducts.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesSource = sourceFilter === 'all' || product.sourceDomain === sourceFilter
        return matchesSearch && matchesSource
    })

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'imported': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20'
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        }
    }

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'imported': return <CheckCircle className="h-3 w-3" />
            case 'pending': return <Clock className="h-3 w-3" />
            case 'failed': return <XCircle className="h-3 w-3" />
            default: return <Box className="h-3 w-3" />
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-50 p-4 md:p-8">
            <ToastContainer />

            {/* Ambient Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto space-y-6 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-3">
                        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors group">
                            <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                            Zurück zum Dashboard
                        </Link>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center gap-3">
                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                    <Download className="h-7 w-7 text-white" />
                                </div>
                                <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Product Importer
                                </span>
                            </h1>
                            <p className="text-gray-600 text-lg mt-2">Importieren Sie Produkte von jeder URL – Powered by AI</p>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex items-center gap-3 bg-white/80 p-2 rounded-2xl border border-gray-200 backdrop-blur-xl shadow-lg">
                        <Button
                            variant={activeTab === 'import' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('import')}
                            className={`rounded-xl transition-all duration-300 ${activeTab === 'import'
                                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
=======
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-4 md:p-8 font-sans">
            <ToastContainer />
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Modern Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2 group">
                            <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                            Zurück zum Dashboard
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Product Importer
                            </span>
                        </h1>
                        <p className="text-gray-600 text-lg">Importieren Sie Produkte von jeder URL direkt in Ihren Store.</p>
                    </div>

                    {/* Modern Tab Switcher */}
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-lg border border-gray-100">
                        <Button
                            variant={activeTab === 'import' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('import')}
                            className={`rounded-xl transition-all duration-200 ${activeTab === 'import'
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                                    : 'text-gray-600 hover:bg-gray-50'
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                }`}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Import
                        </Button>
                        <Button
                            variant={activeTab === 'store' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('store')}
<<<<<<< HEAD
                            className={`rounded-xl transition-all duration-300 ${activeTab === 'store'
                                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
=======
                            className={`rounded-xl transition-all duration-200 ${activeTab === 'store'
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                                    : 'text-gray-600 hover:bg-gray-50'
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                }`}
                        >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Store
<<<<<<< HEAD
                            <Badge className="ml-2 bg-violet-100 text-violet-700 border-0 px-2">
=======
                            <Badge variant="secondary" className="ml-2 bg-white/20 text-current border-0">
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                {importedProducts.length}
                            </Badge>
                        </Button>
                    </div>
                </div>

                {activeTab === 'import' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Left Column: Input & Settings */}
                        <div className="lg:col-span-7 space-y-6">

<<<<<<< HEAD
                            {/* URL Input Card with Drag & Drop */}
                            <Card
                                className="border-gray-200 bg-white/80 backdrop-blur-xl shadow-lg overflow-hidden"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 transition-opacity ${isDragging ? 'opacity-100' : 'opacity-50'}`}></div>
                                <CardHeader className="pb-4 pt-6">
                                    <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mr-3 shadow-lg shadow-violet-500/20">
                                            <Globe className="h-6 w-6 text-white" />
                                        </div>
                                        Product URLs
                                    </CardTitle>
                                    <CardDescription className="text-base text-gray-600">
                                        URLs hinzufügen oder per Drag & Drop einfügen
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Drag & Drop Zone */}
                                    {isDragging && (
                                        <div className="border-2 border-dashed border-violet-500 bg-violet-500/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 mb-4">
                                            <Upload className="h-12 w-12 text-violet-400 animate-bounce" />
                                            <p className="text-violet-300 font-medium">URL hier ablegen</p>
                                        </div>
                                    )}

=======
                            {/* Modern URL Input Card */}
                            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden ring-1 ring-gray-900/5 hover:shadow-2xl transition-shadow duration-300">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                                <CardHeader className="pb-4 pt-6">
                                    <CardTitle className="flex items-center text-xl font-bold">
                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
                                            <Globe className="h-6 w-6 text-white" />
                                        </div>
                                        Produkt URLs
                                    </CardTitle>
                                    <CardDescription className="text-base">
                                        Fügen Sie eine oder mehrere Produkt-URLs hinzu
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                    {/* URL Inputs */}
                                    <div className="space-y-3">
                                        {urls.map((urlValue, index) => (
                                            <div key={index} className="relative group animate-in fade-in slide-in-from-left-4 duration-300">
                                                <div className="relative">
<<<<<<< HEAD
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-violet-500 transition-colors z-10" />
                                                    <Input
                                                        placeholder="https://shop.example.com/product/item"
                                                        className="pl-12 pr-12 h-14 text-base bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:bg-white transition-all rounded-2xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
=======
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                                    <Input
                                                        placeholder="https://shop.beispiel.de/produkt/t-shirt"
                                                        className="pl-12 pr-12 h-14 text-base bg-gray-50/50 border-gray-200 focus:bg-white transition-all shadow-sm rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                        value={urlValue}
                                                        onChange={(e) => handleUrlChange(index, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault()
                                                                handleStartImport()
                                                            }
                                                        }}
                                                    />
                                                    {urls.length > 1 && (
                                                        <button
                                                            onClick={() => handleRemoveUrl(index)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                                                            title="Entfernen"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add URL Button */}
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={handleAddUrl}
<<<<<<< HEAD
                                        className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50 h-12 rounded-2xl transition-all duration-200"
=======
                                        className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 h-12 rounded-2xl transition-all duration-200 hover:shadow-md"
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                    >
                                        <Plus className="h-5 w-5 mr-2" />
                                        Weitere URL hinzufügen
                                    </Button>

                                    {/* Import Button */}
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            size="lg"
<<<<<<< HEAD
                                            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 px-8 h-12 rounded-2xl transform hover:-translate-y-0.5 duration-200"
=======
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl px-8 h-12 rounded-2xl transform hover:-translate-y-0.5 duration-200"
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                            disabled={urls.every(u => !u.trim()) || isImporting}
                                            onClick={handleStartImport}
                                        >
                                            {isImporting ? (
                                                <>
                                                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                                    Importiere...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-5 w-5 mr-2" />
                                                    Import Starten
                                                    <ArrowRight className="h-5 w-5 ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Info Card */}
<<<<<<< HEAD
                                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-4 flex items-start space-x-3">
                                        <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                                            <Info className="h-4 w-4 text-violet-600" />
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p className="font-semibold text-violet-900">Unterstützte Plattformen</p>
                                            <p className="text-violet-700">
                                                Shopify, WooCommerce, Magento und viele mehr. Alle Daten werden automatisch extrahiert.
=======
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-xl p-4 flex items-start space-x-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                            <Info className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p className="font-semibold text-blue-900">Unterstützte Plattformen</p>
                                            <p className="text-blue-700">
                                                Shopify, WooCommerce, Magento und viele mehr. Alle Daten (Metafields, SEO, Bilder) werden automatisch extrahiert.
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                            </p>
                                        </div>
                                    </div>

                                    {/* Checkboxes */}
                                    <div className="flex flex-wrap gap-4 pt-2">
                                        <label className="flex items-center space-x-2 cursor-pointer group">
                                            <Checkbox
                                                checked={settings.skipValidation}
                                                onCheckedChange={(c) => setSettings({ ...settings, skipValidation: c as boolean })}
<<<<<<< HEAD
                                                className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 border-gray-400 rounded-md"
=======
                                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md"
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                            />
                                            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium">Validierung überspringen</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer group">
                                            <Checkbox
                                                checked={settings.acceptTerms}
                                                onCheckedChange={(c) => setSettings({ ...settings, acceptTerms: c as boolean })}
<<<<<<< HEAD
                                                className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 border-gray-400 rounded-md"
=======
                                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md"
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                            />
                                            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium">
                                                AGB akzeptieren
                                            </span>
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>

<<<<<<< HEAD
                            {/* Settings Card */}
                            <Card className="border-gray-200 bg-white/80 backdrop-blur-xl shadow-lg">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mr-3 shadow-lg shadow-purple-500/20">
=======
                            {/* Modern Settings Card */}
                            <Card className="border-none shadow-lg bg-white/90 backdrop-blur-xl ring-1 ring-gray-900/5">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center text-lg font-bold">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mr-3">
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                            <SettingsIcon className="h-5 w-5 text-white" />
                                        </div>
                                        Import Einstellungen
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Settings Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Collection */}
<<<<<<< HEAD
                                        <Card className="bg-gray-50 border-gray-200 shadow-sm">
                                            <CardContent className="p-4 space-y-2">
                                                <Label className="text-gray-700 font-semibold flex items-center">
                                                    <Box className="h-4 w-4 mr-2 text-violet-600" />
=======
                                        <Card className="bg-gray-50/50 border-gray-200 shadow-sm">
                                            <CardContent className="p-4 space-y-2">
                                                <Label className="text-gray-700 font-semibold flex items-center">
                                                    <Box className="h-4 w-4 mr-2 text-blue-600" />
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                    Kollektion
                                                </Label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                                                    <Select
                                                        value={settings.collection}
                                                        onValueChange={(value) => setSettings({ ...settings, collection: value })}
                                                    >
<<<<<<< HEAD
                                                        <SelectTrigger className="pl-9 bg-white border-gray-300 rounded-xl h-11 text-gray-900">
                                                            <SelectValue placeholder="Kollektion wählen..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white border-gray-300 text-gray-900">
=======
                                                        <SelectTrigger className="pl-9 bg-white border-gray-200 rounded-xl h-11">
                                                            <SelectValue placeholder="Kollektion wählen..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                            {collections.map((col) => (
                                                                <SelectItem key={col.id} value={col.id.toString()}>
                                                                    {col.title}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Price Multiplier */}
<<<<<<< HEAD
                                        <Card className="bg-gray-50 border-gray-200 shadow-sm">
                                            <CardContent className="p-4 space-y-2">
                                                <Label className="text-gray-700 font-semibold flex items-center">
                                                    <DollarSign className="h-4 w-4 mr-2 text-emerald-600" />
=======
                                        <Card className="bg-gray-50/50 border-gray-200 shadow-sm">
                                            <CardContent className="p-4 space-y-2">
                                                <Label className="text-gray-700 font-semibold flex items-center">
                                                    <DollarSign className="h-4 w-4 mr-2 text-green-600" />
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                    Preis-Multiplikator
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.1"
<<<<<<< HEAD
                                                        className="bg-white border-gray-300 rounded-xl h-11 pr-16 text-gray-900"
                                                        value={settings.priceMultiplier}
                                                        onChange={(e) => setSettings({ ...settings, priceMultiplier: e.target.value })}
                                                    />
                                                    <div className="absolute right-3 top-3 text-sm text-gray-600 pointer-events-none font-medium">
=======
                                                        className="bg-white border-gray-200 rounded-xl h-11 pr-16"
                                                        value={settings.priceMultiplier}
                                                        onChange={(e) => setSettings({ ...settings, priceMultiplier: e.target.value })}
                                                    />
                                                    <div className="absolute right-3 top-3 text-sm text-gray-500 pointer-events-none font-medium">
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                        × {settings.priceMultiplier}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <Separator className="bg-gray-200" />

                                    {/* Product Options */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
<<<<<<< HEAD
                                            { id: 'isActive', label: 'Produkt aktivieren', icon: CheckCircle2, color: 'emerald' },
=======
                                            { id: 'isActive', label: 'Produkt aktivieren', icon: CheckCircle2, color: 'green' },
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                            { id: 'isPhysical', label: 'Physisches Produkt', icon: Package, color: 'blue' },
                                            { id: 'chargeTax', label: 'Steuern erheben', icon: FileText, color: 'purple' },
                                            { id: 'trackQuantity', label: 'Bestand verfolgen', icon: Tag, color: 'orange' },
                                        ].map((item) => {
                                            const Icon = item.icon
                                            return (
                                                <div
                                                    key={item.id}
<<<<<<< HEAD
                                                    className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-100 transition-all border border-gray-200 hover:border-gray-300 cursor-pointer group"
=======
                                                    className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-all border border-gray-200 hover:border-gray-300 cursor-pointer group"
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                    onClick={() => setSettings({ ...settings, [item.id]: !settings[item.id as keyof typeof settings] })}
                                                >
                                                    <Checkbox
                                                        id={item.id}
                                                        checked={settings[item.id as keyof typeof settings] as boolean}
                                                        onCheckedChange={(c) => setSettings({ ...settings, [item.id]: c as boolean })}
<<<<<<< HEAD
                                                        className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 border-gray-400 rounded-md"
                                                    />
                                                    <Icon className="h-4 w-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
                                                    <Label htmlFor={item.id} className="cursor-pointer font-medium text-gray-600 group-hover:text-gray-900 flex-1 transition-colors">
=======
                                                        className={`data-[state=checked]:bg-${item.color}-500 data-[state=checked]:border-${item.color}-500 rounded-md`}
                                                    />
                                                    <Icon className={`h-4 w-4 text-${item.color}-600`} />
                                                    <Label htmlFor={item.id} className="cursor-pointer font-medium text-gray-700 group-hover:text-gray-900 flex-1">
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                        {item.label}
                                                    </Label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Right Column: Preview */}
                        <div className="lg:col-span-5">
                            <div className="sticky top-6">
                                {previewData ? (
<<<<<<< HEAD
                                    <Card className="border-gray-200 bg-white/80 backdrop-blur-xl shadow-lg overflow-hidden ring-2 ring-violet-200 animate-in fade-in slide-in-from-right-4 duration-500">
                                        {/* Product Image */}
                                        <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden group">
=======
                                    <Card className="border-none shadow-2xl bg-white overflow-hidden ring-2 ring-blue-500/20 animate-in fade-in slide-in-from-right-4 duration-500">
                                        {/* Product Image */}
                                        <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden group">
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                            <img
                                                src={previewData.images?.[0] || '/placeholder.png'}
                                                alt={previewData.title}
                                                className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute top-4 right-4">
<<<<<<< HEAD
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 shadow-md">
=======
                                                <Badge className="bg-green-500 text-white shadow-lg">
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Validiert
                                                </Badge>
                                            </div>
<<<<<<< HEAD
                                            {/* Source Domain */}
                                            {previewData.sourceDomain && (
                                                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-200 shadow-md">
                                                    <img
                                                        src={getFaviconUrl(previewData.sourceDomain)}
                                                        alt=""
                                                        className="h-4 w-4"
                                                    />
                                                    <span className="text-xs text-gray-700 font-medium">
                                                        Imported from: {previewData.sourceDomain}
                                                    </span>
                                                </div>
                                            )}
=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                        </div>

                                        <CardContent className="p-6 space-y-4">
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{previewData.title}</h3>
                                                <div className="flex items-center gap-2">
<<<<<<< HEAD
                                                    <span className="text-3xl font-bold text-violet-600">{previewData.price} €</span>
                                                    {previewData.vendor && (
                                                        <Badge variant="outline" className="text-gray-600 border-gray-300">
=======
                                                    <span className="text-3xl font-bold text-blue-600">{previewData.price} €</span>
                                                    {previewData.vendor && (
                                                        <Badge variant="outline" className="text-gray-600">
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                            {previewData.vendor}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

<<<<<<< HEAD
                                            <Separator className="bg-gray-200" />
=======
                                            <Separator />
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9

                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold text-gray-700">Beschreibung</Label>
                                                <div
<<<<<<< HEAD
                                                    className="text-sm text-gray-600 line-clamp-4 bg-gray-50 p-4 rounded-xl border border-gray-200"
=======
                                                    className="text-sm text-gray-600 line-clamp-4 bg-gray-50 p-4 rounded-xl"
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                    dangerouslySetInnerHTML={{ __html: previewData.description || 'Keine Beschreibung verfügbar' }}
                                                />
                                            </div>

                                            <Button
                                                size="lg"
<<<<<<< HEAD
                                                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 rounded-2xl h-12 transform hover:-translate-y-0.5 transition-all duration-200"
=======
                                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl rounded-2xl h-12 transform hover:-translate-y-0.5 transition-all duration-200"
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                onClick={handleSaveProduct}
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                                        Speichere...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="h-5 w-5 mr-2" />
                                                        Produkt speichern
                                                    </>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
<<<<<<< HEAD
                                    <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-xl shadow-md">
                                        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                            {isLoadingPreview ? (
                                                <div className="space-y-4">
                                                    <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center animate-pulse">
                                                        <RefreshCw className="h-8 w-8 text-violet-600 animate-spin" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-lg font-semibold text-gray-900">Lade Produktdaten...</p>
                                                        <p className="text-sm text-gray-600">Bitte warten Sie einen Moment</p>
=======
                                    <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-white shadow-lg">
                                        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                            {isLoadingPreview ? (
                                                <div className="space-y-4">
                                                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                                                        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-lg font-semibold text-gray-900">Lade Produktdaten...</p>
                                                        <p className="text-sm text-gray-500">Bitte warten Sie einen Moment</p>
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
<<<<<<< HEAD
                                                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                                                        <Package className="h-10 w-10 text-violet-600" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-lg font-semibold text-gray-900">Bereit zum Import</p>
                                                        <p className="text-sm text-gray-600 max-w-xs">
=======
                                                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                                        <Package className="h-10 w-10 text-blue-600" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-lg font-semibold text-gray-900">Bereit zum Import</p>
                                                        <p className="text-sm text-gray-500 max-w-xs">
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                                                            Fügen Sie eine Produkt-URL hinzu, um die Vorschau hier zu sehen
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
<<<<<<< HEAD
                        {/* Filters */}
                        <div className="mb-6 flex flex-col sm:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                                <Input
                                    placeholder="Produkte durchsuchen..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 h-12 bg-white/80 border-gray-300 text-gray-900 placeholder:text-gray-400 rounded-2xl backdrop-blur-xl shadow-md"
                                />
                            </div>

                            {/* Source Filter */}
                            <Select value={sourceFilter} onValueChange={setSourceFilter}>
                                <SelectTrigger className="w-full sm:w-64 h-12 bg-white/80 border-gray-300 text-gray-900 rounded-2xl backdrop-blur-xl shadow-md">
                                    <Globe className="h-4 w-4 mr-2 text-gray-500" />
                                    <SelectValue placeholder="Alle Quellen" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-300 text-gray-900">
                                    <SelectItem value="all">Alle Quellen ({importedProducts.length})</SelectItem>
                                    {uniqueSources.map((source) => (
                                        <SelectItem key={source} value={source}>
                                            {source} ({importedProducts.filter(p => p.sourceDomain === source).length})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredProducts.length === 0 ? (
                                <div className="col-span-full">
                                    <Card className="border-gray-300 bg-white/80 backdrop-blur-xl shadow-md">
                                        <CardContent className="text-center py-16">
                                            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600 text-lg">
                                                {searchQuery || sourceFilter !== 'all'
                                                    ? 'Keine Produkte gefunden'
                                                    : 'Noch keine Produkte importiert'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                filteredProducts.map((product) => (
                                    <Card
                                        key={product.id}
                                        className="group border-gray-300 bg-white/80 backdrop-blur-xl overflow-hidden hover:border-violet-400 transition-all duration-300 hover:shadow-lg hover:shadow-violet-200 cursor-pointer hover:-translate-y-1"
                                    >
                                        {/* Product Image */}
                                        <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                            {product.image && (
                                                <img
                                                    src={product.image.src}
                                                    alt={product.title}
                                                    className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500 loading"
                                                    loading="lazy"
                                                />
                                            )}

                                            {/* Status Badge */}
                                            <div className="absolute top-3 right-3">
                                                <Badge className={`${getStatusColor(product.status)} border backdrop-blur-sm shadow-md`}>
                                                    {getStatusIcon(product.status)}
                                                    <span className="ml-1 capitalize">{product.status || 'imported'}</span>
                                                </Badge>
                                            </div>

                                            {/* Hover Actions */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="flex-1 bg-white/90 hover:bg-white backdrop-blur-xl border-0 text-gray-900"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (shopDomain) {
                                                            window.open(`https://${shopDomain}/admin/products/${product.id}`, '_blank')
                                                        }
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="flex-1 bg-white/90 hover:bg-white backdrop-blur-xl border-0 text-gray-900"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (shopDomain) {
                                                            window.open(`https://${shopDomain}/admin/products/${product.id}`, '_blank')
                                                        }
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                            </div>
                                        </div>

                                        <CardContent className="p-4 space-y-3">
                                            {/* Product Title */}
                                            <h4 className="font-semibold text-sm line-clamp-2 text-gray-900 group-hover:text-violet-700 transition-colors">
                                                {product.title}
                                            </h4>

                                            {/* Price */}
                                            <p className="text-xl font-bold text-violet-600">
                                                {product.variants?.[0]?.price || product.price} €
                                            </p>

                                            <Separator className="bg-gray-200" />

                                            {/* Source Info */}
                                            {product.sourceDomain && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <img
                                                        src={getFaviconUrl(product.sourceDomain)}
                                                        alt=""
                                                        className="h-4 w-4"
                                                    />
                                                    <span className="truncate">
                                                        Imported from: <span className="text-violet-600 font-medium">{product.sourceDomain}</span>
                                                    </span>
                                                </div>
                                            )}

                                            {/* Import Date */}
                                            {product.importedAt && (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(product.importedAt).toLocaleDateString('de-DE', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
=======
                        <Card className="border-none shadow-xl bg-white">
                            <CardHeader>
                                <CardTitle className="text-2xl font-bold">Importierte Produkte</CardTitle>
                                <CardDescription>Verwalten Sie Ihre importierten Produkte</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {importedProducts.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">Noch keine Produkte importiert</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {importedProducts.map((product) => (
                                            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                                                if (shopDomain) {
                                                    window.open(`https://${shopDomain}/admin/products/${product.id}`, '_blank')
                                                }
                                            }}>
                                                <div className="aspect-square bg-gray-100">
                                                    {product.image && (
                                                        <img src={product.image.src} alt={product.title} className="w-full h-full object-contain p-4" />
                                                    )}
                                                </div>
                                                <CardContent className="p-4">
                                                    <h4 className="font-semibold text-sm line-clamp-2 mb-2">{product.title}</h4>
                                                    <p className="text-blue-600 font-bold">{product.variants?.[0]?.price} €</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                    </div>
                )}

            </div>
        </div>
    )
}
