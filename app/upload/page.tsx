'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, CheckCircle, XCircle, FileText, ArrowLeft, Download, Save, Trash2, Edit2, Check, Eye, Shield, AlertTriangle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { InvoicePreviewDialog } from '@/components/invoice-preview-dialog'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'idle' | 'success' | 'error'
    message?: string
    errors?: string[]
  }>({ type: 'idle' })
  const [dragActive, setDragActive] = useState(false)
  const [previewInvoices, setPreviewInvoices] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  // Edit State
  const [editingInvoice, setEditingInvoice] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number>(-1)

  // Selection State
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Preview State
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [companySettings, setCompanySettings] = useState<any>(null)

  // Import Options
  const [importTarget, setImportTarget] = useState<'invoices' | 'accounting' | 'both'>('invoices')
  const [accountingType, setAccountingType] = useState<'income' | 'expense' | 'other'>('income')

  // Progress State
  const [uploadProgress, setUploadProgress] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(0)

  // Saving Progress State
  const [saveProgress, setSaveProgress] = useState(0)
  const [saveEstimatedTime, setSaveEstimatedTime] = useState(0)

  // Duplicates & Templates
  const [duplicates, setDuplicates] = useState<Set<string>>(new Set())
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  useEffect(() => {
    // Fetch company settings for preview
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setCompanySettings(data))
      .catch(err => console.error('Failed to fetch settings:', err))

    // Fetch templates
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        setTemplates(data)
        const defaultTemplate = data.find((t: any) => t.isDefault)
        if (defaultTemplate) setSelectedTemplateId(defaultTemplate.id)
        else if (data.length > 0) setSelectedTemplateId(data[0].id)
      })
      .catch(err => console.error('Failed to fetch templates:', err))
  }, [])

  // Check for duplicates when previewInvoices changes
  useEffect(() => {
    if (previewInvoices.length === 0) return

    const checkDuplicates = async () => {
      const numbers = previewInvoices.map(inv => inv.number)
      if (numbers.length === 0) return

      try {
        const response = await fetch('/api/invoices/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceNumbers: numbers })
        })

        if (response.ok) {
          const data = await response.json()
          setDuplicates(new Set(data.duplicates))
        }
      } catch (err) {
        console.error('Failed to check duplicates:', err)
      }
    }

    checkDuplicates()
  }, [previewInvoices])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadStatus({ type: 'idle' })
      setPreviewInvoices([])
      setSelectedIndices(new Set())
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/x-iwork-numbers-sffnumbers']
      const validExtensions = ['.csv', '.xlsx', '.numbers']

      const isValid = validTypes.includes(droppedFile.type) || validExtensions.some(ext => droppedFile.name.toLowerCase().endsWith(ext))

      if (isValid) {
        setFile(droppedFile)
        setUploadStatus({ type: 'idle' })
        setPreviewInvoices([])
        setSelectedIndices(new Set())
      } else {
        setUploadStatus({
          type: 'error',
          message: 'Bitte wählen Sie eine CSV, Excel oder Numbers Datei aus.'
        })
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadStatus({ type: 'idle' })
    setPreviewInvoices([])
    setSelectedIndices(new Set())
    setUploadProgress(0)
    setEstimatedTime(2) // Start with 2 seconds estimate

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev
        return prev + 10
      })
      setEstimatedTime(prev => Math.max(0, prev - 0.2))
    }, 200)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (response.ok) {
        setUploadProgress(100)
        setEstimatedTime(0)
        const result = await response.json()

        // Small delay to show 100% before showing results
        setTimeout(() => {
          setUploadStatus({ type: 'success', message: result.message, errors: result.errors })
          setPreviewInvoices(result.invoices || [])
          setUploading(false)
        }, 500)

        // Don't clear file yet, allow re-upload if needed
      } else {
        const error = await response.json()
        setUploadStatus({ type: 'error', message: error.error || 'Upload failed' })
        setUploading(false)
      }
    } catch (error) {
      clearInterval(progressInterval)
      setUploadStatus({ type: 'error', message: 'Netzwerkfehler beim Hochladen der Datei' })
      setUploading(false)
    }
  }

  const saveInvoices = async (invoicesToSave: any[], indicesToRemove: number[]) => {
    if (invoicesToSave.length === 0) return

    setSaving(true)
    setSaveProgress(0)

    const totalToSave = invoicesToSave.length
    // Estimate: 0.1s per invoice is a rough guess for batch processing
    const initialEstimate = Math.ceil(totalToSave * 0.05)
    setSaveEstimatedTime(initialEstimate)

    let savedCount = 0
    const chunkSize = 50 // Process 50 invoices at a time
    const failedInvoices: any[] = []
    const startTime = Date.now()

    // Let's create a Set of indices to remove for efficient lookup
    const indicesToRemoveSet = new Set(indicesToRemove)

    // We need to map the original indices to the actual invoice objects to know what we are saving.
    // invoicesToSave is already passed in.

    // Let's iterate through chunks of invoicesToSave
    for (let i = 0; i < totalToSave; i += chunkSize) {
      const chunk = invoicesToSave.slice(i, i + chunkSize)

      // Update progress
      const currentProgress = Math.round((i / totalToSave) * 100)
      setSaveProgress(currentProgress)

      // Update estimated time remaining
      if (i > 0) {
        const elapsed = (Date.now() - startTime) / 1000
        const rate = i / elapsed // items per second
        const remaining = totalToSave - i
        setSaveEstimatedTime(Math.ceil(remaining / rate))
      }

      setUploadStatus({
        type: 'idle',
        message: `Speichere ${Math.min(i + chunkSize, totalToSave)} von ${totalToSave} Rechnungen...`
      })

      try {
        const response = await fetch('/api/invoices/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invoices: chunk,
            importTarget,
            accountingType,
            templateId: selectedTemplateId
          }),
        })

        if (response.ok) {
          const result = await response.json()
          savedCount += chunk.length

          // Remove these specific invoices from previewInvoices
          // We can't rely on indices anymore because the array might have changed (if we did this async/parallel, but here it's sequential).
          // But to be safe and simple: We know `chunk` contains the exact objects we just saved.
          setPreviewInvoices(prev => prev.filter(inv => !chunk.includes(inv)))

          // Also update selectedIndices. This is harder because indices shift.
          // Easiest is to just clear selection or re-calculate. 
          // If we are saving "Selected", we probably want to clear them as they are saved.
          setSelectedIndices(prev => new Set())

        } else {
          console.error('Chunk failed', await response.json())
          failedInvoices.push(...chunk)
          // If a chunk fails, we might want to stop or continue? 
          // User said: "If a problem occurs... only remaining invoices should stay".
          // So we continue to the next chunk? Or stop?
          // Usually better to try next chunks.
        }
      } catch (error) {
        console.error('Chunk error', error)
        failedInvoices.push(...chunk)
      }
    }

    setSaveProgress(100)
    setSaveEstimatedTime(0)
    setSaving(false)

    if (failedInvoices.length === 0) {
      setUploadStatus({ type: 'success', message: `${savedCount} Rechnungen erfolgreich gespeichert!` })
      if (previewInvoices.length === 0) { // Check if all are gone
        setFile(null)
        // Optional: Redirect
        // window.location.href = '/invoices'
      }
    } else {
      setUploadStatus({
        type: 'error',
        message: `${savedCount} gespeichert. ${failedInvoices.length} konnten nicht gespeichert werden.`
      })
    }
  }

  const handleConfirmAll = () => {
    const allIndices = previewInvoices.map((_, idx) => idx)
    saveInvoices(previewInvoices, allIndices)
  }

  const handleConfirmSelected = () => {
    const selectedList = Array.from(selectedIndices).sort((a, b) => a - b)
    const invoicesToSave = selectedList.map(idx => previewInvoices[idx])
    saveInvoices(invoicesToSave, selectedList)
  }

  const handleConfirmSingle = (index: number) => {
    saveInvoices([previewInvoices[index]], [index])
  }

  const handleDelete = (index: number) => {
    const newInvoices = [...previewInvoices]
    newInvoices.splice(index, 1)
    setPreviewInvoices(newInvoices)

    // Update selection indices - this is tricky, simpler to just clear selection or re-calculate
    // For simplicity, let's clear selection if we delete something to avoid index mismatch
    setSelectedIndices(new Set())
  }

  const handleDeleteAll = () => {
    if (confirm('Sind Sie sicher, dass Sie alle importierten Rechnungen löschen möchten?')) {
      setPreviewInvoices([])
      setFile(null)
      setUploadStatus({ type: 'idle' })
      setSelectedIndices(new Set())
    }
  }

  const handleEdit = (index: number) => {
    setEditingInvoice({ ...previewInvoices[index] })
    setEditIndex(index)
    setIsEditOpen(true)
  }

  const handleSaveEdit = () => {
    if (editIndex > -1 && editingInvoice) {
      const newInvoices = [...previewInvoices]
      newInvoices[editIndex] = editingInvoice
      setPreviewInvoices(newInvoices)
      setIsEditOpen(false)
      setEditingInvoice(null)
      setEditIndex(-1)
    }
  }

  const handlePreview = (index: number) => {
    const invoice = previewInvoices[index]

    // Construct data object for InvoicePreviewDialog
    const data = {
      customer: {
        companyName: invoice.customerName, // Assuming name is company or person
        name: invoice.customerName,
        address: invoice.customerAddress,
        zipCode: invoice.customerZip,
        city: invoice.customerCity,
        country: invoice.customerCountry,
        type: 'company' // Default to company for now
      },
      invoiceData: {
        invoiceNumber: invoice.number,
        date: invoice.date,
        deliveryDate: invoice.date, // Default to invoice date
        headerSubject: `Rechnung Nr. ${invoice.number}`,
        headerText: 'Vielen Dank für Ihren Auftrag. Wir stellen Ihnen folgende Leistungen in Rechnung:',
        footerText: 'Bitte überweisen Sie den Betrag innerhalb von 14 Tagen.'
      },
      items: invoice.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit: 'Stk.',
        unitPrice: item.unitPrice,
        vat: invoice.taxRate || 19,
        total: item.netAmount,
        ean: item.ean
      })),
      settings: {
        companySettings: companySettings || {}
      }
    }

    setPreviewData(data)
    setPreviewOpen(true)
  }

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedIndices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIndices(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIndices.size === previewInvoices.length) {
      setSelectedIndices(new Set())
    } else {
      const allIndices = new Set(previewInvoices.map((_, idx) => idx))
      setSelectedIndices(allIndices)
    }
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
              <h1 className="text-2xl font-bold text-gray-900">
                CSV/Excel Import
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Preview Section */}
        {previewInvoices.length > 0 ? (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Vorschau ({previewInvoices.length} Rechnungen)</CardTitle>
                  <CardDescription>
                    Bitte überprüfen Sie die importierten Daten und bestätigen Sie die Speicherung.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  {/* Template Selector */}
                  <div className="w-[200px]">
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vorlage wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-x-2">
                    {saving ? (
                      <div className="flex items-center gap-4 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                        <div className="flex flex-col w-[200px]">
                          <div className="flex justify-between text-xs text-blue-800 mb-1">
                            <span>Speichere...</span>
                            <span className="font-medium">{saveProgress}%</span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${saveProgress}%` }}
                            ></div>
                          </div>
                          {saveEstimatedTime > 0 && (
                            <span className="text-[10px] text-blue-600 mt-1">
                              ca. {saveEstimatedTime} Sek. verbleibend
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button variant="destructive" onClick={handleDeleteAll}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Alle löschen
                        </Button>
                        <Button
                          onClick={selectedIndices.size > 0 ? handleConfirmSelected : handleConfirmAll}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {selectedIndices.size > 0 ? `${selectedIndices.size} speichern` : 'Alle speichern'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={previewInvoices.length > 0 && selectedIndices.size === previewInvoices.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Bestellnummer</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Betrag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewInvoices.map((inv, idx) => (
                      <TableRow
                        key={idx}
                        className={duplicates.has(inv.number) ? 'bg-yellow-50 hover:bg-yellow-100' : ''}
                      >
                        <TableCell className="w-[50px]">
                          <Checkbox
                            checked={selectedIndices.has(idx)}
                            onCheckedChange={() => toggleSelect(idx)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {inv.number}
                            {duplicates.has(inv.number) && (
                              <div className="ml-2 text-yellow-600" title="Diese Rechnungsnummer existiert bereits">
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{inv.customerName}</span>
                            <span className="text-xs text-gray-500">{inv.customerEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>{inv.date}</TableCell>
                        <TableCell>{inv.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={inv.statusColor}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {inv.document_kind}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handlePreview(idx)} title="Vorschau">
                              <Eye className="h-4 w-4 text-gray-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleConfirmSingle(idx)} title="Speichern">
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(idx)} title="Bearbeiten">
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)} title="Löschen">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div >
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-6 w-6 mr-2 text-blue-600" />
                Datei hochladen
              </CardTitle>
              <CardDescription>
                Laden Sie Ihre Shopify-Bestellungen als CSV, Excel oder Numbers Datei hoch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datei auswählen
                  </label>

                  {/* Hidden file input */}
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv,.numbers,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="Datei auswählen"
                  />

                  {/* Custom file upload button */}
                  <div
                    onClick={() => document.getElementById('file-input')?.click()}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    <Upload className={`h-8 w-8 mx-auto mb-2 ${dragActive ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">
                        Datei auswählen
                      </span>
                      {' '}oder hier ablegen
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      CSV, Numbers oder Excel Dateien werden unterstützt
                    </p>
                  </div>
                </div>

                {file && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm text-blue-800">
                        Ausgewählte Datei: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                )}

                {/* Import Target Selection */}
                <div className="space-y-3 pt-2">
                  <Label>Importieren als:</Label>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="target-invoices"
                        checked={importTarget === 'invoices' || importTarget === 'both'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setImportTarget(importTarget === 'accounting' ? 'both' : 'invoices')
                          } else {
                            if (importTarget === 'both') setImportTarget('accounting')
                            // Prevent unchecking if it's the only one, or handle validation later
                          }
                        }}
                      />
                      <Label htmlFor="target-invoices" className="cursor-pointer">Rechnungen (Invoices)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="target-accounting"
                        checked={importTarget === 'accounting' || importTarget === 'both'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setImportTarget(importTarget === 'invoices' ? 'both' : 'accounting')
                          } else {
                            if (importTarget === 'both') setImportTarget('invoices')
                          }
                        }}
                      />
                      <Label htmlFor="target-accounting" className="cursor-pointer">Buchhaltung</Label>
                    </div>
                  </div>

                  {/* Accounting Type Selection - Only if Accounting is selected */}
                  {(importTarget === 'accounting' || importTarget === 'both') && (
                    <div className="ml-6 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                      <Label className="mb-2 block text-sm font-medium">Buchungstyp:</Label>
                      <Select value={accountingType} onValueChange={(v: any) => setAccountingType(v)}>
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Einnahme</SelectItem>
                          <SelectItem value="expense">Ausgabe</SelectItem>
                          <SelectItem value="other">Sonstiges</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Upload Button or Progress Bar */}
                {uploading ? (
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="mb-4 relative">
                        <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center">
                          <Upload className="h-8 w-8 text-blue-600 animate-bounce" />
                        </div>
                        {/* Optional: Add a success checkmark overlay if 100% */}
                        {uploadProgress === 100 && (
                          <div className="absolute -right-1 -bottom-1 bg-green-500 rounded-full p-1">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {uploadProgress === 100 ? 'Upload abgeschlossen!' : 'Ihre Datei wird hochgeladen...'}
                      </h3>

                      <div className="w-full max-w-md mt-4 mb-2">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Fortschritt</span>
                          <span className="font-medium text-blue-600">{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>

                      {estimatedTime > 0 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Geschätzte Wartezeit: <span className="font-medium">{Math.ceil(estimatedTime)} Sekunden</span>
                        </p>
                      )}

                      <div className="flex items-center mt-4 text-xs text-gray-400">
                        <Shield className="h-3 w-3 mr-1" />
                        100% privat und sicher
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleUpload}
                    disabled={!file}
                    className="w-full"
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Vorschau anzeigen
                  </Button>
                )}
              </div>

              {/* Status Messages */}
              {uploadStatus.type !== 'idle' && (
                <div className={`p-4 rounded-md ${uploadStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {uploadStatus.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-medium ${uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                        {uploadStatus.message}
                      </p>
                      {uploadStatus.errors && uploadStatus.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-red-700">Fehler:</p>
                          <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                            {uploadStatus.errors.map((error: string, index: number) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">CSV-Vorlage mit Beispielen herunterladen</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Laden Sie eine umfassende CSV-Datei mit Beispielen für alle Rechnungstypen herunter.
                    </p>
                  </div>
                  <a href="/api/csv-template" download="rechnungen-vorlage-mit-beispielen.csv">
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                      <Download className="h-4 w-4 mr-2" />
                      Vorlage herunterladen
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )
        }

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Rechnung bearbeiten</DialogTitle>
            </DialogHeader>
            {editingInvoice && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="number" className="text-right">
                    Bestellnummer
                  </Label>
                  <Input
                    id="number"
                    value={editingInvoice.shopifyOrderNumber}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, shopifyOrderNumber: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Kunde
                  </Label>
                  <Input
                    id="name"
                    value={editingInvoice.customerName}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customerName: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={editingInvoice.customerEmail}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customerEmail: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Datum
                  </Label>
                  <Input
                    id="date"
                    value={editingInvoice.date}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, date: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select
                    value={editingInvoice.status}
                    onValueChange={(value) => setEditingInvoice({ ...editingInvoice, status: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Status wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bezahlt">Bezahlt</SelectItem>
                      <SelectItem value="Offen">Offen</SelectItem>
                      <SelectItem value="Überfällig">Überfällig</SelectItem>
                      <SelectItem value="Storniert">Storniert</SelectItem>
                      <SelectItem value="Gutschrift">Gutschrift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" onClick={handleSaveEdit}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invoice Preview Dialog */}
        {
          previewData && (
            <InvoicePreviewDialog
              open={previewOpen}
              onOpenChange={setPreviewOpen}
              data={previewData}
            />
          )
        }
      </main >
    </div >
  )
}
