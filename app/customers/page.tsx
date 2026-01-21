'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSafeNavigation } from '@/hooks/use-safe-navigation'
import { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Plus, ArrowLeft, Mail, Phone, Edit, Search, X, Trash2, AlertTriangle, CheckSquare, Square, User, Filter, ArrowUpDown, MoreHorizontal, Tag } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

function CustomersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { navigate } = useSafeNavigation()
  const [customers, setCustomers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // New States for Sorting and Filtering
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: searchParams.get('sort') || 'createdAt',
    direction: (searchParams.get('dir') as 'asc' | 'desc') || 'desc'
  })
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'ALL')

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    customer: any | null
    isDeleting: boolean
  }>({
    isOpen: false,
    customer: null,
    isDeleting: false
  })
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState<{
    isOpen: boolean
    isDeleting: boolean
  }>({
    isOpen: false,
    isDeleting: false
  })
  const { showToast, ToastContainer } = useToast()
  const { user, isAuthenticated } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()

  // Load customers on component mount and when user changes
  useEffect(() => {
    loadCustomers()
  }, [isAuthenticated, user])

  // Update selectAll state when selection changes
  useEffect(() => {
    const displayed = getProcessedCustomers()
    if (displayed.length > 0) {
      const allSelected = displayed.every(c => selectedCustomers.has(c.id))
      setSelectAll(allSelected)
    } else {
      setSelectAll(false)
    }
  }, [selectedCustomers, customers, searchResults, showSearchResults, sortConfig, filterStatus])

  // Load all customers
  const loadCustomers = async () => {
    if (!isAuthenticated || !user) return

    try {
      const response = await authenticatedFetch('/api/customers')
      const data = await response.json()

      if (data.success) {
        setCustomers(data.customers)
      } else {
        setCustomers([])
      }
    } catch (error) {
      console.error('Error loading customers:', error)
      setCustomers([])
    }
  }

  // Search customers
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    const searchTerms = query.split(/[,;|\n\r\t]+/).map(term => term.trim()).filter(term => term.length > 0)

    try {
      const allResults = new Map()
      for (const term of searchTerms) {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(term)}`)
        const data = await response.json()
        if (data.success && data.customers) {
          data.customers.forEach((customer: any) => {
            const key = customer.email?.toLowerCase() || customer.id
            if (!allResults.has(key)) allResults.set(key, customer)
          })
        }
      }
      setSearchResults(Array.from(allResults.values()))
      setShowSearchResults(true)
    } catch (error) {
      console.error('Error searching customers:', error)
      setSearchResults([])
      setShowSearchResults(true)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) searchCustomers(searchQuery)
      else setShowSearchResults(false)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const clearSearch = () => {
    setSearchQuery('')
    setShowSearchResults(false)
    setSearchResults([])
  }

  // Sorting and Filtering Logic
  const getProcessedCustomers = () => {
    let processed = showSearchResults ? searchResults : customers

    // Filter by Status
    if (filterStatus !== 'ALL') {
      processed = processed.filter(c => c.status === filterStatus)
    }

    // Sort
    return [...processed].sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      // Handle special cases
      if (sortConfig.key === 'ltv' || sortConfig.key === 'orderCount') {
        aValue = Number(aValue || 0)
        bValue = Number(bValue || 0)
      } else if (sortConfig.key === 'lastPurchase') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue?.toLowerCase() || ''
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (filterStatus && filterStatus !== 'ALL') params.set('status', filterStatus)
    if (sortConfig.key !== 'createdAt') params.set('sort', sortConfig.key)
    if (sortConfig.direction !== 'desc') params.set('dir', sortConfig.direction)

    const newUrl = `${window.location.pathname}?${params.toString()}`
    if (window.location.search !== (params.toString() ? `?${params.toString()}` : '')) {
      router.replace(newUrl, { scroll: false })
    }
  }, [searchQuery, filterStatus, sortConfig, router])

  const displayedCustomers = getProcessedCustomers()

  // Delete Handlers
  const handleDeleteCustomer = (customer: any) => {
    setDeleteConfirmation({ isOpen: true, customer, isDeleting: false })
  }

  const confirmDeleteCustomer = async () => {
    const { customer } = deleteConfirmation
    if (!customer || !user) return
    setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }))
    try {
      const response = await authenticatedFetch(`/api/customers?id=${customer.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        showToast(`Kunde "${customer.name}" gelöscht`, 'success')
        setCustomers(prev => prev.filter(c => c.id !== customer.id))
        if (showSearchResults) setSearchResults(prev => prev.filter(c => c.id !== customer.id))
        setDeleteConfirmation({ isOpen: false, customer: null, isDeleting: false })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      showToast('Fehler beim Löschen', 'error')
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const handleBulkDelete = () => {
    if (selectedCustomers.size === 0) return
    setBulkDeleteConfirmation({ isOpen: true, isDeleting: false })
  }

  const confirmBulkDelete = async () => {
    if (selectedCustomers.size === 0 || !user) return
    setBulkDeleteConfirmation(prev => ({ ...prev, isDeleting: true }))
    try {
      const customerIds = Array.from(selectedCustomers)
      let successCount = 0
      for (const id of customerIds) {
        const response = await authenticatedFetch(`/api/customers?id=${id}`, { method: 'DELETE' })
        const data = await response.json()
        if (data.success) successCount++
      }
      if (successCount > 0) {
        setCustomers(prev => prev.filter(c => !selectedCustomers.has(c.id)))
        if (showSearchResults) setSearchResults(prev => prev.filter(c => !selectedCustomers.has(c.id)))
        showToast(`${successCount} Kunden gelöscht`, 'success')
        setSelectedCustomers(new Set())
        setSelectAll(false)
      }
      setBulkDeleteConfirmation({ isOpen: false, isDeleting: false })
    } catch (error) {
      showToast('Fehler bei Massenlöschung', 'error')
      setBulkDeleteConfirmation(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedCustomers(new Set())
      setSelectAll(false)
    } else {
      setSelectedCustomers(new Set(displayedCustomers.map(c => c.id)))
      setSelectAll(true)
    }
  }

  // Helper for Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Aktiv</Badge>
      case 'INACTIVE': return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200">Inaktiv</Badge>
      case 'VIP': return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200">VIP</Badge>
      case 'NEW': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">Neu</Badge>
      default: return <Badge variant="outline">Unbekannt</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 backdrop-blur-xl bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Kunden
                  <Badge variant="secondary" className="rounded-full px-2.5">{customers.length}</Badge>
                </h1>
                <p className="text-sm text-gray-500">Verwalten Sie Ihre Kundenbeziehungen</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {selectedCustomers.size > 0 && (
                <Button variant="destructive" onClick={handleBulkDelete} size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen ({selectedCustomers.size})
                </Button>
              )}
              <Link href="/customers/new">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Kunde
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm border-none bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Gesamt Kunden</p>
                  <h3 className="text-2xl font-bold mt-2">{customers.length}</h3>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-none bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Aktive Kunden</p>
                  <h3 className="text-2xl font-bold mt-2 text-green-600">
                    {customers.filter(c => c.status === 'ACTIVE' || !c.status).length}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <User className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-none bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">VIP Kunden</p>
                  <h3 className="text-2xl font-bold mt-2 text-purple-600">
                    {customers.filter(c => c.status === 'VIP').length}
                  </h3>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-none bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ø Umsatz (LTV)</p>
                  <h3 className="text-2xl font-bold mt-2 text-indigo-600">
                    {customers.length > 0
                      ? `€${(customers.reduce((sum, c) => sum + (c.ltv || 0), 0) / customers.length).toFixed(2)}`
                      : '€0.00'}
                  </h3>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Suchen nach Name, E-Mail, Tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle Status</SelectItem>
                <SelectItem value="ACTIVE">Aktiv</SelectItem>
                <SelectItem value="NEW">Neu</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="INACTIVE">Inaktiv</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortConfig.key}-${sortConfig.direction}`} onValueChange={(val) => {
              const [key, direction] = val.split('-')
              setSortConfig({ key, direction: direction as 'asc' | 'desc' })
            }}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Sortieren" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Neueste zuerst</SelectItem>
                <SelectItem value="createdAt-asc">Älteste zuerst</SelectItem>
                <SelectItem value="ltv-desc">Höchster Umsatz</SelectItem>
                <SelectItem value="orderCount-desc">Meiste Bestellungen</SelectItem>
                <SelectItem value="lastPurchase-desc">Letzter Kauf</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card className="shadow-sm border-none overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="w-12">
                    <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="p-0 h-6 w-6">
                      {selectAll ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-gray-400" />}
                    </Button>
                  </TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Bestellungen</TableHead>
                  <TableHead className="text-right">LTV (Umsatz)</TableHead>
                  <TableHead className="text-right">Letzter Kauf</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-gray-500">
                      Keine Kunden gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => toggleCustomerSelection(customer.id)} className="p-0 h-6 w-6">
                          {selectedCustomers.has(customer.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-gray-400" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link href={`/customers/${customer.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {customer.name}
                          </Link>
                          <span className="text-xs text-gray-500">{customer.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.tags && customer.tags.length > 0 ? (
                            customer.tags.slice(0, 2).map((tag: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {customer.tags && customer.tags.length > 2 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">+{customer.tags.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{customer.orderCount || 0}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        €{(customer.ltv || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-gray-500 text-sm">
                        {customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString('de-DE') : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                            <Link href={`/customers/${customer.id}`}>
                              <DropdownMenuItem>
                                <User className="h-4 w-4 mr-2" /> Profil ansehen
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/customers/${customer.id}/edit`}>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" /> Bearbeiten
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteCustomer(customer)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Delete Dialogs */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Kunde löschen?</h3>
            <p className="text-gray-600 mb-6">
              Möchten Sie <b>{deleteConfirmation.customer?.name}</b> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmation({ isOpen: false, customer: null, isDeleting: false })}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={confirmDeleteCustomer} disabled={deleteConfirmation.isDeleting}>
                {deleteConfirmation.isDeleting ? 'Löscht...' : 'Löschen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Massenlöschung</h3>
            <p className="text-gray-600 mb-6">
              Möchten Sie <b>{selectedCustomers.size} Kunden</b> wirklich löschen?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setBulkDeleteConfirmation({ isOpen: false, isDeleting: false })}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={confirmBulkDelete} disabled={bulkDeleteConfirmation.isDeleting}>
                {bulkDeleteConfirmation.isDeleting ? 'Löscht...' : 'Alle löschen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Kunden...</p>
        </div>
      </div>
    }>
      <CustomersPageContent />
    </Suspense>
  )
}
