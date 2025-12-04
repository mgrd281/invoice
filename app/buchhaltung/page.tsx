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
  ArrowLeft
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

export default function BuchhaltungPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [invoices, setInvoices] = useState<AccountingInvoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<AccountingSummary | null>(null)

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
      
      // Load invoices with filter
      const invoicesResponse = await authenticatedFetch('/api/accounting/invoices?' + new URLSearchParams({
        startDate: filter.startDate || '',
        endDate: filter.endDate || '',
        status: filter.status?.join(',') || '',
        minAmount: filter.minAmount?.toString() || '',
        maxAmount: filter.maxAmount?.toString() || ''
      }))

      // Load expenses with filter
      const expensesResponse = await authenticatedFetch('/api/accounting/expenses?' + new URLSearchParams({
        startDate: filter.startDate || '',
        endDate: filter.endDate || ''
      }))

      if (invoicesResponse.ok && expensesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        const expensesData = await expensesResponse.json()
        
        setInvoices(invoicesData.invoices || [])
        setExpenses(expensesData.expenses || [])
        
        // Calculate summary
        const calculatedSummary = calculateAccountingSummary(
          invoicesData.invoices || [], 
          expensesData.expenses || []
        )
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
          summary
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `buchhaltung-${filter.startDate}-${filter.endDate}.${format}`
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
          </div>
          
          {exporting && (
            <div className="mt-4 flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Export wird vorbereitet...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Tables */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">Rechnungen ({invoices.length})</TabsTrigger>
          <TabsTrigger value="expenses">Ausgaben ({expenses.length})</TabsTrigger>
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
                      <TableCell className="text-right">€{expense.netAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{expense.taxAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">€{expense.totalAmount.toFixed(2)}</TableCell>
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
      </Tabs>
      </div>
    </div>
  )
}
