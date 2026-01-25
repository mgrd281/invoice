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
import { Textarea } from '@/components/ui/textarea'
import {
  FileText, ArrowLeft, Plus, Trash2, Save, Calculator, Bookmark, Download, QrCode,
  MoreHorizontal, Calendar, Search, Settings
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { DashboardUpdater } from '@/lib/dashboard-updater'
import { useAuth } from '@/hooks/use-auth-compat'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { DocumentKind } from '@/lib/document-types'
import { useSafeNavigation } from '@/hooks/use-safe-navigation'
import { BackButton } from '@/components/navigation/back-button'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  vat: number
  discount: number
  total: number
  ean?: string
}

interface Customer {
  type: 'organization' | 'person'
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

import { InvoicePreviewDialog } from '@/components/invoice-preview-dialog'

export default function NewInvoicePage() {
  const { user, isAuthenticated } = useAuth()
  const { navigate } = useSafeNavigation()
  const authenticatedFetch = useAuthenticatedFetch()
  const { showToast } = useToast()

  const [showPreview, setShowPreview] = useState(false)

  const [customer, setCustomer] = useState<Customer>({
    type: 'organization',
    name: '',
    companyName: '',
    email: '',
    address: '',
    zipCode: '',
    city: '',
    country: 'DE'
  })

  const [companySettings, setCompanySettings] = useState<any>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/company-settings')
        if (response.ok) {
          const data = await response.json()
          setCompanySettings(data)
          // Set default internal contact if available
          if (data.companyName) {
            setInternalContact(data.companyName)
          }
        }
      } catch (error) {
        console.error('Error fetching company settings:', error)
      }
    }
    fetchSettings()
  }, [])

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unit: 'Stk', unitPrice: 0, vat: 19, discount: 0, total: 0, ean: '' }
  ])

  // Invoice settings
  const [isERechnung, setIsERechnung] = useState(false)
  const [currency, setCurrency] = useState('EUR')
  const [skonto, setSkonto] = useState({ days: 0, percent: 0 })
  const [internalContact, setInternalContact] = useState('')
  const [revenueAccount, setRevenueAccount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Kein Standard')
  const [costCenter, setCostCenter] = useState('')
  const [vatRegulation, setVatRegulation] = useState('In Deutschland')

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: 'RE-1000',
    date: new Date().toISOString().split('T')[0],
    deliveryDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    referenceNumber: '',
    headerSubject: 'Rechnung Nr. RE-1000',
    headerText: 'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihren Auftrag und das damit verbundene Vertrauen!\nHiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:',
    footerText: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten angegebene Konto.\nDer Rechnungsbetrag ist bis zum [%ZAHLUNGSZIEL%] fällig.\n\nMit freundlichen Grüßen\n[%KONTAKTPERSON%]',
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
  interface RechnungsTemplate {
    id: string
    name: string
    isDefault: boolean
  }
  const [invoiceTemplates, setInvoiceTemplates] = useState<RechnungsTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<RechnungsTemplate | null>(null)

  // Document Type Management
  const [documentKind, setDocumentKind] = useState<DocumentKind>(DocumentKind.INVOICE)
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState('')
  const [reason, setReason] = useState('')
  const [refundAmount, setRefundAmount] = useState<string>('')

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
      setSelectedTemplate(null)
    }
  }

  // Update header subject when invoice number changes
  useEffect(() => {
    setInvoiceData(prev => ({
      ...prev,
      headerSubject: `Rechnung Nr. ${prev.invoiceNumber}`
    }))
  }, [invoiceData.invoiceNumber])

  // Update texts based on document kind
  useEffect(() => {
    switch (documentKind) {
      case DocumentKind.INVOICE:
        setInvoiceData(prev => ({
          ...prev,
          headerSubject: `Rechnung Nr. ${prev.invoiceNumber}`,
          headerText: 'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihren Auftrag und das damit verbundene Vertrauen!\nHiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:',
          footerText: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten angegebene Konto.\nDer Rechnungsbetrag ist bis zum [%ZAHLUNGSZIEL%] fällig.\n\nMit freundlichen Grüßen\n[%KONTAKTPERSON%]'
        }))
        break
      case DocumentKind.CANCELLATION:
        setInvoiceData(prev => ({
          ...prev,
          headerSubject: `Stornorechnung Nr. ${prev.invoiceNumber}`,
          headerText: 'Sehr geehrte Damen und Herren,\n\nhiermit stornieren wir die Rechnung Nr. [ORIGINAL_RECHNUNGSNUMMER] vom [DATUM].',
          footerText: 'Der Betrag wird Ihrem Konto gutgeschrieben.'
        }))
        break
      case DocumentKind.CREDIT_NOTE:
        setInvoiceData(prev => ({
          ...prev,
          headerSubject: `Gutschrift Nr. ${prev.invoiceNumber}`,
          headerText: 'Sehr geehrte Damen und Herren,\n\nwir erstatten Ihnen hiermit folgenden Betrag:',
          footerText: 'Der Betrag wird in den nächsten Tagen auf Ihr Konto überwiesen.'
        }))
        break
      case DocumentKind.DUNNING_1:
        setInvoiceData(prev => ({
          ...prev,
          headerSubject: `Zahlungserinnerung Nr. ${prev.invoiceNumber}`,
          headerText: 'Sehr geehrte Damen und Herren,\n\nleider konnten wir bis heute keinen Zahlungseingang für die Rechnung Nr. [RECHNUNGSNUMMER] feststellen.\nWir bitten Sie, den offenen Betrag bis zum [NEUES_ZAHLUNGSZIEL] zu begleichen.',
          footerText: 'Sollten Sie die Zahlung bereits geleistet haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.'
        }))
        break
      case DocumentKind.DUNNING_2:
        setInvoiceData(prev => ({
          ...prev,
          headerSubject: `2. Mahnung Nr. ${prev.invoiceNumber}`,
          headerText: 'Sehr geehrte Damen und Herren,\n\ntrotz unserer Zahlungserinnerung konnten wir bisher keinen Zahlungseingang feststellen.\nBitte überweisen Sie den fälligen Betrag inklusive Mahngebühren umgehend.',
          footerText: 'Bei weiteren Verzögerungen müssen wir leider rechtliche Schritte einleiten.'
        }))
        break
      case DocumentKind.DUNNING_3:
        setInvoiceData(prev => ({
          ...prev,
          headerSubject: `3. Mahnung Nr. ${prev.invoiceNumber}`,
          headerText: 'Sehr geehrte Damen und Herren,\n\ndies ist unsere letzte Aufforderung zur Zahlung der offenen Rechnung Nr. [RECHNUNGSNUMMER].\nSollte der Betrag nicht bis zum [FRIST] eingehen, werden wir das Verfahren an ein Inkassobüro übergeben.',
          footerText: 'Dies ist die letzte Mahnung vor Einleitung gerichtlicher Schritte.'
        }))
        break
    }
  }, [documentKind])

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }

        if (field === 'quantity' || field === 'unitPrice' || field === 'vat' || field === 'discount') {
          const basePrice = updatedItem.quantity * updatedItem.unitPrice
          const discountedPrice = basePrice * (1 - updatedItem.discount / 100)
          updatedItem.total = discountedPrice
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
      unit: 'Stk',
      unitPrice: 0,
      vat: 19,
      discount: 0,
      total: 0,
      ean: ''
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

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
    setItems(template.items.map(item => ({
      ...item,
      id: `item-${Math.random().toString(36).substr(2, 9)}`
    })))
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

  // Brutto-Berechnung
  const netTotal = items.reduce((sum, item) => sum + item.total, 0)

  const totalVat = items.reduce((sum, item) => {
    return sum + (item.total * (item.vat / 100))
  }, 0)

  const grossTotal = netTotal + totalVat

  // For display purposes
  const subtotal = netTotal
  const total = grossTotal

  const handleSave = async () => {
    if (saving) return
    setSaving(true)

    try {
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

      const validItems = items.filter(item => item.description.trim() !== '')
      if (validItems.length === 0) {
        alert('Bitte fügen Sie mindestens eine Rechnungsposition hinzu')
        setSaving(false)
        return
      }

      // Prepare data for API
      const apiData = {
        invoiceNumber: invoiceData.invoiceNumber,
        date: invoiceData.date,
        dueDate: invoiceData.dueDate,
        deliveryDate: invoiceData.deliveryDate,
        customer: {
          name: customer.name,
          companyName: customer.companyName,
          email: customer.email,
          address: customer.address,
          zipCode: customer.zipCode,
          city: customer.city,
          country: customer.country,
          type: customer.type
        },
        items: validItems.map(item => ({
          description: item.description,
          ean: item.ean || '',
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          vat: item.vat,
          discount: item.discount,
          total: item.total
        })),
        settings: {
          currency,
          skonto,
          internalContact,
          revenueAccount,
          paymentMethod,
          costCenter,
          vatRegulation,
          headerSubject: invoiceData.headerSubject,
          headerText: invoiceData.headerText,
          footerText: invoiceData.footerText,
          isERechnung
        },
        referenceNumber: invoiceData.referenceNumber,
        documentKind: documentKind,
        originalInvoiceDate: originalInvoiceDate,
        reason: reason,
        refundAmount: refundAmount
      }

      const response = await authenticatedFetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      })

      const result = await response.json()

      if (result.success) {
        DashboardUpdater.dispatchInvoiceCreated()
        showToast('Rechnung erfolgreich erstellt', 'success')
        navigate('/invoices')
      } else {
        throw new Error(result.error || 'Fehler beim Erstellen der Rechnung')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      showToast(
        `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        'error'
      )
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <BackButton fallbackUrl="/dashboard" label="" />
              <h1 className="text-2xl font-bold text-gray-900">Neue Rechnung</h1>
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  checked={isERechnung}
                  onCheckedChange={setIsERechnung}
                  id="e-rechnung"
                />
                <Label htmlFor="e-rechnung" className="text-sm font-medium text-gray-700">E-Rechnung</Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)}>Vorschau</Button>
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
              <Button className="bg-slate-900 text-white hover:bg-slate-800">
                Versenden / Drucken / Herunterladen
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Top Section: Recipient & Invoice Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Empfänger */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Empfänger</h2>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-blue-600 font-medium">Kontakt *</Label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${customer.type === 'organization' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    onClick={() => setCustomer({ ...customer, type: 'organization' })}
                  >
                    Organisation
                  </button>
                  <button
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${customer.type === 'person' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    onClick={() => setCustomer({ ...customer, type: 'person' })}
                  >
                    Person
                  </button>
                </div>
              </div>

              <div className="relative">
                <Input
                  placeholder="Name"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="pr-10"
                />
                <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8 text-blue-600">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex justify-between items-center">
                <Label className="text-blue-600 font-medium">Anschrift *</Label>
                <button className="text-xs text-gray-500 hover:text-gray-900 font-medium">Adresszusatz +</button>
              </div>

              <Input
                placeholder="Straße und Hausnummer"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="Postleitzahl"
                  value={customer.zipCode}
                  onChange={(e) => setCustomer({ ...customer, zipCode: e.target.value })}
                  className="col-span-1"
                />
                <Input
                  placeholder="Ort"
                  value={customer.city}
                  onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                  className="col-span-2"
                />
              </div>

              <Select
                value={customer.country}
                onValueChange={(value) => setCustomer({ ...customer, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Land" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DE">Deutschland</SelectItem>
                  <SelectItem value="AT">Österreich</SelectItem>
                  <SelectItem value="CH">Schweiz</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rechnungsinformationen */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Rechnungsinformationen</h2>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <div className="space-y-2">
                <Label className="text-blue-600 font-medium">Dokumententyp</Label>
                <Select
                  value={documentKind}
                  onValueChange={(value) => setDocumentKind(value as DocumentKind)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dokumententyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DocumentKind.INVOICE}>Rechnung</SelectItem>
                    <SelectItem value={DocumentKind.CANCELLATION}>Stornorechnung</SelectItem>
                    <SelectItem value={DocumentKind.CREDIT_NOTE}>Gutschrift / Erstattung</SelectItem>
                    <SelectItem value={DocumentKind.DUNNING_1}>Mahnung 1</SelectItem>
                    <SelectItem value={DocumentKind.DUNNING_2}>Mahnung 2</SelectItem>
                    <SelectItem value={DocumentKind.DUNNING_3}>Mahnung 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-600 font-medium">Rechnungsdatum *</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={invoiceData.date}
                      onChange={(e) => setInvoiceData({ ...invoiceData, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-blue-600 font-medium">Lieferdatum *</Label>
                    <button className="text-xs text-blue-600 hover:underline">Zeitraum</button>
                  </div>
                  <div className="relative">
                    <Input
                      type="date"
                      value={invoiceData.deliveryDate}
                      onChange={(e) => setInvoiceData({ ...invoiceData, deliveryDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-600 font-medium">Rechnungsnummer *</Label>
                  <div className="relative">
                    <Input
                      value={invoiceData.invoiceNumber}
                      onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                    />
                    <Settings className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">Referenznummer</Label>
                  <Input
                    value={invoiceData.referenceNumber}
                    onChange={(e) => setInvoiceData({ ...invoiceData, referenceNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-600 font-medium">Zahlungsziel</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                    className="w-full"
                  />
                  <span className="text-gray-600 whitespace-nowrap">in</span>
                  <div className="bg-gray-100 px-3 py-2 rounded-md font-medium text-gray-900 w-16 text-center">
                    {Math.ceil((new Date(invoiceData.dueDate).getTime() - new Date(invoiceData.date).getTime()) / (1000 * 60 * 60 * 24))}
                  </div>
                  <span className="text-gray-600">Tagen</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kopftext */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Kopftext</h2>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-600 font-medium">Betreff</Label>
              <Input
                value={invoiceData.headerSubject}
                onChange={(e) => setInvoiceData({ ...invoiceData, headerSubject: e.target.value })}
              />
            </div>
            <Textarea
              value={invoiceData.headerText}
              onChange={(e) => setInvoiceData({ ...invoiceData, headerText: e.target.value })}
              className="min-h-[120px]"
            />
          </div>
        </div>

        {/* Positionen */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Positionen</h2>
            <div className="flex bg-white border border-gray-200 rounded-lg p-1">
              <button className="px-3 py-1 text-sm font-medium text-gray-500 hover:text-gray-900">Brutto</button>
              <button className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-900 rounded-md shadow-sm">Netto</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt oder Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">EAN</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Menge</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Einheit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Preis (Netto)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">USt.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Rabatt</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Betrag</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={item.id} className="group hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}.</td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Produkt suchen"
                            className="pl-9 border-gray-200 focus:border-blue-500"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={item.ean || ''}
                          onChange={(e) => updateItem(item.id, 'ean', e.target.value)}
                          placeholder="EAN"
                          className="border-gray-200 focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={item.unit || 'Stk'}
                          onValueChange={(value) => updateItem(item.id, 'unit', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Stk">Stk</SelectItem>
                            <SelectItem value="Std">Std</SelectItem>
                            <SelectItem value="Tag">Tag</SelectItem>
                            <SelectItem value="Psch">Psch</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="text-right pr-8"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">€</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.vat}
                            onChange={(e) => updateItem(item.id, 'vat', parseFloat(e.target.value) || 0)}
                            className="text-right pr-6"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                            className="text-right pr-6"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {item.total.toFixed(2)} EUR
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-4">
              <button onClick={addItem} className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                + Position hinzufügen
              </button>
              <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                + Zeiterfassung auswählen
              </button>
              <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                + Gesamtrabatt hinzufügen
              </button>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Gesamtsumme Netto (inkl. Rabatte / Aufschläge)</span>
                    <span>{netTotal.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Umsatzsteuer 19%</span>
                    <span>{(grossTotal - netTotal).toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Gesamt</span>
                    <span>{grossTotal.toFixed(2)} EUR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fußtext */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Fußtext</h2>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <Textarea
              value={invoiceData.footerText}
              onChange={(e) => setInvoiceData({ ...invoiceData, footerText: e.target.value })}
              className="min-h-[120px]"
            />
          </div>
        </div>

        {/* Weitere Optionen & Umsatzsteuerregelung */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Weitere Optionen */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Weitere Optionen</h2>
              <button className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="h-5 w-5 rotate-90" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">Währung</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">Skonto</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={skonto.days}
                        onChange={(e) => setSkonto({ ...skonto, days: parseInt(e.target.value) || 0 })}
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500 text-sm">Tage</span>
                    </div>
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={skonto.percent}
                        onChange={(e) => setSkonto({ ...skonto, percent: parseFloat(e.target.value) || 0 })}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">Interne Kontaktperson</Label>
                  <Input
                    value={internalContact}
                    onChange={(e) => setInternalContact(e.target.value)}
                    placeholder="xxxxx 22e7ffdb3f@webxio.p"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">Abweichendes Erlöskonto</Label>
                  <Input
                    value={revenueAccount}
                    onChange={(e) => setRevenueAccount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">Zahlungsmethode</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kein Standard">Kein Standard</SelectItem>
                      <SelectItem value="Überweisung">Überweisung</SelectItem>
                      <SelectItem value="PayPal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-600 font-medium">Kostenstelle</Label>
                  <Select value={costCenter} onValueChange={setCostCenter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kostenstelle 1">Kostenstelle 1</SelectItem>
                      <SelectItem value="Kostenstelle 2">Kostenstelle 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Umsatzsteuerregelung */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Umsatzsteuerregelung</h2>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center cursor-pointer">
                <span className="font-medium text-gray-900">In Deutschland</span>
                <ArrowLeft className="h-4 w-4 rotate-90 text-gray-500" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="r1"
                    name="vatRegulation"
                    value="In Deutschland"
                    checked={vatRegulation === 'In Deutschland'}
                    onChange={(e) => setVatRegulation(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <Label htmlFor="r1" className="font-medium text-gray-900">Umsatzsteuerpflichtige Umsätze</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="r2"
                    name="vatRegulation"
                    value="Steuerfrei"
                    checked={vatRegulation === 'Steuerfrei'}
                    onChange={(e) => setVatRegulation(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <Label htmlFor="r2" className="text-gray-700">Steuerfreie Umsätze §4 UStG</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="r3"
                    name="vatRegulation"
                    value="Reverse Charge"
                    checked={vatRegulation === 'Reverse Charge'}
                    onChange={(e) => setVatRegulation(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <Label htmlFor="r3" className="text-gray-700">Reverse Charge gem. §13b UStG</Label>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center cursor-pointer mt-4">
                <span className="font-medium text-gray-900">Im EU-Ausland</span>
                <ArrowLeft className="h-4 w-4 -rotate-90 text-gray-500" />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center cursor-pointer">
                <span className="font-medium text-gray-900">Außerhalb der EU</span>
                <ArrowLeft className="h-4 w-4 -rotate-90 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

      </main>

      <InvoicePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        data={{
          customer,
          invoiceData,
          items,
          settings: {
            currency,
            skonto,
            internalContact,
            revenueAccount,
            paymentMethod,
            costCenter,
            vatRegulation,
            companySettings,
            headerSubject: invoiceData.headerSubject,
            headerText: invoiceData.headerText,
            footerText: invoiceData.footerText,
            isERechnung
          }
        }}
      />

      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Als Vorlage speichern</DialogTitle>
            <DialogDescription>
              Geben Sie einen Namen für die Vorlage ein.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveItemTemplate}>Speichern</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
