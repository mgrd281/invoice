'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Plus, ArrowLeft, Mail, Phone, Edit, Search, X, Trash2, AlertTriangle, CheckSquare, Square } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
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
  // Function to handle customer editing
  const handleEditCustomer = (customerId: string) => {
    window.location.href = `/customers/${customerId}/edit`
  }

  // Function to view customer invoices
  const handleViewInvoices = (customerId: string) => {
    window.location.href = `/customers/${customerId}/invoices`
  }

  // Function to initiate customer deletion
  const handleDeleteCustomer = (customer: any) => {
    console.log('Initiating delete for customer:', customer.name)
    setDeleteConfirmation({
      isOpen: true,
      customer: customer,
      isDeleting: false
    })
  }

  // Function to confirm customer deletion
  const confirmDeleteCustomer = async () => {
    const { customer } = deleteConfirmation
    if (!customer || !user) return

    setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }))

    try {
      console.log('Deleting customer:', customer.id, 'for user:', user.email)
      
      const response = await authenticatedFetch(`/api/customers?id=${customer.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        showToast(`Kunde "${customer.name}" wurde erfolgreich gelöscht`, 'success')
        
        // Update customers list by removing the deleted customer
        setCustomers(prev => prev.filter(c => c.id !== customer.id))
        
        // Also update search results if showing
        if (showSearchResults) {
          setSearchResults(prev => prev.filter(c => c.id !== customer.id))
        }
        
        // Close confirmation dialog
        setDeleteConfirmation({
          isOpen: false,
          customer: null,
          isDeleting: false
        })
      } else {
        throw new Error(data.error || 'Fehler beim Löschen des Kunden')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      showToast(
        `Fehler beim Löschen von "${customer.name}": ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        'error'
      )
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: false }))
    }
  }

  // Function to cancel customer deletion
  const cancelDeleteCustomer = () => {
    setDeleteConfirmation({
      isOpen: false,
      customer: null,
      isDeleting: false
    })
  }

  // Function to toggle customer selection
  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(customerId)) {
        newSet.delete(customerId)
      } else {
        newSet.add(customerId)
      }
      return newSet
    })
  }

  // Function to toggle select all
  const toggleSelectAll = () => {
    const displayedCustomers = showSearchResults ? searchResults : customers
    if (selectAll) {
      setSelectedCustomers(new Set())
      setSelectAll(false)
    } else {
      setSelectedCustomers(new Set(displayedCustomers.map(c => c.id)))
      setSelectAll(true)
    }
  }

  // Function to initiate bulk deletion
  const handleBulkDelete = () => {
    if (selectedCustomers.size === 0) {
      showToast('Bitte wählen Sie mindestens einen Kunden zum Löschen aus', 'error')
      return
    }
    setBulkDeleteConfirmation({
      isOpen: true,
      isDeleting: false
    })
  }

  // Function to confirm bulk deletion
  const confirmBulkDelete = async () => {
    if (selectedCustomers.size === 0 || !user) return

    setBulkDeleteConfirmation(prev => ({ ...prev, isDeleting: true }))

    try {
      const customerIds = Array.from(selectedCustomers)
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (const customerId of customerIds) {
        try {
          const response = await authenticatedFetch(`/api/customers?id=${customerId}`, {
            method: 'DELETE'
          })
          const data = await response.json()
          
          if (data.success) {
            successCount++
          } else {
            errorCount++
            errors.push(`Kunde ID ${customerId}: ${data.error || 'Unbekannter Fehler'}`)
          }
        } catch (error) {
          errorCount++
          errors.push(`Kunde ID ${customerId}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
        }
      }

      // Update customers list by removing deleted customers
      if (successCount > 0) {
        setCustomers(prev => prev.filter(c => !selectedCustomers.has(c.id)))
        
        // Also update search results if showing
        if (showSearchResults) {
          setSearchResults(prev => prev.filter(c => !selectedCustomers.has(c.id)))
        }
      }

      // Clear selection
      setSelectedCustomers(new Set())
      setSelectAll(false)

      // Show results
      if (successCount > 0 && errorCount === 0) {
        showToast(`${successCount} Kunde(n) erfolgreich gelöscht`, 'success')
      } else if (successCount > 0 && errorCount > 0) {
        showToast(`${successCount} Kunde(n) gelöscht, ${errorCount} Fehler aufgetreten`, 'error')
      } else {
        showToast(`Fehler beim Löschen der Kunden: ${errors.join(', ')}`, 'error')
      }

      // Close confirmation dialog
      setBulkDeleteConfirmation({
        isOpen: false,
        isDeleting: false
      })
    } catch (error) {
      console.error('Error in bulk delete:', error)
      showToast(`Fehler beim Massenlöschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error')
      setBulkDeleteConfirmation(prev => ({ ...prev, isDeleting: false }))
    }
  }

  // Function to cancel bulk deletion
  const cancelBulkDelete = () => {
    setBulkDeleteConfirmation({
      isOpen: false,
      isDeleting: false
    })
  }

  // Load customers on component mount and when user changes
  useEffect(() => {
    loadCustomers()
  }, [isAuthenticated, user])

  // Update selectAll state when selection changes
  useEffect(() => {
    const displayedCustomers = showSearchResults ? searchResults : customers
    if (displayedCustomers.length > 0) {
      const allSelected = displayedCustomers.every(c => selectedCustomers.has(c.id))
      setSelectAll(allSelected)
    } else {
      setSelectAll(false)
    }
  }, [selectedCustomers, customers, searchResults, showSearchResults])

  // Load all customers
  const loadCustomers = async () => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, cannot load customers')
      setCustomers([])
      return
    }

    try {
      console.log('Loading customers from API for user:', user.email)
      
      // Use authenticated fetch to load customers for this user only
      const response = await authenticatedFetch('/api/customers')
      const data = await response.json()
      
      if (data.success) {
        console.log(`Loaded ${data.customers.length} customers for user ${user.email}`)
        setCustomers(data.customers)
      } else {
        console.log('No customers found for user:', user.email)
        setCustomers([])
      }
    } catch (error) {
      console.error('Error loading customers:', error)
      // No fallback data - show empty state
      setCustomers([])
    }
  }

  // Search customers by multiple emails, names, or phone numbers
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    
    // Split query by common separators for multiple search terms
    const searchTerms = query
      .split(/[,;|\n\r\t]+/)
      .map(term => term.trim())
      .filter(term => term.length > 0)
    
    console.log(`Searching customers with ${searchTerms.length} terms:`, searchTerms)
    
    try {
      // Search for each term and combine results
      const allResults = new Map()
      
      for (const term of searchTerms) {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(term)}`)
        const data = await response.json()
        
        if (data.success && data.customers) {
          data.customers.forEach((customer: any) => {
            // Use email as unique key to avoid duplicates
            const key = customer.email?.toLowerCase() || customer.id
            if (!allResults.has(key)) {
              allResults.set(key, customer)
            }
          })
        }
      }
      
      const combinedResults = Array.from(allResults.values())
      console.log(`Found ${combinedResults.length} unique customers from ${searchTerms.length} search terms`)
      
      setSearchResults(combinedResults)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Error searching customers:', error)
      setSearchResults([])
      setShowSearchResults(true)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchCustomers(searchQuery)
      } else {
        setShowSearchResults(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setShowSearchResults(false)
    setSearchResults([])
  }

  // Get displayed customers (search results or all customers)
  const displayedCustomers = showSearchResults ? searchResults : customers

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <Users className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Kunden
                {user?.isAdmin && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full border border-red-200">
                    ADMIN - Alle Kunden
                  </span>
                )}
              </h1>
            </div>
            <div className="flex space-x-2">
              {selectedCustomers.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Massenlöschung ({selectedCustomers.size})</span>
                </Button>
              )}
              <Link href="/customers/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Kunde
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Mehrere Kunden suchen: max@email.com, Anna Schmidt, +49 123, peter@gmail.com"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Suche löschen"
                  aria-label="Suche löschen"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {isSearching && (
              <div className="text-sm text-gray-500">Suche läuft...</div>
            )}
            
            {showSearchResults && (
              <div className="text-sm text-gray-600">
                {searchResults.length} Kunde(n) gefunden
                {searchQuery.includes(',') || searchQuery.includes(';') ? (
                  <span className="ml-1">
                    (Mehrfachsuche: {searchQuery.split(/[,;|\n\r\t]+/).filter(t => t.trim()).length} Begriffe)
                  </span>
                ) : (
                  <span className="ml-1">für "{searchQuery}"</span>
                )}
                {searchResults.length > 0 && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gesamt Kunden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{displayedCustomers.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {showSearchResults ? 'Gefundene Kunden' : 'Aktive Kunden'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{displayedCustomers.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Durchschnittlicher Umsatz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {displayedCustomers.length > 0 
                  ? `€${(displayedCustomers.reduce((sum, customer) => {
                      const amount = parseFloat(customer.totalAmount?.replace('€', '') || '0')
                      return sum + amount
                    }, 0) / displayedCustomers.length).toFixed(2)}`
                  : '€0.00'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {showSearchResults ? `Suchergebnisse (${searchResults.length})` : 'Alle Kunden'}
            </CardTitle>
            <CardDescription>
              {showSearchResults 
                ? `Ergebnisse für "${searchQuery}"`
                : 'Übersicht über alle registrierten Kunden'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayedCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {showSearchResults ? 'Keine Kunden gefunden' : 'Noch keine Kunden registriert'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {showSearchResults 
                    ? `Keine Kunden entsprechen der Suche "${searchQuery}". Versuchen Sie andere Suchbegriffe.`
                    : 'Fügen Sie Ihren ersten Kunden hinzu oder laden Sie CSV-Daten hoch.'
                  }
                </p>
                {showSearchResults ? (
                  <Button onClick={clearSearch} variant="outline">
                    Suche zurücksetzen
                  </Button>
                ) : (
                  <div className="flex justify-center space-x-4">
                    <Link href="/customers/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Neuer Kunde
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="p-0 h-6 w-6"
                      >
                        {selectAll ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Rechnungen</TableHead>
                    <TableHead>Gesamtumsatz</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCustomerSelection(customer.id)}
                          className="p-0 h-6 w-6"
                        >
                          {selectedCustomers.has(customer.id) ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-1" />
                            {customer.phone || 'Nicht verfügbar'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs">
                          {customer.address || 'Nicht verfügbar'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {customer.invoiceCount || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {customer.totalAmount || '€0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditCustomer(customer.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Bearbeiten
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewInvoices(customer.id)}
                          >
                            Rechnungen
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                            title={`Kunde "${customer.name}" löschen`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Kunde löschen
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Sind Sie sicher, dass Sie den Kunden{' '}
                <span className="font-semibold text-gray-900">
                  "{deleteConfirmation.customer?.name}"
                </span>{' '}
                löschen möchten?
              </p>
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              {deleteConfirmation.customer?.invoiceCount > 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  📋 Hinweis: Dieser Kunde hat {deleteConfirmation.customer.invoiceCount} Rechnung(en).
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={cancelDeleteCustomer}
                disabled={deleteConfirmation.isDeleting}
              >
                Abbrechen
              </Button>
              <Button
                onClick={confirmDeleteCustomer}
                disabled={deleteConfirmation.isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteConfirmation.isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Löschen...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {bulkDeleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Massenlöschung bestätigen
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Sind Sie sicher, dass Sie{' '}
                <span className="font-semibold text-gray-900">
                  {selectedCustomers.size} Kunde(n)
                </span>{' '}
                löschen möchten?
              </p>
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <p className="text-sm text-amber-600 mt-2">
                📋 Hinweis: Alle zugehörigen Daten werden ebenfalls gelöscht.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={cancelBulkDelete}
                disabled={bulkDeleteConfirmation.isDeleting}
              >
                Abbrechen
              </Button>
              <Button
                onClick={confirmBulkDelete}
                disabled={bulkDeleteConfirmation.isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {bulkDeleteConfirmation.isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Löschen...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {selectedCustomers.size} Kunde(n) löschen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
