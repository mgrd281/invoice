'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Calculator,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Euro,
  Calendar,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  BarChart3,
  ArrowLeft,
  Upload,
  Trash2,
  Save,
  Archive,
  Briefcase,
  Database
} from 'lucide-react'
import { useAuthenticatedFetch } from '@/lib/api-client'
import {
  AccountingFilter,
  AccountingSummary,
  AccountingInvoice,
  Expense,
  AccountingPeriod,
  InvoiceStatus,
  ExportFormat,
  getAccountingPeriodLabel,
  getInvoiceStatusLabel,
  calculateAccountingSummary
} from '@/lib/accounting-types'

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

  // New states for Voranmeldung
  const [newIncome, setNewIncome] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] })
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadMeta, setUploadMeta] = useState({ description: '', category: 'EXPENSE', date: new Date().toISOString().split('T')[0] })

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

  const handleAddIncome = async () => {
    try {
      if (!newIncome.description || !newIncome.amount) return

      const response = await authenticatedFetch('/api/accounting/additional-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIncome)
      })

      if (response.ok) {
        setNewIncome({ description: '', amount: '', date: new Date().toISOString().split('T')[0] })
        loadAccountingData()
      }
    } catch (error) {
      console.error('Error adding income:', error)
    }
  }

  const [uploadProgress, setUploadProgress] = useState(0)

  const handleUploadReceipt = async () => {
    try {
      if (uploadFiles.length === 0) return

      setLoading(true)
      setUploadProgress(0)

      // Upload files in parallel batches to avoid browser limits but speed up process
      const BATCH_SIZE = 5
      const totalFiles = uploadFiles.length
      let processedCount = 0

      const errors: string[] = []

      for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batch = uploadFiles.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async (file) => {
          try {
            const response = await authenticatedFetch('/api/accounting/receipts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: file.name,
                url: `/uploads/${file.name}`, // Mock URL
                size: file.size,
                mimeType: file.type,
                ...uploadMeta,
                description: uploadMeta.description || file.name
              })
            })

            // authenticatedFetch usually throws on error, but let's be sure
            if (!response.ok) {
              if (response.status === 401) {
                window.location.href = '/login'
                return // Stop execution to redirect
              }
              throw new Error(`Server responded with status ${response.status}`)
            }

          } catch (e: any) {
            console.error(`Failed to upload ${file.name}`, e)
            errors.push(`${file.name}: ${e.message || 'Unknown error'}`)
          }
        }))

        processedCount += batch.length
        setUploadProgress(Math.round((processedCount / totalFiles) * 100))
      }

      if (errors.length > 0) {
        alert(`Fehler beim Hochladen von ${errors.length} Dateien:\n${errors.join('\n')}`)
      } else {
        // Only clear if all successful
        setUploadFiles([])
        setUploadMeta({ description: '', category: 'EXPENSE', date: new Date().toISOString().split('T')[0] })
      }

      setUploadProgress(0)
      loadAccountingData()

    } catch (error: any) {
      console.error('Error uploading receipts:', error)
      alert(`Ein unerwarteter Fehler ist aufgetreten: ${error.message}`)
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])
    }
  }

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index))
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

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAccountingData()
    setRefreshing(false)
  }

  const getStatusColor = (status: InvoiceStatus) => {
    const colors = {
      'offen': 'bg-blue-100 text-blue-800',
      'bezahlt': 'bg-green-100 text-green-800',
      'erstattet': 'bg-purple-100 text-purple-800',
      'storniert': 'bg-red-100 text-red-800',
      'überfällig': 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Buchhaltungsdaten werden geladen...</p>
          </div>
        </div>
      </div>
    )
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
              <Calculator className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Buchhaltung
              </h1>
            </div>
            <div className="flex space-x-2">
              <Link href="/buchhaltung/steuerberater">
                <Button variant="outline" className="flex items-center space-x-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Briefcase className="w-4 h-4" />
                  <span>Steuerberater</span>
                </Button>
              </Link>
              <Button
                variant="outline"
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
        {/* Description */}
        <div className="mb-8">
          <p className="text-gray-600">
            Vollständige Übersicht über Einnahmen, Ausgaben und Steuern für Ihren Steuerberater
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filter & Zeitraum</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="period">Zeitraum</Label>
                <Select
                  value={filter.period}
                  onValueChange={(value: AccountingPeriod) => handlePeriodChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Aktueller Monat</SelectItem>
                    <SelectItem value="quarter">Aktuelles Quartal</SelectItem>
                    <SelectItem value="year">Aktuelles Jahr</SelectItem>
                    <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Von</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filter.startDate}
                  onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="endDate">Bis</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filter.endDate}
                  onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filter.status?.join(',') || 'all'}
                  onValueChange={(value) => setFilter(prev => ({
                    ...prev,
                    status: value === 'all' ? [] : value.split(',') as InvoiceStatus[]
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="offen">Offen</SelectItem>
                    <SelectItem value="bezahlt">Bezahlt</SelectItem>
                    <SelectItem value="erstattet">Erstattet</SelectItem>
                    <SelectItem value="storniert">Storniert</SelectItem>
                    <SelectItem value="überfällig">Überfällig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  €{summary.totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-600">
                  {summary.paidInvoices.count} bezahlte Rechnungen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ausgaben</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  €{summary.totalExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-600">
                  Betriebsausgaben
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nettoeinkommen</CardTitle>
                <Euro className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{summary.netIncome.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-600">
                  Einnahmen - Ausgaben
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Umsatzsteuer</CardTitle>
                <FileText className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  €{summary.totalTax.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-600">
                  Vereinnahmt - Vorsteuer
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Export Buttons */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>Export für Steuerberater</span>
            </CardTitle>
            <CardDescription>
              Exportieren Sie alle Daten in verschiedenen Formaten für Ihren Steuerberater
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>CSV Export</span>
              </Button>

              <Button
                onClick={() => handleExport('excel')}
                disabled={exporting}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Excel Export</span>
              </Button>

              <Button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>PDF Bericht</span>
              </Button>

              <Button
                onClick={() => handleExport('datev')}
                disabled={exporting}
                variant="outline"
                className="flex items-center space-x-2 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Calculator className="w-4 h-4" />
                <span>DATEV Export</span>
              </Button>

              <Button
                onClick={() => handleExport('zip')}
                disabled={exporting}
                variant="outline"
                className="flex items-center space-x-2 bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              >
                <Archive className="w-4 h-4" />
                <span>ZIP Export</span>
              </Button>
            </div>

            {exporting && (
              <div className="mt-4 flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Export wird vorbereitet...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Modern Upload System (Global) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Upload Area */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-blue-600" />
                  Beleg hochladen
                </CardTitle>
                <CardDescription>Drag & Drop oder Klicken zum Auswählen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-blue-50/50 hover:bg-blue-50'
                    }`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadFiles(prev => [...prev, ...Array.from(e.target.files!)])
                      }
                    }}
                    accept=".pdf,.jpg,.png,.docx,.xlsx"
                  />

                  <div className="space-y-2">
                    <div className="h-12 w-12 bg-white rounded-full shadow-sm mx-auto flex items-center justify-center">
                      <Upload className={`h-6 w-6 ${isDragging ? 'text-blue-600' : 'text-blue-400'}`} />
                    </div>
                    <p className="font-medium text-gray-900">
                      {isDragging ? 'Dateien hier ablegen' : 'Dateien auswählen oder hierher ziehen'}
                    </p>
                    <p className="text-xs text-gray-500">PDF, JPG, PNG, DOCX (Unbegrenzt)</p>
                  </div>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                      {uploadFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                          <div className="flex items-center truncate">
                            <FileText className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(index)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Beschreibung (Optional für alle)</Label>
                      <Input
                        value={uploadMeta.description}
                        onChange={(e) => setUploadMeta({ ...uploadMeta, description: e.target.value })}
                        placeholder="Gemeinsame Beschreibung..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Kategorie</Label>
                      <Select
                        value={uploadMeta.category}
                        onValueChange={(v) => setUploadMeta({ ...uploadMeta, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPENSE">Ausgabe</SelectItem>
                          <SelectItem value="INCOME">Einnahme</SelectItem>
                          <SelectItem value="OTHER">Sonstiges</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleUploadReceipt} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                      {loading ? `Wird hochgeladen... ${uploadProgress}%` : `${uploadFiles.length} Dateien hochladen`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Uploaded List */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Beleg-Eingang</CardTitle>
                  <CardDescription>Zuletzt hochgeladene Dokumente</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datei</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead className="text-right">Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-gray-500" />
                            </div>
                            <span className="truncate max-w-[150px]" title={receipt.filename}>{receipt.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(receipt.date).toLocaleDateString('de-DE')}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {receipt.category === 'EXPENSE' ? 'Ausgabe' : receipt.category === 'INCOME' ? 'Einnahme' : 'Sonstiges'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">{receipt.description}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {receipts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                              <FileText className="h-6 w-6 text-gray-300" />
                            </div>
                            <p>Keine Belege vorhanden</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices">Rechnungen ({invoices.length})</TabsTrigger>
            <TabsTrigger value="expenses">Ausgaben ({expenses.length})</TabsTrigger>
            <TabsTrigger value="voranmeldung">Voranmeldung</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Rechnungen</CardTitle>
                <CardDescription>
                  Alle Rechnungen im gewählten Zeitraum
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rechnungsnr.</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Fällig</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Netto</TableHead>
                      <TableHead className="text-right">MwSt</TableHead>
                      <TableHead className="text-right">Brutto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{new Date(invoice.date).toLocaleDateString('de-DE')}</TableCell>
                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString('de-DE')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {getInvoiceStatusLabel(invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">€{invoice.subtotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">€{invoice.taxAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">€{invoice.totalAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {invoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Keine Rechnungen im gewählten Zeitraum gefunden
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Ausgaben</CardTitle>
                    <CardDescription>
                      Alle Betriebsausgaben im gewählten Zeitraum
                    </CardDescription>
                  </div>
                  <Link href="/buchhaltung/ausgaben/new">
                    <Button className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>Ausgabe hinzufügen</span>
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Lieferant</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead className="text-right">Netto</TableHead>
                      <TableHead className="text-right">MwSt</TableHead>
                      <TableHead className="text-right">Brutto</TableHead>
                      <TableHead>Beleg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{new Date(expense.date).toLocaleDateString('de-DE')}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{expense.supplier}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">€{Number(expense.netAmount).toFixed(2)}</TableCell>
                        <TableCell className="text-right">€{Number(expense.taxAmount).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">€{Number(expense.totalAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          {expense.receiptUrl && (
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {expenses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Keine Ausgaben im gewählten Zeitraum gefunden
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voranmeldung">
            <div className="space-y-8">
              {/* 1. Extended KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Einnahmen Breakdown */}
                <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-800">Einnahmen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      €{summary?.totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="space-y-1 text-xs text-green-700/80">
                      <div className="flex justify-between">
                        <span>Steuerpflichtig:</span>
                        <span className="font-medium">€{(summary?.totalRevenue || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Steuerfrei:</span>
                        <span className="font-medium">€0,00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ausgaben Breakdown */}
                <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-800">Ausgaben</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600 mb-2">
                      €{summary?.totalExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="space-y-1 text-xs text-red-700/80">
                      <div className="flex justify-between">
                        <span>Abzugsfähig:</span>
                        <span className="font-medium">€{(summary?.totalExpenses || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nicht abzugsfähig:</span>
                        <span className="font-medium">€0,00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gewinn/Verlust */}
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800">Steuerpfl. Gewinn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold mb-2 ${summary && summary.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      €{summary?.netIncome.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-blue-700/80">
                      Einnahmen - Ausgaben
                    </p>
                  </CardContent>
                </Card>

                {/* Zu versteuerndes Einkommen */}
                <Card className="bg-white border-dashed border-2 border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Zu versteuerndes Einkommen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl font-bold text-gray-800">
                        €{summary?.netIncome.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        className="h-6 text-xs w-24"
                        placeholder="+ / - Betrag"
                        type="number"
                      />
                      <span className="text-xs text-gray-500">Korrektur</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
