'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Users,
  Plus,
  RotateCcw,
  Shield,
  UserX,
  Lock
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DEFAULT_FEATURES } from './features-data'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { ProtectedRoute } from '@/components/protected-route'
import { EnterpriseHeader } from '@/components/layout/enterprise-header'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// New Financial Components
import { FinancialKpiGrid } from '@/components/dashboard/financial/financial-kpi-grid'
import { RevenueTrendsChart } from '@/components/dashboard/financial/revenue-trends-chart'
import { StatusBreakdown } from '@/components/dashboard/financial/status-breakdown'
import { SmartInsightsPanel } from '@/components/dashboard/financial/smart-insights-panel'

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()

  // Financial Data State
  const [financialData, setFinancialData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  // Features State
  const [featuresLoading, setFeaturesLoading] = useState(true)
  const [features, setFeatures] = useState(DEFAULT_FEATURES)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const loadFeatureOrder = async () => {
      if (!isAuthenticated || !user) {
        setFeaturesLoading(false)
        return
      }
      try {
        const response = await authenticatedFetch('/api/user/feature-order')
        if (response.ok) {
          const data = await response.json()
          if (data.featureOrder && Array.isArray(data.featureOrder)) {
            const savedOrder = data.featureOrder
            const reordered = [...DEFAULT_FEATURES].sort((a, b) => {
              const indexA = savedOrder.indexOf(a.id)
              const indexB = savedOrder.indexOf(b.id)
              if (indexA !== -1 && indexB !== -1) return indexA - indexB
              if (indexA !== -1) return -1
              if (indexB !== -1) return 1
              return 0
            })
            setFeatures(reordered)
          }
        }
      } catch (error) {
        console.error('Error loading feature order:', error)
      } finally {
        setFeaturesLoading(false)
      }
    }
    loadFeatureOrder()
  }, [isAuthenticated, user, authenticatedFetch])

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      setFeatures((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)

        const newOrder = newItems.map(item => item.id)
        authenticatedFetch('/api/user/feature-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureOrder: newOrder })
        }).catch(err => console.error('Failed to save order:', err))

        return newItems
      })
    }
  }

  const resetOrder = async () => {
    setFeatures(DEFAULT_FEATURES)
    try {
      await authenticatedFetch('/api/user/feature-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureOrder: DEFAULT_FEATURES.map(f => f.id) })
      })
    } catch (error) {
      console.error('Failed to reset order:', error)
    }
  }

  const loadFinancialData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch(`/api/admin/financial/analytics?period=${period}`)
      const result = await response.json()
      if (result.success) {
        setFinancialData(result.data)
      }
    } catch (error) {
      console.error('Error fetching financial stats:', error)
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch, period])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (isAuthenticated && user) {
      loadFinancialData()
    }
  }, [isAuthenticated, authLoading, router, user, loadFinancialData])

  if (loading && !financialData || authLoading || featuresLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Financial Intelligence...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="pb-[44px] sm:pb-[56px]">
          <EnterpriseHeader />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {/* Welcome Section */}
          <div className="mb-8 relative z-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              Willkommen zurück{user ? `, ${user.firstName}` : ''}!
            </h2>
            <p className="text-gray-600 flex items-center gap-2">
              Hier ist Ihre Financial Intelligence Übersicht.
              <Button
                variant="outline"
                size="sm"
                onClick={loadFinancialData}
                className="ml-4 h-8"
                disabled={loading}
              >
                <RotateCcw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
            </p>
          </div>

          {/* FINANCIAL INTELLIGENCE DASHBOARD */}
          {financialData ? (
            <div className="space-y-6 mb-12 animate-in fade-in duration-500">
              {/* 1. KPIs */}
              <FinancialKpiGrid data={financialData.kpis} />

              {/* 2. Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[400px]">
                <RevenueTrendsChart
                  data={financialData.chartData}
                  period={period}
                  onPeriodChange={setPeriod}
                />
                <StatusBreakdown statusCounts={financialData.statusCounts} />
              </div>

              {/* 3. Insights */}
              <SmartInsightsPanel insights={financialData.insights} />
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 mb-12">
              Keine Finanzdaten verfügbar.
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schnellzugriff</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/invoices/new">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-200">
                  <div className="flex items-center p-6">
                    <div className="bg-blue-100 p-3 rounded-lg mr-4">
                      <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Neue Rechnung</h4>
                      <p className="text-sm text-gray-600">Rechnung erstellen</p>
                    </div>
                  </div>
                </Card>
              </Link>
              <Link href="/invoices">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-green-200">
                  <div className="flex items-center p-6">
                    <div className="bg-green-100 p-3 rounded-lg mr-4">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Alle Rechnungen</h4>
                      <p className="text-sm text-gray-600">Übersicht anzeigen</p>
                    </div>
                  </div>
                </Card>
              </Link>
              <Link href="/customers">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-200">
                  <div className="flex items-center p-6">
                    <div className="bg-purple-100 p-3 rounded-lg mr-4">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Kunden</h4>
                      <p className="text-sm text-gray-600">Verwalten</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Alle Funktionen</h3>
              <Button variant="ghost" size="sm" onClick={resetOrder} className="text-gray-500 hover:text-gray-900">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={features.map(f => f.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {features.map((feature) => (
                    <SortableFeature key={feature.id} feature={feature} />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={null} zIndex={100} style={{ pointerEvents: 'none' }}>
                {activeId ? (
                  <SortableFeature feature={features.find(f => f.id === activeId)!} />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Admin Section */}
          {user?.isAdmin && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Administration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/admin" className="h-full">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-red-100 bg-red-50 h-full flex flex-col">
                    <CardHeader className="flex-1">
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

                <Link href="/blocked-users" className="h-full">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-rose-100 bg-rose-50 h-full flex flex-col">
                    <CardHeader className="flex-1">
                      <div className="w-12 h-12 bg-gradient-to-r from-rose-600 to-red-700 rounded-xl flex items-center justify-center mb-4">
                        <UserX className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">Blockierte Benutzer</CardTitle>
                      <CardDescription>
                        Missbrauch verhindern und Blacklist verwalten
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>

                <Link href="/dashboard/security" className="h-full">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-slate-200 bg-slate-50 h-full flex flex-col">
                    <CardHeader className="flex-1">
                      <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-800 rounded-xl flex items-center justify-center mb-4">
                        <Lock className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">IP-Sperren</CardTitle>
                      <CardDescription>
                        Store-Zugriff für bestimmte IP-Adressen blockieren
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div >
    </ProtectedRoute >
  )
}

function SortableFeature({ feature }: { feature: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: feature.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
    scale: isDragging ? 1.05 : 1,
  }

  const Icon = feature.icon

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full touch-none select-none">
      <Link href={feature.href} onClick={(e) => {
        if (isDragging) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}>
        <Card className={`${feature.cardClass} h-full`}>
          <CardHeader>
            <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center mb-4 relative ${feature.iconShadow || ''}`}>
              <Icon className={`h-6 w-6 ${feature.iconColor || 'text-white'}`} />
              {feature.hasPing && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${feature.pingColor} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${feature.pingDotColor}`}></span>
                </span>
              )}
            </div>
            <CardTitle className="text-xl flex items-center gap-2">
              {feature.title}
              {feature.badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${feature.badgeClass}`}>{feature.badge}</span>
              )}
            </CardTitle>
            <CardDescription>
              {feature.description}
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  )
}
