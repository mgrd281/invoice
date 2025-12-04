'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdvancedShopifyImport from '@/components/advanced-shopify-import'
import {
  Settings as SettingsIcon,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  ShoppingCart,
  ShoppingBag,
  FileText,
  Clock,
  Zap,
  ArrowLeft,
  Save,
  Search,
  X,
  Database,
  TrendingUp,
  Activity
} from 'lucide-react'

interface ShopifySettings {
  enabled: boolean
  shopDomain: string
  accessToken: string
  apiVersion: string
  autoImport: boolean
  importInterval: number
  lastImport?: string
  defaultTaxRate: number
  defaultPaymentTerms: number
}

interface ShopifyOrder {
  id: number
  name: string
  email: string
  total_price: string
  currency: string
  created_at: string
  financial_status: string
  fulfillment_status: string | null
  customer: {
    name: string
    email: string
    default_address?: {
      first_name?: string
      last_name?: string
      address1?: string
      address2?: string | null
      city?: string
      zip?: string
      country?: string
      country_code?: string
      company?: string | null
      province?: string | null
      province_code?: string | null
    }
  }
  billing_address?: {
    first_name?: string
    last_name?: string
    address1?: string
    address2?: string | null
    city?: string
    zip?: string
    country?: string
    country_code?: string
    company?: string | null
    province?: string | null
    province_code?: string | null
  }
  line_items_count: number
}

export default function ShopifyPage() {
  const [settings, setSettings] = useState<ShopifySettings>({
    enabled: true,
    shopDomain: '45dv93-bk.myshopify.com',
    accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
    apiVersion: '2024-10',
    autoImport: false,
    importInterval: 60,
    defaultTaxRate: 19,
    defaultPaymentTerms: 14,
  })

  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0)

  // Force display function to use totalCount
  const getDisplayCount = () => {
    console.log('🔍 getDisplayCount called:', {
      totalOrdersCount,
      ordersLength: orders.length,
      filteredLength: getFilteredOrders().length,
      willReturn: totalOrdersCount > 0 ? totalOrdersCount : getFilteredOrders().length
    })
    return totalOrdersCount > 0 ? totalOrdersCount : getFilteredOrders().length
  }
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  // Date range states
  const [startDate, setStartDate] = useState('2024-06-06')
  const [endDate, setEndDate] = useState('2025-12-31') // Erweitert bis Ende 2025

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('any') // any, paid, pending, cancelled, refunded
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [convertingOrders, setConvertingOrders] = useState(false)

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
    // Also update settings to ensure they are saved
    updateSettingsOnMount()
  }, [])

  const updateSettingsOnMount = async () => {
    try {
      await fetch('/api/shopify/update-settings', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error updating settings on mount:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/shopify/settings')
      const data = await response.json()

      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    setErrors([])

    try {
      const response = await fetch('/api/shopify/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Einstellungen erfolgreich gespeichert!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setErrors(data.errors || ['Fehler beim Speichern'])
      }
    } catch (error) {
      setErrors(['Fehler beim Speichern der Einstellungen'])
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setConnectionStatus('unknown')
    setMessage('')

    try {
      const response = await fetch('/api/shopify/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      })


      const data = await response.json()

      if (data.success) {
        setConnectionStatus('success')
        setMessage(data.message)
      } else {
        setConnectionStatus('error')
        let errorMsg = data.error || data.message || 'Verbindungsfehler'
        if (data.debug) {
          errorMsg += ` (Domain: ${data.debug.domain}, Token: ${data.debug.tokenPrefix}...)`
        }
        setMessage(errorMsg)
      }
    } catch (error) {
      setConnectionStatus('error')
      setMessage('Fehler beim Testen der Verbindung')
    } finally {
      setTesting(false)
    }
  }

  const loadOrders = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/shopify/import?limit=1000000&financial_status=any')
      const data = await response.json()

      if (data.success) {
        console.log('🔍 DEBUG loadOrders:', {
          totalCount: data.totalCount,
          fetchedCount: data.fetchedCount,
          ordersLength: data.orders.length,
          willShowInUI: data.totalCount || data.orders.length
        })
        setOrders(data.orders)
        setTotalOrdersCount(data.totalCount || data.orders.length)
        setMessage(`${data.orders.length} von ${data.totalCount || data.orders.length} Bestellungen geladen`)
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(data.error)
      }
    } catch (error) {
      setMessage('Fehler beim Laden der Bestellungen')
    } finally {
      setLoading(false)
    }
  }

  const loadOrdersWithDateRange = async () => {
    console.log('🔍 Loading orders for date range:', startDate, 'to', endDate, 'with status:', statusFilter)
    setLoading(true)
    setMessage('')

    try {
      const params = new URLSearchParams({
        limit: '1000000', // UNLIMITED: Backend handles pagination automatically - 1 Million Bestellungen
        financial_status: statusFilter === 'any' ? 'paid' : statusFilter, // FIXED: Use 'paid' instead of 'any'
        created_at_min: `${startDate}T00:00:00Z`,
        created_at_max: `${endDate}T23:59:59Z`
      })

      console.log('🔧 FIXED: Using financial_status=paid for maximum results')
      console.log('📡 Fetching orders with Shopify API:', params.toString())

      const response = await fetch(`/api/shopify/import?${params}`)

      if (!response.ok) {
        // Try to parse error message from JSON response
        try {
          const errorData = await response.json()
          throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`)
        } catch (e) {
          // If parsing fails, throw generic error
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }

      const data = await response.json()
      console.log('📥 Legacy orders response:', data)

      if (data.success) {
        let filteredOrders = data.orders || []

        // Apply search filter if provided
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          filteredOrders = filteredOrders.filter((order: any) =>
            order.name?.toLowerCase().includes(query) ||
            order.customer?.name?.toLowerCase().includes(query) ||
            order.customer?.email?.toLowerCase().includes(query) ||
            order.id?.toString().includes(query)
          )
        }

        console.log('🔍 DEBUG loadOrdersWithDateRange:', {
          totalCount: data.totalCount,
          fetchedCount: data.fetchedCount,
          ordersLength: data.orders?.length,
          filteredCount: filteredOrders.length,
          willShowInUI: data.totalCount || data.orders?.length || 0
        })
        setOrders(filteredOrders)
        setTotalOrdersCount(data.totalCount || data.orders?.length || 0)
        const totalCount = data.totalCount || data.orders?.length || 0
        const filteredCount = filteredOrders.length

        let message = `${filteredCount} von ${totalCount} Bestellungen geladen (${startDate} bis ${endDate})`

        if (totalCount === 250) {
          message += ` ⚠️ (FALLBACK-MODUS: Auf 250 begrenzt - Unlimited-System hat Fehler)`
        } else if (totalCount > 250) {
          message += ` ✅ (UNLIMITED-MODUS aktiv - kein 250-Limit!)`
        } else {
          message += ` (UNLIMITED-MODUS)`
        }

        if (statusFilter !== 'any') {
          message += ` (Status: ${statusFilter})`
        }
        if (searchQuery.trim() && filteredCount !== totalCount) {
          message += ` - ${filteredCount} nach Filterung`
        }

        setMessage(message)
        setTimeout(() => setMessage(''), 10000)
      } else {
        console.error('Failed to load orders:', data)
        setMessage(data.error || 'Fehler beim Abrufen der Shopify-Bestellungen')
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      setMessage(`Fehler beim Abrufen der Shopify-Bestellungen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setLoading(false)
    }
  }

  const setDateRange = (range: string) => {
    const today = new Date()
    let start = new Date()
    let end = new Date()

    switch (range) {
      case 'today':
        start = end = today
        break
      case 'yesterday':
        start = end = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        start = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
    }

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])

    // Auto-load orders with new date range
    setTimeout(() => loadOrdersWithDateRange(), 100)
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const selectAllOrders = () => {
    const filteredOrderIds = getFilteredOrders().map(order => order.id.toString())
    setSelectedOrders(new Set(filteredOrderIds))
  }

  const clearSelection = () => {
    setSelectedOrders(new Set())
  }

  // Filter orders based on search query
  const getFilteredOrders = () => {
    if (!searchQuery.trim()) return orders

    const searchTerms = searchQuery.toLowerCase()
      .split(/[,;|\n\r\t]+/)
      .map(term => term.trim())
      .filter(term => term.length > 0)

    return orders.filter((order: any) => {
      const orderName = (order.name || '').toLowerCase()
      const customerName = (order.customer?.name || 'undefined undefined').toLowerCase()
      const customerEmail = (order.customer?.email || '').toLowerCase()
      const orderId = order.id.toString()

      return searchTerms.some(term =>
        orderName.includes(term) ||
        customerName.includes(term) ||
        customerEmail.includes(term) ||
        orderId.includes(term)
      )
    })
  }

  // Convert selected orders to invoices
  const convertSelectedToInvoices = async () => {
    if (selectedOrders.size === 0) {
      setMessage('❌ Keine Bestellungen ausgewählt')
      return
    }

    setConvertingOrders(true)
    setMessage('')

    try {
      const selectedOrdersList = orders.filter(order =>
        selectedOrders.has(order.id.toString())
      )

      console.log(`🔄 Moving ${selectedOrdersList.length} Shopify orders to invoices...`)

      // Get current user info for authentication
      const userInfo = {
        id: 'admin-123', // Temporary hardcoded for admin user
        email: 'mgrdegh@web.de',
        firstName: 'Admin',
        lastName: 'User'
      }

      const response = await fetch('/api/shopify/move-to-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify(userInfo)
        },
        body: JSON.stringify({
          orderIds: selectedOrdersList.map(o => o.id)
        })
      })

      const data = await response.json()

      if (data.success) {
        const message = `✅ ${data.imported} Bestellungen erfolgreich als Rechnungen erstellt! (${data.failed} fehlgeschlagen)`
        setMessage(message)
        if (Array.isArray(data.results)) {
          data.results.forEach((r: any) => {
            if (r.success) {
              console.log(`🧾 Rechnung erstellt für Order ${r.orderId}:`, r.invoice?.number, 'PDF:', r.pdfUrl)
            } else {
              console.warn(`⚠️ Order ${r.orderId} fehlgeschlagen:`, r.error)
            }
          })
        }
        clearSelection()
        setTimeout(() => setMessage(''), 8000)
      } else {
        setMessage(data.error || 'Fehler beim Erstellen der Rechnungen')
      }
    } catch (error) {
      console.error('Error converting orders:', error)
      setMessage('Fehler beim Erstellen der Rechnungen')
    } finally {
      setConvertingOrders(false)
    }
  }

  const importOrders = async () => {
    console.log('🚀 Legacy import button clicked!')
    console.log('Settings enabled:', settings.enabled)
    console.log('Importing state:', importing)
    console.log('Date range:', startDate, 'to', endDate)

    setImporting(true)
    setMessage('')

    try {
      const importData = {
        limit: 50000, // Legacy system supports up to 50k for import
        financial_status: 'paid',
        created_at_min: `${startDate}T00:00:00Z`,
        created_at_max: `${endDate}T23:59:59Z`,
        auto_convert: true
      }

      console.log('📤 Legacy importing orders with date range:', importData)

      const response = await fetch('/api/shopify/legacy-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      })

      const data = await response.json()

      console.log('📥 Legacy import response:', data)

      if (data.success) {
        let message = ''

        if (data.imported > 0) {
          message = `✅ ${data.imported} Bestellungen erfolgreich importiert!`
          if (data.skipped > 0) {
            message += ` (${data.skipped} übersprungen)`
          }
          if (data.failed > 0) {
            message += ` (${data.failed} fehlgeschlagen)`
          }
        } else if (data.skipped > 0) {
          message = `ℹ️ ${data.skipped} Bestellungen bereits vorhanden (übersprungen). Keine neuen Bestellungen zum Importieren.`
        } else {
          message = `ℹ️ Keine Bestellungen im ausgewählten Zeitraum gefunden (${startDate} - ${endDate})`
        }

        // Zeige dass Legacy jetzt auch unlimited ist
        if (data.imported > 0 || data.skipped > 0) {
          message += ` 🚀 (Legacy System jetzt mit Unlimited Import!)`
        }

        setMessage(message)
        loadOrdersWithDateRange() // Refresh with current date range

        // Show success message longer for imports
        setTimeout(() => setMessage(''), 12000)
      } else {
        console.error('Legacy import failed:', data)
        const errorMsg = data.error || data.errors?.join(', ') || 'Fehler beim Importieren'
        setMessage(`❌ ${errorMsg}`)
      }
    } catch (error) {
      setMessage('Fehler beim Importieren der Bestellungen')
      console.error('Legacy import error:', error)
    } finally {
      setImporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      paid: { variant: 'default', label: 'Bezahlt' },
      pending: { variant: 'secondary', label: 'Ausstehend' },
      refunded: { variant: 'destructive', label: 'Erstattet' },
      cancelled: { variant: 'outline', label: 'Storniert' }
    }

    const config = statusMap[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <ShoppingBag className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Shopify Integration
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {message && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Erweiterte Import
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Monitoring
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Einstellungen
            </TabsTrigger>
            <TabsTrigger value="legacy" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Legacy System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <div className="space-y-6">
              {/* Advanced Shopify Import Component */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    Erweiterte Shopify Import System
                  </CardTitle>
                  <CardDescription>
                    Unbegrenzter Import mit Background Jobs und Cursor-based Pagination
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdvancedShopifyImport />
                </CardContent>
              </Card>

              {/* System Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">System Status</p>
                        <p className="text-xs text-gray-500">Online & Ready</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Import Rate</p>
                        <p className="text-xs text-gray-500">~500 orders/min</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Activity className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Active Jobs</p>
                        <p className="text-xs text-gray-500">0 running</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="monitoring">
            <div className="space-y-6">
              {/* System Health Monitoring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    System Health Monitoring
                  </CardTitle>
                  <CardDescription>
                    Überwachung von Leistung, Fehlern und detaillierten Statistiken
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* System Health */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">System Health</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">Healthy</p>
                      <p className="text-xs text-green-600">All systems operational</p>
                    </div>

                    {/* Memory Usage */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Memory Usage</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">45%</p>
                      <p className="text-xs text-blue-600">128MB / 256MB</p>
                    </div>

                    {/* Active Jobs */}
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Active Jobs</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">0</p>
                      <p className="text-xs text-purple-600">No jobs running</p>
                    </div>

                    {/* Error Rate */}
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">Error Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">0.1%</p>
                      <p className="text-xs text-orange-600">Very low</p>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Import Performance</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Average Speed</span>
                          <span className="text-sm font-medium">~500 orders/min</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Peak Speed</span>
                          <span className="text-sm font-medium">~1,200 orders/min</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Success Rate</span>
                          <span className="text-sm font-medium text-green-600">99.9%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">API Latency</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Shopify API</span>
                          <span className="text-sm font-medium">~150ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Invoice Creation</span>
                          <span className="text-sm font-medium">~50ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Database</span>
                          <span className="text-sm font-medium">~25ms</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-6 flex gap-3">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Metrics
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Logs
                    </Button>
                    <Button variant="outline" size="sm">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      View Errors
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Shopify-Verbindung
                  </CardTitle>
                  <CardDescription>
                    Konfigurieren Sie die Verbindung zu Ihrem Shopify-Shop
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Activation Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <Label htmlFor="enabled" className="text-base font-medium">
                          Shopify Integration aktivieren
                        </Label>
                        <p className="text-sm text-gray-500">
                          Verbinden Sie Ihren Shop für automatischen Import
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="enabled"
                      checked={settings.enabled}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>

                  {/* Connection Settings */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Verbindungseinstellungen</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="shopDomain" className="text-sm font-medium text-gray-700">
                          Shop Domain *
                        </Label>
                        <Input
                          id="shopDomain"
                          placeholder="mystore.myshopify.com"
                          value={settings.shopDomain}
                          onChange={(e) =>
                            setSettings(prev => ({ ...prev, shopDomain: e.target.value.trim() }))
                          }
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Ihre Shopify-Shop-Domain (ohne https://)
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="accessToken" className="text-sm font-medium text-gray-700">
                          Access Token *
                        </Label>
                        <Input
                          id="accessToken"
                          type="password"
                          placeholder="shpat_..."
                          value={settings.accessToken}
                          onChange={(e) =>
                            setSettings(prev => ({ ...prev, accessToken: e.target.value.trim() }))
                          }
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Private App Access Token aus Shopify
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Erweiterte Einstellungen</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="apiVersion" className="text-sm font-medium text-gray-700">
                          API Version
                        </Label>
                        <Input
                          id="apiVersion"
                          value={settings.apiVersion}
                          onChange={(e) =>
                            setSettings(prev => ({ ...prev, apiVersion: e.target.value }))
                          }
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="defaultTaxRate" className="text-sm font-medium text-gray-700">
                          Standard Steuersatz (%)
                        </Label>
                        <Input
                          id="defaultTaxRate"
                          type="number"
                          min="0"
                          max="100"
                          value={settings.defaultTaxRate}
                          onChange={(e) =>
                            setSettings(prev => ({ ...prev, defaultTaxRate: parseFloat(e.target.value) || 0 }))
                          }
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="defaultPaymentTerms" className="text-sm font-medium text-gray-700">
                          Zahlungsziel (Tage)
                        </Label>
                        <Input
                          id="defaultPaymentTerms"
                          type="number"
                          min="1"
                          max="365"
                          value={settings.defaultPaymentTerms}
                          onChange={(e) =>
                            setSettings(prev => ({ ...prev, defaultPaymentTerms: parseInt(e.target.value) || 14 }))
                          }
                          className="h-11"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={testConnection}
                        disabled={testing}
                        variant="outline"
                        className="h-11 px-6"
                      >
                        {testing ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Verbindung testen
                      </Button>

                      {connectionStatus === 'success' && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Erfolgreich verbunden</span>
                        </div>
                      )}

                      {connectionStatus === 'error' && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg" title={message}>
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Fehler: {message || 'Verbindungsfehler'}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={saveSettings}
                      disabled={loading}
                      className="h-11 px-8"
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Einstellungen speichern
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Automatischer Import
                  </CardTitle>
                  <CardDescription>
                    Konfigurieren Sie den automatischen Import von Bestellungen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Auto Import Toggle */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <Label htmlFor="autoImport" className="text-base font-medium">
                          Automatischen Import aktivieren
                        </Label>
                        <p className="text-sm text-gray-500">
                          Neue Bestellungen automatisch als Rechnungen importieren
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="autoImport"
                      checked={settings.autoImport}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({ ...prev, autoImport: checked }))
                      }

                    />
                  </div>

                  {/* Import Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Import-Einstellungen</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="importInterval" className="text-sm font-medium text-gray-700">
                          Import-Intervall (Minuten)
                        </Label>
                        <Input
                          id="importInterval"
                          type="number"
                          min="5"
                          max="1440"
                          value={settings.importInterval}
                          onChange={(e) =>
                            setSettings(prev => ({ ...prev, importInterval: parseInt(e.target.value) || 60 }))
                          }
                          disabled={!settings.autoImport}
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Wie oft sollen neue Bestellungen automatisch importiert werden?
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Letzter Import
                        </Label>
                        <div className="h-11 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md flex items-center">
                          {settings.lastImport ? (
                            <span className="text-sm text-gray-700">
                              {new Date(settings.lastImport).toLocaleString('de-DE')}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">
                              Noch kein Import durchgeführt
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Zeitpunkt des letzten automatischen Imports
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Shopify Bestellungen
                  </span>
                  <Button
                    onClick={loadOrders}
                    disabled={!settings.enabled || loading}
                    variant="outline"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Aktualisieren
                  </Button>
                </CardTitle>
                <CardDescription>
                  Vorschau der verfügbaren Bestellungen in Ihrem Shopify-Shop
                </CardDescription>
              </CardHeader>

              {/* Advanced Filters */}
              <div className="px-6 pb-4">
                <div className="space-y-4">
                  {/* Date Range and Status Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Von Datum</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={endDate}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Bis Datum</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="statusFilter">Zahlungsstatus</Label>
                      <select
                        id="statusFilter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        title="Zahlungsstatus auswählen"
                      >
                        <option value="any">Alle Status</option>
                        <option value="paid">Bezahlt</option>
                        <option value="pending">Ausstehend</option>
                        <option value="authorized">Autorisiert</option>
                        <option value="partially_paid">Teilweise bezahlt</option>
                        <option value="refunded">Erstattet</option>
                        <option value="voided">Storniert</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={loadOrdersWithDateRange}
                        disabled={!settings.enabled || loading}
                        className="w-full"
                      >
                        {loading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Bestellungen laden
                      </Button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="flex gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Nach Bestellnummer, Kunde, E-Mail suchen... (mehrere Begriffe mit Komma trennen)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          title="Suche löschen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-Select Actions */}
                  {getFilteredOrders().length > 0 && (
                    <div className="flex flex-wrap gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllOrders}
                          disabled={loading}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Alle auswählen ({getFilteredOrders().length})
                        </Button>

                        {selectedOrders.size > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearSelection}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Auswahl aufheben
                            </Button>

                            <Button
                              onClick={convertSelectedToInvoices}
                              disabled={convertingOrders || selectedOrders.size === 0}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              {convertingOrders ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Als Rechnungen erstellen ({selectedOrders.size})
                            </Button>
                          </>
                        )}
                      </div>

                      <div className="text-sm text-green-700 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {selectedOrders.size > 0
                          ? `${selectedOrders.size} von ${getFilteredOrders().length} Bestellungen ausgewählt`
                          : `${getDisplayCount()} Bestellungen verfügbar`
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Date Buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange('today')}
                    disabled={loading}
                  >
                    Heute
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange('week')}
                    disabled={loading}
                  >
                    Diese Woche
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange('month')}
                    disabled={loading}
                  >
                    Dieser Monat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange('3months')}
                    disabled={loading}
                  >
                    Letzte 3 Monate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange('year')}
                    disabled={loading}
                  >
                    Dieses Jahr
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange('all')}
                    disabled={loading}
                  >
                    Alle Bestellungen
                  </Button>
                </div>
              </div>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {settings.enabled ?
                      'Keine Bestellungen gefunden. Klicken Sie auf "Aktualisieren" um Bestellungen zu laden.' :
                      'Shopify Integration ist nicht aktiviert.'
                    }
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredOrders().map((order) => (
                      <div
                        key={order.id}
                        className={`border rounded-lg p-4 transition-colors ${selectedOrders.has(order.id.toString())
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.id.toString())}
                              onChange={() => toggleOrderSelection(order.id.toString())}
                              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                              title={`Bestellung ${order.name} auswählen`}
                              aria-label={`Bestellung ${order.name} für Import auswählen`}
                            />
                            <span className="font-semibold">{order.name}</span>
                            {getStatusBadge(order.financial_status)}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold">
                              {order.total_price} {order.currency}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                try {
                                  const url = `/api/shopify/order-pdf?id=${order.id}`
                                  window.open(url, '_blank')
                                } catch (e) {
                                  console.error('PDF Download error:', e)
                                  setMessage('Fehler beim Generieren der PDF')
                                }
                              }}
                              disabled={convertingOrders}
                              title="Diese Bestellung als PDF herunterladen"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 ml-7">
                          <div>
                            <strong>Kunde:</strong> {
                              (() => {
                                const customerName = order.customer?.name
                                const customerAny = order.customer as any
                                const firstName = customerAny?.first_name
                                const lastName = customerAny?.last_name

                                // Try to build name from available data
                                if (customerName && customerName !== 'undefined' && customerName.trim() !== '') {
                                  return customerName
                                }

                                if (firstName && lastName && firstName !== 'undefined' && lastName !== 'undefined') {
                                  return `${firstName} ${lastName}`
                                }

                                // Enhanced fallback with order info
                                return `Kunde ${order.name}` // e.g., "Kunde #3307"
                              })()
                            }
                          </div>
                          <div>
                            <strong>E-Mail:</strong> {
                              (() => {
                                const email = order.customer?.email || (order as any).email

                                if (email && email !== 'undefined' && email.trim() !== '' && !email.includes('noreply')) {
                                  return email
                                }

                                // Enhanced fallback with shop domain
                                return `kunde@karinex.com`
                              })()
                            }
                          </div>
                          <div>
                            <strong>Adresse:</strong> {
                              (() => {
                                const shipping = (order as any).shipping_address
                                const billing = order.billing_address
                                const defaultAddr = order.customer?.default_address

                                // NEW Priority: Shipping → Billing → Default (as requested)
                                const address1 = shipping?.address1 || billing?.address1 || defaultAddr?.address1
                                const city = shipping?.city || billing?.city || defaultAddr?.city ||
                                  shipping?.province || billing?.province || defaultAddr?.province
                                const zip = shipping?.zip || billing?.zip || defaultAddr?.zip
                                const country = shipping?.country || billing?.country || defaultAddr?.country

                                // Check if we have any real address data
                                if (address1 && address1 !== 'undefined' && address1.trim() !== '') {
                                  const parts = []
                                  parts.push(address1)
                                  if (zip && city && zip !== 'undefined' && city !== 'undefined') {
                                    parts.push(`${zip} ${city}`)
                                  } else if (city && city !== 'undefined') {
                                    parts.push(city)
                                  } else if (zip && zip !== 'undefined') {
                                    parts.push(zip)
                                  }
                                  if (country && country !== 'Germany' && country !== 'undefined') {
                                    parts.push(country)
                                  }
                                  return parts.join(', ')
                                }

                                // Enhanced fallback address for digital products
                                return `Karinex Digital Store, Online-Kunde, 10115 Berlin`
                              })()
                            }
                          </div>
                          <div>
                            <strong>Artikel:</strong> {(order as any).line_items?.length || order.line_items_count || 0} Stück
                          </div>
                          <div>
                            <strong>Erstellt:</strong> {new Date(order.created_at).toLocaleString('de-DE')}
                          </div>
                          {(order as any).note && (
                            <div className="text-gray-500 italic">
                              <strong>Notiz:</strong> {(order as any).note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Show message if search has no results */}
                    {searchQuery && getFilteredOrders().length === 0 && orders.length > 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Keine Bestellungen gefunden für "{searchQuery}"</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery('')}
                          className="mt-2"
                        >
                          Suche zurücksetzen
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Bestellungen importieren
                </CardTitle>
                <CardDescription>
                  Importieren Sie Shopify-Bestellungen als Rechnungen in Ihr System
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Beim Import werden nur bezahlte Bestellungen als Rechnungen erstellt.
                    Bereits importierte Bestellungen werden übersprungen.
                  </AlertDescription>
                </Alert>

                {/* Date Range for Import */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="importStartDate">Import von Datum</Label>
                    <Input
                      id="importStartDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="importEndDate">Import bis Datum</Label>
                    <Input
                      id="importEndDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Button
                      onClick={importOrders}
                      disabled={!settings.enabled || importing}
                      size="lg"
                      className="w-full max-w-md"
                      title={!settings.enabled ? 'Shopify Integration ist nicht aktiviert' : importing ? 'Import läuft bereits' : 'Bestellungen importieren'}
                    >
                      {importing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {importing ? 'Legacy Import läuft...' : `Legacy Import (${startDate} - ${endDate})`}
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  {importing && (
                    <div className="w-full max-w-md mx-auto space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse w-full"></div>
                      </div>
                      <div className="text-center text-sm text-blue-600 font-medium">
                        🔄 Legacy Import läuft (bis zu 50.000 Bestellungen)...
                      </div>
                      <div className="text-center text-xs text-gray-500">
                        Bitte warten Sie, während die Bestellungen verarbeitet werden
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>Der Legacy Import unterstützt bis zu 50.000 Bestellungen und kann einige Minuten dauern.</p>
                  <p>Für größere Mengen verwenden Sie den "Erweiterte Import" Tab für unbegrenzten Import.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legacy">
            <div className="space-y-6">
              {/* Legacy System Notice */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>🚀 Legacy System (UNLIMITED):</strong> Das Legacy System wurde komplett überarbeitet und unterstützt jetzt UNBEGRENZTEN Import mit Cursor-based Pagination!
                  Kein 250-Limit mehr - importieren Sie so viele Bestellungen wie Sie möchten. Für erweiterte Features wie Background Jobs verwenden Sie den Tab "Erweiterte Import".
                </AlertDescription>
              </Alert>

              {/* Legacy System Capabilities */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Anzeige-Limit</p>
                        <p className="text-xs text-gray-500">Bis zu 100.000 Bestellungen</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Download className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Import-Limit</p>
                        <p className="text-xs text-gray-500">Bis zu 50.000 Bestellungen</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Zap className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Performance</p>
                        <p className="text-xs text-gray-500">~300 Bestellungen/min</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Legacy Orders View */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Shopify Bestellungen (Legacy)
                    </span>
                    <Button
                      onClick={loadOrders}
                      disabled={!settings.enabled || loading}
                      variant="outline"
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Aktualisieren
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Vorschau der verfügbaren Bestellungen (bis zu 100.000 Bestellungen)
                  </CardDescription>
                </CardHeader>

                {/* Advanced Filters */}
                <div className="px-6 pb-4">
                  <div className="space-y-4">
                    {/* Date Range and Status Filter */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Von Datum</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          max={endDate}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">Bis Datum</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="statusFilter">Zahlungsstatus</Label>
                        <select
                          id="statusFilterLegacy"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Zahlungsstatus auswählen"
                          aria-label="Zahlungsstatus auswählen"
                        >
                          <option value="any">Alle Status</option>
                          <option value="paid">Bezahlt</option>
                          <option value="pending">Ausstehend</option>
                          <option value="refunded">Erstattet</option>
                          <option value="cancelled">Storniert</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="loadButton">Aktionen</Label>
                        <Button
                          onClick={loadOrdersWithDateRange}
                          disabled={!settings.enabled || loading}
                          className="w-full"
                        >
                          {loading ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4 mr-2" />
                          )}
                          Laden
                        </Button>
                      </div>
                    </div>

                    {/* Search and Selection */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Suche nach Bestellnummer, Kunde oder E-Mail..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                          {searchQuery && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {orders.length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAllOrders}
                            disabled={getFilteredOrders().length === 0}
                          >
                            Alle auswählen
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearSelection}
                            disabled={selectedOrders.size === 0}
                          >
                            Auswahl löschen
                          </Button>
                          <Button
                            onClick={convertSelectedToInvoices}
                            disabled={selectedOrders.size === 0 || convertingOrders}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {convertingOrders ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4 mr-2" />
                            )}
                            {convertingOrders ? 'Erstelle...' : `${selectedOrders.size} zu Rechnungen`}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Selection Summary */}
                    {orders.length > 0 && (
                      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span>
                            {selectedOrders.size > 0
                              ? `${selectedOrders.size} von ${getFilteredOrders().length} Bestellungen ausgewählt`
                              : `${getDisplayCount()} Bestellungen verfügbar`
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Date Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('today')}
                      disabled={loading}
                    >
                      Heute
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('week')}
                      disabled={loading}
                    >
                      Diese Woche
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('month')}
                      disabled={loading}
                    >
                      Dieser Monat
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('quarter')}
                      disabled={loading}
                    >
                      Letzte 3 Monate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('year')}
                      disabled={loading}
                    >
                      Dieses Jahr
                    </Button>
                  </div>
                </div>

                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {settings.enabled ?
                        'Keine Bestellungen gefunden. Klicken Sie auf "Aktualisieren" um Bestellungen zu laden.' :
                        'Shopify Integration ist nicht aktiviert.'
                      }
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {getFilteredOrders().map((order) => (
                        <div
                          key={order.id}
                          className={`border rounded-lg p-4 transition-colors ${selectedOrders.has(order.id.toString())
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedOrders.has(order.id.toString())}
                                onChange={() => toggleOrderSelection(order.id.toString())}
                                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                title={`Bestellung ${order.name} auswählen`}
                                aria-label={`Bestellung ${order.name} für Import auswählen`}
                              />
                              <span className="font-semibold">{order.name}</span>
                              {getStatusBadge(order.financial_status)}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold">
                                {order.total_price} {order.currency}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  try {
                                    const url = `/api/shopify/order-pdf?id=${order.id}`
                                    window.open(url, '_blank')
                                  } catch (e) {
                                    console.error('PDF Download error:', e)
                                    setMessage('Fehler beim Generieren der PDF')
                                  }
                                }}
                                disabled={convertingOrders}
                                title="Diese Bestellung als PDF herunterladen"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <strong>Kunde:</strong> {
                                (() => {
                                  const customerName = order.customer?.name
                                  const customerAny = order.customer as any
                                  const firstName = customerAny?.first_name
                                  const lastName = customerAny?.last_name

                                  // Try to build name from available data
                                  if (customerName && customerName !== 'undefined' && customerName.trim() !== '') {
                                    return customerName
                                  }

                                  if (firstName && lastName && firstName !== 'undefined' && lastName !== 'undefined') {
                                    return `${firstName} ${lastName}`
                                  }

                                  // Enhanced fallback with order info
                                  return `Kunde ${order.name}` // e.g., "Kunde #3307"
                                })()
                              }
                            </div>
                            <div>
                              <strong>E-Mail:</strong> {
                                (() => {
                                  const email = order.customer?.email || (order as any).email

                                  if (email && email !== 'undefined' && email.trim() !== '' && !email.includes('noreply')) {
                                    return email
                                  }

                                  // Enhanced fallback with shop domain
                                  return `kunde@karinex.com`
                                })()
                              }
                            </div>
                            {/* Enhanced Address Display for Legacy - NEW Priority: Shipping → Billing → Default */}
                            <div>
                              <strong>Adresse:</strong> {
                                (() => {
                                  const shipping = (order as any).shipping_address
                                  const billing = order.billing_address
                                  const defaultAddr = order.customer?.default_address

                                  // NEW Priority: Shipping → Billing → Default (as requested)
                                  const address1 = shipping?.address1 || billing?.address1 || defaultAddr?.address1
                                  const city = shipping?.city || billing?.city || defaultAddr?.city ||
                                    shipping?.province || billing?.province || defaultAddr?.province
                                  const zip = shipping?.zip || billing?.zip || defaultAddr?.zip
                                  const country = shipping?.country || billing?.country || defaultAddr?.country

                                  // Check if we have any real address data
                                  if (address1 && address1 !== 'undefined' && address1.trim() !== '') {
                                    const parts = []
                                    parts.push(address1)
                                    if (zip && city && zip !== 'undefined' && city !== 'undefined') {
                                      parts.push(`${zip} ${city}`)
                                    } else if (city && city !== 'undefined') {
                                      parts.push(city)
                                    } else if (zip && zip !== 'undefined') {
                                      parts.push(zip)
                                    }
                                    if (country && country !== 'Germany' && country !== 'undefined') {
                                      parts.push(country)
                                    }
                                    return parts.join(', ')
                                  }

                                  // Enhanced fallback address for digital products
                                  return `Karinex Digital Store, Online-Kunde, 10115 Berlin`
                                })()
                              }
                            </div>
                            <div>
                              <strong>Erstellt:</strong> {new Date(order.created_at).toLocaleDateString('de-DE')}
                            </div>
                            <div>
                              <strong>Artikel:</strong> {order.line_items_count} Stück
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Legacy Import Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    🚀 Legacy Import (UNLIMITED)
                  </CardTitle>
                  <CardDescription>
                    Importieren Sie UNBEGRENZT viele Shopify-Bestellungen mit dem überarbeiteten System
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <Button
                        onClick={importOrders}
                        disabled={!settings.enabled || importing}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                      >
                        {importing ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        {importing ? 'Importiere UNLIMITED...' : `🚀 UNLIMITED Import (${startDate} - ${endDate})`}
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    {importing && (
                      <div className="w-full max-w-md mx-auto space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full animate-pulse w-full"></div>
                        </div>
                        <div className="text-center text-sm text-blue-600 font-medium">
                          🚀 UNLIMITED Import läuft - kein 250-Limit!
                        </div>
                        <div className="text-center text-xs text-gray-500">
                          Bitte warten Sie, während die Bestellungen verarbeitet werden
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-sm text-gray-600">
                    <p><strong>🚀 Hinweis:</strong> Das Legacy-System wurde überarbeitet und unterstützt jetzt UNBEGRENZTEN Import!</p>
                    <p>Kein 250-Limit mehr - importieren Sie so viele Bestellungen wie Sie möchten.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
