'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Users,
  Upload,
  TrendingUp,
  Settings,
  ShoppingBag,
  Plus,
  LogOut,
  Euro,
  Calendar,
  CheckCircle,
  Calculator,
  MessageSquare,
  Bot,
  Key,
  DollarSign,
  AlertCircle,
  Shield,
  Package,
  Gift
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { ProtectedRoute } from '@/components/protected-route'

interface DashboardStats {
  totalRevenue: number
  totalInvoices: number
  totalCustomers: number
  paidInvoicesCount: number
  paidInvoicesAmount: number
  openInvoicesCount: number
  openInvoicesAmount: number
  overdueInvoicesCount: number
  overdueInvoicesAmount: number
  refundInvoicesCount: number
  refundInvoicesAmount: number
  cancelledInvoicesCount: number
  cancelledInvoicesAmount: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalInvoices: 0,
    totalCustomers: 0,
    paidInvoicesCount: 0,
    paidInvoicesAmount: 0,
    openInvoicesCount: 0,
    openInvoicesAmount: 0,
    overdueInvoicesCount: 0,
    overdueInvoicesAmount: 0,
    refundInvoicesCount: 0,
    refundInvoicesAmount: 0,
    cancelledInvoicesCount: 0,
    cancelledInvoicesAmount: 0
  })
  const [loading, setLoading] = useState(true)

  // Memoize the data loading function to prevent infinite loops
  const loadDashboardData = useCallback(async () => {
    try {
      console.log('📊 Loading dashboard data from API...')

      // Use authenticated fetch so the API can filter by current user/admin
      const response = await authenticatedFetch('/api/dashboard-stats')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('📦 API Response:', result)

      if (result.success && result.data) {
        console.log('✅ Dashboard data loaded successfully:', result.data)
        setStats(result.data)
      } else {
        console.warn('⚠️ API returned no data:', result)
        // Keep default values if no data available
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error)
      // Keep default values on error
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch])

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (isAuthenticated && user) {
      loadDashboardData()
    }
  }, [isAuthenticated, authLoading, router, user, loadDashboardData])

  const handleLogout = () => {
    logout() // This will redirect to landing page automatically
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Dashboard wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b relative overflow-hidden">
          {/* Beautiful Small Orbs in Header */}
          <div className="absolute top-2 right-20 interactive-orb orb-mini" title="Dashboard Perle"></div>
          <div className="absolute top-4 left-20 interactive-orb orb-tiny" title="Winzige Perle"></div>
          <div className="absolute top-1 right-40 interactive-orb orb-tiny" title="Kleine Perle"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg mr-3">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    RechnungsProfi
                  </h1>
                  <p className="text-xs text-gray-500">Professional Invoice Management</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-gray-700 hover:text-red-600 hover:bg-red-50 border-gray-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {/* Beautiful Small Background Orbs */}
          <div className="absolute top-10 right-10 interactive-orb orb-3" title="Kleine Statistik Perle"></div>
          <div className="absolute top-32 left-8 interactive-orb orb-mini" title="Daten Perle"></div>
          <div className="absolute bottom-20 right-16 interactive-orb orb-5" title="Rosa Perle"></div>
          <div className="absolute bottom-40 left-12 interactive-orb orb-tiny" title="Winzige Info Perle"></div>
          <div className="absolute top-60 right-32 interactive-orb orb-mini" title="Elegante Perle"></div>
          <div className="absolute bottom-60 left-32 interactive-orb orb-tiny" title="Kleine Perle"></div>

          {/* Supporting Particles */}
          <div className="absolute top-16 right-32 particle particle-1"></div>
          <div className="absolute top-48 left-24 particle particle-2"></div>
          <div className="absolute bottom-32 right-40 particle particle-3"></div>
          <div className="absolute bottom-16 left-40 particle particle-4"></div>

          {/* Welcome Section */}
          <div className="mb-8 relative z-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              Willkommen zurück{user ? `, ${user.firstName}` : ''}!
              {user?.isAdmin && (
                <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded-full border border-red-200">
                  ADMIN
                </span>
              )}
            </h2>
            <p className="text-gray-600">
              {user?.isAdmin
                ? 'Admin-Dashboard: Sie können alle Daten im System verwalten.'
                : 'Hier ist eine Übersicht über Ihre Rechnungen und Geschäftstätigkeiten.'
              }
            </p>

            {/* Data Source Info */}
            {stats.totalInvoices > 0 ? (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">
                    Echte Daten geladen: {stats.totalInvoices} Rechnungen, {stats.totalCustomers} Kunden
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-800">
                    Keine Daten vorhanden. Importieren Sie CSV-Dateien oder erstellen Sie Rechnungen.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamtumsatz</CardTitle>
                <Euro className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  €{stats.totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-600">
                  {stats.totalRevenue > 0
                    ? `Aus ${stats.totalInvoices} Rechnungen generiert`
                    : 'Keine Umsätze vorhanden'
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rechnungen gesamt</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalInvoices}</div>
                <p className="text-xs text-gray-600">
                  {stats.totalInvoices > 0
                    ? `${stats.paidInvoicesCount} bezahlt, ${stats.openInvoicesCount} offen`
                    : 'Keine Rechnungen vorhanden'
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bezahlt</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.paidInvoicesCount}</div>
                <p className="text-xs text-gray-600">
                  {stats.totalInvoices > 0 ? Math.round((stats.paidInvoicesCount / stats.totalInvoices) * 100) : 0}% aller Rechnungen
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offen</CardTitle>
                <Calendar className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.openInvoicesCount}</div>
                <p className="text-xs text-gray-600">
                  €{stats.openInvoicesAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} ausstehend
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schnellzugriff</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/invoices/new">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-200">
                  <CardContent className="flex items-center p-6">
                    <div className="bg-blue-100 p-3 rounded-lg mr-4">
                      <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Neue Rechnung</h4>
                      <p className="text-sm text-gray-600">Rechnung erstellen</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/invoices">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-green-200">
                  <CardContent className="flex items-center p-6">
                    <div className="bg-green-100 p-3 rounded-lg mr-4">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Alle Rechnungen</h4>
                      <p className="text-sm text-gray-600">Übersicht anzeigen</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/customers">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-200">
                  <CardContent className="flex items-center p-6">
                    <div className="bg-purple-100 p-3 rounded-lg mr-4">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Kunden</h4>
                      <p className="text-sm text-gray-600">Verwalten</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alle Funktionen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/upload">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">CSV-Import</CardTitle>
                    <CardDescription>
                      Shopify-Bestellungen importieren
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/shopify">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                      <ShoppingBag className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">Shopify Integration</CardTitle>
                    <CardDescription>
                      Shop direkt verbinden
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/buchhaltung">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                      <Calculator className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">Buchhaltung</CardTitle>
                    <CardDescription>
                      Vollständige Buchführung für Steuerberater
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/chat">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-300 bg-gradient-to-br from-white to-purple-50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 relative">
                      <Bot className="h-6 w-6 text-white" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                    </div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      AI-Assistent
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">NEU</span>
                    </CardTitle>
                    <CardDescription>
                      Intelligente Verkaufsanalyse mit GPT-4
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/digital-products">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">Digitale Produkte</CardTitle>
                    <CardDescription>
                      Lizenzschlüssel und Downloads verwalten
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/support">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-300 bg-gradient-to-br from-white to-blue-50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 relative">
                      <MessageSquare className="h-6 w-6 text-white" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      Support Center
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">NEU</span>
                    </CardTitle>
                    <CardDescription>
                      Kundenanfragen und Tickets verwalten
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/analytics/customers">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-orange-300 bg-gradient-to-br from-white to-orange-50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      Kundenanalyse
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">BETA</span>
                    </CardTitle>
                    <CardDescription>
                      Top Kunden, Produkte & Warenkörbe
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/dunning">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-red-300 bg-gradient-to-br from-white to-red-50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center mb-4">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      Mahnwesen
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">AUTO</span>
                    </CardTitle>
                    <CardDescription>
                      Automatische Zahlungserinnerungen & Mahnungen
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/ustva">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-300 bg-gradient-to-br from-white to-blue-50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center mb-4 relative">
                      <Shield className="h-6 w-6 text-white" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                    </div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      UStVA Elster
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">NEU</span>
                    </CardTitle>
                    <CardDescription>
                      Umsatzsteuervoranmeldung direkt an Finanzamt
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/settings/marketing">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-pink-300 bg-gradient-to-br from-white to-pink-50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mb-4">
                      <Gift className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      Marketing
                      <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">AUTO</span>
                    </CardTitle>
                    <CardDescription>
                      Automatische Rabatte und Kundenbindung
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/settings">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mb-4">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">Einstellungen</CardTitle>
                    <CardDescription>
                      Konto und Firma konfigurieren
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>

          {/* Admin Section */}
          {user?.isAdmin && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Administration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/admin">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-red-100 bg-red-50">
                    <CardHeader>
                      <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">Benutzerverwaltung</CardTitle>
                      <CardDescription>
                        Alle Benutzer und Berechtigungen verwalten
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Aktuelle Statistiken</CardTitle>
              <CardDescription>
                Detaillierte Aufschlüsselung Ihrer Rechnungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.paidInvoicesCount > 0 && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover-lift">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                      <span className="text-sm animate-slide-in">{stats.paidInvoicesCount} bezahlte Rechnungen</span>
                    </div>
                    <span className="text-sm font-medium text-green-600 calculator-display">
                      €{stats.paidInvoicesAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {stats.openInvoicesCount > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover-lift">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-3 animate-bounce"></div>
                      <span className="text-sm animate-slide-in">{stats.openInvoicesCount} offene Rechnungen</span>
                    </div>
                    <span className="text-sm font-medium text-orange-600 status-badge-pending">
                      €{stats.openInvoicesAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {stats.overdueInvoicesCount > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover-lift animate-glow">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                      <span className="text-sm animate-slide-in">{stats.overdueInvoicesCount} überfällige Rechnungen</span>
                    </div>
                    <span className="text-sm font-medium text-red-600 status-badge-overdue">
                      €{stats.overdueInvoicesAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {stats.refundInvoicesCount > 0 && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover-lift relative">
                    <div className="absolute top-1 right-1 text-xs animate-invoice-stamp">↩️</div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 animate-float"></div>
                      <span className="text-sm animate-slide-in">{stats.refundInvoicesCount} erstattete Rechnungen</span>
                    </div>
                    <span className="text-sm font-medium text-purple-600 calculator-display">
                      €{stats.refundInvoicesAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {stats.totalInvoices === 0 && (
                  <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg hover-lift">
                    <div className="text-center">
                      <div className="relative">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-float" />
                        <div className="absolute -top-1 -right-1 invoice-paper animate-paper-fly animation-delay-1s opacity-30"></div>
                      </div>
                      <span className="text-sm text-gray-500 animate-slide-in">Keine Rechnungen vorhanden</span>
                      <div className="mt-2 text-xs text-gray-400">
                        <span className="euro-symbol">€</span> Erstellen Sie Ihre erste Rechnung!
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
