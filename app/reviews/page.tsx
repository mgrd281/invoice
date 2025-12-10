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
    ThumbsDown,
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
    TrendingUp,
    Clock,
    AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

import { Switch } from '@/components/ui/switch'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShoppingBag, Globe, Info } from 'lucide-react'

function timeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) {
        return seconds === 1 ? "vor 1 Sekunde" : "vor " + seconds + " Sekunden"
    }

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) {
        return minutes === 1 ? "vor 1 Minute" : "vor " + minutes + " Minuten"
    }

    const hours = Math.floor(minutes / 60)
    if (hours < 24) {
        return hours === 1 ? "vor 1 Stunde" : "vor " + hours + " Stunden"
    }

    const days = Math.floor(hours / 24)
    if (days < 30) {
        return days === 1 ? "vor 1 Tag" : "vor " + days + " Tagen"
    }

    const months = Math.floor(days / 30)
    if (months < 12) {
        return months === 1 ? "vor 1 Monat" : "vor " + months + " Monaten"
    }

    const years = Math.floor(days / 365)
    return years === 1 ? "vor 1 Jahr" : "vor " + years + " Jahren"
}

interface Product {
    id: number
    title: string
    images: { src: string }[]
    handle: string
    vendor?: string
}

function useShopifyProducts() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true)
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
                setLoading(false)
            }
        }
        fetchProducts()
    }, [])

    return { products, loading }
}

export default function ReviewsPage() {
    const [activeTab, setActiveTab] = useState('overview')
    const { products: shopifyProducts } = useShopifyProducts()

    // Stats State
    const [stats, setStats] = useState({
        totalReviews: 0,
        averageRating: 0,
        photoReviews: 0,
        pendingReviews: 0,
        recentReviews: [] as any[],
        negativeReviews: [] as any[],
        analysis: {
            trend: 0,
            trendDirection: 'stable',
            negativeReasons: [] as any[],
            negativePercentage: 0
        }
    })
    const [loadingStats, setLoadingStats] = useState(false)

    // Product Grouping State
    const [viewMode, setViewMode] = useState<'products' | 'details'>('products')
    const [productStats, setProductStats] = useState<any[]>([])
    const [selectedProductStat, setSelectedProductStat] = useState<any>(null)
    const [productSearch, setProductSearch] = useState('')
    const [loadingProductStats, setLoadingProductStats] = useState(false)

    // All Reviews State
    const [allReviews, setAllReviews] = useState<any[]>([])
    const [loadingAllReviews, setLoadingAllReviews] = useState(false)
    const [reviewsPage, setReviewsPage] = useState(1)
    const [reviewsTotal, setReviewsTotal] = useState(0)
    // Filter states for details view
    const [filterRating, setFilterRating] = useState<number | null>(null)
    const [filterStatus, setFilterStatus] = useState<string | null>(null)
    const [reviewSearch, setReviewSearch] = useState('')

    // Bulk Delete State
    const [selectedReviews, setSelectedReviews] = useState<string[]>([])
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    // Google Integration State
    const [googleTab, setGoogleTab] = useState('shopping')
    const [googleShoppingSettings, setGoogleShoppingSettings] = useState({
        productSelection: 'all', // 'all' | 'some'
        selectedProducts: [] as string[],
        filterCustomerReviews: true,
        filterImportedReviews: true,
        filterEmptyComments: false,
        countryFilter: 'all',
        keywordFilter: '',
        productIdentification: 'gtin'
    })
    const [googleSnippetSettings, setGoogleSnippetSettings] = useState({
        schemaEnabled: true,
        pushInterval: 'daily'
    })
    const [googleProductStatus, setGoogleProductStatus] = useState<Record<string, boolean>>({})
    const [feedUrl, setFeedUrl] = useState('')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setFeedUrl(`${window.location.origin}/api/feeds/google-shopping.xml`)
        }
    }, [])

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchStats()
        } else if (activeTab === 'reviews') {
            // If we are in product view, fetch product stats
            if (viewMode === 'products') {
                fetchProductStats()
            } else {
                // If we are in details view, fetch reviews for that product
                fetchAllReviews()
            }
        } else if (activeTab === 'google-integration') {
            fetchProductStats()
            fetch('/api/reviews/google-settings')
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setGoogleShoppingSettings(prev => ({
                            ...prev,
                            ...data
                        }))
                    }
                })
                .catch(err => console.error('Failed to load Google Shopping settings:', err))
        }
    }, [activeTab, viewMode, selectedProductStat, filterStatus, reviewsPage])

    const saveGoogleSettings = async () => {
        try {
            await fetch('/api/reviews/google-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(googleShoppingSettings)
            })
            toast.success('Google Shopping Einstellungen gespeichert')
        } catch (err) {
            console.error('Failed to save Google Shopping settings:', err)
            toast.error('Fehler beim Speichern')
        }
    }

    const fetchAllReviews = async () => {
        setLoadingAllReviews(true)
        try {
            let url = `/api/reviews?page=${reviewsPage}&limit=100`
            if (selectedProductStat) {
                url += `&productId=${selectedProductStat.productId}`
            }
            if (filterStatus) {
                url += `&status=${filterStatus}`
            }
            // Note: API might not support rating/search filtering yet, but we can add it later or filter client-side if needed
            // For now, let's assume basic filtering is handled or we add query params

            const res = await fetch(url)
            const data = await res.json()
            if (data.reviews) {
                let filteredReviews = data.reviews

                // Client-side filtering for things API might not support yet
                if (filterRating) {
                    filteredReviews = filteredReviews.filter((r: any) => r.rating === filterRating)
                }
                if (reviewSearch) {
                    const searchLower = reviewSearch.toLowerCase()
                    filteredReviews = filteredReviews.filter((r: any) =>
                        (r.content && r.content.toLowerCase().includes(searchLower)) ||
                        (r.title && r.title.toLowerCase().includes(searchLower)) ||
                        (r.customerName && r.customerName.toLowerCase().includes(searchLower))
                    )
                }

                setAllReviews(filteredReviews)
                setReviewsTotal(data.pagination.total)
            }
        } catch (error) {
            console.error('Failed to fetch all reviews', error)
            toast.error('Fehler beim Laden der Bewertungen')
        } finally {
            setLoadingAllReviews(false)
        }
    }

    const fetchProductStats = async () => {
        setLoadingProductStats(true)
        try {
            const res = await fetch('/api/reviews/products-stats')
            const data = await res.json()
            if (!data.error) {
                setProductStats(data)
                return data
            }
        } catch (error) {
            console.error('Failed to fetch product stats', error)
        } finally {
            setLoadingProductStats(false)
        }
        return null
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
    const [productImportSearch, setProductImportSearch] = useState('')

    // Filter and Group Products for Import
    const filteredImportProducts = products.filter(p => {
        if (!productImportSearch) return true
        const search = productImportSearch.toLowerCase()
        return (
            p.title.toLowerCase().includes(search) ||
            (p.vendor && p.vendor.toLowerCase().includes(search)) ||
            p.id.toString().includes(search)
        )
    })

    const productsByVendor = filteredImportProducts.reduce((acc, product) => {
        const vendor = product.vendor || 'Andere'
        if (!acc[vendor]) {
            acc[vendor] = []
        }
        acc[vendor].push(product)
        return acc
    }, {} as Record<string, Product[]>)

    const sortedVendors = Object.keys(productsByVendor).sort()

    const handleExportReviews = async () => {
        if (selectedProducts.length === 0) {
            toast.error('Bitte wählen Sie mindestens ein Produkt aus.')
            return
        }

        try {
            const productIds = selectedProducts.join(',')
            const res = await fetch(`/api/reviews/export?productIds=${productIds}`)
            const data = await res.json()

            if (data.reviews && data.reviews.length > 0) {
                const exportData = data.reviews.map((r: any) => ({
                    'Produktname': r.productTitle,
                    'Produkt-ID': r.productId,
                    'Bewertungstitel': r.title,
                    'Bewertungstext': r.content,
                    'Sterne': r.rating,
                    'Name des Kunden': r.customerName,
                    'E-Mail': r.customerEmail,
                    'Datum': new Date(r.createdAt).toLocaleDateString(),
                    'Status': r.status
                }))

                const ws = XLSX.utils.json_to_sheet(exportData)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, "Reviews")
                XLSX.writeFile(wb, "reviews_export.xlsx")
                toast.success(`${data.reviews.length} Bewertungen exportiert`)
            } else {
                toast.info('Keine Bewertungen für die ausgewählten Produkte gefunden.')
            }
        } catch (error) {
            console.error('Export failed', error)
            toast.error('Fehler beim Exportieren')
        }
    }

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

    // Widget Settings State
    const [widgetSettings, setWidgetSettings] = useState({
        primaryColor: '#2563eb',
        layout: 'list', // 'list' | 'grid'
        reviewsEnabled: true
    })

    // Email Settings State
    const [emailSettings, setEmailSettings] = useState({
        enabled: false,
        delayDays: 3,
        subject: 'Ihre Meinung ist uns wichtig! 🌟',
        body: 'Hallo {customer_name},\n\nvielen Dank für Ihren Einkauf bei uns! Wir hoffen, Sie sind mit Ihrer Bestellung zufrieden.\n\nWir würden uns sehr freuen, wenn Sie sich einen Moment Zeit nehmen könnten, um eine Bewertung für {product_title} abzugeben.\n\n[Link zur Bewertung]\n\nVielen Dank und beste Grüße,\nIhr Team'
    })

    // Edit/Delete State
    const [editingReview, setEditingReview] = useState<any>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)

    const handleUpdateReview = async () => {
        if (!editingReview) return
        setIsUpdating(true)
        try {
            const res = await fetch(`/api/reviews/${editingReview.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: editingReview.rating,
                    title: editingReview.title,
                    content: editingReview.content,
                    customerName: editingReview.customerName,
                    status: editingReview.status,
                    images: editingReview.images || [],
                    videos: editingReview.videos || []
                })
            })
            if (res.ok) {
                toast.success('Bewertung aktualisiert')
                setEditingReview(null)
                fetchAllReviews() // Refresh list
                fetchStats() // Refresh stats
            } else {
                toast.error('Fehler beim Aktualisieren')
            }
        } catch (error) {
            console.error('Update error:', error)
            toast.error('Fehler beim Aktualisieren')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteReview = async () => {
        if (!deletingReviewId) return
        try {
            const res = await fetch(`/api/reviews/${deletingReviewId}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                toast.success('Bewertung gelöscht')
                setDeletingReviewId(null)
                fetchAllReviews() // Refresh list
                fetchStats() // Refresh stats

                // Update product stats immediately
                const newStats = await fetchProductStats()
                if (selectedProductStat) {
                    const updatedStat = newStats?.find((s: any) => s.productId === selectedProductStat.productId)
                    if (updatedStat) {
                        setSelectedProductStat(updatedStat)
                    } else {
                        // If product not found in stats, it means 0 reviews left
                        setSelectedProductStat((prev: any) => ({
                            ...prev,
                            reviewCount: 0,
                            averageRating: 0
                        }))
                    }
                }
            } else {
                toast.error('Fehler beim Löschen')
            }
        } catch (error) {
            console.error('Delete error:', error)
            toast.error('Fehler beim Löschen')
        }
    }



    const toggleReviewSelection = (id: string) => {
        setSelectedReviews(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleAllReviews = () => {
        if (selectedReviews.length === allReviews.length) {
            setSelectedReviews([])
        } else {
            setSelectedReviews(allReviews.map(r => r.id))
        }
    }

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true)
        try {
            const res = await fetch('/api/reviews', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedReviews })
            })

            if (res.ok) {
                toast.success('Die ausgewählten Bewertungen wurden erfolgreich gelöscht.')
                setSelectedReviews([])
                setShowBulkDeleteDialog(false)
                fetchAllReviews()
                fetchStats()

                // Update product stats immediately
                const newStats = await fetchProductStats()
                if (selectedProductStat) {
                    const updatedStat = newStats?.find((s: any) => s.productId === selectedProductStat.productId)
                    if (updatedStat) {
                        setSelectedProductStat(updatedStat)
                    } else {
                        // If product not found in stats, it means 0 reviews left
                        setSelectedProductStat((prev: any) => ({
                            ...prev,
                            reviewCount: 0,
                            averageRating: 0
                        }))
                    }
                }
            } else {
                toast.error('Fehler beim Löschen der Bewertungen')
            }
        } catch (error) {
            console.error('Bulk delete error:', error)
            toast.error('Fehler beim Löschen der Bewertungen')
        } finally {
            setIsBulkDeleting(false)
        }
    }

    // Fetch settings on mount
    // Fetch settings on mount
    useEffect(() => {
        fetch('/api/reviews/settings', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setWidgetSettings({
                        primaryColor: data.primaryColor || '#2563eb',
                        layout: data.layout || 'list',
                        reviewsEnabled: data.reviewsEnabled !== undefined ? data.reviewsEnabled : true
                    })
                    setEmailSettings({
                        enabled: data.emailEnabled || false,
                        delayDays: data.emailDelayDays || 3,
                        subject: data.emailSubject || 'Ihre Meinung ist uns wichtig! 🌟',
                        body: data.emailBody || 'Hallo {customer_name},\n\nvielen Dank für Ihren Einkauf bei uns! Wir hoffen, Sie sind mit Ihrer Bestellung zufrieden.\n\nWir würden uns sehr freuen, wenn Sie sich einen Moment Zeit nehmen könnten, um eine Bewertung für {product_title} abzugeben.\n\n[Link zur Bewertung]\n\nVielen Dank und beste Grüße,\nIhr Team'
                    })
                }
            })
            .catch(err => console.error('Failed to load widget settings:', err))
    }, [])

    const [isSavingSettings, setIsSavingSettings] = useState(false)

    const updateWidgetSettings = async (newWidgetSettings: any) => {
        setWidgetSettings(newWidgetSettings)
        setIsSavingSettings(true)
        try {
            const payload = {
                ...newWidgetSettings,
                emailEnabled: emailSettings.enabled,
                emailDelayDays: emailSettings.delayDays,
                emailSubject: emailSettings.subject,
                emailBody: emailSettings.body
            }
            await fetch('/api/reviews/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            toast.success('Einstellungen gespeichert')
        } catch (err) {
            console.error('Failed to save widget settings:', err)
            toast.error('Fehler beim Speichern')
        } finally {
            setIsSavingSettings(false)
        }
    }

    // Email Settings State
    const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false)

    const saveEmailSettings = async () => {
        setIsSavingEmailSettings(true)
        try {
            const payload = {
                ...widgetSettings,
                emailEnabled: emailSettings.enabled,
                emailDelayDays: emailSettings.delayDays,
                emailSubject: emailSettings.subject,
                emailBody: emailSettings.body
            }
            await fetch('/api/reviews/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            toast.success('E-Mail Einstellungen gespeichert')
        } catch (err) {
            console.error('Failed to save email settings:', err)
            toast.error('Fehler beim Speichern')
        } finally {
            setIsSavingEmailSettings(false)
        }
    }

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

    const [isImportingUrl, setIsImportingUrl] = useState(false)

    const handleUrlImport = async () => {
        if (!importUrl) {
            toast.error('Bitte geben Sie eine URL ein')
            return
        }

        if (selectedProducts.length === 0) {
            toast.error('Bitte wählen Sie zuerst mindestens ein Produkt aus (Schritt 1)')
            return
        }

        setIsImportingUrl(true)
        try {
            const res = await fetch('/api/reviews/import-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: importUrl,
                    productIds: selectedProducts
                })
            })

            const data = await res.json()

            if (data.success) {
                toast.success(`${data.count} Bewertungen erfolgreich importiert!`)
                setImportStep(1)
                setImportSource(null)
                setImportUrl('')
                setSelectedProducts([])
                setActiveTab('reviews')
                fetchAllReviews()
                fetchStats()
            } else {
                toast.error(data.error || 'Fehler beim Importieren')
            }
        } catch (error) {
            console.error('Import error:', error)
            toast.error('Fehler beim Importieren der URL')
        } finally {
            setIsImportingUrl(false)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingCsv(true)
        const reader = new FileReader()

        reader.onload = async (event) => {
            try {
                const data = event.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet)

                const reviews = jsonData.map((row: any) => ({
                    rating: row.rating || row.Rating || row.sterne || 5,
                    title: row.title || row.Title || row.titel || '',
                    content: row.content || row.Content || row.inhalt || row.text || '',
                    customer_name: row.customer_name || row.CustomerName || row.name || row.Name || 'Kunde',
                    customer_email: row.customer_email || row.CustomerEmail || row.email || row.Email || '',
                    date: row.date || row.Date || row.datum || new Date().toISOString(),
                    images: row.images ? row.images.split(',').map((img: string) => img.trim()) : []
                }))

                if (reviews.length === 0) {
                    toast.error('Keine gültigen Daten gefunden')
                    return
                }

                for (const productId of selectedProducts) {
                    const product = products.find(p => p.id === productId)
                    await fetch('/api/reviews/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            productId: productId,
                            reviews: reviews.map((r: any) => ({ ...r, product_title: product?.title }))
                        })
                    })
                }
                toast.success(`${reviews.length} Bewertungen erfolgreich importiert!`)
                setImportStep(1)
                setImportSource(null)
                setSelectedProducts([])
                setActiveTab('reviews')
            } catch (error) {
                console.error('Import Error:', error)
                toast.error('Fehler beim Importieren der Datei')
            } finally {
                setIsUploadingCsv(false)
            }
        }

        reader.readAsBinaryString(file)
    }

    const filteredProducts = productStats
        .filter(stat => stat.productTitle.toLowerCase().includes(productSearch.toLowerCase()))
        .sort((a, b) => new Date(b.lastReviewDate).getTime() - new Date(a.lastReviewDate).getTime())

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Bulk Delete Confirm Dialog */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Möchten Sie die ausgewählten Bewertungen wirklich löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Es werden {selectedReviews.length} Bewertungen gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleBulkDelete()
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isBulkDeleting}
                        >
                            {isBulkDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Löschen...
                                </>
                            ) : (
                                'Löschen'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
                                Produktbewertungen
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => setActiveTab('widgets')}>
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
                        <TabsTrigger value="reviews" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Alle Bewertungen</TabsTrigger>
                        <TabsTrigger value="import" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Import & Export</TabsTrigger>
                        <TabsTrigger value="widgets" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Widgets & Design</TabsTrigger>
                        <TabsTrigger value="auto-reviews" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Auto-Reviews</TabsTrigger>
                        <TabsTrigger value="emails" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">E-Mail Automation</TabsTrigger>
                        <TabsTrigger value="google-integration" className="h-10 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Google Integration</TabsTrigger>
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

                        {/* Negative Reviews Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Negative Reviews List */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="flex items-center gap-2 text-red-600">
                                                <AlertTriangle className="h-5 w-5" />
                                                Kritische Bewertungen (1-2 Sterne)
                                            </CardTitle>
                                            <CardDescription>Hier sehen Sie alle negativen Bewertungen, die Ihre Aufmerksamkeit benötigen.</CardDescription>
                                        </div>
                                        <Badge variant="destructive">{stats.negativeReviews.length} Neu</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {stats.negativeReviews.length > 0 ? (
                                        <div className="space-y-4">
                                            {stats.negativeReviews.map((review: any) => (
                                                <div key={review.id} className="border rounded-lg p-4 hover:bg-red-50/30 transition-colors">
                                                    <div className="flex gap-4">
                                                        {/* Product Image */}
                                                        <div className="h-12 w-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                                            {review.productImage ? (
                                                                <img src={review.productImage} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                    <ImageIcon className="h-4 w-4" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <h4 className="font-medium text-sm text-gray-900">{review.productTitle}</h4>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <div className="flex text-yellow-400">
                                                                            {[...Array(5)].map((_, i) => (
                                                                                <Star
                                                                                    key={i}
                                                                                    className={`h-3 w-3 ${i < review.rating ? 'fill-current text-yellow-500' : 'text-gray-300'}`}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                        <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                                                                        <span className="text-xs font-medium text-gray-700">• {review.customerName}</span>
                                                                    </div>
                                                                </div>
                                                                <Badge variant={review.handlingStatus === 'RESOLVED' ? 'outline' : review.handlingStatus === 'REPLIED' ? 'secondary' : 'destructive'}>
                                                                    {review.handlingStatus === 'RESOLVED' ? 'Gelöst' : review.handlingStatus === 'REPLIED' ? 'Antwort gesendet' : 'Neu'}
                                                                </Badge>
                                                            </div>

                                                            <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border border-gray-100">
                                                                "{review.content}"
                                                            </p>

                                                            <div className="mt-3 flex justify-end gap-2">
                                                                <Button size="sm" variant="outline" className="h-8 text-xs">
                                                                    <MessageSquare className="h-3 w-3 mr-1" />
                                                                    Antworten
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                            <p>Keine kritischen Bewertungen gefunden. Weiter so!</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Analysis Section */}
                            <div className="space-y-6">
                                {/* Trend Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Trend-Analyse</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm text-gray-500">Negative Reviews (30 Tage)</span>
                                            <span className={`text-sm font-bold ${stats.analysis.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {stats.analysis.trend > 0 ? '+' : ''}{stats.analysis.trend}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${stats.analysis.trendDirection === 'increasing' ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: '60%' }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {stats.analysis.trendDirection === 'increasing'
                                                ? 'Die Anzahl negativer Bewertungen steigt.'
                                                : 'Die Anzahl negativer Bewertungen ist stabil oder sinkt.'}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Reasons Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Häufigste Gründe</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {stats.analysis.negativeReasons.map((reason: any, index: number) => (
                                                <div key={index}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-medium text-gray-700">{reason.reason}</span>
                                                        <span className="text-gray-500">{reason.percentage}%</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-600 rounded-full"
                                                            style={{ width: `${reason.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Recent Reviews */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Neueste Bewertungen</CardTitle>
                                <CardDescription>Die letzten eingegangenen Bewertungen</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingStats ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    </div>
                                ) : stats.recentReviews.length > 0 ? (
                                    <div className="space-y-4">
                                        {stats.recentReviews.map((review: any) => (
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
                                                            {review.status === 'APPROVED' ? 'Genehmigt' : review.status === 'PENDING' ? 'Ausstehend' : review.status === 'REJECTED' ? 'Abgelehnt' : review.status}
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
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        Keine Bewertungen vorhanden
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* REVIEWS LIST TAB */}
                    <TabsContent value="reviews">
                        {viewMode === 'products' ? (
                            <Card>
                                <CardHeader className="pb-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <CardTitle className="text-2xl font-bold text-gray-900">Produkte mit Bewertungen</CardTitle>
                                                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                                                    {filteredProducts.length} Produkte
                                                </span>
                                            </div>
                                            <CardDescription className="text-base text-gray-500 mt-1">
                                                Wählen Sie ein Produkt, um dessen Bewertungen zu verwalten
                                            </CardDescription>
                                        </div>
                                        <div className="relative w-full md:w-[320px] group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                            </div>
                                            <Input
                                                placeholder="Produkt suchen..."
                                                className="pl-10 h-11 rounded-full bg-white border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 bg-gray-50/50 min-h-[500px]">
                                    {loadingProductStats ? (
                                        <div className="flex justify-center py-20">
                                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                                        </div>
                                    ) : filteredProducts.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {filteredProducts
                                                .map((stat) => {
                                                    const shopifyProduct = shopifyProducts.find(p => String(p.id) === String(stat.productId))
                                                    const productImage = shopifyProduct?.images?.[0]?.src || stat.productImage

                                                    return (
                                                        <div
                                                            key={stat.productId}
                                                            className="group bg-white rounded-[18px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:scale-[1.02] transition-all duration-300 cursor-pointer p-5 flex items-center gap-5 relative overflow-hidden"
                                                            onClick={() => {
                                                                setSelectedProductStat(stat)
                                                                setViewMode('details')
                                                            }}
                                                        >
                                                            {/* Hover Highlight Line */}
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                                            {/* Product Image */}
                                                            <div className="h-[80px] w-[80px] rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm bg-white relative group-hover:shadow-md transition-shadow">
                                                                {productImage ? (
                                                                    <img
                                                                        src={productImage}
                                                                        alt={stat.productTitle}
                                                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                                    />
                                                                ) : (
                                                                    <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300">
                                                                        <ImageIcon className="h-8 w-8" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Product Info */}
                                                            <div className="flex-1 min-w-0 py-1">
                                                                <h4 className="text-[17px] font-bold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                                    {stat.productTitle}
                                                                </h4>

                                                                <div className="space-y-1.5">
                                                                    {/* Rating & Count */}
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                                                                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                                                            <span className="font-bold text-gray-900 text-sm">{stat.averageRating.toFixed(1)}</span>
                                                                        </div>
                                                                        <span className="text-gray-500 text-sm font-medium">({stat.reviewCount})</span>
                                                                    </div>

                                                                    {/* Last Review Date */}
                                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        <span>{new Date(stat.lastReviewDate).toLocaleDateString()}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Chevron for affordance */}
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                                                <ArrowRight className="h-5 w-5 text-gray-300" />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                <MessageSquare className="h-10 w-10 text-gray-300" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-900">Keine Bewertungen gefunden</h3>
                                            <p className="text-gray-500 mt-2 max-w-md">Es wurden noch keine Bewertungen für Produkte abgegeben oder es wurden keine Produkte gefunden, die Ihrer Suche entsprechen.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <Button variant="ghost" onClick={() => {
                                    setViewMode('products')
                                    setSelectedProductStat(null)
                                    setAllReviews([])
                                }} className="pl-0 hover:pl-2 transition-all">
                                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                                    Zurück zur Übersicht
                                </Button>

                                <Card>
                                    <CardHeader>
                                        <div className="flex flex-col gap-6">
                                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                                        {selectedProductStat?.productImage && (
                                                            <img src={selectedProductStat.productImage} alt="" className="h-full w-full object-cover" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <CardTitle>{selectedProductStat?.productTitle}</CardTitle>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="flex text-yellow-400">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`h-4 w-4 ${i < Math.round(selectedProductStat?.averageRating || 0) ? 'fill-current' : 'text-gray-300'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="font-bold text-lg">{selectedProductStat?.averageRating.toFixed(1)}</span>
                                                            <span className="text-gray-500">({selectedProductStat?.reviewCount} Bewertungen)</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="relative">
                                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                                        <Input
                                                            placeholder="Bewertungen durchsuchen..."
                                                            className="pl-9 w-[200px]"
                                                            value={reviewSearch}
                                                            onChange={(e) => setReviewSearch(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bulk Actions Toolbar */}
                                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={allReviews.length > 0 && selectedReviews.length === allReviews.length}
                                                        onCheckedChange={toggleAllReviews}
                                                        id="select-all-reviews"
                                                    />
                                                    <Label htmlFor="select-all-reviews" className="text-sm font-medium cursor-pointer">
                                                        Alle auswählen
                                                    </Label>
                                                </div>

                                                {selectedReviews.length > 0 && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => setShowBulkDeleteDialog(true)}
                                                        className="animate-in fade-in zoom-in duration-200"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        {selectedReviews.length} Bewertungen löschen
                                                    </Button>
                                                )}
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
                                                    <div key={review.id} className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors group ${selectedReviews.includes(review.id) ? 'bg-blue-50 border-blue-200' : ''}`}>
                                                        <div className="pt-2">
                                                            <Checkbox
                                                                checked={selectedReviews.includes(review.id)}
                                                                onCheckedChange={() => toggleReviewSelection(review.id)}
                                                            />
                                                        </div>
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
                                                                            {timeAgo(review.createdAt)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant={review.status === 'APPROVED' ? 'default' : 'secondary'}>
                                                                        {review.status === 'APPROVED' ? 'Genehmigt' : review.status === 'PENDING' ? 'Ausstehend' : review.status === 'REJECTED' ? 'Abgelehnt' : review.status}
                                                                    </Badge>

                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Button variant="ghost" size="icon" onClick={() => setEditingReview(review)}>
                                                                            <PenTool className="h-4 w-4 text-gray-500" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" onClick={() => setDeletingReviewId(review.id)}>
                                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-gray-600 mt-2">{review.content}</p>
                                                            <div className="flex items-center gap-4 mt-2">
                                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <ThumbsUp className="h-3 w-3" />
                                                                    {review.helpful || 0}
                                                                </div>
                                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <ThumbsDown className="h-3 w-3" />
                                                                    {review.notHelpful || 0}
                                                                </div>
                                                            </div>
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
                            </div>
                        )}
                    </TabsContent>

                    {/* IMPORT TAB */}
                    <TabsContent value="import" className="space-y-6">
                        {/* Step 1: Select Products */}
                        {importStep === 1 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>1. Produkte auswählen</CardTitle>
                                            <CardDescription>Wählen Sie die Produkte aus, für die Sie Bewertungen importieren oder exportieren möchten</CardDescription>
                                        </div>
                                        <Button variant="outline" onClick={handleExportReviews} disabled={selectedProducts.length === 0}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Exportieren
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loadingProducts ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Search Input */}
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                                <Input
                                                    placeholder="Produktname, Marke oder ID suchen..."
                                                    className="pl-10 rounded-full bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                                    value={productImportSearch}
                                                    onChange={(e) => setProductImportSearch(e.target.value)}
                                                />
                                            </div>

                                            <div className="flex justify-between items-center mb-2">
                                                <div className="text-sm text-gray-500">
                                                    {selectedProducts.length} Produkte ausgewählt
                                                </div>
                                                <Button variant="outline" size="sm" onClick={toggleAll}>
                                                    {selectedProducts.length === products.length ? 'Alle abwählen' : 'Alle auswählen'}
                                                </Button>
                                            </div>

                                            <div className="border rounded-lg max-h-[400px] overflow-y-auto bg-white">
                                                {filteredImportProducts.length === 0 ? (
                                                    <div className="p-8 text-center text-gray-500">
                                                        Keine Produkte gefunden.
                                                    </div>
                                                ) : (
                                                    sortedVendors.map(vendor => (
                                                        <div key={vendor}>
                                                            <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 border-b border-t first:border-t-0">
                                                                {vendor}
                                                            </div>
                                                            <div className="divide-y">
                                                                {productsByVendor[vendor].map(product => (
                                                                    <div key={product.id} className="flex items-center p-3 hover:bg-gray-50 transition-colors">
                                                                        <Checkbox
                                                                            checked={selectedProducts.includes(product.id)}
                                                                            onCheckedChange={() => toggleProduct(product.id)}
                                                                            className="mr-4"
                                                                        />
                                                                        <div className="h-10 w-10 bg-gray-100 rounded-md mr-4 overflow-hidden flex-shrink-0 border border-gray-200">
                                                                            {product.images[0] ? (
                                                                                <img src={product.images[0].src} alt="" className="h-full w-full object-cover" />
                                                                            ) : (
                                                                                <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                                    <ImageIcon className="h-4 w-4" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className="text-sm font-medium truncate" title={product.title}>{product.title}</h4>
                                                                            <p className="text-xs text-gray-400 truncate">ID: {product.id}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
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
                                            <h3 className="font-semibold mb-2">Datei Upload</h3>
                                            <p className="text-sm text-gray-500">CSV, Excel oder Numbers Datei hochladen</p>
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
                                                    <Button
                                                        className="bg-purple-600 hover:bg-purple-700"
                                                        onClick={handleUrlImport}
                                                        disabled={isImportingUrl}
                                                    >
                                                        {isImportingUrl ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Importiere...
                                                            </>
                                                        ) : (
                                                            'Importieren'
                                                        )}
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
                                                        Datei hier ablegen oder klicken zum Auswählen
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Unterstützt CSV, Excel (.xlsx, .xls) und Numbers
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept=".csv, .xlsx, .xls, .numbers"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        onChange={handleFileUpload}
                                                    />
                                                    {isUploadingCsv && (
                                                        <div className="flex flex-col items-center mt-4">
                                                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                                            <span className="text-xs text-blue-600 mt-1">Wird verarbeitet...</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-center">
                                                    <Button variant="link" className="text-blue-600" onClick={() => {
                                                        const csvContent = "rating,title,content,customer_name,date\n5,Tolles Produkt,Bin sehr zufrieden!,Max Mustermann,2024-01-01"
                                                        const blob = new Blob([csvContent], { type: 'text/csv' })
                                                        const url = window.URL.createObjectURL(blob)
                                                        const a = document.createElement('a')
                                                        a.href = url
                                                        a.download = 'beispiel_bewertungen.csv'
                                                        a.click()
                                                    }}>
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Beispiel-Datei herunterladen
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
                                    <div className="space-y-4 border-b pb-4 mb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Bewertungen im Shop anzeigen</Label>
                                                <p className="text-sm text-gray-500">
                                                    {widgetSettings.reviewsEnabled
                                                        ? 'Bewertungen werden im Shop angezeigt.'
                                                        : 'Bewertungen sind aktuell ausgeblendet.'}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={widgetSettings.reviewsEnabled}
                                                onCheckedChange={(checked) => updateWidgetSettings({ ...widgetSettings, reviewsEnabled: checked })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Primärfarbe</Label>
                                        <div className="flex gap-2 items-center flex-wrap">
                                            {['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#000000', '#2C5147'].map((color) => (
                                                <div
                                                    key={color}
                                                    className={`h-8 w-8 rounded-full cursor-pointer border-2 ring-1 ring-gray-200 transition-all ${widgetSettings.primaryColor === color ? 'border-gray-900 scale-110' : 'border-white hover:scale-105'}`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => setWidgetSettings({ ...widgetSettings, primaryColor: color })}
                                                    title={color}
                                                />
                                            ))}
                                            <div className="relative ml-2">
                                                <Label htmlFor="custom-color" className="sr-only">Benutzerdefinierte Farbe</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full overflow-hidden border-2 ring-1 ring-gray-200 cursor-pointer relative">
                                                        <Input
                                                            id="custom-color"
                                                            type="color"
                                                            value={widgetSettings.primaryColor}
                                                            onChange={(e) => setWidgetSettings({ ...widgetSettings, primaryColor: e.target.value })}
                                                            className="h-full w-full opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                    <span className="text-sm text-gray-500">{widgetSettings.primaryColor}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Layout</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div
                                                className={`border-2 rounded-lg p-4 cursor-pointer text-center transition-all ${widgetSettings.layout === 'list' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                                onClick={() => setWidgetSettings({ ...widgetSettings, layout: 'list' })}
                                            >
                                                <div className="space-y-2 mb-2">
                                                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                                                    <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                                                </div>
                                                <span className={`text-sm font-medium ${widgetSettings.layout === 'list' ? 'text-blue-700' : 'text-gray-600'}`}>Liste</span>
                                            </div>
                                            <div
                                                className={`border-2 rounded-lg p-4 cursor-pointer text-center transition-all ${widgetSettings.layout === 'grid' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                                onClick={() => setWidgetSettings({ ...widgetSettings, layout: 'grid' })}
                                            >
                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                    <div className="h-4 bg-gray-200 rounded"></div>
                                                    <div className="h-4 bg-gray-200 rounded"></div>
                                                </div>
                                                <span className={`text-sm font-medium ${widgetSettings.layout === 'grid' ? 'text-blue-700' : 'text-gray-600'}`}>Raster</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                        <Button onClick={() => updateWidgetSettings(widgetSettings)} disabled={isSavingSettings}>
                                            {isSavingSettings ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Speichern...
                                                </>
                                            ) : (
                                                'Speichern'
                                            )}
                                        </Button>
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
                                                <div className="flex my-1" style={{ color: widgetSettings.primaryColor }}>
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
                                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: star === 5 ? '70%' : star === 4 ? '20%' : '5%',
                                                                    backgroundColor: widgetSettings.primaryColor
                                                                }}
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
                                                            <div className="flex text-xs" style={{ color: widgetSettings.primaryColor }}>
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

                        {/* Installation Instructions */}
                        <Card className="mt-8">
                            <CardHeader>
                                <CardTitle>Installation</CardTitle>
                                <CardDescription>Fügen Sie diesen Code in Ihr Shopify Theme ein</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>1. Script einbinden (theme.liquid)</Label>
                                    <p className="text-sm text-gray-500">Fügen Sie dies vor dem schließenden <code>&lt;/body&gt;</code> Tag ein:</p>
                                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm relative group">
                                        <code>&lt;script src="https://invoice-kohl-five.vercel.app/review-widget.js" async&gt;&lt;/script&gt;</code>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                navigator.clipboard.writeText('<script src="https://invoice-kohl-five.vercel.app/review-widget.js" async></script>')
                                                toast.success('Code kopiert!')
                                            }}
                                        >
                                            Kopieren
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>2. Sterne-Bewertung anzeigen (product.liquid)</Label>
                                    <p className="text-sm text-gray-500">Fügen Sie dies dort ein, wo die Sterne erscheinen sollen (z.B. unter dem Titel):</p>
                                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm relative group">
                                        <code>&lt;div class="rechnung-profi-stars" data-product-id="&#123;&#123; product.id &#125;&#125;"&gt;&lt;/div&gt;</code>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                navigator.clipboard.writeText('<div class="rechnung-profi-stars" data-product-id="{{ product.id }}"></div>')
                                                toast.success('Code kopiert!')
                                            }}
                                        >
                                            Kopieren
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>3. Bewertungen anzeigen (product.liquid)</Label>
                                    <p className="text-sm text-gray-500">Fügen Sie dies dort ein, wo die Liste der Bewertungen erscheinen soll:</p>
                                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm relative group">
                                        <code>&lt;div id="rechnung-profi-reviews-widget" data-product-id="&#123;&#123; product.id &#125;&#125;"&gt;&lt;/div&gt;</code>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                navigator.clipboard.writeText('<div id="rechnung-profi-reviews-widget" data-product-id="{{ product.id }}"></div>')
                                                toast.success('Code kopiert!')
                                            }}
                                        >
                                            Kopieren
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* AUTO REVIEWS TAB */}
                    <TabsContent value="auto-reviews">
                        <AutoReviewsSettings />
                    </TabsContent>

                    {/* EMAIL AUTOMATION TAB */}
                    <TabsContent value="emails" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <CardTitle>E-Mail Automation</CardTitle>
                                                <CardDescription>Senden Sie automatische Bewertungsanfragen an Ihre Kunden</CardDescription>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Label htmlFor="email-automation-mode" className="text-sm font-medium">Aktivieren</Label>
                                                <Switch
                                                    id="email-automation-mode"
                                                    checked={emailSettings.enabled}
                                                    onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, enabled: checked })}
                                                />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full h-fit">
                                                <Mail className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-blue-900">Wie es funktioniert</h4>
                                                <p className="text-sm text-blue-700 mt-1">
                                                    Wir senden automatisch eine E-Mail an Ihre Kunden, nachdem eine Bestellung erfüllt wurde.
                                                    Sie können festlegen, wie viele Tage wir warten sollen.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Verzögerung (Tage)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={emailSettings.delayDays}
                                                        onChange={(e) => setEmailSettings({ ...emailSettings, delayDays: parseInt(e.target.value) || 0 })}
                                                        className="pl-10"
                                                    />
                                                    <div className="absolute left-3 top-2.5 text-gray-400">
                                                        <Clock className="h-4 w-4" />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500">Tage nach Erfüllung der Bestellung</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Betreffzeile</Label>
                                            <Input
                                                value={emailSettings.subject}
                                                onChange={(e) => setEmailSettings({ ...emailSettings, subject: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>E-Mail Inhalt</Label>
                                            <Textarea
                                                value={emailSettings.body}
                                                onChange={(e) => setEmailSettings({ ...emailSettings, body: e.target.value })}
                                                className="min-h-[200px] font-mono text-sm"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <Badge variant="outline" className="cursor-pointer hover:bg-gray-100" onClick={() => setEmailSettings({ ...emailSettings, body: emailSettings.body + ' {customer_name}' })}>{'{customer_name}'}</Badge>
                                                <Badge variant="outline" className="cursor-pointer hover:bg-gray-100" onClick={() => setEmailSettings({ ...emailSettings, body: emailSettings.body + ' {product_title}' })}>{'{product_title}'}</Badge>
                                                <Badge variant="outline" className="cursor-pointer hover:bg-gray-100" onClick={() => setEmailSettings({ ...emailSettings, body: emailSettings.body + ' {shop_name}' })}>{'{shop_name}'}</Badge>
                                            </div>
                                        </div>

                                        <div className="flex justify-between pt-4">
                                            <Button variant="outline">
                                                Test E-Mail senden
                                            </Button>
                                            <Button onClick={saveEmailSettings} disabled={isSavingEmailSettings}>
                                                {isSavingEmailSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                Einstellungen speichern
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Preview */}
                            <div className="space-y-6">
                                <Card className="bg-gray-50 border-dashed">
                                    <CardHeader>
                                        <CardTitle className="text-sm uppercase text-gray-500 tracking-wider">Vorschau</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                                            <div className="bg-gray-50 p-4 border-b flex items-center gap-3">
                                                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                    S
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{emailSettings.subject}</p>
                                                    <p className="text-xs text-gray-500">Von: Ihr Shop Name</p>
                                                </div>
                                            </div>
                                            <div className="p-6 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                {emailSettings.body
                                                    .replace('{customer_name}', 'Max Mustermann')
                                                    .replace('{product_title}', 'Beispiel Produkt')
                                                    .replace('{shop_name}', 'Mein Shop')
                                                }
                                                <div className="mt-6">
                                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                                        Jetzt bewerten
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* GOOGLE INTEGRATION TAB */}
                    <TabsContent value="google-integration" className="space-y-6">
                        <Tabs value={googleTab} onValueChange={setGoogleTab} className="space-y-6">
                            <TabsList className="bg-white border p-1 h-10 rounded-lg shadow-sm w-auto inline-flex">
                                <TabsTrigger value="shopping" className="h-8 px-4 text-sm">Google Shopping</TabsTrigger>
                                <TabsTrigger value="snippets" className="h-8 px-4 text-sm">Google Search Rating / Review Snippet</TabsTrigger>
                            </TabsList>

                            {/* GOOGLE SHOPPING TAB */}
                            <TabsContent value="shopping" className="space-y-6">
                                {/* Info Banner */}
                                <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                                    <ShoppingBag className="h-4 w-4" />
                                    <AlertTitle>Google Shopping Integration</AlertTitle>
                                    <AlertDescription className="flex justify-between items-center mt-2">
                                        <span>Synchronisieren Sie Ihre Bewertungen mit Google Shopping, um Sterne in Google-Shopping-Anzeigen anzuzeigen.</span>
                                        <Button variant="outline" size="sm" className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200">
                                            Mehr erfahren <ArrowRight className="h-3 w-3 ml-1" />
                                        </Button>
                                    </AlertDescription>
                                </Alert>

                                {/* Product Settings */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Product settings</CardTitle>
                                        <CardDescription>Wählen Sie aus, welche Produkte im Feed enthalten sein sollen.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    id="all-products"
                                                    name="product-selection"
                                                    checked={googleShoppingSettings.productSelection === 'all'}
                                                    onChange={() => setGoogleShoppingSettings({ ...googleShoppingSettings, productSelection: 'all' })}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                />
                                                <Label htmlFor="all-products">Alle Produkte</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    id="some-products"
                                                    name="product-selection"
                                                    checked={googleShoppingSettings.productSelection === 'some'}
                                                    onChange={() => setGoogleShoppingSettings({ ...googleShoppingSettings, productSelection: 'some' })}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                />
                                                <Label htmlFor="some-products">Einige Produkte</Label>
                                            </div>
                                        </div>

                                        {googleShoppingSettings.productSelection === 'some' && (
                                            <div className="pl-6">
                                                <Button variant="outline" size="sm">
                                                    <PenTool className="h-3 w-3 mr-2" />
                                                    Produkte auswählen
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Review Filter */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Review filter</CardTitle>
                                        <CardDescription>Filtern Sie, welche Bewertungen an Google gesendet werden.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium">Quellen</Label>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="customer-reviews"
                                                    checked={googleShoppingSettings.filterCustomerReviews}
                                                    onCheckedChange={(checked) => setGoogleShoppingSettings({ ...googleShoppingSettings, filterCustomerReviews: !!checked })}
                                                />
                                                <Label htmlFor="customer-reviews">Customer Reviews</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="imported-reviews"
                                                    checked={googleShoppingSettings.filterImportedReviews}
                                                    onCheckedChange={(checked) => setGoogleShoppingSettings({ ...googleShoppingSettings, filterImportedReviews: !!checked })}
                                                />
                                                <Label htmlFor="imported-reviews">Importierte Reviews</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="empty-comments"
                                                    checked={googleShoppingSettings.filterEmptyComments}
                                                    onCheckedChange={(checked) => setGoogleShoppingSettings({ ...googleShoppingSettings, filterEmptyComments: !!checked })}
                                                />
                                                <Label htmlFor="empty-comments">Leere Kommentare filtern</Label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Country Filter</Label>
                                                <Select
                                                    value={googleShoppingSettings.countryFilter}
                                                    onValueChange={(val) => setGoogleShoppingSettings({ ...googleShoppingSettings, countryFilter: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select country" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All countries</SelectItem>
                                                        <SelectItem value="de">Germany</SelectItem>
                                                        <SelectItem value="us">United States</SelectItem>
                                                        <SelectItem value="gb">United Kingdom</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Keyword exception filter (comma separated)</Label>
                                                <Input
                                                    placeholder="e.g. spam, fake"
                                                    value={googleShoppingSettings.keywordFilter}
                                                    onChange={(e) => setGoogleShoppingSettings({ ...googleShoppingSettings, keywordFilter: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Product Identification */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Product identification</CardTitle>
                                        <CardDescription>Wie sollen Produkte bei Google identifiziert werden?</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="max-w-md space-y-2">
                                            <Label>Matching Method</Label>
                                            <Select
                                                value={googleShoppingSettings.productIdentification}
                                                onValueChange={(val) => setGoogleShoppingSettings({ ...googleShoppingSettings, productIdentification: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select method" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="gtin">GTIN</SelectItem>
                                                    <SelectItem value="mpn">MPN + Brand</SelectItem>
                                                    <SelectItem value="sku">SKU</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-lg border text-sm text-gray-600">
                                            <p>Das System wird versuchen, das gewählte Feld aus Ihren Shopify-Produktdaten zu extrahieren und im Feed bereitzustellen.</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Feed Generation */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Feed Generierung</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <Button
                                            className="bg-blue-600 hover:bg-blue-700"
                                            onClick={saveGoogleSettings}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Einstellungen speichern
                                        </Button>

                                        <div className="space-y-2">
                                            <Label>Feed URL</Label>
                                            <div className="flex gap-2">
                                                <Input readOnly value={feedUrl || "https://invoice-app.com/api/feeds/google-shopping.xml"} className="bg-gray-50 font-mono text-sm" />
                                                <Button variant="outline" size="icon" onClick={() => {
                                                    navigator.clipboard.writeText(feedUrl)
                                                    toast.success('URL kopiert')
                                                }}>
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Letzte Aktualisierung: Vor 2 Stunden • 124 Produkte • 850 Reviews
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* GOOGLE SNIPPETS TAB */}
                            <TabsContent value="snippets" className="space-y-6">
                                {/* Info Banner */}
                                <Alert className="bg-green-50 border-green-200 text-green-800">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Google Review Snippets</AlertTitle>
                                    <AlertDescription>
                                        Aktivieren Sie Google Review Snippets, damit Ihre Sterne in den Google-Suchergebnissen angezeigt werden.
                                    </AlertDescription>
                                </Alert>

                                {/* Filter Bar */}
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                                        <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700 border-blue-200">All</Button>
                                        <Button variant="ghost" size="sm">One star</Button>
                                        <Button variant="ghost" size="sm">Two star</Button>
                                        <Button variant="ghost" size="sm">Three star</Button>
                                        <Button variant="ghost" size="sm">Four star</Button>
                                        <Button variant="ghost" size="sm">Five star</Button>
                                    </div>
                                    <div className="relative w-full md:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                        <Input placeholder="Produkt suchen..." className="pl-9" />
                                    </div>
                                </div>

                                {/* Product Table */}
                                <Card>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produkt</TableHead>
                                                <TableHead>Bewertungsinfo</TableHead>
                                                <TableHead>Google Ratings Display</TableHead>
                                                <TableHead>Check it on Google</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productStats.slice(0, 5).map((stat) => {
                                                const shopifyProduct = shopifyProducts.find(p => String(p.id) === String(stat.productId))
                                                const productImage = shopifyProduct?.images?.[0]?.src || stat.productImage

                                                return (
                                                    <TableRow key={stat.productId}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                                                                    {productImage ? (
                                                                        <img src={productImage} alt="" className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <ImageIcon className="h-5 w-5 m-auto text-gray-400" />
                                                                    )}
                                                                </div>
                                                                <span className="font-medium text-sm line-clamp-1 max-w-[200px]">{stat.productTitle}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col text-sm">
                                                                <div className="flex items-center gap-1">
                                                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                                    <span className="font-bold">{stat.averageRating.toFixed(1)}</span>
                                                                </div>
                                                                <span className="text-gray-500">{stat.reviewCount} Reviews</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Switch
                                                                    checked={googleProductStatus[stat.productId] !== false}
                                                                    onCheckedChange={(checked) => setGoogleProductStatus({ ...googleProductStatus, [stat.productId]: checked })}
                                                                />
                                                                <span className="text-sm text-gray-600">
                                                                    {googleProductStatus[stat.productId] !== false ? 'Aktiv' : 'Inaktiv'}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <a
                                                                href={`https://www.google.com/search?q=${encodeURIComponent(stat.productTitle)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                                            >
                                                                Check now <LinkIcon className="h-3 w-3" />
                                                            </a>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </Card>

                                {/* Settings */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Google Rating Settings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Strukturierte Daten (Schema.org)</Label>
                                                <p className="text-sm text-gray-500">
                                                    Automatisch JSON-LD Markup für Bewertungen in Ihren Store injecten.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={googleSnippetSettings.schemaEnabled}
                                                onCheckedChange={(checked) => setGoogleSnippetSettings({ ...googleSnippetSettings, schemaEnabled: checked })}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Edit Dialog */}
            <Dialog open={!!editingReview} onOpenChange={(open) => !open && setEditingReview(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bewertung bearbeiten</DialogTitle>
                        <DialogDescription>Ändern Sie die Details der Bewertung hier.</DialogDescription>
                    </DialogHeader>
                    {editingReview && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={editingReview.status === 'APPROVED' ? 'default' : 'outline'}
                                        onClick={() => setEditingReview({ ...editingReview, status: 'APPROVED' })}
                                    >
                                        Genehmigt
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={editingReview.status === 'PENDING' ? 'default' : 'outline'}
                                        onClick={() => setEditingReview({ ...editingReview, status: 'PENDING' })}
                                    >
                                        Ausstehend
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={editingReview.status === 'REJECTED' ? 'default' : 'outline'}
                                        onClick={() => setEditingReview({ ...editingReview, status: 'REJECTED' })}
                                    >
                                        Abgelehnt
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Kundenname</Label>
                                <Input
                                    value={editingReview.customerName}
                                    onChange={(e) => setEditingReview({ ...editingReview, customerName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bewertung (Sterne)</Label>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setEditingReview({ ...editingReview, rating: star })}
                                            className="focus:outline-none"
                                        >
                                            <Star
                                                className={`h-6 w-6 ${star <= editingReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Titel</Label>
                                <Input
                                    value={editingReview.title || ''}
                                    onChange={(e) => setEditingReview({ ...editingReview, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Inhalt</Label>
                                <Textarea
                                    value={editingReview.content || ''}
                                    onChange={(e) => setEditingReview({ ...editingReview, content: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fotos/Videos</Label>
                                <div className="flex flex-wrap gap-3 mb-3">
                                    {editingReview.images?.map((img: string, idx: number) => (
                                        <div key={`img-${idx}`} className="relative group w-24 h-24 flex-shrink-0 bg-gray-50 rounded-md border border-gray-200 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={img}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newImages = [...editingReview.images];
                                                    newImages.splice(idx, 1);
                                                    setEditingReview({ ...editingReview, images: newImages });
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0 w-6 h-6 flex items-center justify-center shadow-sm transition-all z-10"
                                                title="Löschen"
                                            >
                                                <span className="text-xs font-bold">×</span>
                                            </button>
                                        </div>
                                    ))}
                                    {editingReview.videos?.map((vid: string, idx: number) => (
                                        <div key={`vid-${idx}`} className="relative group w-24 h-24 flex-shrink-0 bg-gray-50 rounded-md border border-gray-200 flex items-center justify-center overflow-hidden">
                                            <video
                                                src={vid}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVideos = [...editingReview.videos];
                                                    newVideos.splice(idx, 1);
                                                    setEditingReview({ ...editingReview, videos: newVideos });
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0 w-6 h-6 flex items-center justify-center shadow-sm transition-all z-10"
                                                title="Löschen"
                                            >
                                                <span className="text-xs font-bold">×</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple
                                        className="cursor-pointer"
                                        onChange={async (e) => {
                                            const files = e.target.files;
                                            if (!files) return;

                                            const newImages = [...(editingReview.images || [])];
                                            const newVideos = [...(editingReview.videos || [])];

                                            for (let i = 0; i < files.length; i++) {
                                                const file = files[i];
                                                if (file.size > 5 * 1024 * 1024) {
                                                    toast.error(`Datei ${file.name} ist zu groß (Max 5MB)`);
                                                    continue;
                                                }

                                                try {
                                                    const base64 = await new Promise((resolve, reject) => {
                                                        const reader = new FileReader();
                                                        reader.onload = () => resolve(reader.result);
                                                        reader.onerror = reject;
                                                        reader.readAsDataURL(file);
                                                    });

                                                    if (file.type.startsWith('image/')) {
                                                        newImages.push(base64);
                                                    } else if (file.type.startsWith('video/')) {
                                                        newVideos.push(base64);
                                                    }
                                                } catch (err) {
                                                    console.error('Error reading file:', err);
                                                }
                                            }
                                            setEditingReview({ ...editingReview, images: newImages, videos: newVideos });
                                            // Reset input
                                            e.target.value = '';
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Max. 5MB pro Datei. Unterstützt: JPG, PNG, MP4.</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingReview(null)}>Abbrechen</Button>
                        <Button onClick={handleUpdateReview} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Speichern
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={!!deletingReviewId} onOpenChange={(open) => !open && setDeletingReviewId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden. Die Bewertung wird dauerhaft gelöscht.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteReview} className="bg-red-600 hover:bg-red-700">
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}

function AutoReviewsSettings() {
    const { products } = useShopifyProducts()
    const [settings, setSettings] = useState({
        enabled: false,
        delayMinutes: 0,
        percentage: 100,
        minRating: 4,
        maxRating: 5,
        templates: [] as { content: string, title: string, rating: number, productId?: string | null }[]
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

    // Template Form State
    const [newTemplate, setNewTemplate] = useState({ content: '', title: '', rating: 5 })
    const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null)
    const [deletingTemplateIndex, setDeletingTemplateIndex] = useState<number | null>(null)

    useEffect(() => {
        fetch('/api/reviews/auto-settings')
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setSettings(data)
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async (updatedSettings = settings) => {
        setSaving(true)
        try {
            await fetch('/api/reviews/auto-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedSettings)
            })
            toast.success('Einstellungen gespeichert')
        } catch (error) {
            toast.error('Fehler beim Speichern')
        } finally {
            setSaving(false)
        }
    }

    const addTemplate = async () => {
        if (!newTemplate.content) return

        let newTemplates = [...settings.templates]

        if (editingTemplateIndex !== null) {
            // Update existing
            newTemplates[editingTemplateIndex] = {
                ...newTemplates[editingTemplateIndex],
                ...newTemplate,
                productId: selectedProductId // Ensure it stays with the current product view
            }
            toast.success('Vorlage aktualisiert')
        } else {
            // Add new
            newTemplates.push({ ...newTemplate, productId: selectedProductId })
            toast.success('Vorlage hinzugefügt')
        }

        const newSettings = { ...settings, templates: newTemplates }
        setSettings(newSettings)
        setNewTemplate({ content: '', title: '', rating: 5 })
        setEditingTemplateIndex(null)

        // Auto-save changes
        await handleSave(newSettings)
    }

    const startEdit = (index: number) => {
        const template = settings.templates[index]
        setNewTemplate({
            content: template.content,
            title: template.title || '',
            rating: template.rating || 5
        })
        setEditingTemplateIndex(index)
    }

    const cancelEdit = () => {
        setNewTemplate({ content: '', title: '', rating: 5 })
        setEditingTemplateIndex(null)
    }

    const confirmDeleteTemplate = async () => {
        if (deletingTemplateIndex === null) return

        const newTemplates = [...settings.templates]
        newTemplates.splice(deletingTemplateIndex, 1)

        const newSettings = { ...settings, templates: newTemplates }
        setSettings(newSettings)
        setDeletingTemplateIndex(null)

        toast.success('Vorlage gelöscht')

        // Auto-save changes
        await handleSave(newSettings)
    }

    // Filter templates based on selection
    const displayedTemplates = settings.templates.filter(t =>
        selectedProductId ? t.productId === selectedProductId : !t.productId
    )

    if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Automatische Bewertungen (Auto-Review)</CardTitle>
                    <CardDescription>
                        Generieren Sie automatisch Bewertungen für neue Bestellungen.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div className="space-y-0.5">
                            <Label className="text-base">Auto-Review aktivieren</Label>
                            <p className="text-sm text-gray-500">
                                Erstellt automatisch Bewertungen, wenn eine neue Bestellung eingeht.
                            </p>
                        </div>
                        <Switch
                            checked={settings.enabled}
                            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Verzögerung (Minuten)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={settings.delayMinutes}
                                onChange={(e) => setSettings({ ...settings, delayMinutes: parseInt(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-gray-500">Zeit nach Bestelleingang bis zur Bewertungserstellung.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Wahrscheinlichkeit (%)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={settings.percentage}
                                    onChange={(e) => setSettings({ ...settings, percentage: parseInt(e.target.value) || 100 })}
                                />
                                <span className="text-sm text-gray-500">%</span>
                            </div>
                            <p className="text-xs text-gray-500">Prozentsatz der Bestellungen, die eine Bewertung erhalten.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Min. Bewertung</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={settings.minRating}
                                    onChange={(e) => setSettings({ ...settings, minRating: parseInt(e.target.value) || 4 })}
                                />
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Max. Bewertung</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={settings.maxRating}
                                    onChange={(e) => setSettings({ ...settings, maxRating: parseInt(e.target.value) || 5 })}
                                />
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product List */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Produkte</CardTitle>
                        <CardDescription>Wählen Sie ein Produkt für spezifische Vorlagen</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[600px] overflow-y-auto">
                            <div
                                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedProductId === null ? 'bg-blue-50 border-blue-200' : ''}`}
                                onClick={() => {
                                    setSelectedProductId(null)
                                    cancelEdit()
                                }}
                            >
                                <h3 className="font-medium">Allgemeine Vorlagen</h3>
                                <p className="text-xs text-gray-500">Werden genutzt wenn keine spezifischen Vorlagen existieren</p>
                            </div>
                            {products.map(product => (
                                <div
                                    key={product.id}
                                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedProductId === String(product.id) ? 'bg-blue-50 border-blue-200' : ''}`}
                                    onClick={() => {
                                        setSelectedProductId(String(product.id))
                                        cancelEdit()
                                    }}
                                >
                                    {product.images && product.images[0] && (
                                        <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                                            <img src={product.images[0].src} alt="" className="h-full w-full object-cover" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-sm truncate">{product.title}</h3>
                                        <p className="text-xs text-gray-500">
                                            {settings.templates.filter(t => t.productId === String(product.id)).length} Vorlagen
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Templates Manager */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>
                            {selectedProductId
                                ? `Vorlagen für "${products.find(p => String(p.id) === selectedProductId)?.title}"`
                                : "Allgemeine Vorlagen"
                            }
                        </CardTitle>
                        <CardDescription>
                            {selectedProductId
                                ? "Diese Vorlagen werden NUR für dieses Produkt verwendet."
                                : "Diese Vorlagen werden für alle Produkte verwendet, die keine eigenen Vorlagen haben."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                            <h4 className="font-medium text-sm">
                                {editingTemplateIndex !== null ? 'Vorlage bearbeiten' : 'Neue Vorlage hinzufügen'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    placeholder="Titel (Optional)"
                                    value={newTemplate.title}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                />
                                <div className="flex items-center gap-2">
                                    <Label>Sterne:</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={newTemplate.rating}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, rating: parseInt(e.target.value) || 5 })}
                                        className="w-20"
                                    />
                                </div>
                            </div>
                            <Textarea
                                placeholder="Bewertungstext..."
                                value={newTemplate.content}
                                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <Button onClick={addTemplate} disabled={!newTemplate.content || saving}>
                                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                    {editingTemplateIndex !== null ? 'Änderungen speichern' : 'Vorlage hinzufügen'}
                                </Button>
                                {editingTemplateIndex !== null && (
                                    <Button variant="outline" onClick={cancelEdit}>
                                        Abbrechen
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {displayedTemplates.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Keine Vorlagen für diese Auswahl vorhanden.
                                </div>
                            ) : (
                                displayedTemplates.map((template, index) => {
                                    // Find the actual index in the main settings.templates array to remove/edit correctly
                                    const realIndex = settings.templates.indexOf(template)
                                    return (
                                        <div key={index} className={`flex items-start justify-between p-4 border rounded-lg bg-white ${editingTemplateIndex === realIndex ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="flex text-yellow-400">
                                                        {[...Array(template.rating)].map((_, i) => (
                                                            <Star key={i} className="h-3 w-3 fill-current" />
                                                        ))}
                                                    </div>
                                                    {template.title && <span className="font-medium text-sm">{template.title}</span>}
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-2">{template.content}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => startEdit(realIndex)}>
                                                    <PenTool className="h-4 w-4 text-gray-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDeletingTemplateIndex(realIndex)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div className="pt-4 flex justify-end border-t">
                            <Button onClick={() => handleSave()} disabled={saving} className="bg-green-600 hover:bg-green-700">
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Speichern...
                                    </>
                                ) : (
                                    'Alle Einstellungen speichern'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Template Alert */}
            <AlertDialog open={deletingTemplateIndex !== null} onOpenChange={(open) => !open && setDeletingTemplateIndex(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Möchten Sie diese Vorlage wirklich löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Diese Aktion löscht die Vorlage dauerhaft aus der Datenbank.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTemplate} className="bg-red-600 hover:bg-red-700">
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>



        </div >
    )
}

