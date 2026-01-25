'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/box-checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, Package, ShoppingCart, Search, Filter, Eye, Edit, Trash2, ArrowLeft, Globe, Plus, RefreshCw, Sparkles, ArrowRight, CheckCircle, Info, Settings as SettingsIcon, CheckCircle2, FileText, Tag, Zap, Box, Clock, XCircle, DollarSign, Upload } from "lucide-react"
import Link from 'next/link'
import { ToastContainer, showToast } from '@/components/ui/toast'

interface ImportedProduct {
    id: string
    title: string
    variants: any[]
    price?: string
    image?: any
    status: 'imported' | 'pending' | 'failed'
    importedAt: string
    sourceUrl?: string
    sourceDomain?: string
    images?: any[]
    handle?: string
}

export default function ProductImportPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'import' | 'store'>('import')

    // Import State
    const [urls, setUrls] = useState<string[]>([''])
    const [isImporting, setIsImporting] = useState(false)
    const [importStep, setImportStep] = useState<'idle' | 'validating' | 'importing' | 'complete'>('idle')
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
    const [isDragging, setIsDragging] = useState(false)

    // Collections State
    const [collections, setCollections] = useState<any[]>([])
    const [loadingCollections, setLoadingCollections] = useState(false)

    // Store State
    const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([])
    const [shopDomain, setShopDomain] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [sourceFilter, setSourceFilter] = useState<string>('all')
    const [uniqueSources, setUniqueSources] = useState<string[]>([])

    // Extract domain from URL or Tag
    const extractDomain = (urlOrTag: string) => {
        if (urlOrTag.startsWith('Source:')) return urlOrTag.replace('Source:', '')
        try {
            const urlObj = new URL(urlOrTag)
            return urlObj.hostname.replace('www.', '')
        } catch {
            return ''
        }
    }

    // Get favicon URL
    const getFaviconUrl = (domain: string) => {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    }

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

    // Extract unique sources when products change
    useEffect(() => {
        const sources = Array.from(new Set(importedProducts.map(p => p.sourceDomain).filter(Boolean))) as string[]
        setUniqueSources(sources)
    }, [importedProducts])

    const loadImportedProducts = async () => {
        try {
            const response = await fetch('/api/products/imported')
            const data = await response.json()
            if (data.success) {
                const productsWithSource = data.products.map((p: any) => {
                    // Extract source from Tags
                    const sourceTag = p.tags?.split(',').find((t: string) => t.trim().startsWith('Source:'))?.trim()
                    const domain = sourceTag ? sourceTag.replace('Source:', '') : (p.sourceDomain || '')

                    return {
                        ...p,
                        image: p.image || (p.images && p.images[0]) || null,
                        sourceUrl: p.sourceUrl || '',
                        sourceDomain: domain,
                        importedAt: p.created_at || p.createdAt || p.importedAt || new Date().toISOString(),
                        status: p.status || 'imported'
                    }
                })
                setImportedProducts(productsWithSource)
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

                // Add source tracking
                product.sourceUrl = validUrls[0]
                product.sourceDomain = extractDomain(validUrls[0])

                // AI Enhancement
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
                // Bulk import
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

                        // Add source tracking
                        product.sourceUrl = url
                        product.sourceDomain = extractDomain(url)

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

    const handleSaveProducts = async () => {
        if (!previewData) return

        setIsSaving(true)
        try {
            const productsToSave = Array.isArray(previewData) ? previewData : [previewData]

            for (const p of productsToSave) {
                await fetch('/api/products/import/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product: p,
                        settings: settings
                    })
                })
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

    // Filter products
    const filteredProducts = importedProducts.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesSource = sourceFilter === 'all' || p.sourceDomain === sourceFilter
        return matchesSearch && matchesSource
    })

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-8 pb-32">
            <ToastContainer />

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Product Importer</h1>
                    <p className="text-slate-500 mt-1">Importieren Sie Produkte von jeder URL – Powered by AI</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'import' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Import
                    </button>
                    <button
                        onClick={() => setActiveTab('store')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'store' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Store <Badge variant="secondary" className="ml-1 h-5 px-1.5">{importedProducts.length}</Badge>
                    </button>
                </div>
            </div>

            {activeTab === 'import' ? (
                // IMPORT TAB CONTENT
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Input & Preview */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* URL Inputs */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 transition-opacity ${isDragging ? 'opacity-100' : 'opacity-50'}`}></div>
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold">1</div>
                                    <CardTitle className="text-lg">Product URLs</CardTitle>
                                </div>
                                <CardDescription>URLs hinzufügen oder per Drag & Drop einfügen</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {/* Drag Zone */}
                                {isDragging && (
                                    <div className="border-2 border-dashed border-violet-500 bg-violet-500/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 mb-4">
                                        <Upload className="h-12 w-12 text-violet-400 animate-bounce" />
                                        <p className="text-violet-300 font-medium">URL hier ablegen</p>
                                    </div>
                                )}

                                {urls.map((urlItem, index) => (
                                    <div key={index} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                value={urlItem}
                                                onChange={(e) => handleUrlChange(index, e.target.value)}
                                                placeholder="https://shop.example.com/product/item"
                                                className="pl-10 h-11"
                                            />
                                        </div>
                                        {urls.length > 1 && (
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveUrl(index)} className="text-slate-400 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button variant="outline" onClick={handleAddUrl} className="w-full border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400">
                                    <Plus className="h-4 w-4 mr-2" /> Weitere URL hinzufügen
                                </Button>

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        size="lg"
                                        onClick={handleStartImport}
                                        className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 shadow-lg shadow-violet-200"
                                        disabled={isImporting || urls.every(u => !u.trim())}
                                    >
                                        {isImporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        {isImporting ? 'Analysing...' : 'Import Starten'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Preview Section */}
                        {isImporting && (
                            <div className="space-y-4">
                                {/* Skeletons or Loading State */}
                                <div className="h-48 rounded-xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">
                                    Thinking...
                                </div>
                            </div>
                        )}

                        {previewData && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-slate-800">Preview Results</h3>
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Ready to Import</Badge>
                                </div>

                                {Array.isArray(previewData) ? previewData.map((product: any, idx: number) => (
                                    <Card key={idx} className="overflow-hidden border-slate-200 shadow-md group hover:border-violet-300 transition-all">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="w-full sm:w-48 aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                                {product.images?.[0] ? (
                                                    <img src={typeof product.images[0] === 'string' ? product.images[0] : product.images[0].src} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-slate-400"><Box className="h-8 w-8" /></div>
                                                )}
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 line-clamp-2">{product.title}</h4>
                                                    <p className="text-slate-500 text-sm mt-1">{product.vendor}</p>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">{product.variants?.length || 1} Variants</Badge>
                                                        {product.google_mpn && <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px]">MPN: {product.google_mpn}</Badge>}
                                                        {product.dhl_custom_description && <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100 text-[10px]">Customs OK</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-4">
                                                    <div className="text-xl font-mono font-bold text-slate-900">{product.price} {product.currency}</div>
                                                    {product.compare_at_price && (
                                                        <div className="text-sm text-slate-400 line-through pl-2">{product.compare_at_price} {product.currency}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )) : (
                                    // Single product preview
                                    <Card className="overflow-hidden border-slate-200 shadow-md group hover:border-violet-300 transition-all">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="w-full sm:w-48 aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                                {previewData.images?.[0] ? (
                                                    <img src={typeof previewData.images[0] === 'string' ? previewData.images[0] : previewData.images[0].src} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-slate-400"><Box className="h-8 w-8" /></div>
                                                )}
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 line-clamp-2">{previewData.title}</h4>
                                                    <p className="text-slate-500 text-sm mt-1">{previewData.vendor}</p>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">{previewData.variants?.length || 1} Variants</Badge>
                                                        {previewData.google_mpn && <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px]">MPN: {previewData.google_mpn}</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-4">
                                                    <div className="text-xl font-mono font-bold text-slate-900">{previewData.price} {previewData.currency}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-50 flex items-center justify-center">
                                    <Button size="lg" onClick={handleSaveProducts} disabled={isSaving} className="shadow-xl bg-slate-900 text-white hover:bg-slate-800 px-8">
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                                        Import {Array.isArray(previewData) ? previewData.length : 1} Products to Shopify
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Settings */}
                    <div className="space-y-6">
                        <Card className="border-slate-200 shadow-sm sticky top-6">
                            <CardHeader className="py-4 border-b border-slate-100">
                                <CardTitle className="text-sm uppercase tracking-wider text-slate-500 font-bold">Import Einstellungen</CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold text-slate-600 uppercase">Kollektion</Label>
                                    <Select value={settings.collection} onValueChange={(val) => setSettings({ ...settings, collection: val })}>
                                        <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Kollektion wählen..." /></SelectTrigger>
                                        <SelectContent>
                                            {collections.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold text-slate-600 uppercase">Preis-Multiplikator</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">x</div>
                                        <Input type="number" step="0.1" value={settings.priceMultiplier} onChange={(e) => setSettings({ ...settings, priceMultiplier: e.target.value })} className="pl-8 bg-slate-50" />
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between"><Label>Sofort Aktivieren</Label><Checkbox checked={settings.isActive} onCheckedChange={(c) => setSettings({ ...settings, isActive: !!c })} /></div>
                                    <div className="flex items-center justify-between"><Label>Bestandsverfolgung</Label><Checkbox checked={settings.trackQuantity} onCheckedChange={(c) => setSettings({ ...settings, trackQuantity: !!c })} /></div>
                                    <div className="flex items-center justify-between"><Label>Steuer erheben</Label><Checkbox checked={settings.chargeTax} onCheckedChange={(c) => setSettings({ ...settings, chargeTax: !!c })} /></div>
                                    <div className="flex items-center justify-between"><Label>Terms akzeptieren</Label><Checkbox checked={settings.acceptTerms} onCheckedChange={(c) => setSettings({ ...settings, acceptTerms: !!c })} /></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                // STORE TAB CONTENT
                <div className="space-y-6">
                    {/* Filters Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Produkte suchen..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 border-slate-200"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Select value={sourceFilter} onValueChange={setSourceFilter}>
                                <SelectTrigger className="w-[200px] border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-slate-500" />
                                        <SelectValue placeholder="Alle Quellen" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Quellen</SelectItem>
                                    {uniqueSources.map(source => (
                                        <SelectItem key={source} value={source}>
                                            <div className="flex items-center gap-2">
                                                <img src={getFaviconUrl(source)} className="w-4 h-4 rounded-sm" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                {source}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={loadImportedProducts} className="border-slate-200"><RefreshCw className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <Card key={product.id} className="group overflow-hidden border-slate-200 hover:border-violet-300 hover:shadow-md transition-all">
                                <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                                    {product?.image ? (
                                        <img src={product.image.src} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-50">No Image</div>
                                    )}

                                    {/* Status Badge */}
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm shadow-sm text-xs font-normal border-0">
                                            {product.status}
                                        </Badge>
                                    </div>

                                    {/* Quick Actions Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Link href={`https://${shopDomain}/products/${product.handle}`} target="_blank">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white text-slate-900 hover:bg-violet-50 hover:text-violet-600"><Eye className="h-4 w-4" /></Button>
                                        </Link>
                                        <Link href={`https://${shopDomain}/admin/products/${product.id}`} target="_blank">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white text-slate-900 hover:bg-violet-50 hover:text-violet-600"><Edit className="h-4 w-4" /></Button>
                                        </Link>
                                    </div>
                                </div>
                                <CardContent className="p-4">
                                    <div className="mb-2">
                                        {product.sourceDomain && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1" title={product.sourceUrl || product.sourceDomain}>
                                                <img src={getFaviconUrl(product.sourceDomain)} className="w-3.5 h-3.5 rounded-sm opacity-70" alt="" />
                                                <span className="font-medium truncate max-w-[120px]">Quelle: {product.sourceDomain}</span>
                                            </div>
                                        )}
                                        <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 min-h-[2.5em]" title={product.title}>{product.title}</h3>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        <span className="text-sm font-mono font-bold text-slate-900">{product.variants?.[0]?.price || '-'} €</span>
                                        <span className="text-[10px] text-slate-400">{new Date(product.importedAt).toLocaleDateString()}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
