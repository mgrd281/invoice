'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, ArrowLeft, Download, Eye, RefreshCw } from 'lucide-react'
import { downloadInvoicePDF } from '@/lib/pdf-generator'

export default function CsvInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCsvData()
  }, [])

  const fetchCsvData = async () => {
    try {
      console.log('Fetching CSV data...')
      const response = await fetch('/api/invoices/csv')
      const data = await response.json()
      
      console.log('CSV API Response:', data)
      console.log('Invoices received:', data.invoices?.length || 0)
      console.log('Customers received:', data.customers?.length || 0)
      
      setInvoices(data.invoices || [])
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error fetching CSV data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = (invoiceId: string, invoiceNumber: string) => {
    try {
      downloadInvoicePDF(invoiceId, invoiceNumber)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Fehler beim Herunterladen der PDF-Datei')
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    fetchCsvData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">CSV-Daten werden geladen...</p>
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
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück zu Rechnungen
                </Button>
              </Link>
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  CSV-Rechnungen
                </h1>
                <p className="text-sm text-gray-600">
                  Aus Shopify CSV-Dateien generierte Rechnungen
                </p>
              </div>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                CSV-Rechnungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{invoices.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                CSV-Kunden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{customers.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gesamtwert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                €{invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>CSV-Rechnungen</CardTitle>
            <CardDescription>
              Alle aus CSV-Dateien generierten Rechnungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rechnungsnummer</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shopify-Bestellung</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.number}
                      </TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell className="font-medium">{invoice.amount}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${invoice.statusColor}`}>
                          {invoice.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {invoice.shopifyOrderNumber}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Anzeigen
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadPdf(invoice.id, invoice.number)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Keine CSV-Rechnungen gefunden
                </h3>
                <p className="text-gray-600 mb-6">
                  Laden Sie eine CSV-Datei hoch, um Rechnungen zu generieren.
                </p>
                <Link href="/upload">
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    CSV hochladen
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
