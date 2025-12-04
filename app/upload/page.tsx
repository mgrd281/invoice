'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, CheckCircle, XCircle, FileText, ArrowLeft, Download } from 'lucide-react'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'idle' | 'success' | 'error'
    message?: string
    errors?: string[]
  }>({ type: 'idle' })
  const [dragActive, setDragActive] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadStatus({ type: 'idle' })
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
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
        setUploadStatus({ type: 'idle' })
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: 'Bitte wählen Sie eine CSV-Datei aus.' 
        })
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadStatus({ type: 'idle' })

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
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        
        // Trigger invoice list refresh
        console.log('CSV upload successful, triggering invoice list refresh...')
        window.dispatchEvent(new CustomEvent('invoicesUpdated'))
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
                CSV-Datei hochladen
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-6 w-6 mr-2 text-blue-600" />
              Shopify CSV-Datei hochladen
            </CardTitle>
            <CardDescription>
              Laden Sie Ihre Shopify-Bestellungen als CSV-Datei hoch, um automatisch deutsche Rechnungen zu erstellen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV-Datei auswählen
                </label>
                
                {/* Hidden file input */}
                <input
                  id="file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="CSV-Datei auswählen"
                />
                
                {/* Custom file upload button */}
                <div 
                  onClick={() => document.getElementById('file-input')?.click()}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    dragActive 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Upload className={`h-8 w-8 mx-auto mb-2 ${
                    dragActive ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      Datei auswählen
                    </span>
                    {' '}oder hier ablegen
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Nur CSV-Dateien werden unterstützt
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
                    Wird hochgeladen...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    CSV-Datei hochladen
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
                    {uploadStatus.type === 'success' && (
                      <div className="mt-3">
                        <Link href="/invoices/csv">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <FileText className="h-4 w-4 mr-2" />
                            CSV-Rechnungen anzeigen
                          </Button>
                        </Link>
                      </div>
                    )}
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
                    Laden Sie eine umfassende CSV-Datei mit Beispielen für alle Rechnungstypen herunter: Normale Rechnungen, Stornos und Gutschriften
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

            {/* Instructions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Anweisungen</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Exportieren Sie Ihre Bestellungen aus Shopify als CSV-Datei</p>
                <p>• Die CSV-Datei sollte folgende Spalten enthalten:</p>
                <div className="ml-4 space-y-1">
                  <p>- <strong>Bestellnummer</strong> (Eindeutige Bestellnummer/Rechnungsnummer)</p>
                  <p>- Name, Email (Kundeninformationen)</p>
                  <p>- Billing/Shipping Address, City, Zip, Country (Adressdaten)</p>
                  <p>- Lineitem name, quantity, price (Produktinformationen)</p>
                  <p>- Total, Created at (Preis und Datum)</p>
                  <p>- Financial Status, Fulfillment Status (Status)</p>
                </div>
                <p>• <strong>Tipp:</strong> Laden Sie die Vorlage herunter und passen Sie Ihre Daten entsprechend an</p>
                <p>• Nach dem Upload werden automatisch deutsche Rechnungen erstellt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
