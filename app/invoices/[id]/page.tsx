'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Download, Edit, Save, X, Mail, ArrowLeft, FileText, Plus, Trash2, Calculator, Bell, AlertTriangle, AlertOctagon, AlertCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DashboardUpdater } from '@/lib/dashboard-updater'
import { renderRecipientBlock } from '@/lib/recipient-renderer'
import { InvoiceTimeline } from '@/components/invoice-timeline'
import { InvoicePreviewDialog } from '@/components/invoice-preview-dialog'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  ean?: string
}

interface Customer {
  id: string
  name: string
  companyName?: string
  email: string
  address: string
  zipCode: string
  city: string
  country: string
}

interface Organization {
  id: string
  name: string
  address: string
  zipCode: string
  city: string
  country: string
  taxId: string
  bankName: string
  iban: string
  bic: string
}

interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  status: string
  customer: Customer
  organization: Organization
  items: InvoiceItem[]
  order?: {
    id: string
    shopifyOrderId?: string
  }
  history?: any[]
  paymentMethod?: string
  headerSubject?: string | null
  headerText?: string | null
  footerText?: string | null
  serviceDate?: string | null
  settings?: any
}

export default function InvoiceViewPage() {
  const params = useParams()
  const id = params?.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editableInvoice, setEditableInvoice] = useState<Invoice | null>(null)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    console.log(`${type.toUpperCase()}: ${message}`)
    setToastMessage({ message, type })
    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setToastMessage(null)
    }, 5000)
  }

  useEffect(() => {
    if (id) {
      fetchInvoice()
    }
  }, [id])

  const fetchInvoice = async () => {
    try {
      console.log('Fetching invoice with ID:', id)

      const response = await fetch(`/api/invoices/${id}`)

      if (!response.ok) {
        throw new Error('Invoice not found')
      }

      const invoiceData = await response.json()
      console.log('Received invoice data:', invoiceData)

      setInvoice(invoiceData)
    } catch (error) {
      console.error('Error fetching invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadInvoicePDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      console.log('🔄 Starting PDF download for invoice:', invoiceId, invoiceNumber)
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

          console.log(`✅ PDF für Rechnung ${invoiceNumber} erfolgreich heruntergeladen`)
          showToast(`PDF für Rechnung ${invoiceNumber} erfolgreich heruntergeladen!`, 'success')
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

  const handleDownloadPdf = async () => {
    if (!invoice) return

    setDownloadingPdf(true)
    try {
      await downloadInvoicePDF(invoice.id, invoice.number)
    } catch (error) {
      console.error('Error downloading PDF:', error)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleSendEmail = async () => {
    if (!invoice) return

    setSendingEmail(true)
    try {
      const response = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          customerEmail: invoice.customer.email,
          customerName: invoice.customer.name || invoice.customer.companyName || 'Kunde',
          invoiceNumber: invoice.number,
          emailSubject: `Rechnung ${invoice.number}`,
          emailMessage: `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invoice.number} über ${invoice.total.toFixed(2)} EUR.\n\nVielen Dank für Ihr Vertrauen.\n\nMit freundlichen Grüßen`,
          invoiceAmount: invoice.total,
          dueDate: invoice.dueDate
        }),
      })

      const result = await response.json()

      if (result.success) {
        showToast(result.message, 'success')
      } else {
        throw new Error(result.error || 'Unbekannter Fehler')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      showToast(`Fehler beim Senden der E-Mail: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSendReminder = async (level: string = 'reminder') => {
    if (!invoice) return

    setSendingReminder(true)
    try {
      const response = await fetch('/api/reminders/send-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          reminderLevel: level
        }),
      })

      const result = await response.json()

      if (result.success) {
        showToast('Erinnerung erfolgreich gesendet', 'success')
      } else {
        throw new Error(result.error || 'Unbekannter Fehler')
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      showToast(`Fehler beim Senden der Erinnerung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error')
    } finally {
      setSendingReminder(false)
    }
  }

  const handleCancel = async () => {
    if (!invoice) return

    // Check if connected to Shopify
    if (invoice.order?.shopifyOrderId) {
      const confirmShopify = window.confirm(
        'Diese Rechnung ist mit einer Shopify-Bestellung verknüpft.\n\nMöchten Sie die Bestellung auch im Shopify-System stornieren?'
      )

      if (confirmShopify) {
        try {
          showToast('Storniere Bestellung in Shopify...', 'success')
          const response = await fetch('/api/shopify/cancel-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ invoiceId: invoice.id }),
          })

          const result = await response.json()

          if (result.success) {
            showToast('Shopify-Bestellung erfolgreich storniert', 'success')
          } else {
            showToast(`Fehler bei Shopify-Stornierung: ${result.error}`, 'error')
          }
        } catch (error) {
          console.error('Error cancelling Shopify order:', error)
          showToast('Verbindungsfehler zu Shopify', 'error')
        }
      }
    }

    // Navigate to cancellation page
    window.location.href = `/invoices/${invoice.id}/cancel`
  }

  const handleEditInvoice = () => {
    if (!invoice) return

    console.log('Editing invoice:', invoice.id)
    showToast('Bearbeitungsmodus wird geöffnet...', 'success')

    // Create editable copy of invoice
    setEditableInvoice({
      ...invoice,
      items: [...invoice.items] // Deep copy of items array
    })

    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editableInvoice) return

    setSaving(true)
    try {
      showToast('Änderungen werden gespeichert...', 'success')

      // Calculate totals
      const subtotal = editableInvoice.items.reduce((sum, item) => sum + item.total, 0)
      const taxAmount = subtotal * (editableInvoice.taxRate / 100)
      const total = subtotal + taxAmount

      const updatedInvoice = {
        ...editableInvoice,
        subtotal,
        taxAmount,
        total
      }

      // Save to server
      const response = await fetch(`/api/invoices/${editableInvoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedInvoice),
      })

      if (response.ok) {
        // Check if status changed for dashboard update
        const statusChanged = invoice?.status !== updatedInvoice.status

        // Update the main invoice state
        setInvoice(updatedInvoice)
        setEditableInvoice(null)
        setIsEditing(false)

        // Trigger dashboard update if status changed
        if (statusChanged && invoice) {
          DashboardUpdater.dispatchInvoiceStatusChanged(
            invoice.id,
            invoice.status,
            updatedInvoice.status
          )
        } else {
          // General invoice update
          DashboardUpdater.dispatchInvoiceUpdated(updatedInvoice)
        }

        // Dispatch legacy event for list view refresh
        window.dispatchEvent(new CustomEvent('invoicesUpdated'))

        showToast('Rechnung erfolgreich aktualisiert!', 'success')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save invoice')
      }
    } catch (error) {
      console.error('Error saving invoice:', error)
      showToast('Fehler beim Speichern der Änderungen', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Check if there are unsaved changes
    const hasChanges = editableInvoice && JSON.stringify(editableInvoice) !== JSON.stringify(invoice)

    if (hasChanges) {
      const confirmCancel = window.confirm(
        'Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen? Alle Änderungen gehen verloren.'
      )
      if (!confirmCancel) {
        return
      }
    }

    setEditableInvoice(null)
    setIsEditing(false)
    showToast('Bearbeitung abgebrochen', 'success')
  }

  // Helper functions for editing
  const updateEditableInvoice = (field: keyof Invoice, value: any) => {
    if (!editableInvoice) return
    setEditableInvoice({ ...editableInvoice, [field]: value })
  }

  const updateEditableCustomer = (field: keyof Customer, value: string) => {
    if (!editableInvoice) return
    setEditableInvoice({
      ...editableInvoice,
      customer: { ...editableInvoice.customer, [field]: value }
    })
  }

  const updateEditableItem = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!editableInvoice) return
    const newItems = [...editableInvoice.items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalculate item total if quantity or unitPrice changed
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice
    }

    setEditableInvoice({ ...editableInvoice, items: newItems })
  }

  const addNewItem = () => {
    if (!editableInvoice) return
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      ean: ''
    }
    setEditableInvoice({
      ...editableInvoice,
      items: [...editableInvoice.items, newItem]
    })
  }

  const removeItem = (index: number) => {
    if (!editableInvoice) return
    const newItems = editableInvoice.items.filter((_, i) => i !== index)
    setEditableInvoice({ ...editableInvoice, items: newItems })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Rechnung wird geladen...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Rechnung nicht gefunden</h2>
          <p className="text-gray-600 mb-4">Die angeforderte Rechnung konnte nicht gefunden werden.</p>
          <Link href="/invoices">
            <Button>Zurück zu Rechnungen</Button>
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'bezahlt':
        return 'bg-green-100 text-green-800'
      case 'erstattet':
        return 'bg-blue-100 text-blue-800'
      case 'storniert':
        return 'bg-gray-100 text-gray-800'
      case 'offen':
        return 'bg-gray-100 text-gray-600'
      case 'mahnung':
        return 'bg-red-100 text-red-800'
      case 'überfällig':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
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
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  Rechnung {invoice.number}
                  {isEditing && (
                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Edit className="h-3 w-3 mr-1" />
                      Bearbeitungsmodus
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-600">
                  Erstellt am {new Date(invoice.date).toLocaleDateString('de-DE')}
                  {isEditing && (
                    <span className="ml-2 text-blue-600 font-medium">
                      • Wird bearbeitet
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Vorschau
              </Button>
              <Button variant="outline" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                {downloadingPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Generiere PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    PDF herunterladen
                  </>
                )}
              </Button>

              {isEditing ? (
                <>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Speichern...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Speichern
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Abbrechen
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={handleEditInvoice}>
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">Rechnung {invoice.number}</CardTitle>
                    {isEditing && editableInvoice ? (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rechnungsdatum
                            </label>
                            <Input
                              type="date"
                              value={editableInvoice.date}
                              onChange={(e) => updateEditableInvoice('date', e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fälligkeitsdatum
                            </label>
                            <Input
                              type="date"
                              value={editableInvoice.dueDate}
                              onChange={(e) => updateEditableInvoice('dueDate', e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <CardDescription className="text-base mt-2">
                        Rechnungsdatum: {new Date(invoice.date).toLocaleDateString('de-DE')}<br />
                        Fälligkeitsdatum: {new Date(invoice.dueDate).toLocaleDateString('de-DE')}
                      </CardDescription>
                    )}
                  </div>
                  <div className="ml-4">
                    {isEditing && editableInvoice ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={editableInvoice.status}
                          onChange={(e) => updateEditableInvoice('status', e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Rechnungsstatus auswählen"
                          aria-label="Rechnungsstatus auswählen"
                        >
                          <option value="Offen">Offen</option>
                          <option value="Bezahlt">Bezahlt</option>
                          <option value="Erstattet">Erstattet</option>
                          <option value="Storniert">Storniert</option>
                          <option value="Mahnung">Mahnung</option>
                        </select>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Organization & Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Organization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Von</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold">{invoice.organization.name}</p>
                    <p className="text-sm text-gray-600">
                      {invoice.organization.address}<br />
                      {invoice.organization.zipCode} {invoice.organization.city}<br />
                      {invoice.organization.country}
                    </p>
                    <p className="text-sm text-gray-600">
                      Steuer-ID: {invoice.organization.taxId}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* To Customer */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">An</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing && editableInvoice ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kundenname
                        </label>
                        <Input
                          value={editableInvoice.customer.name}
                          onChange={(e) => updateEditableCustomer('name', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Firmenname
                        </label>
                        <Input
                          value={editableInvoice.customer.companyName || ''}
                          onChange={(e) => updateEditableCustomer('companyName', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Adresse
                        </label>
                        <Input
                          value={editableInvoice.customer.address}
                          onChange={(e) => updateEditableCustomer('address', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            PLZ
                          </label>
                          <Input
                            value={editableInvoice.customer.zipCode}
                            onChange={(e) => updateEditableCustomer('zipCode', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stadt
                          </label>
                          <Input
                            value={editableInvoice.customer.city}
                            onChange={(e) => updateEditableCustomer('city', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Land
                        </label>
                        <Input
                          value={editableInvoice.customer.country}
                          onChange={(e) => updateEditableCustomer('country', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          E-Mail
                        </label>
                        <Input
                          type="email"
                          value={editableInvoice.customer.email}
                          onChange={(e) => updateEditableCustomer('email', e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-semibold">{invoice.customer.name}</p>
                      {invoice.customer.companyName && (
                        <p className="font-medium text-gray-800">{invoice.customer.companyName}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        {invoice.customer.address}<br />
                        {invoice.customer.zipCode.replace(/^'/, '')} {invoice.customer.city}<br />
                        {invoice.customer.country}
                      </p>
                      <div className="flex items-center text-sm text-gray-600 mt-2">
                        <Mail className="h-3 w-3 mr-1" />
                        {invoice.customer.email}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Rechnungspositionen</CardTitle>
                  {isEditing && (
                    <Button onClick={addNewItem} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Position hinzufügen
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead className="text-center">EAN</TableHead>
                      <TableHead className="text-center">Menge</TableHead>
                      <TableHead className="text-right">Einzelpreis</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      {isEditing && <TableHead className="text-center">Aktionen</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isEditing && editableInvoice ? editableInvoice.items : invoice.items).map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {isEditing && editableInvoice ? (
                            <Input
                              value={item.description}
                              onChange={(e) => updateEditableItem(index, 'description', e.target.value)}
                              placeholder="Beschreibung eingeben..."
                              className="w-full"
                            />
                          ) : (
                            item.description
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing && editableInvoice ? (
                            <Input
                              value={item.ean || ''}
                              onChange={(e) => updateEditableItem(index, 'ean', e.target.value)}
                              placeholder="EAN (optional)"
                              className="w-32 text-center"
                            />
                          ) : (
                            <span className="text-gray-500 text-sm">
                              {item.ean || '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing && editableInvoice ? (
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateEditableItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-20 text-center"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing && editableInvoice ? (
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateEditableItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-24 text-right"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            `€${item.unitPrice.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{item.total.toFixed(2)}
                        </TableCell>
                        {isEditing && (
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Position löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Rechnungssumme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const currentInvoice = isEditing && editableInvoice ? editableInvoice : invoice
                  const subtotal = currentInvoice.items.reduce((sum, item) => sum + item.total, 0)
                  const taxAmount = subtotal * (currentInvoice.taxRate / 100)
                  const total = subtotal + taxAmount

                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Zwischensumme:</span>
                        <span className="font-medium">€{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">MwSt.:</span>
                        <div className="flex items-center space-x-2">
                          {isEditing && editableInvoice ? (
                            <Input
                              type="number"
                              value={currentInvoice.taxRate}
                              onChange={(e) => updateEditableInvoice('taxRate', parseFloat(e.target.value) || 0)}
                              className="w-16 text-right"
                              min="0"
                              max="100"
                              step="0.1"
                            />
                          ) : (
                            <span>{currentInvoice.taxRate}</span>
                          )}
                          <span>%</span>
                          <span className="font-medium">€{taxAmount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Gesamtsumme:</span>
                          <span>€{total.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )
                })()}

                {/* Payment Method */}
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium text-gray-900">Zahlungsmethode</h4>
                  {isEditing && editableInvoice ? (
                    <Select
                      value={(editableInvoice as any).paymentMethod || ''}
                      onValueChange={(value) => updateEditableInvoice('paymentMethod' as any, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Zahlungsmethode wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PayPal">PayPal</SelectItem>
                        <SelectItem value="PayPal Express Checkout">PayPal Express Checkout</SelectItem>
                        <SelectItem value="Kreditkarte">Kreditkarte</SelectItem>
                        <SelectItem value="Vorkasse">Vorkasse</SelectItem>
                        <SelectItem value="Rechnung">Rechnung</SelectItem>
                        <SelectItem value="Sofort/Klarna">Sofort/Klarna</SelectItem>
                        <SelectItem value="Apple Pay">Apple Pay</SelectItem>
                        <SelectItem value="Google Pay">Google Pay</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {(invoice as any).paymentMethod || '-'}
                    </p>
                  )}
                </div>

                {/* Bank Details */}
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium text-gray-900">Bankverbindung</h4>
                  <div className="text-sm text-gray-600">
                    <p>{invoice.organization.bankName}</p>
                    <p>IBAN: {invoice.organization.iban}</p>
                    <p>BIC: {invoice.organization.bic}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t pt-4 space-y-2">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Speichern...
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Änderungen speichern
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="w-full"
                      >
                        Bearbeitung abbrechen
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleDownloadPdf} className="w-full" disabled={downloadingPdf}>
                        {downloadingPdf ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generiere PDF...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            PDF herunterladen
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleSendEmail}
                        disabled={sendingEmail}
                      >
                        {sendingEmail ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                            Sende E-Mail...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Per E-Mail senden
                          </>
                        )}
                      </Button>

                      {/* Reminder Button - Only show for unpaid invoices */}
                      {invoice.status !== 'Bezahlt' && invoice.status !== 'Storniert' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full mt-3 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                              disabled={sendingReminder}
                            >
                              {sendingReminder ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                                  Sende...
                                </>
                              ) : (
                                <>
                                  <Bell className="h-4 w-4 mr-2" />
                                  Erinnerung / Mahnung
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>Mahnwesen</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleSendReminder('reminder')}>
                              <Bell className="mr-2 h-4 w-4" />
                              <span>Erinnerung senden</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReminder('first_notice')}>
                              <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                              <span>1. Mahnung</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReminder('second_notice')}>
                              <AlertOctagon className="mr-2 h-4 w-4 text-red-500" />
                              <span>2. Mahnung</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReminder('final_notice')}>
                              <AlertCircle className="mr-2 h-4 w-4 text-red-700 font-bold" />
                              <span className="text-red-700 font-bold">3. Mahnung (Letzte)</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Storno Button - Only show for non-cancelled invoices */}
                      {invoice.status !== 'Storniert' && (
                        <Button
                          variant="outline"
                          className="w-full mt-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                          onClick={handleCancel}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Storno erstellen
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Verlauf</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceTimeline history={(invoice as any).history || []} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${toastMessage.type === 'success'
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
          }`}>
          <div className="flex items-center">
            {toastMessage.type === 'success' ? (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>{toastMessage.message}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-4 text-white hover:text-gray-200"
              title="Schließen"
              aria-label="Nachricht schließen"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Invoice Preview Dialog */}
      {invoice && (
        <InvoicePreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          data={{
            customer: {
              ...invoice.customer,
              type: invoice.customer.companyName ? 'company' : 'person'
            },
            invoiceData: {
              invoiceNumber: invoice.number,
              date: invoice.date,
              deliveryDate: invoice.serviceDate || invoice.date,
              headerSubject: invoice.headerSubject || `Rechnung Nr. ${invoice.number}`,
              headerText: invoice.headerText || '',
              footerText: invoice.footerText || ''
            },
            items: invoice.items.map(item => ({
              ...item,
              unit: 'Stk', // Default unit
              vat: invoice.taxRate || 19
            })),
            settings: {
              companySettings: {
                ...invoice.organization,
                logoPath: (invoice.organization as any).logoUrl || (invoice.organization as any).logo || null,
                postalCode: invoice.organization.zipCode || (invoice.organization as any).zip || ''
              },
              internalContact: invoice.settings?.internalContact || '',
              currency: invoice.settings?.currency || 'EUR'
            }
          }}
        />
      )}
    </div>
  )
}
