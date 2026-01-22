'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, ArrowLeft, FileText, Eye, Download, Plus } from 'lucide-react'
import { downloadInvoicePDF } from '@/lib/pdf-generator'

interface Customer {
  id: string
  name: string
  email: string
}

interface Invoice {
  id: string
  number: string
  date: string
  amount: string
  status: string
  statusColor: string
}

export default function CustomerInvoicesPage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomerAndInvoices()
  }, [params.id])

  const fetchCustomerAndInvoices = async () => {
    try {
      // Mock data - in a real app, you'd fetch from /api/customers/[id] and /api/customers/[id]/invoices
      const mockCustomer: Customer = {
        id: params.id,
        name: 'Max Mustermann',
        email: 'max.mustermann@email.com'
      }

      const mockInvoices: Invoice[] = [
        {
          id: '1',
          number: 'RE-2024-001',
          date: '2024-01-15',
          amount: '€119.00',
          status: 'Bezahlt',
          statusColor: 'bg-green-100 text-green-800'
        },
        {
          id: '4',
          number: 'RE-2024-004',
          date: '2024-02-01',
          amount: '€89.50',
          status: 'Offen',
          statusColor: 'bg-yellow-100 text-yellow-800'
        },
        {
          id: '7',
          number: 'RE-2024-007',
          date: '2024-02-15',
          amount: '€148.50',
          status: 'Überfällig',
          statusColor: 'bg-red-100 text-red-800'
        }
      ]
      
      setCustomer(mockCustomer)
      setInvoices(mockInvoices)
    } catch (error) {
      console.error('Error fetching customer and invoices:', error)
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

  const totalAmount = invoices.reduce((sum, invoice) => {
    const amount = parseFloat(invoice.amount.replace('€', '').replace(',', '.'))
    return sum + amount
  }, 0)

  const paidInvoices = invoices.filter(inv => inv.status === 'Bezahlt').length
  const openInvoices = invoices.filter(inv => inv.status === 'Offen').length
  const overdueInvoices = invoices.filter(inv => inv.status === 'Überfällig').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Daten werden geladen...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Kunde nicht gefunden</h2>
          <p className="text-gray-600 mb-4">Der angeforderte Kunde konnte nicht gefunden werden.</p>
          <Link href="/customers">
            <Button>Zurück zu Kunden</Button>
          </Link>
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
              <Link href="/customers">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück zu Kunden
                </Button>
              </Link>
              <Users className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Rechnungen für {customer.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {customer.email}
                </p>
              </div>
            </div>
            <Link href={`/invoices/new?customer=${customer.id}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neue Rechnung
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gesamt Rechnungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Bezahlte Rechnungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{paidInvoices}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Offene Rechnungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{openInvoices}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gesamtumsatz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">€{totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rechnungen für {customer.name}</CardTitle>
            <CardDescription>
              Alle Rechnungen für diesen Kunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rechnungsnummer</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.number}
                      </TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell className="font-medium">{invoice.amount}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${invoice.statusColor}`}>
                          {invoice.status}
                        </span>
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
                  Noch keine Rechnungen
                </h3>
                <p className="text-gray-600 mb-6">
                  Für diesen Kunden wurden noch keine Rechnungen erstellt.
                </p>
                <Link href={`/invoices/new?customer=${customer.id}`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Erste Rechnung erstellen
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
