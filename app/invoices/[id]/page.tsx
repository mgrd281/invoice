'use client'

import { HeaderNavIcons } from '@/components/navigation/header-nav-icons'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Download, Edit, Save, X, Mail, ArrowLeft, FileText, Plus, Trash2, Calculator, Bell, AlertTriangle, AlertOctagon, AlertCircle, UserX, ShieldAlert } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
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
import { useSafeNavigation } from '@/hooks/use-safe-navigation'
import { BackButton } from '@/components/navigation/back-button'

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
  const { navigate } = useSafeNavigation()
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
  const [showPreview, setShowPreview] = useState(false)

  const { showToast, ToastContainer } = useToast()

  useEffect(() => {
    if (id) {
      fetchInvoice()
    }
  }, [id])

  const fetchInvoice = async () => {
    try {
      console.log('Fetching invoice with ID:', id)
      const response = await fetch(`/api/invoices/${id}`)
      if (!response.ok) throw new Error('Invoice not found')
      const invoiceData = await response.json()
      setInvoice(invoiceData)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      showToast('Rechnung konnte nicht geladen werden', 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadInvoicePDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      console.log('🔄 Starting PDF download for invoice:', invoiceId, invoiceNumber)
      showToast('PDF wird generiert...', 'loading')

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

      if (response.ok) {
        const blob = await response.blob()
        if (blob.size > 100) {
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${invoiceNumber}.pdf`
          a.style.display = 'none'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)

          showToast('', 'success', {
            title: 'PDF heruntergeladen',
            description: invoiceNumber ? `Rechnung #${invoiceNumber} wurde gespeichert.` : 'Rechnung wurde gespeichert.',
            variant: 'premium',
            duration: 6000
          })
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

      try {
        const directUrl = `/api/invoices/${invoiceId}/download-pdf`
        window.open(directUrl, '_blank')
        showToast('PDF wird in neuem Tab geöffnet...', 'info')
      } catch (fallbackError) {
        showToast('Alle Download-Methoden fehlgeschlagen.', 'error')
      }
    }
  }

  const handleDownloadPdf = async () => {
    if (!invoice) return
    setDownloadingPdf(true)
    try {
      await downloadInvoicePDF(invoice.id, invoice.number)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleSendEmail = async () => {
    if (!invoice) return
    setSendingEmail(true)
    try {
      showToast('E-Mail wird gesendet...', 'loading')
      const response = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          customerEmail: invoice.customer.email,
          customerName: invoice.customer.name || invoice.customer.companyName || 'Kunde',
          invoiceNumber: invoice.number,
          emailSubject: `Rechnung ${invoice.number}`,
          emailMessage: `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invoice.number}.\n\nVielen Dank für Ihr Vertrauen.`,
          invoiceAmount: invoice.total,
          dueDate: invoice.dueDate
        }),
      })

      const result = await response.json()
      if (result.success) {
        showToast('E-Mail erfolgreich versendet', 'success')
      } else {
        throw new Error(result.error || 'Unbekannter Fehler')
      }
    } catch (error) {
      showToast(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSendReminder = async (level: string = 'reminder') => {
    if (!invoice) return
    setSendingReminder(true)
    try {
      showToast('Zahlungserinnerung wird erstellt...', 'loading')
      const response = await fetch('/api/reminders/send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, reminderLevel: level }),
      })
      const result = await response.json()
      if (result.success) {
        showToast('Erinnerung erfolgreich gesendet', 'success')
      } else {
        throw new Error(result.error || 'Unbekannter Fehler')
      }
    } catch (error) {
      showToast('Fehler beim Senden', 'error')
    } finally {
      setSendingReminder(false)
    }
  }

  const handleCancel = async () => {
    if (!invoice) return
    if (invoice.order?.shopifyOrderId) {
      if (window.confirm('Bestellung auch in Shopify stornieren?')) {
        try {
          showToast('Shopify-Stornierung läuft...', 'loading')
          const response = await fetch('/api/shopify/cancel-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: invoice.id }),
          })
          const result = await response.json()
          if (result.success) showToast('Shopify-Bestellung storniert', 'success')
        } catch (error) {
          showToast('Shopify-Fehler', 'error')
        }
      }
    }
    navigate(`/invoices/${invoice.id}/cancel`)
  }

  const handleEditInvoice = () => {
    if (!invoice) return
    setEditableInvoice({ ...invoice, items: [...invoice.items] })
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editableInvoice) return
    setSaving(true)
    try {
      showToast('Speichere Änderungen...', 'loading')
      const subtotal = editableInvoice.items.reduce((sum, item) => sum + item.total, 0)
      const taxAmount = subtotal * (editableInvoice.taxRate / 100)
      const total = subtotal + taxAmount
      const updatedInvoice = { ...editableInvoice, subtotal, taxAmount, total }

      const response = await fetch(`/api/invoices/${editableInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInvoice),
      })

      if (response.ok) {
        setInvoice(updatedInvoice)
        setIsEditing(false)
        showToast('Rechnung wurde aktualisiert', 'success')
        window.dispatchEvent(new CustomEvent('invoicesUpdated'))
      } else {
        throw new Error('Save failed')
      }
    } catch (error) {
      showToast('Fehler beim Speichern', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditableInvoice(null)
  }

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
      total: 0
    }
    setEditableInvoice({ ...editableInvoice, items: [...editableInvoice.items, newItem] })
  }

  const removeItem = (index: number) => {
    if (!editableInvoice) return
    const newItems = editableInvoice.items.filter((_, i) => i !== index)
    setEditableInvoice({ ...editableInvoice, items: newItems })
  }

  const handleBlockCustomer = async () => {
    if (!invoice?.customer?.email) return
    if (!confirm(`Nutzer ${invoice.customer.email} blockieren?`)) return
    try {
      const res = await fetch('/api/blocked-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invoice.customer.email,
          name: invoice.customer.name,
          reason: `Blockiert über Rechnung ${invoice.number}`
        })
      })
      if (res.ok) showToast('Kunde blockiert', 'success')
      else showToast('Fehler', 'error')
    } catch (e) {
      showToast('Fehler', 'error')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'bezahlt': case 'paid': return 'bg-green-100 text-green-800'
      case 'erstattet': return 'bg-blue-100 text-blue-800'
      case 'storniert': case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'offen': case 'sent': case 'open': return 'bg-gray-100 text-gray-600'
      case 'mahnung': case 'überfällig': case 'overdue': return 'bg-red-100 text-red-800'
      case 'blocked': case 'on_hold': return 'bg-red-800 text-white'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-center"><div><h2 className="text-xl font-bold">Rechnung nicht gefunden</h2><Button onClick={() => navigate('/invoices')} className="mt-4">Zurück</Button></div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <HeaderNavIcons />
              <div className="mx-2" />
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  Rechnung {invoice.number}
                  {isEditing && <span className="ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Bearbeiten</span>}
                </h1>
                <p className="text-sm text-gray-600">{new Date(invoice.date).toLocaleDateString('de-DE')}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowPreview(true)}>Vorschau</Button>
              <Button variant="outline" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                {downloadingPdf ? 'Lade...' : <><Download className="h-4 w-4 mr-2" /> PDF</>}
              </Button>
              {isEditing ? (
                <><Button onClick={handleSaveEdit} disabled={saving}>Speichern</Button><Button variant="outline" onClick={handleCancelEdit}>X</Button></>
              ) : (
                <Button variant="outline" onClick={handleEditInvoice}>Bearbeiten</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle>Details</CardTitle>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>{invoice.status}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-gray-500">Von</p><p className="font-bold">{invoice.organization.name}</p></div>
                  <div><p className="text-sm text-gray-500">An</p><p className="font-bold">{invoice.customer.name}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Positionen</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Bezeichnung</TableHead><TableHead>Menge</TableHead><TableHead>Preis</TableHead><TableHead className="text-right">Gesamt</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isEditing && editableInvoice ? editableInvoice.items : invoice.items).map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell>{isEditing ? <Input value={item.description} onChange={e => updateEditableItem(idx, 'description', e.target.value)} /> : item.description}</TableCell>
                        <TableCell>{isEditing ? <Input type="number" value={item.quantity} onChange={e => updateEditableItem(idx, 'quantity', parseFloat(e.target.value))} /> : item.quantity}</TableCell>
                        <TableCell>{isEditing ? <Input type="number" value={item.unitPrice} onChange={e => updateEditableItem(idx, 'unitPrice', parseFloat(e.target.value))} /> : `€${item.unitPrice.toFixed(2)}`}</TableCell>
                        <TableCell className="text-right">€{item.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Aktionen</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={handleSendEmail} disabled={sendingEmail}>{sendingEmail ? 'Sende...' : 'E-Mail senden'}</Button>
                <Button variant="outline" className="w-full" onClick={() => handleSendReminder()} disabled={sendingReminder}>Erinnerung</Button>
                <Button variant="outline" className="w-full text-red-600" onClick={handleCancel}>Stornieren</Button>
              </CardContent>
            </Card>

            <InvoiceTimeline history={invoice.history || []} />
          </div>
        </div>
      </main>


      <InvoicePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        design={invoice.settings?.design}
        onDesignChange={async (newDesign) => {
          // Update local state immediately
          setInvoice(prev => prev ? {
            ...prev,
            settings: { ...prev.settings, design: newDesign }
          } : null)

          // Persist to server
          try {
            await fetch(`/api/invoices/${invoice.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ design: newDesign })
            })
          } catch (err) {
            console.error('Failed to save design:', err)
          }
        }}
        data={{
          customer: invoice.customer,
          invoiceData: {
            invoiceNumber: invoice.number,
            date: invoice.date,
            dueDate: invoice.dueDate,
          },
          items: invoice.items,
          settings: {
            companySettings: invoice.organization
          }
        }}
      />
      <ToastContainer />
    </div>
  )
}
