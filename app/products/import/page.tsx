'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
    Zap
} from 'lucide-react'

export default function ProductImportPage() {
    const [url, setUrl] = useState('')
    const [isImporting, setIsImporting] = useState(false)
    const [importStep, setImportStep] = useState<'idle' | 'validating' | 'importing' | 'complete'>('idle')

    // Settings State
    const [settings, setSettings] = useState({
        skipValidation: false,
        acceptTerms: false,
        collection: '',
        priceMultiplier: '1',
        isActive: true,
        isPhysical: true,
        chargeTax: true,
        trackQuantity: true
    })

    // Preview State
    const [previewData, setPreviewData] = useState<any>(null)

    const handleStartMigration = async () => {
        if (!url || !settings.acceptTerms) return

        setIsImporting(true)
        setImportStep('validating')

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

            // Apply price multiplier
            const multiplier = parseFloat(settings.priceMultiplier) || 1
            if (data.product.price && multiplier !== 1) {
                data.product.price = (parseFloat(data.product.price) * multiplier).toFixed(2)
            }

            setPreviewData(data.product)
            setImportStep('complete')
        } catch (error) {
            console.error('Import error:', error)
            alert('Error importing product: ' + (error instanceof Error ? error.message : 'Unknown error'))
            setImportStep('idle')
        } finally {
            setIsImporting(false)
        }
    }

    const handleSaveProduct = async () => {
        if (!previewData) return

        // Here you would implement the logic to save to your own database or Shopify store
        // For now, we'll just show a success message
        alert('Product would be saved to your store now! (Backend implementation pending)')
    }
    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-12">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Product Import</h1>
                        <p className="text-gray-500 mt-2">Import products directly from any URL into your store.</p>
                    </div>
                    <Button variant="outline">
                        <Info className="h-4 w-4 mr-2" />
                        Documentation
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Input & Settings */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* 1. Product URL Area */}
                        <Card className="border-none shadow-md overflow-hidden">
                            <CardHeader className="bg-white border-b border-gray-100 pb-6">
                                <CardTitle className="flex items-center text-xl">
                                    <Globe className="h-5 w-5 mr-2 text-blue-600" />
                                    Source URL
                                </CardTitle>
                                <CardDescription>
                                    Enter the product page URL you want to import from.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="url">Product URL</Label>
                                    <div className="relative">
                                        <Input
                                            id="url"
                                            placeholder="https://example.com/product/t-shirt"
                                            className="pl-10 h-12 text-lg"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                        />
                                        <Globe className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-lg p-4 flex items-start space-x-3">
                                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-800">
                                        We support imports from most major e-commerce platforms including Shopify, WooCommerce, and Magento.
                                    </p>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="skipValidation"
                                            checked={settings.skipValidation}
                                            onCheckedChange={(c) => setSettings({ ...settings, skipValidation: c as boolean })}
                                        />
                                        <Label htmlFor="skipValidation" className="font-normal">Skip validation (try to import even if platform is not recognized)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="acceptTerms"
                                            checked={settings.acceptTerms}
                                            onCheckedChange={(c) => setSettings({ ...settings, acceptTerms: c as boolean })}
                                        />
                                        <Label htmlFor="acceptTerms" className="font-normal">
                                            I accept the <span className="text-blue-600 underline cursor-pointer">terms and conditions</span> regarding content usage.
                                        </Label>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                                    disabled={!url || !settings.acceptTerms || isImporting}
                                    onClick={handleStartMigration}
                                >
                                    {isImporting ? (
                                        <span className="flex items-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                            {importStep === 'validating' ? 'Validating URL...' : 'Importing Data...'}
                                        </span>
                                    ) : (
                                        <span className="flex items-center">
                                            Start migration <ArrowRight className="ml-2 h-5 w-5" />
                                        </span>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* 2. Import Settings */}
                        <Card className="border-none shadow-md">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="flex items-center">
                                    <SettingsIcon className="h-5 w-5 mr-2 text-gray-500" />
                                    Import Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Add to collection</Label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search collections..."
                                                className="pl-9"
                                                value={settings.collection}
                                                onChange={(e) => setSettings({ ...settings, collection: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Price multiplier</Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={settings.priceMultiplier}
                                            onChange={(e) => setSettings({ ...settings, priceMultiplier: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-500">Adjust imported prices (e.g. 1.2 for +20%)</p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <Checkbox
                                            id="isActive"
                                            checked={settings.isActive}
                                            onCheckedChange={(c) => setSettings({ ...settings, isActive: c as boolean })}
                                        />
                                        <Label htmlFor="isActive" className="cursor-pointer">Set product as active</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <Checkbox
                                            id="isPhysical"
                                            checked={settings.isPhysical}
                                            onCheckedChange={(c) => setSettings({ ...settings, isPhysical: c as boolean })}
                                        />
                                        <Label htmlFor="isPhysical" className="cursor-pointer">This is a physical product</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <Checkbox
                                            id="chargeTax"
                                            checked={settings.chargeTax}
                                            onCheckedChange={(c) => setSettings({ ...settings, chargeTax: c as boolean })}
                                        />
                                        <Label htmlFor="chargeTax" className="cursor-pointer">Charge tax on this product</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                        <Checkbox
                                            id="trackQuantity"
                                            checked={settings.trackQuantity}
                                            onCheckedChange={(c) => setSettings({ ...settings, trackQuantity: c as boolean })}
                                        />
                                        <Label htmlFor="trackQuantity" className="cursor-pointer">Track quantity</Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Right Column: Preview & Sidebar */}
                    <div className="space-y-6">

                        {/* 3. Product Preview */}
                        <Card className="border-none shadow-md h-fit sticky top-6">
                            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                                <CardTitle className="text-lg flex items-center justify-between">
                                    <span>Product Preview</span>
                                    {previewData && <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ready</Badge>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {previewData ? (
                                    <div className="animate-in fade-in duration-500">
                                        <div className="aspect-square relative bg-gray-100 overflow-hidden">
                                            <img
                                                src={previewData.images[0]}
                                                alt={previewData.title}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                                {previewData.currency} {previewData.price}
                                            </div>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 leading-tight">{previewData.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">{previewData.vendor}</p>
                                            </div>

                                            <p className="text-sm text-gray-600 line-clamp-3">
                                                {previewData.description}
                                            </p>

                                            <div className="flex flex-wrap gap-2 pt-2">
                                                <Badge variant="secondary" className="font-normal">
                                                    <Box className="w-3 h-3 mr-1" /> {previewData.weight}
                                                </Badge>
                                                <Badge variant="secondary" className="font-normal">
                                                    <Tag className="w-3 h-3 mr-1" /> {previewData.sku}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-col gap-2 mt-4">
                                                <Button className="w-full" variant="outline">
                                                    <ExternalLink className="w-4 h-4 mr-2" /> View Full Details
                                                </Button>
                                                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveProduct}>
                                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Import to Store
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-gray-400 space-y-4">
                                        <div className="h-24 w-24 bg-gray-100 rounded-2xl mx-auto flex items-center justify-center">
                                            <Package className="h-10 w-10 text-gray-300" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">No data yet</p>
                                            <p className="text-sm mt-1">Start the migration to see the product preview here.</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 4. Partner Apps / Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">Recommended Apps</h3>

                            <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                <CardContent className="p-4 flex items-start space-x-4">
                                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-colors">
                                        <Zap className="h-5 w-5 text-indigo-600 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">BlogAgent</h4>
                                        <p className="text-xs text-gray-500 mt-1">Auto-generate SEO blogs for your imported products.</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                <CardContent className="p-4 flex items-start space-x-4">
                                    <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-yellow-500 transition-colors">
                                        <CheckCircle2 className="h-5 w-5 text-yellow-600 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">WiseReviews</h4>
                                        <p className="text-xs text-gray-500 mt-1">Import reviews along with your products.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                    </div>

                </div>
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
