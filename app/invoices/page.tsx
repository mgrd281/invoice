'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eye, Download, Trash2, Plus, Search, Filter, RefreshCw, MailCheck, AlertTriangle, CheckCircle, X, XCircle, DollarSign, FileText, ArrowLeft, Mail, Check, ArrowDown } from 'lucide-react'
import { downloadInvoicePDF } from '@/lib/pdf-generator'
import { useToast } from '@/components/ui/toast'
import { InvoiceActions } from '@/components/invoice-actions'
import { EmailInvoice } from '@/components/email-invoice'
import BulkEmailSender from '@/components/bulk-email-sender'
import CSVExportButton from '@/components/csv-export-button'
import { InvoiceType, ExtendedInvoice } from '@/lib/invoice-types'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'

export default function InvoicesPage() {
  const { user, isAuthenticated } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()

  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk', ids: string[], invoiceNumber?: string }>({ type: 'single', ids: [] })
  const [deleting, setDeleting] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)
  const [deletingByNumber, setDeletingByNumber] = useState<string | null>(null)
  const [emailStatuses, setEmailStatuses] = useState<Record<string, any>>({})
  const [showBulkEmailSender, setShowBulkEmailSender] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [hiddenInvoices, setHiddenInvoices] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const { showToast, ToastContainer } = useToast()

  const [isAutoSyncing, setIsAutoSyncing] = useState(true)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    fetchInvoices()

    // Load hidden invoices from localStorage
    const savedHidden = localStorage.getItem('hiddenInvoices')
    if (savedHidden) {
      try {
        const hiddenIds = JSON.parse(savedHidden)
        setHiddenInvoices(new Set(hiddenIds))
      } catch (error) {
        console.error('Error loading hidden invoices:', error)
      }
    }

    // Listen for invoice updates (e.g., after CSV upload)
    const handleInvoiceUpdate = () => {
      console.log('Invoice update detected, refreshing list...')
      fetchInvoices()
    }

    // Custom event listener for invoice updates
    window.addEventListener('invoicesUpdated', handleInvoiceUpdate)
    window.addEventListener('invoiceUpdated', handleInvoiceUpdate)
    window.addEventListener('invoiceStatusChanged', handleInvoiceUpdate)

    // ---------------------------------------------------------
    // AUTO-SYNC POLLING (Every 10 seconds)
    // ---------------------------------------------------------
    let syncInterval: NodeJS.Timeout

    if (isAuthenticated && isAutoSyncing) {
      console.log('🔄 Starting Auto-Sync polling (every 10s)...')
      syncInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/shopify/auto-sync')
          const data = await res.json()

          setLastSyncTime(new Date())

          if (data.synced > 0) {
            console.log(`✅ Auto-Sync found ${data.synced} new invoices! Refreshing...`)
            showToast(`${data.synced} neue Bestellungen gefunden und importiert!`, 'success')
            fetchInvoices() // Refresh the list
          }
        } catch (err) {
          console.error('Auto-Sync failed:', err)
        }
      }, 10000) // 10 seconds
    }

    return () => {
      window.removeEventListener('invoicesUpdated', handleInvoiceUpdate)
      window.removeEventListener('invoiceUpdated', handleInvoiceUpdate)
      window.removeEventListener('invoiceStatusChanged', handleInvoiceUpdate)
      if (syncInterval) clearInterval(syncInterval)
    }
  }, [isAuthenticated, user, isAutoSyncing])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Bezahlt': return 'bg-green-100 text-green-800'
      case 'Offen': return 'bg-yellow-100 text-yellow-800'
      case 'Überfällig': return 'bg-red-100 text-red-800'
      case 'Storniert': return 'bg-gray-100 text-gray-800'
      case 'Gutschrift': return 'bg-blue-100 text-blue-800'
      case 'Entwurf': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const fetchInvoices = async () => {

    if (!isAuthenticated || !user) {
      console.log('User not authenticated, cannot load invoices')
      setInvoices([])
      setLoading(false)
      return
    }

    try {
      // Fetch invoices for this user only using authenticated fetch
      const response = await authenticatedFetch('/api/invoices')
      const allInvoices = await response.json()

      console.log('Fetched invoices for user:', user.email, 'Count:', allInvoices.length)

      // Fetch email statuses for all invoices
      const emailStatusPromises = allInvoices.map(async (invoice: any) => {
        try {
          const statusResponse = await fetch(`/api/invoices/${invoice.id}/email-status`)
          const statusData = await statusResponse.json()
          return { id: invoice.id, status: statusData.status }
        } catch (error) {
          console.error(`Error fetching email status for invoice ${invoice.id}:`, error)
          return { id: invoice.id, status: { sent: false } }
        }
      })

      const emailStatusResults = await Promise.all(emailStatusPromises)
      const emailStatusMap = emailStatusResults.reduce((acc, { id, status }) => {
        acc[id] = status
        return acc
      }, {} as Record<string, any>)

      setEmailStatuses(emailStatusMap)

      // Only use API data - no local mock data to avoid ID conflicts
      // The API already includes mock/test invoices
      const combinedInvoices = allInvoices

      // Sort invoices by creation date/upload date in descending order (newest first)
      const sortedInvoices = combinedInvoices.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.date || a.uploadedAt || '1970-01-01')
        const dateB = new Date(b.createdAt || b.date || b.uploadedAt || '1970-01-01')
        return dateB.getTime() - dateA.getTime() // Descending order (newest first)
      })

      console.log('Invoices sorted by date (newest first):', sortedInvoices.length)
      setInvoices(sortedInvoices)

    } catch (error) {
      console.error('Error fetching invoices:', error)
      // Fallback to empty array - API should handle mock data
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const [isSearchingShopify, setIsSearchingShopify] = useState(false)

  // Search invoices directly (supports multiple emails, names, and invoice numbers)
  const searchInvoicesByCustomer = async (query: string) => {
    if (!query.trim()) {
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)

    const queryLower = query.toLowerCase().trim()
    console.log(`Searching invoices for: "${queryLower}"`)

    // Split query by common separators (comma, semicolon, space, newline)
    const searchTerms = queryLower
      .split(/[,;|\n\r\t]+/)
      .map(term => term.trim())
      .filter(term => term.length > 0)

    console.log(`Search terms:`, searchTerms)

    // Local Search
    const filteredInvoices = invoices.filter(invoice => {
      // Get all possible customer email fields
      const customerEmail = (
        invoice.customerEmail ||
        invoice.customer?.email ||
        invoice.email ||
        ''
      ).toLowerCase()

      // Get all possible customer name fields  
      const customerName = (
        invoice.customerName ||
        invoice.customer?.name ||
        invoice.name ||
        ''
      ).toLowerCase()

      // Get invoice number
      const invoiceNumber = (invoice.number || invoice.invoiceNumber || '').toLowerCase()
      const orderNumber = (invoice.orderNumber || '').toLowerCase()

      // Check if any search term matches any field
      const hasMatch = searchTerms.some(term => {
        const emailMatch = customerEmail.includes(term)
        const nameMatch = customerName.includes(term)
        const numberMatch = invoiceNumber.includes(term)
        const orderMatch = orderNumber.includes(term)

        return emailMatch || nameMatch || numberMatch || orderMatch
      })

      return hasMatch
    })

    console.log(`Found ${filteredInvoices.length} matching invoices locally`)
    setSearchResults(filteredInvoices)
    setShowSearchResults(true)
    setIsSearching(false)

    // Shopify Search (if query looks like an order number)
    // Check if any term looks like an order number (digits, optionally starting with #)
    const potentialOrderNumber = searchTerms.find(term => /^#?\d+$/.test(term))

    if (potentialOrderNumber) {
      console.log(`🔍 Query "${potentialOrderNumber}" looks like an order number. Searching Shopify...`)
      setIsSearchingShopify(true)

      try {
        const response = await fetch(`/api/shopify/search-order?query=${potentialOrderNumber}`)
        const data = await response.json()

        if (data.found && data.invoice) {
          console.log('✅ Found invoice in Shopify:', data.invoice.number)

          if (data.isNew) {
            showToast(`Bestellung ${data.invoice.orderNumber} gefunden und importiert!`, 'success')

            // Add to invoices list
            setInvoices(prev => [data.invoice, ...prev])

            // Add to search results if not already there
            setSearchResults(prev => {
              if (!prev.find(inv => inv.id === data.invoice.id)) {
                return [data.invoice, ...prev]
              }
              return prev
            })
          } else {
            // If it exists but wasn't found in local search (maybe due to strict filtering?), ensure it's shown
            // But usually local search should have found it. 
            // Maybe we just want to highlight it?
            console.log('Invoice already exists locally.')
          }
        } else {
          console.log('❌ Order not found in Shopify.')
        }
      } catch (error) {
        console.error('Error searching Shopify:', error)
      } finally {
        setIsSearchingShopify(false)
      }
    }
  }

  // Handle search input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchInvoicesByCustomer(searchQuery)
      } else {
        setShowSearchResults(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, invoices])

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setShowSearchResults(false)
    setSearchResults([])
  }

  // Function to hide a mock invoice
  const handleHideInvoice = (invoiceId: string, invoiceNumber: string) => {
    const newHidden = new Set(hiddenInvoices)
    newHidden.add(invoiceId)
    setHiddenInvoices(newHidden)

    // Save to localStorage
    localStorage.setItem('hiddenInvoices', JSON.stringify(Array.from(newHidden)))

    showToast(`Beispiel-Rechnung "${invoiceNumber}" wurde ausgeblendet`, 'success')
  }

  // Function to show hidden invoices
  const handleShowHidden = () => {
    setHiddenInvoices(new Set())
    localStorage.removeItem('hiddenInvoices')
    showToast('Alle ausgeblendeten Rechnungen werden wieder angezeigt', 'success')
  }

  // Filter out hidden invoices
  const visibleInvoices = invoices.filter(invoice => !hiddenInvoices.has(invoice.id))
  const visibleSearchResults = searchResults.filter(invoice => !hiddenInvoices.has(invoice.id))

  // Get displayed invoices (search results or all invoices, filtered by hidden AND status)
  let baseInvoices = showSearchResults ? visibleSearchResults : visibleInvoices

  // Apply status filter if active
  if (statusFilter) {
    baseInvoices = baseInvoices.filter(invoice => invoice.status === statusFilter)
  }

  const displayedInvoices = baseInvoices

  // Function to handle PDF download - FIXED VERSION
  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    console.log('🔄 Starting PDF download for:', invoiceId, invoiceNumber)

    // Skip old method entirely, use new method directly
    try {
      showToast('PDF wird generiert...', 'success')

      // Use new download endpoint with authentication
      const response = await fetch(`/api/invoices/${invoiceId}/download-pdf`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify({
            id: 'admin-123',
            email: 'mgrdegh@web.de',
            firstName: 'Admin',
            lastName: 'User'
          }),
          'Cache-Control': 'no-cache'
        }
      })

      console.log('📥 PDF API Response:', response.status, response.statusText)

      if (response.ok) {
        const blob = await response.blob()
        console.log('📄 PDF Blob size:', blob.size)

        if (blob.size > 100) {
          // Create download
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${invoiceNumber}.pdf`
          a.style.display = 'none'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)

          showToast(`✅ PDF für Rechnung ${invoiceNumber} erfolgreich heruntergeladen!`, 'success')
        } else {
          throw new Error('PDF ist zu klein oder leer')
        }
      } else {
        const errorText = await response.text()
        throw new Error(`Server Error: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('❌ PDF Download Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
      showToast(`Fehler beim PDF Download: ${errorMessage}`, 'error')

      // Fallback: Open direct link in new tab
      try {
        const directUrl = `/api/invoices/${invoiceId}/download-pdf`
        window.open(directUrl, '_blank')
        showToast('PDF wird in neuem Tab geöffnet...', 'success')
      } catch (fallbackError) {
        showToast('Alle Download-Methoden fehlgeschlagen. Bitte Seite neu laden.', 'error')
      }
    }
  }

  // Checkbox handling functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(displayedInvoices.map(invoice => invoice.id))
      setSelectedInvoices(allIds)
    } else {
      setSelectedInvoices(new Set())
    }
  }

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoices)
    if (checked) {
      newSelected.add(invoiceId)
    } else {
      newSelected.delete(invoiceId)
    }
    setSelectedInvoices(newSelected)
  }

  // Delete handling functions
  const handleDeleteSingle = (invoiceId: string, invoiceNumber: string) => {
    setDeleteTarget({ type: 'single', ids: [invoiceId], invoiceNumber })
    setShowDeleteConfirm(true)
  }

  const handleDeleteBulk = () => {
    const selectedIds = Array.from(selectedInvoices)
    setDeleteTarget({ type: 'bulk', ids: selectedIds })
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const endpoint = deleteTarget.type === 'single'
        ? `/api/invoices/${deleteTarget.ids[0]}`
        : '/api/invoices/bulk-delete'

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: deleteTarget.type === 'bulk' ? JSON.stringify({ ids: deleteTarget.ids }) : undefined
      })

      if (response.ok) {
        // Remove deleted invoices from state
        setInvoices(prev => prev.filter(invoice => !deleteTarget.ids.includes(invoice.id)))
        setSelectedInvoices(new Set())

        // Show success message
        const message = deleteTarget.type === 'single'
          ? 'Rechnung gelöscht'
          : `${deleteTarget.ids.length} Rechnungen gelöscht`

        showToast(message, 'success')

      } else {
        const error = await response.json()

        // Handle different error types with specific messages
        if (response.status === 409) {
          if (error.code === 'MOCK_INVOICE') {
            // For mock invoices, offer to hide instead
            const invoiceNumber = deleteTarget.invoiceNumber || 'diese Rechnung'
            const confirmed = window.confirm(
              `Beispiel-/Test-Rechnung kann nicht gelöscht werden.\n\nMöchten Sie "${invoiceNumber}" stattdessen ausblenden?\n\n(Sie können ausgeblendete Rechnungen später wieder einblenden)`
            )
            if (confirmed && deleteTarget.ids.length > 0) {
              handleHideInvoice(deleteTarget.ids[0], invoiceNumber)
            }
          } else if (error.code === 'LOCKED_INVOICE') {
            showToast(`Rechnung kann nicht gelöscht werden: ${error.message}`, 'error')
          } else {
            showToast(`Löschen nicht möglich: ${error.message}`, 'error')
          }
        } else if (response.status === 404) {
          showToast('Rechnung nicht gefunden - möglicherweise bereits gelöscht oder aus Beispieldaten.', 'error')
        } else {
          showToast(`Fehler beim Löschen: ${error.message || 'Unbekannter Fehler'}`, 'error')
        }
      }
    } catch (error) {
      console.error('Delete error:', error)
      showToast('Netzwerkfehler beim Löschen', 'error')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
      setDeleteTarget({ type: 'single', ids: [] })
    }
  }

  const handleDownloadZip = async () => {
    const invoiceIds = selectedInvoices.size > 0
      ? Array.from(selectedInvoices)
      : invoices.map(invoice => invoice.id)

    console.log('Starting ZIP download with IDs:', invoiceIds)

    if (invoiceIds.length === 0) {
      showToast('Keine Rechnungen zum Herunterladen verfügbar', 'error')
      return
    }

    try {
      console.log('Sending request to /api/download-invoices-zip')
      const response = await fetch('/api/download-invoices-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceIds })
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        throw new Error('Failed to download ZIP')
      }

      // Get the ZIP file as blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `Rechnungen_${new Date().toISOString().split('T')[0]}.zip`

      a.download = filename
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      const count = selectedInvoices.size > 0 ? selectedInvoices.size : invoices.length
      showToast(`${count} Rechnungen als ZIP heruntergeladen`, 'success')

    } catch (error) {
      console.error('ZIP download error:', error)
      showToast('Fehler beim Herunterladen der ZIP-Datei', 'error')
    }
  }

  const handleCleanupDuplicates = async () => {
    const confirmed = window.confirm(
      'Duplikate bereinigen?\n\nDies wird alle doppelten Rechnungen entfernen und nur die erste Version jeder Rechnung behalten.\n\nDiese Aktion kann nicht rückgängig gemacht werden.'
    )

    if (!confirmed) {
      return
    }

    setCleaningUp(true)

    try {
      console.log('Starting cleanup of duplicate invoices...')

      const response = await fetch('/api/cleanup-duplicates', {
        method: 'POST'
      })

      console.log('Cleanup response status:', response.status)
      const data = await response.json()
      console.log('Cleanup response data:', data)

      if (response.ok) {
        showToast(`Bereinigung erfolgreich! ${data.duplicatesRemoved} Duplikate entfernt.`, 'success')

        // Refresh the invoice list
        fetchInvoices()
      } else {
        console.error('Cleanup failed:', data)
        showToast(data.message || 'Fehler beim Bereinigen der Duplikate', 'error')
      }
    } catch (error) {
      console.error('Cleanup error:', error)
      showToast('Netzwerkfehler beim Bereinigen der Duplikate', 'error')
    } finally {
      setCleaningUp(false)
    }
  }

  const handleDeleteByNumber = async (invoiceNumber: string) => {
    const confirmed = window.confirm(
      `Alle Rechnungen mit Nummer "${invoiceNumber}" löschen?\n\nDies wird alle Duplikate dieser Rechnung entfernen.\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
    )

    if (!confirmed) {
      return
    }

    setDeletingByNumber(invoiceNumber)

    try {
      console.log('Deleting invoices with number:', invoiceNumber)

      const response = await fetch('/api/delete-invoice-by-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceNumber })
      })

      console.log('Delete by number response status:', response.status)
      const data = await response.json()
      console.log('Delete by number response data:', data)

      if (response.ok) {
        showToast(`${data.deletedCount} Rechnung(en) erfolgreich gelöscht!`, 'success')

        // Refresh the invoice list
        fetchInvoices()
      } else {
        console.error('Delete by number failed:', data)
        showToast(data.message || 'Fehler beim Löschen der Rechnungen', 'error')
      }
    } catch (error) {
      console.error('Delete by number error:', error)
      showToast('Netzwerkfehler beim Löschen der Rechnungen', 'error')
    } finally {
      setDeletingByNumber(null)
    }
  }

  // Function to detect duplicates
  const getDuplicateInvoiceNumbers = () => {
    const numberCounts: { [key: string]: number } = {}
    invoices.forEach(invoice => {
      const number = invoice.number || invoice.invoiceNumber
      numberCounts[number] = (numberCounts[number] || 0) + 1
    })
    return Object.keys(numberCounts).filter(number => numberCounts[number] > 1)
  }


  const duplicateNumbers = getDuplicateInvoiceNumbers()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Rechnungen werden geladen...</p>
        </div>
      </div>
    )
  }

  // Calculate statistics (based on ALL visible invoices, ignoring current filter for the counts themselves)
  // We want the counts to remain static/global based on the search context, not the filter context
  const statsBaseInvoices = showSearchResults ? visibleSearchResults : visibleInvoices
  const totalInvoices = statsBaseInvoices.length
  const paidInvoices = statsBaseInvoices.filter((invoice: any) => invoice.status === 'Bezahlt').length
  const openInvoices = statsBaseInvoices.filter((invoice: any) => invoice.status === 'Offen').length
  const overdueInvoices = statsBaseInvoices.filter((invoice: any) => invoice.status === 'Überfällig').length
  const cancelledInvoices = statsBaseInvoices.filter((invoice: any) => invoice.status === 'Storniert').length
  const refundInvoices = statsBaseInvoices.filter((invoice: any) => invoice.status === 'Gutschrift').length
  const duplicateCount = duplicateNumbers.length

  // Helper function to get invoice type icon and color
  const getInvoiceTypeDisplay = (invoice: any) => {
    if (invoice.type === InvoiceType.CANCELLATION || invoice.status === 'Storniert') {
      return { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600', label: 'Storno' }
    }
    if (invoice.type === InvoiceType.REFUND || invoice.status === 'Gutschrift') {
      return { icon: <DollarSign className="h-4 w-4" />, color: 'text-blue-600', label: 'Gutschrift' }
    }
    return { icon: <FileText className="h-4 w-4" />, color: 'text-gray-600', label: 'Rechnung' }
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
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Rechnungen
                {user?.isAdmin && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full border border-red-200">
                    ADMIN - Alle Rechnungen
                  </span>
                )}
              </h1>
            </div>
            <div className="flex space-x-2">
              {hiddenInvoices.size > 0 && (
                <Button
                  variant="outline"
                  onClick={handleShowHidden}
                  className="text-gray-600 hover:text-gray-700 hover:border-gray-300"
                  title={`${hiddenInvoices.size} ausgeblendete Rechnung(en) wieder anzeigen`}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {hiddenInvoices.size} ausgeblendete anzeigen
                </Button>
              )}
              {selectedInvoices.size > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowBulkEmailSender(true)}
                  className="text-blue-600 hover:text-blue-700 hover:border-blue-300"
                  title={`${selectedInvoices.size} Rechnungen per E-Mail versenden`}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {selectedInvoices.size} E-Mails senden
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDownloadZip}
                className="text-green-600 hover:text-green-700 hover:border-green-300"
                title={selectedInvoices.size > 0 ? `${selectedInvoices.size} ausgewählte Rechnungen herunterladen` : 'Alle Rechnungen herunterladen'}
              >
                <Download className="h-4 w-4 mr-2" />
                {selectedInvoices.size > 0 ? `${selectedInvoices.size} als ZIP` : 'Alle als ZIP'}
              </Button>

              {/* CSV Export Button */}
              <CSVExportButton
                selectedIds={Array.from(selectedInvoices)}
                filters={{
                  searchQuery: showSearchResults ? searchQuery : undefined,
                  displayedInvoices: displayedInvoices.map(inv => inv.id)
                }}
                totalCount={displayedInvoices.length}
                selectedCount={selectedInvoices.size}
                className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
              />

              <Link href="/invoices/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Rechnung
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
                placeholder="Mehrere Suchbegriffe mit Komma trennen: max@email.com, peter@gmail.com, RE001, Anna Schmidt"
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

            {isSearchingShopify && (
              <div className="text-sm text-blue-600 flex items-center animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Suche in Shopify...
              </div>
            )}

            {showSearchResults && (
              <div className="text-sm text-gray-600">
                {searchResults.length} Rechnung(en) gefunden
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
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-8">
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === null ? 'ring-2 ring-blue-500 shadow-md bg-blue-50/50' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter(null)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gesamt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalInvoices}</div>
              <p className="text-xs text-gray-500">Alle Rechnungen</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Offen' ? 'ring-2 ring-yellow-500 shadow-md bg-yellow-50/50' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('Offen')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Offen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{openInvoices}</div>
              <p className="text-xs text-gray-500">Unbezahlt</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Überfällig' ? 'ring-2 ring-red-500 shadow-md bg-red-50/50' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('Überfällig')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Überfällig
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueInvoices}</div>
              <p className="text-xs text-gray-500">Verspätet</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Bezahlt' ? 'ring-2 ring-green-500 shadow-md bg-green-50/50' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('Bezahlt')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Bezahlt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{paidInvoices}</div>
              <p className="text-xs text-gray-500">Abgeschlossen</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Storniert' ? 'ring-2 ring-gray-500 shadow-md bg-gray-50/50' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('Storniert')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Storniert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{cancelledInvoices}</div>
              <p className="text-xs text-gray-500">Stornos</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Gutschrift' ? 'ring-2 ring-blue-500 shadow-md bg-blue-50/50' : 'hover:bg-gray-50'}`}
            onClick={() => setStatusFilter('Gutschrift')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gutschriften
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{refundInvoices}</div>
              <p className="text-xs text-gray-500">Rückerstattungen</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 opacity-70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Duplikate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{duplicateCount}</div>
              <p className="text-xs text-gray-500">Potenziell</p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Alle Rechnungen</CardTitle>
            <CardDescription>
              Übersicht über alle erstellten Rechnungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Bulk Actions Bar */}
            {selectedInvoices.size > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">
                    {selectedInvoices.size} Rechnung{selectedInvoices.size !== 1 ? 'en' : ''} ausgewählt
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteBulk}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ausgewählte löschen ({selectedInvoices.size})
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Alle auswählen"
                    />
                  </TableHead>
                  <TableHead>Rechnungsnummer</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      Datum
                      <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />
                      <span className="text-xs text-gray-500 ml-1">(Neueste zuerst)</span>
                    </div>
                  </TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInvoices.map((invoice) => {
                  const typeDisplay = getInvoiceTypeDisplay(invoice)
                  return (
                    <TableRow
                      key={invoice.id}
                      className={duplicateNumbers.includes(invoice.number) ? 'bg-orange-50 border-l-4 border-l-orange-400' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Rechnung ${invoice.number} auswählen`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {invoice.number}
                          {duplicateNumbers.includes(invoice.number) && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Duplikat
                            </span>
                          )}
                          {invoice.originalInvoiceNumber && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Ref: {invoice.originalInvoiceNumber})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.customerName || invoice.customer?.name || 'Unbekannter Kunde'}
                      </TableCell>
                      <TableCell>
                        {invoice.date ? new Date(invoice.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: invoice.currency || 'EUR' }).format(invoice.amount || invoice.total || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                          {/* E-Mail-Status-Anzeige */}
                          {emailStatuses[invoice.id]?.sent && (
                            <div
                              className="flex items-center text-green-600"
                              title={`E-Mail gesendet am ${new Date(emailStatuses[invoice.id].sentAt).toLocaleDateString('de-DE')} an ${emailStatuses[invoice.id].sentTo}`}
                            >
                              <MailCheck className="h-4 w-4" />
                              <span className="text-xs ml-1">Versendet</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="outline" size="sm" title="Anzeigen">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            title="PDF herunterladen"
                            onClick={() => handleDownloadPdf(invoice.id, invoice.number)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {/* E-Mail-Versand für alle Rechnungstypen */}
                          <EmailInvoice
                            invoice={invoice}
                            onEmailSent={fetchInvoices}
                          />

                          {/* Storno Button für normale Rechnungen */}
                          {(invoice.type === InvoiceType.REGULAR || !invoice.type) && invoice.status !== 'Storniert' && (
                            <Link href={`/invoices/${invoice.id}/cancel`} className="ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Storno-Rechnung erstellen"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}

                          {/* Weitere Aktionen */}
                          {(invoice.type === InvoiceType.REGULAR || !invoice.type) && invoice.status !== 'Storniert' && (
                            <InvoiceActions
                              invoice={invoice}
                              onInvoiceUpdated={fetchInvoices}
                            />
                          )}

                          {duplicateNumbers.includes(invoice.number) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteByNumber(invoice.number)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              disabled={deletingByNumber === invoice.number}
                              title="Alle Duplikate dieser Rechnung löschen"
                            >
                              {deletingByNumber === invoice.number ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-1"></div>
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              )}
                              Duplikate
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSingle(invoice.id, invoice.number)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Rechnung löschen"
                            disabled={deleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Empty State (if no invoices or no search results) */}
        {displayedInvoices.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {showSearchResults ? 'Keine Rechnungen gefunden' : 'Noch keine Rechnungen erstellt'}
              </h3>
              <p className="text-gray-600 mb-6">
                {showSearchResults
                  ? `Keine Rechnungen entsprechen der Suche "${searchQuery}". Versuchen Sie andere Suchbegriffe.`
                  : 'Erstellen Sie Ihre erste Rechnung oder laden Sie CSV-Daten hoch.'
                }
              </p>
              {showSearchResults ? (
                <Button onClick={clearSearch} variant="outline">
                  Suche zurücksetzen
                </Button>
              ) : (
                <div className="flex justify-center space-x-4">
                  <Link href="/invoices/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Neue Rechnung
                    </Button>
                  </Link>
                  <Link href="/upload">
                    <Button variant="outline">
                      CSV hochladen
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {deleteTarget.type === 'single'
                  ? 'Rechnung wirklich löschen?'
                  : `${deleteTarget.ids.length} Rechnungen wirklich löschen?`
                }
              </h3>
              {deleteTarget.type === 'single' && deleteTarget.invoiceNumber && (
                <p className="text-sm text-gray-600 mb-6">
                  Die Rechnung "{deleteTarget.invoiceNumber}" wird unwiderruflich gelöscht.
                </p>
              )}
              {deleteTarget.type === 'bulk' && (
                <p className="text-sm text-gray-600 mb-6">
                  Die ausgewählten {deleteTarget.ids.length} Rechnungen werden unwiderruflich gelöscht.
                </p>
              )}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteTarget({ type: 'single', ids: [] })
                  }}
                  disabled={deleting}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Wird gelöscht...
                    </>
                  ) : (
                    'Ja, löschen'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Komponente für den Massenversand */}
      {showBulkEmailSender && (
        <BulkEmailSender
          selectedInvoices={Array.from(selectedInvoices)}
          onClose={() => setShowBulkEmailSender(false)}
        />
      )}

      <ToastContainer />
    </div>
  )
}
