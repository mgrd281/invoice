'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
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
    LayoutGrid,
    List,
    MoreHorizontal,
    Trash2,
    Copy,
    Edit,
    Clipboard,
    Plus
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'

export default function ProductImportPage() {
    const { showToast, ToastContainer } = useToast()
    const [url, setUrl] = useState('')
    const [isImporting, setIsImporting] = useState(false)
    const [importStep, setImportStep] = useState<'idle' | 'validating' | 'importing' | 'complete'>('idle')
    const [activeTab, setActiveTab] = useState('import')

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

    // Shop Domain State
    const [shopDomain, setShopDomain] = useState('')

    // Store State
    const [importedProducts, setImportedProducts] = useState<any[]>([])
    const [loadingStore, setLoadingStore] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Collections State
    const [collections, setCollections] = useState<any[]>([])
    const [loadingCollections, setLoadingCollections] = useState(false)

    // Bulk Import State
    const [importQueue, setImportQueue] = useState<string[]>([])
    const [currentImportIndex, setCurrentImportIndex] = useState(0)
    const [importLogs, setImportLogs] = useState<string[]>([])
    const [isBulkImporting, setIsBulkImporting] = useState(false)

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

    // Auto-paste from clipboard on focus
    useEffect(() => {
        const checkClipboard = async () => {
            // Only check if input is empty to avoid annoying the user
            if (url) return

            try {
                const text = await navigator.clipboard.readText()
                if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                    setUrl(text)
                    showToast("URL aus Zwischenablage eingefügt", "success")
                }
            } catch (err) {
                // Ignore errors (permissions, etc) silently
            }
        }

        window.addEventListener('focus', checkClipboard)
        // Also check on mount
        checkClipboard()

        return () => {
            window.removeEventListener('focus', checkClipboard)
        }
    }, [url])

    const loadImportedProducts = async () => {
        setLoadingStore(true)
        try {
            const response = await fetch('/api/products/imported')
            const data = await response.json()
            if (data.success) {
                setImportedProducts(data.products)
                setShopDomain(data.shopDomain)
            }
        } catch (error) {
            console.error('Error loading store:', error)
            showToast("Fehler beim Laden der Produkte", "error")
        } finally {
            setLoadingStore(false)
        }
    }

    const handleProductClick = (product: any) => {
        if (!shopDomain) return
        const adminUrl = `https://${shopDomain}/admin/products/${product.id}`
        window.open(adminUrl, '_blank')
    }

    // ... (inside return)

    {
        importedProducts.map((product) => (
            <tr
                key={product.id}
                className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                onClick={() => handleProductClick(product)}
            >
                <td className="px-6 py-4">
                    {/* ... content ... */}
                </td>
                {/* ... other cells ... */}
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {/* Actions (stop propagation to prevent opening link when clicking delete/edit) */}
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600"
                            onClick={(e) => {
                                e.stopPropagation()
                                setEditingProduct(product)
                            }}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProduct(product.id)
                            }}
                            disabled={isDeleting === product.id}
                        >
                            {isDeleting === product.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    </div>
                </td>
            </tr>
        ))
    }

    // ... (grid view)

    {
        importedProducts.map((product) => (
            <Card
                key={product.id}
                className="group hover:shadow-xl transition-all duration-300 border-gray-100 overflow-hidden cursor-pointer"
                onClick={() => handleProductClick(product)}
            >
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {/* ... image ... */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-full"
                            onClick={(e) => {
                                e.stopPropagation()
                                setEditingProduct(product)
                            }}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-full text-red-600 hover:text-red-700"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProduct(product.id)
                            }}
                            disabled={isDeleting === product.id}
                        >
                            {isDeleting === product.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                {/* ... content ... */}
            </Card>
        ))
    }

    const handleStartMigration = async () => {
        if (!url || !settings.acceptTerms) return

        // Check for multiple URLs
        const urls = url.split('\n').map(u => u.trim()).filter(u => u.length > 0)

        if (urls.length > 1) {
            // BULK IMPORT MODE
            setIsBulkImporting(true)
            setImportQueue(urls)
            setCurrentImportIndex(0)
            setImportLogs([])

            for (let i = 0; i < urls.length; i++) {
                setCurrentImportIndex(i + 1)
                const currentUrl = urls[i]

                try {
                    // 1. Scrape
                    const scrapeRes = await fetch('/api/products/import/external', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: currentUrl })
                    })

                    if (!scrapeRes.ok) throw new Error('Scrape failed')
                    const scrapeData = await scrapeRes.json()
                    const product = scrapeData.product

                    // 1.5 AI Enhancement (Automatic)
                    try {
                        setImportLogs(prev => [`🤖 ${currentUrl}: Analysiere Produktdaten...`, ...prev])

                        // Artificial delay to ensure user sees the process and to prevent rate limiting
                        await new Promise(resolve => setTimeout(resolve, 2000))

                        setImportLogs(prev => [`✍️ ${currentUrl}: Schreibe professionelle Beschreibung (SEO)...`, ...prev])

                        const aiRes = await fetch('/api/ai/enhance-product', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ product })
                        })

                        if (aiRes.ok) {
                            const aiData = await aiRes.json()
                            if (aiData.enhancedText) {
                                product.description = aiData.enhancedText
                            }
                            if (aiData.newTitle) {
                                product.title = aiData.newTitle
                            }
                            // Apply new SEO fields
                            if (aiData.tags) product.tags = Array.isArray(aiData.tags) ? aiData.tags.join(', ') : aiData.tags
                            if (aiData.handle) product.handle = aiData.handle
                            if (aiData.metaTitle) product.metaTitle = aiData.metaTitle
                            if (aiData.metaDescription) product.metaDescription = aiData.metaDescription
                            if (aiData.variantMetafields) product.variantMetafields = aiData.variantMetafields

                            setImportLogs(prev => [`✨ ${currentUrl}: Optimierung erfolgreich abgeschlossen`, ...prev])
                        }
                    } catch (aiError) {
                        console.error('AI Enhancement failed:', aiError)
                        setImportLogs(prev => [`⚠️ ${currentUrl}: AI fehlgeschlagen, nutze Originaldaten`, ...prev])
                    }

                    // Apply multiplier
                    const multiplier = parseFloat(settings.priceMultiplier) || 1
                    if (product.price && multiplier !== 1) {
                        product.price = (parseFloat(product.price) * multiplier).toFixed(2)
                    }

                    // 2. Save immediately
                    const saveRes = await fetch('/api/products/import/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            product: product,
                            settings: settings
                        })
                    })

                    if (!saveRes.ok) throw new Error('Save failed')

                    setImportLogs(prev => [`✅ ${currentUrl}: Success`, ...prev])
                } catch (error) {
                    console.error(`Failed to import ${currentUrl}:`, error)
                    setImportLogs(prev => [`❌ ${currentUrl}: Failed`, ...prev])
                }
            }

            setIsBulkImporting(false)
            showToast(`Bulk Import abgeschlossen (${urls.length} Produkte)`, "success")
            setUrl('')
            loadImportedProducts()
            setActiveTab('store')
            return
        }

        // SINGLE IMPORT MODE (Existing Logic)
        setIsImporting(true)
        setImportStep('validating')
        setPreviewData(null)

        try {
            // 1. Validate & Fetch Data
            const response = await fetch('/api/products/import/external', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to import product')
            }

            setImportStep('importing')
            const data = await response.json()
            const product = data.product

            // 1.5 AI Enhancement (Automatic)
            try {
                showToast("Analysiere Produktdaten...", "info")

                // Clear description to prevent "fallback" to original if AI fails
                // This ensures we only get AI content or an error
                const originalDescription = product.description
                product.description = "⏳ Generiere professionelle Beschreibung..."

                // Give AI time to "think" and process
                await new Promise(resolve => setTimeout(resolve, 2000))

                showToast("Erstelle SEO-optimierte Beschreibung...", "info")

                const aiRes = await fetch('/api/ai/enhance-product', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product: { ...product, description: originalDescription } }) // Send original data to AI
                })

                if (aiRes.ok) {
                    const aiData = await aiRes.json()
                    // ... (success logic)
                    if (aiData.enhancedText) product.description = aiData.enhancedText
                    if (aiData.newTitle) product.title = aiData.newTitle

                    if (aiData.tags) product.tags = Array.isArray(aiData.tags) ? aiData.tags.join(', ') : aiData.tags
                    if (aiData.handle) product.handle = aiData.handle
                    if (aiData.metaTitle) product.metaTitle = aiData.metaTitle
                    if (aiData.metaDescription) product.metaDescription = aiData.metaDescription
                    if (aiData.variantMetafields) product.variantMetafields = aiData.variantMetafields

                    showToast("Produktbeschreibung erfolgreich generiert", "success")
                } else {
                    const errorData = await aiRes.json()
                    throw new Error(errorData.error || 'AI request failed')
                }
            } catch (aiError: any) {
                console.error('AI Enhancement failed:', aiError)
                // DO NOT revert to original description. Show error.
                product.description = `<div style="color: red; padding: 20px; border: 1px solid red; border-radius: 8px;">
                    <h3>⚠️ AI Generierung fehlgeschlagen</h3>
                    <p>${aiError.message}</p>
                    <p>Bitte versuchen Sie es erneut oder prüfen Sie den API Key.</p>
                </div>`
                showToast(`AI Fehler: ${aiError.message}`, "error")
            }

            // Apply price multiplier
            const multiplier = parseFloat(settings.priceMultiplier) || 1
            if (product.price && multiplier !== 1) {
                product.price = (parseFloat(product.price) * multiplier).toFixed(2)
            }

            setPreviewData(product)
            setImportStep('complete')
            showToast("Produktdaten erfolgreich geladen", "success")
        } catch (error) {
            console.error('Import error:', error)
            showToast(error instanceof Error ? error.message : 'Import fehlgeschlagen', "error")
            setImportStep('idle')
        } finally {
            setIsImporting(false)
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

            const data = await response.json()

            showToast("Produkt erfolgreich importiert!", "success")

            // Switch to store tab to show the new product
            setActiveTab('store')
            // Reset preview
            setPreviewData(null)
            setUrl('')
            setImportStep('idle')

        } catch (error) {
            console.error('Save error:', error)
            showToast(error instanceof Error ? error.message : 'Speichern fehlgeschlagen', "error")
        } finally {
            setIsSaving(false)
        }
    }

    const [isDeleting, setIsDeleting] = useState<number | null>(null)
    const [isRewriting, setIsRewriting] = useState(false)

    const handleDeleteProduct = async (productId: number) => {
        if (!confirm('Möchten Sie dieses Produkt wirklich löschen?')) return

        setIsDeleting(productId)
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('Failed to delete product')
            }

            showToast("Produkt erfolgreich gelöscht", "success")

            // Refresh list
            loadImportedProducts()
        } catch (error) {
            console.error('Delete error:', error)
            showToast("Fehler beim Löschen des Produkts", "error")
        } finally {
            setIsDeleting(null)
        }
    }

    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    const handleUpdateProduct = async () => {
        if (!editingProduct) return

        setIsUpdating(true)
        try {
            // Prepare payload for Shopify
            // Note: Price is on the variant level
            const payload: any = {
                title: editingProduct.title,
                vendor: editingProduct.vendor,
                product_type: editingProduct.product_type,
            }

            // If price changed, we need to update the first variant
            // We assume the first variant is the main one for simple products
            if (editingProduct.variants && editingProduct.variants.length > 0) {
                payload.variants = [{
                    id: editingProduct.variants[0].id,
                    price: editingProduct.variants[0].price
                }]
            }

            const response = await fetch(`/api/products/${editingProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product: payload })
            })

            if (!response.ok) {
                throw new Error('Failed to update product')
            }

            showToast("Produkt erfolgreich aktualisiert", "success")

            setEditingProduct(null)
            loadImportedProducts()

        } catch (error) {
            console.error('Update error:', error)
            showToast("Fehler beim Aktualisieren des Produkts", "error")
        } finally {
            setIsUpdating(false)
        }
    }

    const handleAiRewrite = async () => {
        if (!previewData || !previewData.description) return

        setIsRewriting(true)
        try {
            const response = await fetch('/api/ai/rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: previewData.description,
                    type: 'description'
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'AI Rewrite failed')
            }

            setPreviewData({
                ...previewData,
                description: data.text
            })

            showToast("Beschreibung erfolgreich optimiert", "success")

        } catch (error) {
            console.error('AI error:', error)
            showToast("AI Optimierung fehlgeschlagen", "error")
        } finally {
            setIsRewriting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-12 font-sans">
            <ToastContainer />
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Zurück zum Dashboard
                        </Link>
                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
                            Product<span className="text-blue-600">Importer</span>
                        </h1>
                        <p className="text-gray-500 text-lg">Importieren Sie Produkte von jeder URL direkt in Ihren Store.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
                        <Button
                            variant={activeTab === 'import' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('import')}
                            className={`rounded-lg transition-all ${activeTab === 'import' ? 'bg-blue-600 shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Import
                        </Button>
                        <Button
                            variant={activeTab === 'store' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('store')}
                            className={`rounded-lg transition-all ${activeTab === 'store' ? 'bg-blue-600 shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Store
                            <Badge variant="secondary" className="ml-2 bg-white/20 text-current border-0">
                                {importedProducts.length}
                            </Badge>
                        </Button>
                    </div>
                </div>

                {activeTab === 'import' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Left Column: Input & Settings */}
                        <div className="lg:col-span-7 space-y-6">

                            {/* 1. Product URL Area */}
                            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden ring-1 ring-gray-200/50">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center text-xl">
                                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                                            <Globe className="h-5 w-5 text-blue-600" />
                                        </div>
                                        Quelle
                                    </CardTitle>
                                    <CardDescription>
                                        Geben Sie die URL der Produktseite ein, die Sie importieren möchten.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-gray-600 font-medium">Produkt URLs</Label>

                                        {/* Dynamic URL Inputs */}
                                        <div className="space-y-3">
                                            {url.split('\n').map((u, index) => (
                                                <div key={index} className="relative group animate-in fade-in slide-in-from-left-4 duration-300">
                                                    <Input
                                                        placeholder="https://shop.beispiel.de/produkt/t-shirt"
                                                        className="pl-11 pr-12 h-12 text-base bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
                                                        value={u}
                                                        onChange={(e) => {
                                                            const newUrls = url.split('\n')
                                                            newUrls[index] = e.target.value
                                                            setUrl(newUrls.join('\n'))
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault()
                                                                handleStartMigration()
                                                            }
                                                            // Delete empty field on Backspace if it's not the only one
                                                            if (e.key === 'Backspace' && u === '' && url.split('\n').length > 1) {
                                                                e.preventDefault()
                                                                const newUrls = url.split('\n')
                                                                newUrls.splice(index, 1)
                                                                setUrl(newUrls.join('\n'))
                                                            }
                                                        }}
                                                    />
                                                    <Globe className="absolute left-4 top-3 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />

                                                    {/* Delete Button (only if more than 1) */}
                                                    {url.split('\n').length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                const newUrls = url.split('\n')
                                                                newUrls.splice(index, 1)
                                                                setUrl(newUrls.join('\n'))
                                                            }}
                                                            className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Entfernen"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Add Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setUrl(url + '\n')}
                                            className="w-full border-dashed border-2 border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 h-10"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Weitere URL hinzufügen
                                        </Button>

                                        <div className="flex justify-end pt-2">
                                            <Button
                                                size="lg"
                                                className="bg-blue-600 hover:bg-blue-700 transition-all shadow-md px-8"
                                                disabled={!url.trim() || isImporting}
                                                onClick={handleStartMigration}
                                            >
                                                {isImporting ? (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                        Importiere...
                                                    </>
                                                ) : (
                                                    <>
                                                        Import Starten
                                                        <ArrowRight className="h-4 w-4 ml-2" />
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start space-x-3">
                                        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-800 space-y-1">
                                            <p className="font-medium">Unterstützte Plattformen</p>
                                            <p className="text-blue-600/80">
                                                Wir unterstützen Importe von Shopify, WooCommerce, Magento und vielen anderen.
                                                Alle verfügbaren Daten (Metafields, SEO, Bilder) werden automatisch extrahiert.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 pt-2">
                                        <label className="flex items-center space-x-2 cursor-pointer group">
                                            <Checkbox
                                                checked={settings.skipValidation}
                                                onCheckedChange={(c) => setSettings({ ...settings, skipValidation: c as boolean })}
                                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Validierung überspringen</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer group">
                                            <Checkbox
                                                checked={settings.acceptTerms}
                                                onCheckedChange={(c) => setSettings({ ...settings, acceptTerms: c as boolean })}
                                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                                                AGB akzeptieren
                                            </span>
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Bulk Import Progress */}
                            {isBulkImporting && (
                                <Card className="border-blue-200 bg-blue-50/50 shadow-lg animate-in fade-in slide-in-from-top-4">
                                    <CardHeader>
                                        <CardTitle className="text-blue-800 flex items-center">
                                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                            Bulk Import läuft...
                                        </CardTitle>
                                        <CardDescription>
                                            Verarbeite {currentImportIndex} von {importQueue.length} URLs
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                                style={{ width: `${(currentImportIndex / importQueue.length) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-white rounded-md border border-gray-200 text-xs font-mono">
                                            {importLogs.map((log, i) => (
                                                <div key={i} className={log.startsWith('❌') ? 'text-red-600' : 'text-green-600'}>
                                                    {log}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* 2. Import Settings */}
                            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm ring-1 ring-gray-200/50">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center text-lg">
                                        <SettingsIcon className="h-5 w-5 mr-3 text-gray-500" />
                                        Import Einstellungen
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-gray-600">Zu Kollektion hinzufügen</Label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                                                <Select
                                                    value={settings.collection}
                                                    onValueChange={(value) => setSettings({ ...settings, collection: value })}
                                                >
                                                    <SelectTrigger className="pl-9 bg-gray-50 border-gray-200 focus:bg-white w-full">
                                                        <SelectValue placeholder="Kollektion wählen..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {collections.map((col) => (
                                                            <SelectItem key={col.id} value={col.id.toString()}>
                                                                {col.title}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-600">Preis-Multiplikator</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    className="bg-gray-50 border-gray-200 focus:bg-white"
                                                    value={settings.priceMultiplier}
                                                    onChange={(e) => setSettings({ ...settings, priceMultiplier: e.target.value })}
                                                />
                                                <div className="absolute right-3 top-2.5 text-xs text-gray-400 pointer-events-none">
                                                    x {settings.priceMultiplier}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-gray-100" />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { id: 'isActive', label: 'Produkt aktivieren', checked: settings.isActive },
                                            { id: 'isPhysical', label: 'Physisches Produkt', checked: settings.isPhysical },
                                            { id: 'chargeTax', label: 'Steuern erheben', checked: settings.chargeTax },
                                            { id: 'trackQuantity', label: 'Bestand verfolgen', checked: settings.trackQuantity },
                                        ].map((item) => (
                                            <div key={item.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer" onClick={() => setSettings({ ...settings, [item.id]: !item.checked })}>
                                                <Checkbox
                                                    id={item.id}
                                                    checked={item.checked}
                                                    onCheckedChange={(c) => setSettings({ ...settings, [item.id]: c as boolean })}
                                                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                                />
                                                <Label htmlFor={item.id} className="cursor-pointer font-medium text-gray-700">{item.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Right Column: Preview & Sidebar */}
                        <div className="lg:col-span-5 space-y-6">

                            {/* 3. Product Preview */}
                            <div className="sticky top-6 space-y-6">
                                <Card className={`border-none shadow-2xl transition-all duration-500 overflow-hidden ${previewData ? 'ring-2 ring-blue-500/20 transform hover:scale-[1.01]' : 'bg-gray-50 border-dashed border-2 border-gray-200'}`}>
                                    {previewData ? (
                                        <div className="animate-in fade-in duration-500">
                                            <div className="relative aspect-[4/3] bg-white overflow-hidden group">
                                                <img
                                                    src={previewData.images[0]}
                                                    alt={previewData.title}
                                                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                                    <div className="text-white">
                                                        <p className="font-bold text-lg">{previewData.images.length} Bilder gefunden</p>
                                                    </div>
                                                </div>
                                                <div className="absolute top-4 right-4">
                                                    <Badge className="bg-white/90 text-black hover:bg-white backdrop-blur shadow-sm">
                                                        {previewData.currency} {previewData.price}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="p-6 bg-white space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Badge variant="outline" className="text-xs font-normal text-gray-500 border-gray-200">
                                                            {previewData.vendor || 'Unbekannter Hersteller'}
                                                        </Badge>
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
                                                            Bereit zum Import
                                                        </Badge>
                                                    </div>
                                                    <h3 className="font-bold text-xl text-gray-900 leading-tight">{previewData.title}</h3>
                                                </div>

                                                <div className="relative group/desc">
                                                    <div className="prose prose-sm text-gray-500 line-clamp-3" dangerouslySetInnerHTML={{ __html: previewData.description }}></div>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="absolute bottom-0 right-0 opacity-0 group-hover/desc:opacity-100 transition-opacity bg-white/90 shadow-sm border border-gray-200 text-purple-600 hover:text-purple-700"
                                                        onClick={handleAiRewrite}
                                                        disabled={isRewriting}
                                                    >
                                                        {isRewriting ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                                                        AI Rewrite
                                                    </Button>
                                                </div>

                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {previewData.sku && (
                                                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                                            SKU: {previewData.sku}
                                                        </Badge>
                                                    )}
                                                    {previewData.product_type && (
                                                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                                            Typ: {previewData.product_type}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="pt-4 grid grid-cols-2 gap-3">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => previewData.url && window.open(previewData.url, '_blank')}
                                                        disabled={!previewData.url}
                                                    >
                                                        <ExternalLink className="w-4 h-4 mr-2" /> Details
                                                    </Button>
                                                    <Button
                                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-200"
                                                        onClick={handleSaveProduct}
                                                        disabled={isSaving}
                                                    >
                                                        {isSaving ? (
                                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        )}
                                                        {isSaving ? 'Speichern...' : 'Importieren'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center space-y-4 min-h-[400px] flex flex-col items-center justify-center">
                                            <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-2 animate-pulse">
                                                <Package className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900 text-lg">Warte auf Eingabe</h3>
                                                <p className="text-gray-500 mt-1 max-w-xs mx-auto">
                                                    Geben Sie eine URL ein, um die Vorschau zu laden.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </Card>

                                {/* Recommended Apps (Mini) */}
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-all">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-white/20 p-2 rounded-lg">
                                                <Zap className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">BlogAgent AI</p>
                                                <p className="text-xs text-indigo-100">SEO-Texte generieren</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-white/70" />
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Store View */}
                        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                            <CardHeader className="border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
                                <div>
                                    <CardTitle className="text-2xl">Importierte Produkte</CardTitle>
                                    <CardDescription>Verwalten Sie Ihre importierten Produkte.</CardDescription>
                                </div>
                                <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                                        onClick={() => setViewMode('list')}
                                    >
                                        <List className="h-4 w-4" />
                                    </Button>
                                    <div className="w-px h-4 bg-gray-300 mx-2"></div>
                                    <Button variant="ghost" size="sm" onClick={loadImportedProducts} disabled={loadingStore}>
                                        <RefreshCw className={`h-4 w-4 ${loadingStore ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                {loadingStore ? (
                                    <div className="p-24 text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                        <p className="text-gray-500">Lade Inventar...</p>
                                    </div>
                                ) : importedProducts.length > 0 ? (
                                    viewMode === 'list' ? (
                                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-6 py-4">Produkt</th>
                                                        <th className="px-6 py-4">Status</th>
                                                        <th className="px-6 py-4">Typ</th>
                                                        <th className="px-6 py-4">Hersteller</th>
                                                        <th className="px-6 py-4 text-right">Preis</th>
                                                        <th className="px-6 py-4 text-right">Aktionen</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {importedProducts.map((product) => (
                                                        <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className="h-12 w-12 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200 relative">
                                                                        {product.images?.[0]?.src ? (
                                                                            <img src={product.images[0].src} alt={product.title} className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            <div className="h-full w-full flex items-center justify-center text-gray-300">
                                                                                <Package className="h-6 w-6" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{product.title}</div>
                                                                        <div className="text-xs text-gray-500 mt-0.5 flex items-center">
                                                                            <Tag className="h-3 w-3 mr-1" />
                                                                            {product.tags || 'Keine Tags'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className={product.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-0' : ''}>
                                                                    {product.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600">{product.product_type}</td>
                                                            <td className="px-6 py-4 text-gray-600">{product.vendor}</td>
                                                            <td className="px-6 py-4 text-right font-medium font-mono">
                                                                {product.variants?.[0]?.price} €
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                                                        onClick={() => setEditingProduct(product)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                                                                        onClick={() => handleDeleteProduct(product.id)}
                                                                        disabled={isDeleting === product.id}
                                                                    >
                                                                        {isDeleting === product.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {importedProducts.map((product) => (
                                                <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border-gray-100 overflow-hidden">
                                                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                                        {product.images?.[0]?.src ? (
                                                            <img src={product.images[0].src} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <Package className="h-12 w-12" />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 right-3">
                                                            <Badge className={product.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                                                                {product.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="rounded-full"
                                                                onClick={() => setEditingProduct(product)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="rounded-full text-red-600 hover:text-red-700"
                                                                onClick={() => handleDeleteProduct(product.id)}
                                                                disabled={isDeleting === product.id}
                                                            >
                                                                {isDeleting === product.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <CardContent className="p-4">
                                                        <h3 className="font-bold text-gray-900 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">{product.title}</h3>
                                                        <p className="text-sm text-gray-500 mb-3">{product.vendor}</p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-mono font-bold text-lg">{product.variants?.[0]?.price} €</span>
                                                            <span className="text-xs text-gray-400">{product.product_type}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <div className="p-16 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900">Keine importierten Produkte</h3>
                                        <p className="max-w-md mx-auto mt-2 mb-6">Starten Sie Ihren ersten Import, um Ihren Store zu füllen.</p>
                                        <Button onClick={() => setActiveTab('import')} className="bg-blue-600 hover:bg-blue-700 text-white">
                                            Jetzt importieren
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
                {/* Edit Dialog */}
                {editingProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <Card className="w-full max-w-md bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <CardHeader>
                                <CardTitle>Produkt bearbeiten</CardTitle>
                                <CardDescription>Ändern Sie die wichtigsten Details des Produkts.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Titel</Label>
                                    <Input
                                        value={editingProduct.title}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Preis (€)</Label>
                                        <Input
                                            type="number"
                                            value={editingProduct.variants?.[0]?.price || ''}
                                            onChange={(e) => {
                                                const newVariants = [...(editingProduct.variants || [])]
                                                if (newVariants.length > 0) {
                                                    newVariants[0] = { ...newVariants[0], price: e.target.value }
                                                }
                                                setEditingProduct({ ...editingProduct, variants: newVariants })
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Hersteller</Label>
                                        <Input
                                            value={editingProduct.vendor || ''}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, vendor: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Produkttyp</Label>
                                    <Input
                                        value={editingProduct.product_type || ''}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, product_type: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end space-x-2 bg-gray-50 rounded-b-xl">
                                <Button variant="outline" onClick={() => setEditingProduct(null)}>Abbrechen</Button>
                                <Button onClick={handleUpdateProduct} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Speichern
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}

function SettingsIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}
