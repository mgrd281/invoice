'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, CheckCircle, XCircle, FileText, ArrowLeft, Download, Save, Trash2, Edit2, Check, Eye } from 'lucide-react'
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

  useEffect(() => {
    // Fetch company settings for preview
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setCompanySettings(data))
      .catch(err => console.error('Failed to fetch settings:', err))
  }, [])

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

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setUploadStatus({ type: 'success', message: result.message, errors: result.errors })
        setPreviewInvoices(result.invoices || [])

        // Don't clear file yet, allow re-upload if needed
      } else {
        const error = await response.json()
        setUploadStatus({ type: 'error', message: error.error || 'Upload failed' })
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Netzwerkfehler beim Hochladen der Datei' })
    } finally {
      setUploading(false)
    }
  }

  const saveInvoices = async (invoicesToSave: any[], indicesToRemove: number[]) => {
    if (invoicesToSave.length === 0) return

    setSaving(true)
    try {
      const response = await fetch('/api/invoices/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoices: invoicesToSave }),
      })

      if (response.ok) {
        const result = await response.json()

        // Remove saved invoices from preview
        const newInvoices = previewInvoices.filter((_, idx) => !indicesToRemove.includes(idx))
        setPreviewInvoices(newInvoices)

        // Clear selection
        setSelectedIndices(new Set())

        if (newInvoices.length === 0) {
          setUploadStatus({ type: 'success', message: 'Alle Rechnungen wurden erfolgreich gespeichert!' })
          setFile(null)
          // Redirect or show success
          window.location.href = '/invoices'
        } else {
          setUploadStatus({ type: 'success', message: `${result.count} Rechnungen erfolgreich gespeichert.` })
        }

      } else {
        const error = await response.json()
        setUploadStatus({ type: 'error', message: error.error || 'Fehler beim Speichern der Rechnungen' })
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Netzwerkfehler beim Speichern' })
    } finally {
      setSaving(false)
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
                <div className="flex space-x-4">
                  <Button variant="destructive" onClick={handleDeleteAll}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Alle löschen
                  </Button>

                  {selectedIndices.size > 0 ? (
                    <Button onClick={handleConfirmSelected} disabled={saving} className="bg-green-600 hover:bg-green-700">
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Speichere...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {selectedIndices.size} Ausgewählte speichern
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={handleConfirmAll} disabled={saving} className="bg-green-600 hover:bg-green-700">
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Speichere...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Alle Bestätigen & Speichern
                        </>
                      )}
                    </Button>
                  )}
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
                      <TableRow key={idx}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIndices.has(idx)}
                            onCheckedChange={() => toggleSelect(idx)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{inv.shopifyOrderNumber}</TableCell>
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
          </div>
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

                {/* Upload Button */}
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Wird analysiert...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Vorschau anzeigen
                    </>
                  )}
                </Button>
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
        )}

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
        {previewData && (
          <InvoicePreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            data={previewData}
          />
        )}
      </main>
    </div>
  )
}
