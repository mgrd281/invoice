'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calculator, RefreshCw, ArrowLeft, Briefcase, Download, BarChart3, FileText, Archive } from 'lucide-react'
import { useAuthenticatedFetch } from '@/lib/api-client'
import {
  AccountingFilter,
  AccountingSummary,
  AccountingInvoice,
  Expense,
  AccountingPeriod,
  ExportFormat,
  calculateAccountingSummary
} from '@/lib/accounting-types'
import { AccountingStats } from '@/components/accounting/accounting-stats'
import { AccountingFilterBar } from '@/components/accounting/accounting-filter'
import { ReceiptUploader, PendingFile } from '@/components/accounting/receipt-uploader'
import { ReceiptsList } from '@/components/accounting/receipts-list'
import { ExpensesTable } from '@/components/accounting/expenses-table'
import { InvoicesTable } from '@/components/accounting/invoices-table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface AdditionalIncome {
  id: string
  date: string
  description: string
  amount: number
  type: string
}

interface Receipt {
  id: string
  date: string
  filename: string
  description: string
  category: string
  url: string
  amount?: number
}

export default function BuchhaltungPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [invoices, setInvoices] = useState<AccountingInvoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [additionalIncomes, setAdditionalIncomes] = useState<AdditionalIncome[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [summary, setSummary] = useState<AccountingSummary | null>(null)

  // Upload state
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)

  // Selection state
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([])

  // Filter states
  const [filter, setFilter] = useState<AccountingFilter>({
    period: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: [],
    customerIds: [],
    minAmount: undefined,
    maxAmount: undefined
  })

  useEffect(() => {
    loadAccountingData()
  }, [filter])

  const loadAccountingData = async () => {
    try {
      setLoading(true)

      const queryParams = new URLSearchParams({
        startDate: filter.startDate || '',
        endDate: filter.endDate || ''
      })

      // Load invoices with filter
      const invoicesResponse = await authenticatedFetch('/api/accounting/invoices?' + new URLSearchParams({
        ...Object.fromEntries(queryParams),
        status: filter.status?.join(',') || '',
        minAmount: filter.minAmount?.toString() || '',
        maxAmount: filter.maxAmount?.toString() || ''
      }))

      // Load expenses
      const expensesResponse = await authenticatedFetch('/api/accounting/expenses?' + queryParams)

      // Load additional income
      const incomeResponse = await authenticatedFetch('/api/accounting/additional-income?' + queryParams)

      // Load receipts
      const receiptsResponse = await authenticatedFetch('/api/accounting/receipts?' + queryParams)

      if (invoicesResponse.ok && expensesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        const expensesData = await expensesResponse.json()
        const incomeData = incomeResponse.ok ? await incomeResponse.json() : []
        const receiptsData = receiptsResponse.ok ? await receiptsResponse.json() : []

        setInvoices(invoicesData.invoices || [])
        setExpenses(expensesData.expenses || [])
        setAdditionalIncomes(incomeData || [])
        setReceipts(receiptsData || [])

        // Calculate summary
        const calculatedSummary = calculateAccountingSummary(
          invoicesData.invoices || [],
          expensesData.expenses || []
        )

        // Adjust summary with additional income
        if (incomeData && incomeData.length > 0) {
          const additionalTotal = incomeData.reduce((sum: number, inc: AdditionalIncome) => sum + Number(inc.amount), 0)
          calculatedSummary.totalRevenue += additionalTotal
          calculatedSummary.netIncome += additionalTotal
        }

        setSummary(calculatedSummary)
      } else {
        console.error('Failed to load accounting data')
      }
    } catch (error) {
      console.error('Error loading accounting data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilesAdded = async (files: File[]) => {
    const newPending: PendingFile[] = files.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      meta: {
        description: f.name,
        category: 'EXPENSE',
        date: new Date().toISOString().split('T')[0],
        amount: ''
      },
      status: 'analyzing'
    }))

    setPendingFiles(prev => [...prev, ...newPending])

    // Process OCR for each file
    newPending.forEach(async (pf) => {
      try {
        const formData = new FormData()
        formData.append('file', pf.file)

        // Call OCR API
        const res = await authenticatedFetch('/api/ocr/analyze', {
          method: 'POST',
          body: formData
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setPendingFiles(prev => prev.map(p => p.id === pf.id ? {
              ...p,
              status: 'success',
              meta: {
                ...p.meta,
                amount: data.data.totalAmount?.toString() || '',
                description: data.data.description || p.meta.description,
                category: data.data.category || 'INCOME', // Default to INCOME as requested
                date: data.data.date || p.meta.date,
                supplier: data.data.supplier,
                invoiceNumber: data.data.invoiceNumber
              }
            } : p))
            return
          }
        }
        // If failed or no data
        setPendingFiles(prev => prev.map(p => p.id === pf.id ? { ...p, status: 'pending' } : p))
      } catch (e) {
        console.error('OCR failed for', pf.file.name, e)
        setPendingFiles(prev => prev.map(p => p.id === pf.id ? { ...p, status: 'error' } : p))
      }
    })
  }

  const handleUploadReceipt = async () => {
    try {
      if (pendingFiles.length === 0) return

      setLoading(true)
      setUploadProgress(0)

      const BATCH_SIZE = 3
      const totalFiles = pendingFiles.length
      let processedCount = 0
      const errors: string[] = []

      for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batch = pendingFiles.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async (pf) => {
          try {
            const response = await authenticatedFetch('/api/accounting/receipts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: pf.file.name,
                url: `/uploads/${pf.file.name}`, // Mock URL
                size: pf.file.size,
                mimeType: pf.file.type,
                ...pf.meta,
                amount: pf.meta.amount ? parseFloat(pf.meta.amount) : undefined,
                supplier: pf.meta.supplier,
                invoiceNumber: pf.meta.invoiceNumber
              })
            })

            if (!response.ok) {
              throw new Error(`Status ${response.status}`)
            }
          } catch (e: any) {
            console.error(`Failed to upload ${pf.file.name}`, e)
            errors.push(`${pf.file.name}: ${e.message}`)
          }
        }))

        processedCount += batch.length
        setUploadProgress(Math.round((processedCount / totalFiles) * 100))
      }

      if (errors.length > 0) {
        alert(`Fehler beim Hochladen:\n${errors.join('\n')}`)
      } else {
        setPendingFiles([])
      }

      setUploadProgress(0)
      loadAccountingData()

    } catch (error: any) {
      console.error('Error uploading receipts:', error)
      alert(`Fehler: ${error.message}`)
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handlePeriodChange = (period: AccountingPeriod) => {
    const now = new Date()
    let startDate: string
    let endDate: string = now.toISOString().split('T')[0]

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        break
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        break
      case 'all':
        startDate = ''
        endDate = ''
        break
      default:
        return // Don't change dates for custom period
    }

    setFilter(prev => ({
      ...prev,
      period,
      startDate,
      endDate
    }))
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAccountingData()
    setRefreshing(false)
  }

  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true)

      const response = await authenticatedFetch('/api/accounting/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format,
          filter,
          invoices,
          expenses,
          additionalIncomes,
          summary
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const extensionMap: Record<string, string> = {
          csv: 'csv',
          excel: 'xls',
          pdf: 'html', // API returns HTML
          datev: 'csv',
          zip: 'zip'
        }
        a.download = `buchhaltung-${filter.startDate}-${filter.endDate}.${extensionMap[format] || format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Fehler beim Exportieren der Daten')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Fehler beim Exportieren der Daten')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <Calculator className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">
                Buchhaltung
              </h1>
            </div>
            <div className="flex space-x-2">
              <Link href="/buchhaltung/steuerberater">
                <Button variant="outline" size="sm" className="flex items-center space-x-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Briefcase className="w-4 h-4" />
                  <span>Steuerberater</span>
                </Button>
              </Link>
              <Link href="/buchhaltung/debug">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                  <span className="text-xs">Diagnose</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Aktualisieren</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Overview */}
        <AccountingStats summary={summary} />

        {/* Filters */}
        <AccountingFilterBar
          filter={filter}
          setFilter={setFilter}
          handlePeriodChange={handlePeriodChange}
        />

        {/* Main Content Tabs */}
        <Tabs defaultValue="receipts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="receipts">Belege & Eingang</TabsTrigger>
            <TabsTrigger value="invoices">Einnahmen</TabsTrigger>
            <TabsTrigger value="expenses">Ausgaben</TabsTrigger>
            <TabsTrigger value="reports">Berichte & Export</TabsTrigger>
          </TabsList>

          <TabsContent value="receipts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <ReceiptUploader
                  onFilesAdded={handleFilesAdded}
                  pendingFiles={pendingFiles}
                  setPendingFiles={setPendingFiles}
                  onUpload={handleUploadReceipt}
                  loading={loading}
                  uploadProgress={uploadProgress}
                />
              </div>
              <div className="lg:col-span-2">
                <ReceiptsList
                  receipts={receipts}
                  additionalIncomes={additionalIncomes}
                  selectedReceipts={selectedReceipts}
                  setSelectedReceipts={setSelectedReceipts}
                  onDeleteSelected={async () => {
                    if (selectedReceipts.length === 0) return
                    if (!confirm(`Möchten Sie wirklich ${selectedReceipts.length} Belege löschen?`)) return

                    try {
                      // Separate IDs into receipts and additional incomes
                      const receiptIds = selectedReceipts.filter(id => receipts.some(r => r.id === id))
                      const incomeIds = selectedReceipts.filter(id => additionalIncomes.some(ai => ai.id === id))

                      const promises = []

                      if (receiptIds.length > 0) {
                        promises.push(authenticatedFetch('/api/accounting/receipts', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids: receiptIds })
                        }))
                      }

                      if (incomeIds.length > 0) {
                        promises.push(authenticatedFetch('/api/accounting/additional-income', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids: incomeIds })
                        }))
                      }

                      const results = await Promise.all(promises)
                      const allOk = results.every(res => res.ok)

                      if (allOk) {
                        setSelectedReceipts([])
                        loadAccountingData()
                      } else {
                        alert('Fehler beim Löschen einiger Einträge')
                      }
                    } catch (error) {
                      console.error('Error deleting items:', error)
                      alert('Fehler beim Löschen')
                    }
                  }}
                  onDelete={async (id) => {
                    if (!confirm('Möchten Sie diesen Beleg wirklich löschen?')) return
                    try {
                      const response = await authenticatedFetch(`/api/accounting/receipts/${id}`, { method: 'DELETE' })
                      if (response.ok) loadAccountingData()
                      else alert('Fehler beim Löschen')
                    } catch (error) {
                      console.error('Error deleting receipt:', error)
                      alert('Fehler beim Löschen')
                    }
                  }}
                  onEdit={(receipt) => {
                    // Implement edit dialog logic here if needed, or navigate to edit page
                    console.log('Edit receipt', receipt)
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesTable invoices={invoices} additionalIncomes={additionalIncomes} />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTable
              expenses={expenses}
              onEdit={(expense) => {
                // Implement edit dialog logic here
                console.log('Edit expense', expense)
              }}
              onDelete={async (id) => {
                if (!confirm('Möchten Sie diese Ausgabe wirklich löschen?')) return
                try {
                  const res = await authenticatedFetch(`/api/accounting/expenses/${id}`, { method: 'DELETE' })
                  if (res.ok) loadAccountingData()
                  else alert('Fehler beim Löschen')
                } catch (e) {
                  console.error(e)
                  alert('Fehler beim Löschen')
                }
              }}
            />
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Export für Steuerberater</CardTitle>
                <CardDescription>
                  Exportieren Sie alle Daten in verschiedenen Formaten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => handleExport('csv')} disabled={exporting} className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>CSV Export</span>
                  </Button>
                  <Button onClick={() => handleExport('excel')} disabled={exporting} variant="outline" className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Excel Export</span>
                  </Button>
                  <Button onClick={() => handleExport('pdf')} disabled={exporting} variant="outline" className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>PDF Bericht</span>
                  </Button>
                  <Button onClick={() => handleExport('datev')} disabled={exporting} variant="outline" className="flex items-center space-x-2 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100">
                    <Calculator className="w-4 h-4" />
                    <span>DATEV Export</span>
                  </Button>
                  <Button onClick={() => handleExport('zip')} disabled={exporting} variant="outline" className="flex items-center space-x-2 bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100">
                    <Archive className="w-4 h-4" />
                    <span>ZIP Export</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
