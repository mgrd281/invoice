'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Users, Plus, Search, X, Trash2, User, Filter,
  ArrowUpDown, MoreHorizontal, Download, Tag
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/layout/page-header'

// New Hub Components
import { CustomerKPIs } from '@/components/customers/customer-kpis'
import { CustomerAnalytics } from '@/components/customers/customer-analytics'
import { CustomerSegments } from '@/components/customers/customer-segments'
import { Customer360Drawer } from '@/components/customers/customer-360-drawer'
import { CustomerEmptyState } from '@/components/customers/customer-empty-state'

function CustomersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [activeSegment, setActiveSegment] = useState('all')
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  const { showToast, ToastContainer } = useToast()
  const { user, isAuthenticated } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()

  useEffect(() => {
    loadData()
  }, [isAuthenticated, user])

  const loadData = async () => {
    if (!isAuthenticated || !user) return
    try {
      const response = await authenticatedFetch('/api/customers')
      const data = await response.json()
      if (data.success) {
        setCustomers(data.customers)
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))

    // Segment filtering logic
    if (activeSegment === 'vip') return matchesSearch && (c.status === 'VIP' || c.ltv > 500)
    if (activeSegment === 'new') return matchesSearch && c.status === 'NEW'
    if (activeSegment === 'inactive') return matchesSearch && c.status === 'INACTIVE'

    return matchesSearch
  })

  const handleRowClick = (customer: any) => {
    setSelectedCustomer(customer)
    setDrawerOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 min-h-screen bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  const actions = (
    <div className="flex items-center gap-3">
      {selectedCustomers.size > 0 && (
        <div className="flex items-center bg-slate-100 rounded-lg p-1 animate-in fade-in zoom-in duration-200">
          <Button variant="ghost" size="sm" className="h-8 text-[11px] font-black uppercase text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Löschen ({selectedCustomers.size})
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button variant="ghost" size="sm" className="h-8 text-[11px] font-black uppercase text-slate-600">
            <Tag className="w-3.5 h-3.5 mr-2" /> Tagging
          </Button>
        </div>
      )}
      <Button variant="outline" size="sm" className="h-10 px-4 font-black text-xs uppercase tracking-widest border-slate-200">
        <Download className="w-4 h-4 mr-2" /> Export CSV
      </Button>
      <Button
        onClick={() => router.push('/customers/new')}
        className="h-10 px-6 font-black text-xs uppercase tracking-widest bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200"
      >
        <Plus className="w-4 h-4 mr-2" /> Neuer Kunde
      </Button>
    </div>
  )

  return (
    <div className="space-y-8 pb-20 bg-[#F8FAFC] min-h-screen animate-in fade-in duration-500">
      <PageHeader
        title="Customer Intelligence Hub"
        subtitle="CRM-analytik und Kundenwert-Optimierung in Echtzeit."
        actions={actions}
      />

      {customers.length === 0 ? (
        <CustomerEmptyState />
      ) : (
        <>
          {/* Zone A: Analysis KPIs */}
          <CustomerKPIs analytics={{ ...analytics, total: customers.length }} />

          {/* Zone B: Growth Analytics */}
          <CustomerAnalytics />

          {/* Zone C: Smart Segments */}
          <CustomerSegments
            segments={analytics?.segments}
            activeSegment={activeSegment}
            onSegmentChange={setActiveSegment}
          />

          {/* Zone D: The Enterprise Table */}
          <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Suche nach Name, E-Mail oder Tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px] h-9 text-[11px] font-black uppercase tracking-tight bg-slate-50 border-none">
                    <Filter className="w-3.5 h-3.5 mr-2" /> Status
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="ltv-desc">
                  <SelectTrigger className="w-[160px] h-9 text-[11px] font-black uppercase tracking-tight bg-slate-50 border-none">
                    <ArrowUpDown className="w-3.5 h-3.5 mr-2" /> Sortieren
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ltv-desc">Höchster LTV</SelectItem>
                    <SelectItem value="date-desc">Neueste Kunden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none">
                    <TableHead className="w-10">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kunde</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tags</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Orders</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">LTV</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Letzter Kauf</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      onClick={() => handleRowClick(customer)}
                      className="group cursor-pointer hover:bg-slate-50/50 transition-colors border-slate-50"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={selectedCustomers.has(customer.id)}
                          onChange={() => {
                            const newSet = new Set(selectedCustomers)
                            if (newSet.has(customer.id)) newSet.delete(customer.id)
                            else newSet.add(customer.id)
                            setSelectedCustomers(newSet)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            {customer.name?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900">{customer.name}</span>
                            <span className="text-[10px] font-bold text-slate-400">{customer.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`
                                                text-[9px] font-black uppercase px-2 h-5 border-none
                                                ${customer.status === 'VIP' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'}
                                            `}>
                          {customer.status || 'AKTIV'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {customer.tags?.slice(0, 2).map((t: string) => (
                            <Badge key={t} variant="secondary" className="text-[9px] font-bold h-5 uppercase tracking-tighter">
                              {t}
                            </Badge>
                          ))}
                          {customer.tags?.length > 2 && <span className="text-[9px] font-bold text-slate-300">+{customer.tags.length - 2}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-black">{customer.orderCount || 0}</TableCell>
                      <TableCell className="text-right text-xs font-black text-slate-900">€{customer.ltv?.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-[10px] font-bold text-slate-400">
                        {customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleRowClick(customer)}>
                              <User className="w-4 h-4 mr-2" /> Einsehen
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Tag className="w-4 h-4 mr-2" /> Tag hinzufügen
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" /> Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      <Customer360Drawer
        customer={selectedCustomer}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      <ToastContainer />
    </div>
  )
}

function Separator({ orientation, className }: any) {
  return <div className={`bg-slate-200 ${orientation === 'vertical' ? 'w-px h-full' : 'h-px w-full'} ${className}`} />
}

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    }>
      <CustomersPageContent />
    </Suspense>
  )
}
