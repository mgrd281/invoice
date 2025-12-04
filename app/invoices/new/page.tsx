'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FileText, ArrowLeft, Plus, Trash2, Save, Calculator, Bookmark, Download, QrCode } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { DashboardUpdater } from '@/lib/dashboard-updater'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { InvoiceTemplate as RechnungsTemplate, getDefaultTemplate } from '@/lib/invoice-templates'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  ean?: string
}

interface Customer {
  name: string
  companyName: string
  email: string
  address: string
  zipCode: string
  city: string
  country: string
}

interface ItemTemplate {
  id: string
  name: string
  items: InvoiceItem[]
  taxRate: number
  createdAt: string
}

export default function NewInvoicePage() {
  const { user, isAuthenticated } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()

  const [customer, setCustomer] = useState<Customer>({
    name: '',
    companyName: '',
    email: '',
    address: '',
    zipCode: '',
    city: '',
    country: 'DE'
  })

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0, ean: '' }
  ])

  // Invoice number generation removed - now manual input only

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    taxRate: 19,
    status: 'Offen'
  })

  const [saving, setSaving] = useState(false)

  // Item Template management (for invoice items)
  const [itemTemplates, setItemTemplates] = useState<ItemTemplate[]>([])
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')

  // Invoice Template management (for invoice layout/texts)
  const [invoiceTemplates, setInvoiceTemplates] = useState<RechnungsTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<RechnungsTemplate | null>(null)

  // QR-Code payment settings
  const [qrCodeSettings, setQrCodeSettings] = useState({
    enabled: false,
    paymentMethod: 'sepa', // 'sepa', 'paypal', 'custom'
    iban: '',
    bic: '',
    paypalEmail: '',
    customText: '',
    recipientName: '',
    placement: 'flex-beside-thanks' // 'flex-beside-thanks', 'left-below-table', 'top-right-outside-info', 'top-right-summary', 'bottom-right-footer'
  })

  // Load item templates from localStorage and invoice templates from API
  useEffect(() => {
    const savedTemplates = localStorage.getItem('invoiceTemplates')
    if (savedTemplates) {
      setItemTemplates(JSON.parse(savedTemplates))
    }

    // Load invoice templates from API
    loadInvoiceTemplates()
  }, [])

  const loadInvoiceTemplates = async () => {
    try {
      const response = await authenticatedFetch('/api/invoice-templates')
      const result = await response.json()

      if (result.success) {
        setInvoiceTemplates(result.data)
        // Set default template
        const defaultTemplate = result.data.find((t: RechnungsTemplate) => t.isDefault)
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate)
        }
      }
    } catch (error) {
      console.error('Error loading invoice templates:', error)
      // Use fallback default template
      const fallbackTemplate = getDefaultTemplate()
      setSelectedTemplate(fallbackTemplate)
    }
  }

  // Invoice number will be entered manually by user
  // useEffect removed to disable automatic generation

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice
        }
        return updatedItem
      }
      return item
    }))
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      ean: ''
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  // EAN validation function
  const validateEAN = (ean: string): boolean => {
    if (!ean || ean.trim() === '') return true // Empty EAN is valid (optional field)
    const cleanEAN = ean.replace(/\D/g, '') // Remove non-digits
    return [8, 12, 13, 14].includes(cleanEAN.length)
  }

  const getEANValidationMessage = (ean: string): string => {
    if (!ean || ean.trim() === '') return ''
    const cleanEAN = ean.replace(/\D/g, '')
    if (![8, 12, 13, 14].includes(cleanEAN.length)) {
      return 'EAN muss 8, 12, 13 oder 14 Ziffern haben'
    }
    return ''
  }

  // Status color function
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Bezahlt': return 'bg-green-100 text-green-800'
      case 'Erstattet': return 'bg-blue-100 text-blue-800'
      case 'Storniert': return 'bg-gray-100 text-gray-800'
      case 'Offen': return 'bg-gray-100 text-gray-600'
      case 'Mahnung': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  // Item Template functions
  const saveItemTemplate = () => {
    if (!templateName.trim()) {
      alert('Bitte geben Sie einen Namen für die Vorlage ein')
      return
    }

    const validItems = items.filter((item: InvoiceItem) => item.description.trim() !== '')
    if (validItems.length === 0) {
      alert('Bitte fügen Sie mindestens eine Position hinzu')
      return
    }

    const newTemplate: ItemTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: templateName,
      items: validItems.map((item: InvoiceItem) => ({ ...item, id: `item-${Math.random().toString(36).substr(2, 9)}` })),
      taxRate: invoiceData.taxRate,
      createdAt: new Date().toISOString()
    }

    const updatedTemplates = [...itemTemplates, newTemplate]
    setItemTemplates(updatedTemplates)
    localStorage.setItem('invoiceTemplates', JSON.stringify(updatedTemplates))

    setTemplateName('')
    setShowSaveTemplateDialog(false)
    alert('Vorlage erfolgreich gespeichert!')
  }

  const applyItemTemplate = (template: ItemTemplate) => {
    // Apply template items
    setItems(template.items.map(item => ({
      ...item,
      id: `item-${Math.random().toString(36).substr(2, 9)}`
    })))

    // Apply tax rate
    setInvoiceData(prev => ({ ...prev, taxRate: template.taxRate }))

    setShowApplyTemplateDialog(false)
  }

  const deleteItemTemplate = (templateId: string) => {
    if (!confirm('Möchten Sie diese Vorlage wirklich löschen?')) return

    const updatedTemplates = itemTemplates.filter((t: ItemTemplate) => t.id !== templateId)
    setItemTemplates(updatedTemplates)
    localStorage.setItem('invoiceTemplates', JSON.stringify(updatedTemplates))
    alert('Vorlage erfolgreich gelöscht!')
  }

  // Brutto-Berechnung - Preise inklusive Steuer
  const grossTotal = items.reduce((sum, item) => sum + item.total, 0) // Gesamtsumme (inkl. Steuer)
  const netTotal = grossTotal / (1 + invoiceData.taxRate / 100) // Nettosumme = Brutto / 1.19
  const taxAmount = grossTotal - netTotal // Steuer = Brutto - Netto

  // For display purposes
  const subtotal = netTotal // Zwischensumme (Netto)
  const total = grossTotal // Gesamtsumme (Brutto)

  const handleSave = async () => {
    // Prevent multiple submissions
    if (saving) {
      console.log('Save already in progress, ignoring duplicate request')
      return
    }

    setSaving(true)

    try {
      // Validate required fields
      if (!invoiceData.invoiceNumber.trim()) {
        alert('Bitte geben Sie eine Rechnungsnummer ein')
        setSaving(false)
        return
      }

      if (!customer.name.trim()) {
        alert('Bitte geben Sie einen Kundennamen ein')
        setSaving(false)
        return
      }

      if (!customer.email.trim()) {
        alert('Bitte geben Sie eine E-Mail-Adresse ein')
        setSaving(false)
        return
      }

      const validItems = items.filter(item => item.description.trim() !== '')
      if (validItems.length === 0) {
        alert('Bitte fügen Sie mindestens eine Rechnungsposition hinzu')
        setSaving(false)
        return
      }

      // Use the manually entered invoice number
      console.log('Creating invoice with data:', {
        invoiceNumber: invoiceData.invoiceNumber,
        customer: customer.name,
        itemCount: validItems.length,
        total: total,
        qrCodeSettings: qrCodeSettings
      })

      const invoicePayload = {
        ...invoiceData,
        // invoiceNumber already included in invoiceData
        customer,
        items: validItems,
        subtotal,
        taxAmount,
        total,
        status: invoiceData.status,
        statusColor: getStatusColor(invoiceData.status),
        // Include selected template information
        templateId: selectedTemplate?.id,
        templateName: selectedTemplate?.name,
        templateType: selectedTemplate?.type,
        // Include QR-Code payment settings
        qrCodeSettings: qrCodeSettings.enabled ? qrCodeSettings : null
      }

      const response = await authenticatedFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoicePayload),
      })

      console.log('API Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Invoice created successfully:', result.id)

        // Trigger dashboard update
        DashboardUpdater.dispatchInvoiceCreated(result)

        // Prevent further submissions by keeping saving state true
        alert('Rechnung erfolgreich erstellt!')

        // Disable the form completely to prevent any further submissions
        const form = document.querySelector('form')
        if (form) {
          const inputs = form.querySelectorAll('input, button, select, textarea')
          inputs.forEach(input => (input as HTMLElement).setAttribute('disabled', 'true'))
        }

        // Also disable the entire page to prevent any interaction
        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.1);
          z-index: 9999;
          cursor: not-allowed;
        `
        document.body.appendChild(overlay)

        // Use a longer timeout to ensure no race conditions
        setTimeout(() => {
          window.location.href = '/invoices'
        }, 1500)
      } else {
        const error = await response.json()
        console.error('API Error:', error)
        alert('Fehler beim Erstellen der Rechnung: ' + (error.error || 'Unbekannter Fehler'))
        setSaving(false) // Re-enable button only on error
      }

    } catch (error) {
      console.error('Network error:', error)
      alert('Netzwerkfehler beim Speichern der Rechnung')
      setSaving(false) // Re-enable button only on error
    }
    // Note: We don't set setSaving(false) on success to prevent double submissions
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
              <h1 className="text-2xl font-bold text-gray-900">
                Neue Rechnung erstellen
              </h1>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Rechnung speichern
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle>Rechnungsdetails</CardTitle>
                <CardDescription>
                  Grundlegende Informationen zur Rechnung
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechnungsnummer
                  </label>
                  <Input
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                    placeholder="z.B. RE-2025-001"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechnungsvorlage & Status
                  </label>
                  <div className="relative">
                    <Select
                      value={selectedTemplate?.id || ''}
                      onValueChange={(value) => {
                        const template = invoiceTemplates.find(t => t.id === value)
                        if (template) {
                          setSelectedTemplate(template)

                          // Auto-fill invoice data based on template defaults (with fallbacks for old templates)
                          const defaults = template.defaults || {
                            status: 'Offen',
                            dueDays: 14,
                            taxRate: 19,
                            showBankDetails: true,
                            showPaymentInstructions: true
                          }

                          setInvoiceData(prev => ({
                            ...prev,
                            status: defaults.status,
                            taxRate: defaults.taxRate,
                            dueDate: new Date(Date.now() + defaults.dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          }))

                          console.log(`✅ Template applied: ${template.name}`)
                          console.log(`📋 Auto-filled: Status=${defaults.status}, Tax=${defaults.taxRate}%, Due=${defaults.dueDays} days`)
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 border border-gray-300 hover:border-gray-400 focus:border-blue-500 flex items-center">
                        <SelectValue placeholder="Vorlage auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceTemplates.map((template) => {
                          const defaults = template.defaults || { status: 'Offen' }
                          const statusColor =
                            defaults.status === 'Bezahlt' ? 'text-green-600' :
                              defaults.status === 'Storniert' ? 'text-red-600' :
                                defaults.status === 'Erstattet' ? 'text-purple-600' :
                                  defaults.status === 'Mahnung' ? 'text-orange-600' :
                                    'text-blue-600'

                          // Remove status icons - clean text only

                          return (
                            <SelectItem key={template.id} value={template.id} className="py-2">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center flex-1">
                                  <div className={`w-2 h-2 rounded-full mr-3 ${defaults.status === 'Bezahlt' ? 'bg-green-500' :
                                      defaults.status === 'Storniert' ? 'bg-red-500' :
                                        defaults.status === 'Erstattet' ? 'bg-purple-500' :
                                          defaults.status === 'Mahnung' ? 'bg-orange-500' :
                                            'bg-blue-500'
                                    }`}></div>
                                  <div className="flex items-center">
                                    <span className="font-medium text-sm">{template.name}</span>
                                    {template.isDefault && (
                                      <span className="ml-2 text-xs text-blue-600 font-medium">Standard</span>
                                    )}
                                  </div>
                                </div>
                                <span className={`ml-3 text-xs font-medium px-2 py-1 rounded ${defaults.status === 'Bezahlt' ? 'bg-green-100 text-green-700' :
                                    defaults.status === 'Storniert' ? 'bg-red-100 text-red-700' :
                                      defaults.status === 'Erstattet' ? 'bg-purple-100 text-purple-700' :
                                        defaults.status === 'Mahnung' ? 'bg-orange-100 text-orange-700' :
                                          'bg-blue-100 text-blue-700'
                                  }`}>
                                  {defaults.status}
                                </span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {selectedTemplate && (
                      <div className="mt-2 p-2 bg-gray-50 rounded border text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Ausgewählt: <span className="font-medium">{selectedTemplate.name}</span></span>
                          <span className={`text-xs px-2 py-1 rounded ${invoiceData.status === 'Bezahlt' ? 'bg-green-100 text-green-700' :
                              invoiceData.status === 'Storniert' ? 'bg-red-100 text-red-700' :
                                invoiceData.status === 'Erstattet' ? 'bg-purple-100 text-purple-700' :
                                  invoiceData.status === 'Mahnung' ? 'bg-orange-100 text-orange-700' :
                                    'bg-blue-100 text-blue-700'
                            }`}>
                            {invoiceData.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Steuersatz (%)
                  </label>
                  <Input
                    type="number"
                    value={invoiceData.taxRate}
                    onChange={(e) => setInvoiceData({ ...invoiceData, taxRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechnungsdatum
                  </label>
                  <Input
                    type="date"
                    value={invoiceData.date}
                    onChange={(e) => setInvoiceData({ ...invoiceData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fälligkeitsdatum
                  </label>
                  <Input
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Kundeninformationen</CardTitle>
                <CardDescription>
                  Rechnungsempfänger Details
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <Input
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="z.B. Max Mustermann"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firmenname
                  </label>
                  <Input
                    value={customer.companyName}
                    onChange={(e) => setCustomer({ ...customer, companyName: e.target.value })}
                    placeholder="z.B. Mustermann GmbH"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail-Adresse
                  </label>
                  <Input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="kunde@beispiel.de"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Straße und Hausnummer
                  </label>
                  <Input
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    placeholder="Musterstraße 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PLZ
                  </label>
                  <Input
                    value={customer.zipCode}
                    onChange={(e) => setCustomer({ ...customer, zipCode: e.target.value })}
                    placeholder="12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stadt
                  </label>
                  <Input
                    value={customer.city}
                    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    placeholder="Berlin"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Land
                  </label>
                  <Select
                    value={customer.country}
                    onValueChange={(value) => setCustomer({ ...customer, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Land auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DE">Deutschland</SelectItem>
                      <SelectItem value="AT">Österreich</SelectItem>
                      <SelectItem value="CH">Schweiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Rechnungspositionen</CardTitle>
                  <CardDescription>
                    Produkte und Dienstleistungen
                  </CardDescription>
                </div>

                {/* Action Buttons Bar */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                  <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        <Bookmark className="h-4 w-4 mr-2" />
                        Vorlage speichern
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Vorlage speichern</DialogTitle>
                        <DialogDescription>
                          Speichern Sie die aktuellen Positionen als Vorlage für zukünftige Rechnungen.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="templateName">Name der Vorlage</Label>
                          <Input
                            id="templateName"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="z.B. Standard Beratung"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
                            Abbrechen
                          </Button>
                          <Button onClick={saveItemTemplate}>
                            Speichern
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showApplyTemplateDialog} onOpenChange={setShowApplyTemplateDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        <Download className="h-4 w-4 mr-2" />
                        Vorlage anwenden
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Vorlage anwenden</DialogTitle>
                        <DialogDescription>
                          Wählen Sie eine gespeicherte Vorlage aus, um die Positionen zu übernehmen.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {itemTemplates.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">
                            Keine Vorlagen gespeichert
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {itemTemplates.map((template: ItemTemplate) => (
                              <div key={template.id} className="flex items-center justify-between p-3 border rounded">
                                <div>
                                  <h4 className="font-medium">{template.name}</h4>
                                  <p className="text-sm text-gray-500">
                                    {template.items.length} Position(en) • {template.taxRate}% MwSt.
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => applyItemTemplate(template)}
                                  >
                                    Anwenden
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteItemTemplate(template.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-end">
                          <Button variant="outline" onClick={() => setShowApplyTemplateDialog(false)}>
                            Schließen
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button onClick={addItem} variant="outline" size="sm" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Position hinzufügen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                      {/* First row: Description and EAN */}
                      <div className="grid grid-cols-12 gap-4 mb-4">
                        <div className="col-span-8">
                          {index === 0 && (
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Beschreibung
                            </label>
                          )}
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Produktbeschreibung"
                          />
                        </div>
                        <div className="col-span-4">
                          {index === 0 && (
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              EAN <span className="text-xs text-gray-500">(optional)</span>
                            </label>
                          )}
                          <Input
                            value={item.ean || ''}
                            onChange={(e) => updateItem(item.id, 'ean', e.target.value)}
                            placeholder="z.B. 1234567890123"
                            className={!validateEAN(item.ean || '') ? 'border-yellow-300 bg-yellow-50' : ''}
                          />
                          {!validateEAN(item.ean || '') && (
                            <p className="text-xs text-yellow-600 mt-1">
                              {getEANValidationMessage(item.ean || '')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Second row: Quantity, Price, Total, Delete */}
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-2">
                          {index === 0 && (
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Menge
                            </label>
                          )}
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3">
                          {index === 0 && (
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Einzelpreis (€) <span className="text-xs text-blue-600">inkl. 19% MwSt</span>
                            </label>
                          )}
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3">
                          {index === 0 && (
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Gesamt (€)
                            </label>
                          )}
                          <Input
                            value={item.total.toFixed(2)}
                            readOnly
                            className="bg-gray-100"
                          />
                        </div>
                        <div className="col-span-4 flex justify-end">
                          {index === 0 && (
                            <div className="h-5 mb-1"></div>
                          )}
                          <Button
                            onClick={() => removeItem(item.id)}
                            variant="outline"
                            size="sm"
                            disabled={items.length === 1}
                            className="w-auto"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Entfernen
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Rechnungssumme
                </CardTitle>
                <CardDescription className="text-xs text-blue-600">
                  ℹ️ Einzelpreise sind bereits inkl. 19% MwSt eingegeben
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Zwischensumme:</span>
                  <span className="font-medium">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MwSt. ({invoiceData.taxRate}%):</span>
                  <span className="font-medium">€{taxAmount.toFixed(2)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Gesamtsumme:</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Invoice Preview Info */}
                <div className="border-t pt-4 space-y-2">
                  <div className="text-sm text-gray-600">
                    <strong>Rechnungsnummer:</strong><br />
                    {invoiceData.invoiceNumber}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Status:</strong><br />
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoiceData.status)}`}>
                      {invoiceData.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Datum:</strong><br />
                    {new Date(invoiceData.date).toLocaleDateString('de-DE')}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Fällig am:</strong><br />
                    {new Date(invoiceData.dueDate).toLocaleDateString('de-DE')}
                  </div>
                </div>

                {/* QR-Code Payment Settings */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <QrCode className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">QR-Code für Zahlung</span>
                    </div>
                    <Switch
                      checked={qrCodeSettings.enabled}
                      onCheckedChange={(checked) =>
                        setQrCodeSettings(prev => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>

                  {qrCodeSettings.enabled && (
                    <div className="space-y-3 pl-6 border-l-2 border-blue-100">
                      <div>
                        <Label htmlFor="paymentMethod" className="text-xs">Zahlungsmethode</Label>
                        <Select
                          value={qrCodeSettings.paymentMethod}
                          onValueChange={(value) =>
                            setQrCodeSettings(prev => ({ ...prev, paymentMethod: value }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sepa">SEPA-Überweisung</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                            <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="qrPlacement" className="text-xs">QR-Code Position</Label>
                        <Select
                          value={qrCodeSettings.placement}
                          onValueChange={(value) =>
                            setQrCodeSettings(prev => ({ ...prev, placement: value }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flex-beside-thanks">Flex: Neben Dankes-Text</SelectItem>
                            <SelectItem value="left-below-table">Links unterhalb Tabelle</SelectItem>
                            <SelectItem value="top-right-outside-info">Oben rechts (außerhalb Info-Box)</SelectItem>
                            <SelectItem value="top-right-summary">Oben rechts (bei Gesamt)</SelectItem>
                            <SelectItem value="bottom-right-footer">Unten rechts (über Fußzeile)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {qrCodeSettings.paymentMethod === 'sepa' && (
                        <>
                          <div>
                            <Label htmlFor="recipientName" className="text-xs">Empfängername</Label>
                            <Input
                              id="recipientName"
                              value={qrCodeSettings.recipientName}
                              onChange={(e) =>
                                setQrCodeSettings(prev => ({ ...prev, recipientName: e.target.value }))
                              }
                              placeholder="Firmenname"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label htmlFor="iban" className="text-xs">IBAN</Label>
                            <Input
                              id="iban"
                              value={qrCodeSettings.iban}
                              onChange={(e) =>
                                setQrCodeSettings(prev => ({ ...prev, iban: e.target.value }))
                              }
                              placeholder="DE89 3704 0044 0532 0130 00"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label htmlFor="bic" className="text-xs">BIC (optional)</Label>
                            <Input
                              id="bic"
                              value={qrCodeSettings.bic}
                              onChange={(e) =>
                                setQrCodeSettings(prev => ({ ...prev, bic: e.target.value }))
                              }
                              placeholder="COBADEFFXXX"
                              className="h-8 text-xs"
                            />
                          </div>
                        </>
                      )}

                      {qrCodeSettings.paymentMethod === 'paypal' && (
                        <div>
                          <Label htmlFor="paypalEmail" className="text-xs">PayPal E-Mail</Label>
                          <Input
                            id="paypalEmail"
                            value={qrCodeSettings.paypalEmail}
                            onChange={(e) =>
                              setQrCodeSettings(prev => ({ ...prev, paypalEmail: e.target.value }))
                            }
                            placeholder="payment@company.com"
                            className="h-8 text-xs"
                          />
                        </div>
                      )}

                      {qrCodeSettings.paymentMethod === 'custom' && (
                        <div>
                          <Label htmlFor="customText" className="text-xs">Benutzerdefinierter Text</Label>
                          <Input
                            id="customText"
                            value={qrCodeSettings.customText}
                            onChange={(e) =>
                              setQrCodeSettings(prev => ({ ...prev, customText: e.target.value }))
                            }
                            placeholder="Zahlungslink oder Anweisungen"
                            className="h-8 text-xs"
                          />
                        </div>
                      )}

                      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                        💡 Der QR-Code wird automatisch auf der Rechnung generiert und enthält alle Zahlungsinformationen.
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleSave} className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Rechnung erstellen
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
