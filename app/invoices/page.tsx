'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
// ... other imports
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
<<<<<<< HEAD
import { Eye, Download, Trash2, Plus, Search, Filter, RefreshCw, MailCheck, AlertTriangle, CheckCircle, X, XCircle, DollarSign, FileText, ArrowLeft, Mail, Check, ArrowDown, Edit2, Edit, Save, Calculator, Bell, AlertOctagon, AlertCircle, Send, Volume2, VolumeX, ShieldAlert, UserX } from 'lucide-react'
=======
import { Eye, Download, Trash2, Plus, Search, Filter, RefreshCw, MailCheck, AlertTriangle, CheckCircle, X, XCircle, DollarSign, FileText, ArrowLeft, Mail, Check, ArrowDown, Edit2, Edit, Save, Calculator, Bell, AlertOctagon, AlertCircle, Send } from 'lucide-react'
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
import { downloadInvoicePDF } from '@/lib/pdf-generator'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { InvoiceActions } from '@/components/invoice-actions'
import { EmailInvoice } from '@/components/email-invoice'
import BulkEmailSender from '@/components/bulk-email-sender'
import CSVExportButton from '@/components/csv-export-button'
import { CustomerHistoryDrawer } from '@/components/customer-history-drawer'
import { InvoiceType, ExtendedInvoice } from '@/lib/invoice-types'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import { BarChart3 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'

function getPaymentMethodDisplay(method: string | undefined) {
  if (!method) return <span className="text-gray-400">-</span>

  let label = method
  let className = "bg-gray-100 text-gray-800"

  const lowerMethod = method.toLowerCase()

  if (lowerMethod.includes('paypal')) {
    label = 'PayPal'
    className = "bg-[#003087]/10 text-[#003087]"
  } else if (lowerMethod.includes('credit') || lowerMethod.includes('kredit')) {
    label = 'Kreditkarte'
    className = "bg-purple-100 text-purple-800"
  } else if (lowerMethod.includes('klarna')) {
    label = 'Klarna'
    className = "bg-pink-100 text-pink-800"
  } else if (lowerMethod.includes('sofort')) {
    label = 'Sofort'
    className = "bg-orange-100 text-orange-800"
  } else if (lowerMethod.includes('amazon')) {
    label = 'Amazon Pay'
    className = "bg-cyan-100 text-cyan-800"
  } else if (lowerMethod === 'manual' || lowerMethod === 'custom') {
    label = 'Vorkasse'
    className = "bg-yellow-100 text-yellow-800"
  } else if (lowerMethod.includes('vorkasse')) {
    label = 'Vorkasse'
    className = "bg-yellow-100 text-yellow-800"
  } else if (lowerMethod.includes('rechnung')) {
    label = 'Rechnung'
    className = "bg-yellow-100 text-yellow-800"
  } else if (lowerMethod.includes('shopify')) {
    label = 'Shopify Payments'
    className = "bg-green-100 text-green-800"
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function getGermanStatus(status: string) {
  if (!status) return ''
  const s = status.toUpperCase()
  switch (s) {
    case 'PAID': return 'Bezahlt'
    case 'SENT': return 'Versendet'
    case 'DRAFT': return 'Entwurf'
    case 'OVERDUE': return 'Überfällig'
    case 'CANCELLED': return 'Storniert'
    case 'OPEN': return 'Offen'
    case 'PENDING': return 'Ausstehend'
<<<<<<< HEAD
    case 'BLOCKED': return 'Gesperrt'
    case 'ON_HOLD': return 'In Prüfung'
=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
    default: return status
  }
}

export default function InvoicesPage() {
<<<<<<< HEAD
  // Persistent audio reference to bypass autoplay policies
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [isSoundEnabled, setIsSoundEnabled] = useState(false) // Start disabled - requires user interaction
  const [isAudioBlessed, setIsAudioBlessed] = useState(false) // Track if audio context is activated
  const [soundError, setSoundError] = useState<string>('')

  // Don't initialize audio on page load - wait for user interaction

  // Helper: Try to unlock audio context
  const unlockAudioContext = useCallback(async () => {
    try {
      // Try Web Audio API approach
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContext) {
          audioContextRef.current = new AudioContext()
        }
      }

      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
        console.log('✅ Audio Context resumed')
      }

      return true
    } catch (e) {
      console.error('Audio Context unlock failed:', e)
      return false
    }
  }, [])

  const playNotificationSound = useCallback(() => {
    // Only play if sound is enabled AND audio context has been blessed by user interaction
    if (!isSoundEnabled || !audioRef.current || !isAudioBlessed) {
      if (!isAudioBlessed && isSoundEnabled) {
        console.warn('⚠️ Sound enabled but audio context not blessed. User needs to click sound button first.')
      }
      return
    }

    // Reset time to allow rapid replay
    audioRef.current.currentTime = 0
    const playPromise = audioRef.current.play()

    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Sound playback failed:', error)
        // If playback fails, reset blessed state
        setIsAudioBlessed(false)
        setIsSoundEnabled(false)
      })
    }
  }, [isSoundEnabled, isAudioBlessed])


=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
  const { user, isAuthenticated } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()

  // State definitions
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

  // Pagination State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50) // Default limit set to 50 as requested
  const [totalPages, setTotalPages] = useState(1)
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0)
  const [vat19Sum, setVat19Sum] = useState(0)
  const [vat7Sum, setVat7Sum] = useState(0)
  const [totalPaidAmount, setTotalPaidAmount] = useState(0)

  // Stats Counts State
  const [paidInvoicesCount, setPaidInvoicesCount] = useState(0)
  const [openInvoicesCount, setOpenInvoicesCount] = useState(0)
  const [overdueInvoicesCount, setOverdueInvoicesCount] = useState(0)
  const [cancelledInvoicesCount, setCancelledInvoicesCount] = useState(0)
  const [refundInvoicesCount, setRefundInvoicesCount] = useState(0)

  const [isAutoSyncing, setIsAutoSyncing] = useState(true)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  // Date Filter State
  const [dateRange, setDateRange] = useState<{ from: string | null, to: string | null }>(() => {
    const today = new Date().toISOString().split('T')[0]
    return { from: today, to: today }
  })



  // Bulk Actions State
  const [showBulkStatusUpdate, setShowBulkStatusUpdate] = useState(false)

  // Accountant Export
  const [showAccountantDialog, setShowAccountantDialog] = useState(false)
  const [accountantEmail, setAccountantEmail] = useState('')
  const [sendingAccountant, setSendingAccountant] = useState(false)

  // Filter states
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('')
  const [filterMinAmount, setFilterMinAmount] = useState<string>('')
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('')
  const [filterNewCustomers, setFilterNewCustomers] = useState(false)
  const [filterUnsent, setFilterUnsent] = useState(false)
  const [filterDuplicates, setFilterDuplicates] = useState(false)

  // Customer History Drawer State
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Abort controller ref to cancel previous requests
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleCustomerClick = (email: string) => {
    if (!email) return
    setSelectedCustomerEmail(email)
    setIsDrawerOpen(true)
  }

  const fetchInvoices = useCallback(async (isBackground = false) => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, cannot load invoices')
      setInvoices([])
      setLoading(false)
      return
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Set timeout to avoid hanging requests (15 seconds)
    const timeoutId = setTimeout(() => {
      console.log('Fetch timed out, aborting...')
      abortController.abort()
    }, 15000)

    if (!isBackground) {
      // Only set main loading if not searching (to avoid full screen spinner on search)
      if (!isSearching) setLoading(true)
    }

    try {
      // Build query string
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (debouncedSearchQuery) {
        queryParams.append('search', debouncedSearchQuery)
      }

      if (dateRange.from) queryParams.append('from', dateRange.from)
      if (dateRange.to) queryParams.append('to', dateRange.to)

      // Advanced Filters
      if (filterPaymentMethod && filterPaymentMethod !== 'all') queryParams.append('paymentMethod', filterPaymentMethod)
      if (filterMinAmount) queryParams.append('minAmount', filterMinAmount)
      if (filterMaxAmount) queryParams.append('maxAmount', filterMaxAmount)
      if (filterNewCustomers) queryParams.append('newCustomers', 'true')

      // Fetch invoices for this user only using authenticated fetch with pagination and search
      const response = await authenticatedFetch(`/api/invoices?${queryParams.toString()}`, {
        signal: abortController.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Handle new response format
      const allInvoices = data.invoices || []
      const pagination = data.pagination || { total: 0, pages: 1, page: 1, limit: 20 }

      // Set stats from API
      if (data.stats) {
        setVat19Sum(typeof data.stats.totalVat19 === 'number' ? data.stats.totalVat19 : 0)
        setVat7Sum(typeof data.stats.totalVat7 === 'number' ? data.stats.totalVat7 : 0)
        setTotalPaidAmount(typeof data.stats.totalPaidAmount === 'number' ? data.stats.totalPaidAmount : 0)

        // Set counts
        setPaidInvoicesCount(typeof data.stats.paidInvoicesCount === 'number' ? data.stats.paidInvoicesCount : 0)
        setOpenInvoicesCount(typeof data.stats.openInvoicesCount === 'number' ? data.stats.openInvoicesCount : 0)
        setOverdueInvoicesCount(typeof data.stats.overdueInvoicesCount === 'number' ? data.stats.overdueInvoicesCount : 0)
        setCancelledInvoicesCount(typeof data.stats.cancelledInvoicesCount === 'number' ? data.stats.cancelledInvoicesCount : 0)
        setRefundInvoicesCount(typeof data.stats.refundInvoicesCount === 'number' ? data.stats.refundInvoicesCount : 0)
      } else {
        setVat19Sum(0)
        setVat7Sum(0)
        setTotalPaidAmount(0)
        setPaidInvoicesCount(0)
        setOpenInvoicesCount(0)
        setOverdueInvoicesCount(0)
        setCancelledInvoicesCount(0)
        setRefundInvoicesCount(0)
      }

      setTotalPages(pagination.pages)
      setTotalInvoicesCount(pagination.total)

      console.log('Fetched invoices for user:', user.email, 'Count:', allInvoices.length, 'Page:', page)

      // Extract email statuses from the invoices directly
      const emailStatusMap = allInvoices.reduce((acc: Record<string, any>, invoice: any) => {
        if (invoice.emailStatus) {
          acc[invoice.id] = invoice.emailStatus
        } else {
          acc[invoice.id] = { sent: false }
        }
        return acc
      }, {})

      setEmailStatuses(emailStatusMap)

      // Only use API data - no local mock data to avoid ID conflicts
      // The API already includes mock/test invoices
      const combinedInvoices = allInvoices

      // Sort invoices by creation date/upload date in descending order (newest first)
      // Note: Backend already sorts, but we can keep client-side sort if needed for mixed data
      const sortedInvoices = combinedInvoices.sort((a: any, b: any) => {
        const dateA = new Date(a.date || a.createdAt || a.uploadedAt || '1970-01-01').getTime()
        const dateB = new Date(b.date || b.createdAt || b.uploadedAt || '1970-01-01').getTime()

        if (dateB !== dateA) {
          return dateB - dateA // Sort by date descending
        }

        // If dates are equal, sort by invoice number descending
        const numA = a.number || a.invoiceNumber || ''
        const numB = b.number || b.invoiceNumber || ''
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' })
      })

      console.log('Invoices sorted by date (newest first):', sortedInvoices.length)
      setInvoices(sortedInvoices)

      // Update search results state if we are searching
      if (debouncedSearchQuery) {
        setSearchResults(sortedInvoices)
        setShowSearchResults(true)
      } else {
        setShowSearchResults(false)
      }

    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        console.log('Fetch aborted')
        return
      }
      console.error('Error fetching invoices:', error)
      // Fallback to empty array - API should handle mock data
      setInvoices([])
      showToast('Fehler beim Laden der Rechnungen', 'error')
    } finally {
      // Only set loading false if this request wasn't aborted and we were loading
      if (abortControllerRef.current === abortController) {
        if (!isBackground) setLoading(false)
        setIsSearching(false) // Stop search loading indicator
      }
    }
  }, [isAuthenticated, user?.email, page, limit, debouncedSearchQuery, dateRange, filterPaymentMethod, filterMinAmount, filterMaxAmount, filterNewCustomers]) // Add filters to dependencies

  // Listen for invoice updates (e.g., after CSV upload)
  const handleInvoiceUpdate = useCallback(() => {
    console.log('Invoice update detected, refreshing list...')
    fetchInvoices(true) // Background update
  }, [fetchInvoices])

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

  // Handle date range changes
  useEffect(() => {
    if (dateRange.from || dateRange.to) {
      setLimit(250) // Increase limit when filtering by date
      setPage(1)
    }
  }, [dateRange])

  // Custom event listener for invoice updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('invoicesUpdated', handleInvoiceUpdate)
      window.addEventListener('invoiceUpdated', handleInvoiceUpdate)
      window.addEventListener('invoiceStatusChanged', handleInvoiceUpdate)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('invoicesUpdated', handleInvoiceUpdate)
        window.removeEventListener('invoiceUpdated', handleInvoiceUpdate)
        window.removeEventListener('invoiceStatusChanged', handleInvoiceUpdate)
      }
    }
  }, [handleInvoiceUpdate])

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

    // ---------------------------------------------------------
    // AUTO-SYNC POLLING (Every 30 seconds)
    // ---------------------------------------------------------
    let syncInterval: NodeJS.Timeout

    if (isAuthenticated && isAutoSyncing) {
      console.log('🔄 Starting Auto-Sync polling (every 30s)...')
      syncInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/shopify/auto-sync')
          const data = await res.json()

          setLastSyncTime(new Date())

          if (data.synced > 0) {
            console.log(`✅ Auto-Sync found ${data.synced} new invoices! Refreshing...`)
            showToast(`${data.synced} neue Bestellungen gefunden und importiert!`, 'success')
<<<<<<< HEAD

            // Play Notification Sound
            playNotificationSound()

=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
            fetchInvoices(true) // Refresh the list in background
          }
        } catch (err) {
          console.error('Auto-Sync failed:', err)
        }
      }, 30000) // 30 seconds for reduced load
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchInvoices, isAutoSyncing, isAuthenticated])


  // Bulk Status Update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedInvoices.size === 0) return

    try {
      showToast(`Aktualisiere Status für ${selectedInvoices.size} Rechnungen...`, 'info')

      const response = await authenticatedFetch('/api/invoices/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'updateStatus',
          ids: Array.from(selectedInvoices),
          status: newStatus
        })
      })

      if (response.ok) {
        showToast('Status erfolgreich aktualisiert', 'success')
        fetchInvoices(true)
        setSelectedInvoices(new Set())
        setShowBulkStatusUpdate(false)
      } else {
        throw new Error('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Fehler beim Aktualisieren des Status', 'error')
    }
  }

  // Handle search input change with debouncing (reset page to 1 on search)
  useEffect(() => {
    // If search query changes, set isSearching to true immediately (visual feedback)
    if (searchQuery !== debouncedSearchQuery) {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true)
      }

      const timeoutId = setTimeout(() => {
        setPage(1) // Reset to first page on new search
        setDebouncedSearchQuery(searchQuery)
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [searchQuery, debouncedSearchQuery])

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
  }

  // Function to hide a mock invoice
  const handleHideInvoice = (invoiceId: string, invoiceNumber: string) => {
    const newHidden = new Set(hiddenInvoices)
    newHidden.add(invoiceId)
    setHiddenInvoices(newHidden)

    // Save to localStorage
    localStorage.setItem('hiddenInvoices', JSON.stringify(Array.from(newHidden)))

    showToast(`Beispiel - Rechnung "${invoiceNumber}" wurde ausgeblendet`, 'success')
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

  // Client-side Advanced Filters
  if (filterUnsent) {
    baseInvoices = baseInvoices.filter(inv => !emailStatuses[inv.id]?.sent)
  }
  if (filterDuplicates) {
    const dups = getDuplicateInvoiceNumbers()
    baseInvoices = baseInvoices.filter(inv => dups.includes(inv.number))
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

    setIsDownloadingZip(true)
    // Show a toast if it takes longer than 1 second (simulated by just showing it, user perception handles the rest)
    // or we can use a timeout to show it only if it's slow.
    // For now, let's show a "Preparing" toast immediately which is good UX.
    const loadingToastId = setTimeout(() => {
      showToast('ZIP-Datei wird erstellt... Bitte warten', 'info')
    }, 1000)

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
      clearTimeout(loadingToastId) // Clear the loading toast timer if it finished fast
      showToast(`${count} Rechnungen als ZIP heruntergeladen`, 'success')

    } catch (error) {
      console.error('ZIP download error:', error)
      showToast('Fehler beim Herunterladen der ZIP-Datei', 'error')
    } finally {
      clearTimeout(loadingToastId)
      setIsDownloadingZip(false)
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

  // Use total count from API if available (for pagination/filtering), otherwise fallback to loaded length
  const totalInvoices = totalInvoicesCount > 0 ? totalInvoicesCount : statsBaseInvoices.length

  // Note: These counts are now fetched from the API for accuracy across all pages
  const paidInvoices = paidInvoicesCount
  const openInvoices = openInvoicesCount
  const overdueInvoices = overdueInvoicesCount
  const cancelledInvoices = cancelledInvoicesCount
  const refundInvoices = refundInvoicesCount
  const duplicateCount = duplicateNumbers.length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Bezahlt': return 'bg-green-100 text-green-800'
      case 'Offen': return 'bg-yellow-100 text-yellow-800'
      case 'Überfällig': return 'bg-red-100 text-red-800'
      case 'Storniert': return 'bg-gray-100 text-gray-800'
      case 'Gutschrift': return 'bg-blue-100 text-blue-800'
      case 'Entwurf': return 'bg-gray-100 text-gray-600'
<<<<<<< HEAD
      case 'Gesperrt':
      case 'BLOCKED': return 'bg-red-800 text-white'
      case 'In Prüfung':
      case 'ON_HOLD': return 'bg-orange-100 text-orange-800'
=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
      default: return 'bg-gray-100 text-gray-600'
    }
  }

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
                    ADMIN
                  </span>
                )}
              </h1>
            </div>
            <div className="flex space-x-2">
<<<<<<< HEAD
              <Link href="/blocked-users">
                <Button variant="outline" className="text-red-700 hover:text-red-800 hover:bg-red-50 hover:border-red-200">
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Blocklist
                </Button>
              </Link>
=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
              <Button
                variant={showAnalytics ? "secondary" : "outline"}
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="text-gray-600 hover:text-gray-700 hover:border-gray-300"
                title="Analysen & Statistiken anzeigen"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analysen
              </Button>

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
                disabled={isDownloadingZip}
                className="text-green-600 hover:text-green-700 hover:border-green-300"
                title={selectedInvoices.size > 0 ? `${selectedInvoices.size} ausgewählte Rechnungen herunterladen` : 'Alle Rechnungen herunterladen'}
              >
                {isDownloadingZip ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {selectedInvoices.size > 0 ? `${selectedInvoices.size} als ZIP` : 'Alle als ZIP'}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
<<<<<<< HEAD
                size="icon"
                onClick={async () => {
                  const newState = !isSoundEnabled

                  if (newState) {
                    // User wants to ENABLE sound - multiple attempts!
                    setSoundError('')

                    try {
                      // Step 1: Try to unlock AudioContext first
                      await unlockAudioContext()

                      // Step 2: Initialize or reuse audio element
                      if (!audioRef.current) {
                        console.log('🔊 Creating new Audio element...')
                        audioRef.current = new Audio('/sounds/cha-ching.mp3')
                        audioRef.current.volume = 0.5

                        // Preload
                        audioRef.current.load()
                        console.log('📥 Audio file loaded')
                      }

                      // Step 3: Play test sound IMMEDIATELY (this is the user gesture!)
                      console.log('▶️ Attempting to play...')
                      audioRef.current.currentTime = 0

                      const playPromise = audioRef.current.play()
                      await playPromise // Wait for it to actually play

                      // Success! Audio context is now blessed
                      console.log('✅ Sound played successfully!')
                      setIsSoundEnabled(true)
                      setIsAudioBlessed(true)
                      setSoundError('')
                      showToast('✓ Benachrichtigungston aktiviert!', 'success')

                    } catch (e: any) {
                      console.error('❌ Sound activation failed:', e)

                      // Detailed error diagnostic
                      let errorMsg = 'Ton konnte nicht aktiviert werden. '

                      if (e.name === 'NotAllowedError') {
                        errorMsg += 'Browser blockiert Autoplay. Lösung: '
                        if (navigator.userAgent.includes('Chrome')) {
                          errorMsg += 'Klicke auf Schloss-Icon oben links → Sound → Zulassen'
                        } else if (navigator.userAgent.includes('Safari')) {
                          errorMsg += 'Safari > Einstellungen > Websites > Auto-Play > Erlauben'
                        } else if (navigator.userAgent.includes('Firefox')) {
                          errorMsg += 'Klicke auf Schloss-Icon → Berechtigungen → Autoplay erlauben'
                        } else {
                          errorMsg += 'Bitte Browser-Einstellungen prüfen'
                        }
                      } else if (e.name === 'NotSupportedError') {
                        errorMsg += 'Audio-Format wird nicht unterstützt. Bitte Browser aktualisieren.'
                      } else {
                        errorMsg += `Fehler: ${e.message || 'Unbekannt'}`
                      }

                      setIsSoundEnabled(false)
                      setIsAudioBlessed(false)
                      setSoundError(errorMsg)
                      showToast('❌ ' + errorMsg, 'error')
                    }
                  } else {
                    // User wants to DISABLE sound
                    setIsSoundEnabled(false)
                    setSoundError('')
                    if (audioRef.current) {
                      audioRef.current.pause()
                    }
                    showToast('Benachrichtigungston deaktiviert', 'info')
                  }
                }}
                className={`mr-2 ${isAudioBlessed && isSoundEnabled
                  ? "text-green-600 border-green-600 bg-green-50 shadow-sm"
                  : isSoundEnabled
                    ? "text-yellow-600 border-yellow-300 bg-yellow-50"
                    : "text-gray-400 border-gray-300"
                  }`}
                title={
                  soundError
                    ? soundError
                    : isAudioBlessed && isSoundEnabled
                      ? "Ton aktiviert ✓"
                      : isSoundEnabled
                        ? "Ton aktivieren (klicken zum Testen)"
                        : "Ton einschalten"
                }
              >
                {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>

              <Button
                variant="outline"
=======
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                onClick={async () => {
                  showToast('Synchronisiere mit Shopify...', 'info')
                  try {
                    const res = await fetch('/api/shopify/auto-sync')
                    const data = await res.json()
                    if (data.synced > 0) {
                      showToast(`${data.synced} neue Bestellungen importiert!`, 'success')
                      fetchInvoices()
                    } else {
                      showToast('Keine neuen Bestellungen gefunden.', 'info')
                    }
                  } catch (err) {
                    console.error('Manual sync failed:', err)
                    showToast('Fehler bei der Synchronisation', 'error')
                  }
                }}
                className="text-gray-600 hover:text-gray-700 hover:border-gray-300"
                title="Manuell mit Shopify synchronisieren"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync
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
        {isDownloadingZip && (
          <div className="w-full h-1 bg-green-100 overflow-hidden">
            <div className="h-full bg-green-500 animate-pulse w-full origin-left"></div>
          </div>
        )}
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

          {/* Date Filter & Bulk Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Zeitraum:</span>
              <input
                type="date"
                className="text-sm border rounded px-2 py-1"
                value={dateRange.from || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value || null }))}
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                className="text-sm border rounded px-2 py-1"
                value={dateRange.to || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value || null }))}
              />
              {(dateRange.from || dateRange.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ from: null, to: null })}
                  className="h-8 px-2 text-gray-500"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <Button
              variant={showAdvancedFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="h-8"
            >
              <Filter className="h-3 w-3 mr-2" />
              Filter
              {(filterPaymentMethod || filterMinAmount || filterMaxAmount || filterNewCustomers || filterUnsent || filterDuplicates) && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-1.5 rounded-full">
                  {[filterPaymentMethod, filterMinAmount, filterMaxAmount, filterNewCustomers, filterUnsent, filterDuplicates].filter(Boolean).length}
                </span>
              )}
            </Button>

            {/* Active Filters Badges */}
            {(filterPaymentMethod || filterMinAmount || filterMaxAmount || filterNewCustomers || filterUnsent || filterDuplicates) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterPaymentMethod('')
                  setFilterMinAmount('')
                  setFilterMaxAmount('')
                  setFilterNewCustomers(false)
                  setFilterUnsent(false)
                  setFilterDuplicates(false)
                }}
                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3 w-3 mr-1" />
                Filter zurücksetzen
              </Button>
            )}

            {selectedInvoices.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm font-medium text-blue-600">{selectedInvoices.size} ausgewählt</span>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setShowBulkStatusUpdate(true)}
                >
                  <Edit2 className="h-3 w-3 mr-2" />
                  Status ändern
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setShowAccountantDialog(true)}
                >
                  <Send className="h-3 w-3 mr-2" />
                  An Steuerberater
                </Button>
              </div>
            )}

          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4">

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Zahlungsmethode</label>
                  <select
                    value={filterPaymentMethod}
                    onChange={(e) => setFilterPaymentMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-md text-sm p-2"
                  >
                    <option value="">Alle</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Klarna">Klarna</option>
                    <option value="Vorkasse">Vorkasse</option>
                    <option value="Rechnung">Rechnung</option>
                    <option value="custom">Vorkasse / Rechnung (Custom)</option>
                    <option value="Shopify Payments">Shopify Payments</option>
                    <option value="Credit Card">Kreditkarte</option>
                    <option value="Amazon Pay">Amazon Pay</option>
                  </select>
                </div>

                {/* Amount Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Betrag (€)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filterMinAmount}
                      onChange={(e) => setFilterMinAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-md text-sm p-2"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filterMaxAmount}
                      onChange={(e) => setFilterMaxAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-md text-sm p-2"
                    />
                  </div>
                </div>

                {/* Checkboxes Group 1 */}
                <div className="space-y-2 flex flex-col justify-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterNewCustomers}
                      onChange={(e) => setFilterNewCustomers(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Nur neue Kunden (30 Tage)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterUnsent}
                      onChange={(e) => setFilterUnsent(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">E-Mail nicht gesendet</span>
                  </label>
                </div>

                {/* Checkboxes Group 2 */}
                <div className="space-y-2 flex flex-col justify-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterDuplicates}
                      onChange={(e) => setFilterDuplicates(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Nur Duplikate anzeigen</span>
                  </label>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showBulkStatusUpdate} onOpenChange={setShowBulkStatusUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Status für {selectedInvoices.size} Rechnungen ändern</DialogTitle>
            <DialogDescription>
              Wählen Sie den neuen Status für die ausgewählten Rechnungen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {['Bezahlt', 'Offen', 'Mahnung', 'Storniert'].map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  className={`justify-start ${getStatusColor(status)}`}
                  onClick={() => handleBulkStatusUpdate(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAccountantDialog} onOpenChange={setShowAccountantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>An Steuerberater senden</DialogTitle>
            <DialogDescription>
              Senden Sie {selectedInvoices.size} ausgewählte Rechnungen an Ihren Steuerberater.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">E-Mail-Adresse des Steuerberaters</label>
              <Input
                type="email"
                placeholder="steuerberater@kanzlei.de"
                value={accountantEmail}
                onChange={(e) => setAccountantEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAccountantDialog(false)}>Abbrechen</Button>
              <Button
                onClick={async () => {
                  if (!accountantEmail) return
                  setSendingAccountant(true)
                  try {
                    const response = await fetch('/api/invoices/send-to-accountant', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        invoiceIds: Array.from(selectedInvoices),
                        accountantEmail
                      })
                    })
                    const result = await response.json()
                    if (result.success) {
                      setShowAccountantDialog(false)
                      // Show success toast (need to implement toast or just alert)
                      alert(`Erfolgreich an ${accountantEmail} gesendet!`)
                      setSelectedInvoices(new Set())
                    } else {
                      alert('Fehler: ' + result.error)
                    }
                  } catch (e) {
                    alert('Fehler beim Senden')
                  } finally {
                    setSendingAccountant(false)
                  }
                }}
                disabled={sendingAccountant || !accountantEmail}
              >
                {sendingAccountant ? 'Sende...' : 'Senden'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Analytics Section */}
        {showAnalytics && <AnalyticsDashboard />}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <div className="text-2xl font-bold text-gray-900" title={String(totalInvoices)}>{totalInvoices}</div>
              <p className="text-xs text-gray-500">Alle Rechnungen</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Offen' ? 'ring-2 ring-yellow-500 shadow-md bg-yellow-50/50' : 'hover:bg-gray-50'} ${openInvoices === 0 ? 'opacity-50' : ''}`}
            onClick={() => setStatusFilter('Offen')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Offen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" title={String(openInvoices)}>{openInvoices}</div>
              <p className="text-xs text-gray-500">Unbezahlt</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Überfällig' ? 'ring-2 ring-red-500 shadow-md bg-red-50/50' : 'hover:bg-gray-50'} ${overdueInvoices === 0 ? 'opacity-50' : ''}`}
            onClick={() => setStatusFilter('Überfällig')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Überfällig
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" title={String(overdueInvoices)}>{overdueInvoices}</div>
              <p className="text-xs text-gray-500">Verspätet</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Bezahlt' ? 'ring-2 ring-green-500 shadow-md bg-green-50/50' : 'hover:bg-gray-50'} ${paidInvoices === 0 ? 'opacity-50' : ''}`}
            onClick={() => setStatusFilter('Bezahlt')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Bezahlt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" title={String(paidInvoices)}>{paidInvoices}</div>
              <p className="text-xs text-gray-500">Abgeschlossen</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Storniert' ? 'ring-2 ring-gray-500 shadow-md bg-gray-50/50' : 'hover:bg-gray-50'} ${cancelledInvoices === 0 ? 'opacity-50' : ''}`}
            onClick={() => setStatusFilter('Storniert')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Storniert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500" title={String(cancelledInvoices)}>{cancelledInvoices}</div>
              <p className="text-xs text-gray-500">Stornos</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'Gutschrift' ? 'ring-2 ring-blue-500 shadow-md bg-blue-50/50' : 'hover:bg-gray-50'} ${refundInvoices === 0 ? 'opacity-50' : ''}`}
            onClick={() => setStatusFilter('Gutschrift')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gutschriften
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" title={String(refundInvoices)}>{refundInvoices}</div>
              <p className="text-xs text-gray-500">Rückerstattungen</p>
            </CardContent>
          </Card>



          {/* 19% VAT Card */}
          <Card className={`bg-violet-50 border-violet-100 ${vat19Sum === 0 ? 'opacity-50' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-violet-700">
                19 % MwSt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-xl font-bold text-violet-700"
                title={new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(vat19Sum)}
              >
                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(vat19Sum)}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Steuerbetrag (19%)
              </p>
            </CardContent>
          </Card>

          {/* Total Paid Amount Card */}
          <Card className={`bg-emerald-50 border-emerald-100 ${totalPaidAmount === 0 ? 'opacity-50' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">
                Gesamtbetrag (bezahlt)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-xl font-bold text-emerald-700"
                title={new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(totalPaidAmount)}
              >
                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(totalPaidAmount)}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                nur abgeschlossene Zahlungen
              </p>
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
                  <TableHead>Bestellnummer</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      Datum
                      <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />
                      <span className="text-xs text-gray-500 ml-1">(Neueste zuerst)</span>
                    </div>
                  </TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Zahlung</TableHead>
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
<<<<<<< HEAD
                        <div className="flex flex-col items-start gap-0.5">
                          <div className="flex items-center gap-2">
                            {/* Order Number (Bold) */}
                            <span className="font-bold text-gray-900">
                              {invoice.orderNumber || (invoice.order?.shopifyOrderId ? (invoice.order.shopifyOrderId.startsWith('#') ? invoice.order.shopifyOrderId : `#${invoice.order.shopifyOrderId}`) : (invoice.order?.orderNumber || '-'))}
                            </span>
                            {duplicateNumbers.includes(invoice.number) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                                Duplikat
                              </span>
                            )}
                          </div>
                          {/* Invoice Number (Subtle) */}
                          {invoice.number && (
                            <span className="text-xs text-gray-500 font-mono" title="Rechnungsnummer">
                              {invoice.number}
                            </span>
                          )}
                          {invoice.originalInvoiceNumber && (
                            <span className="text-[10px] text-gray-400">
                              Ref: {invoice.originalInvoiceNumber}
=======
                        <div className="flex items-center">
                          {invoice.orderNumber || invoice.order?.orderNumber || invoice.number}
                          {duplicateNumbers.includes(invoice.number) && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Duplikat
                            </span>
                          )}
                          {invoice.originalInvoiceNumber && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Ref: {invoice.originalInvoiceNumber})
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex flex-col"
                          onClick={() => handleCustomerClick(invoice.customerEmail || invoice.customer?.email)}
                        >
                          <span>{invoice.customerName || invoice.customer?.name || 'Unbekannter Kunde'}</span>
                          {(invoice.customerEmail || invoice.customer?.email) && (
                            <span className="text-xs text-gray-500 no-underline font-normal">
                              {invoice.customerEmail || invoice.customer?.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {invoice.date ? new Date(invoice.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                          </span>
                          {invoice.date && (
                            <span className="text-xs text-gray-500">
                              {new Date(invoice.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: invoice.currency || 'EUR' }).format(invoice.amount || invoice.total || 0)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">
                          {getPaymentMethodDisplay(invoice.paymentMethod || invoice.settings?.paymentMethod)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {getGermanStatus(invoice.status)}
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

                          {/* Mahnstatus Anzeige */}
                          {invoice.vorkasseReminderLevel > 0 && (
                            <div
                              className="flex items-center text-orange-600 ml-2"
                              title={`Mahnstufe ${invoice.vorkasseReminderLevel} - Letzte: ${invoice.vorkasseLastReminderAt ? new Date(invoice.vorkasseLastReminderAt).toLocaleDateString('de-DE') : 'Unbekannt'}`}
                            >
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs ml-1 font-medium">Mahnung {invoice.vorkasseReminderLevel}</span>
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
        {
          displayedInvoices.length === 0 && (
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
          )
        }

        {/* Pagination Controls */}
        {
          displayedInvoices.length > 0 && !showSearchResults && (
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Zeige</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1) // Reset to first page when limit changes
                  }}
                  className="border border-gray-300 rounded-md text-sm p-1"
                >
                  <option value="50">50</option>
                  <option value="500">500</option>
                  <option value="100000">Unbegrenzt</option>
                </select>
                <span className="text-sm text-gray-600">Einträge pro Seite</span>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Zurück
                </Button>
                <span className="text-sm text-gray-600">
                  Seite {page} von {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )
        }

        {/* Delete Confirmation Dialog */}
        {
          showDeleteConfirm && (
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
          )
        }
      </main>

      {/* Komponente für den Massenversand */}
      {
        showBulkEmailSender && (
          <BulkEmailSender
            selectedInvoices={Array.from(selectedInvoices)}
            onClose={() => setShowBulkEmailSender(false)}
          />
        )
      }

      <CustomerHistoryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        customerEmail={selectedCustomerEmail}
        allInvoices={invoices}
      />

      <ToastContainer />
    </div >
  )
}
