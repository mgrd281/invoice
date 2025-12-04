'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, ArrowLeft, Save, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface NewCustomer {
  name: string
  email: string
  phone: string
  address: string
  zipCode: string
  city: string
  country: string
  taxId: string
  notes: string
}

export default function NewCustomerPage() {
  const [customer, setCustomer] = useState<NewCustomer>({
    name: '',
    email: '',
    phone: '',
    address: '',
    zipCode: '',
    city: '',
    country: 'Deutschland',
    taxId: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const { showToast, ToastContainer } = useToast()

  const handleSave = async () => {
    // Validate required fields
    if (!customer.name || !customer.email) {
      showToast('Bitte füllen Sie mindestens Name und E-Mail-Adresse aus.', 'error')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customer.email)) {
      showToast('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'error')
      return
    }

    setSaving(true)
    try {
      console.log('Creating new customer:', customer)
      
      // Send POST request to create customer
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customer)
      })
      
      const data = await response.json()
      
      if (data.success) {
        showToast('Kunde erfolgreich erstellt!', 'success')
        console.log('Customer created successfully:', data.customer)
        // Redirect back to customers page after a short delay
        setTimeout(() => {
          window.location.href = '/customers'
        }, 1500)
      } else {
        showToast(data.error || 'Fehler beim Erstellen des Kunden', 'error')
      }
      
    } catch (error) {
      console.error('Error creating customer:', error)
      showToast('Fehler beim Erstellen des Kunden. Bitte versuchen Sie es erneut.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof NewCustomer, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }))
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
              <h1 className="text-2xl font-bold text-gray-900">
                Neuen Kunden erstellen
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
                  Kunde erstellen
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Grundinformationen</CardTitle>
              <CardDescription>
                Grundlegende Daten des neuen Kunden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firmenname / Name *
                  </label>
                  <Input
                    value={customer.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Max Mustermann GmbH"
                    required
                    className="w-full"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail-Adresse *
                  </label>
                  <Input
                    type="email"
                    value={customer.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="kunde@beispiel.de"
                    required
                    className="w-full"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefonnummer
                  </label>
                  <Input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+49 123 456789"
                    className="w-full"
                  />
                </div>

                {/* Tax ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Steuer-ID / USt-IdNr.
                  </label>
                  <Input
                    value={customer.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    placeholder="DE123456789"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - nur für Geschäftskunden
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Adressinformationen</CardTitle>
              <CardDescription>
                Rechnungs- und Lieferadresse des Kunden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Straße und Hausnummer
                  </label>
                  <Input
                    value={customer.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Musterstraße 123"
                    className="w-full"
                  />
                </div>

                {/* ZIP Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postleitzahl
                  </label>
                  <Input
                    value={customer.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="12345"
                    className="w-full"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stadt
                  </label>
                  <Input
                    value={customer.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Berlin"
                    className="w-full"
                  />
                </div>

                {/* Country */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Land
                  </label>
                  <select
                    value={customer.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Land auswählen"
                    aria-label="Land auswählen"
                  >
                    <option value="Deutschland">Deutschland</option>
                    <option value="Österreich">Österreich</option>
                    <option value="Schweiz">Schweiz</option>
                    <option value="Niederlande">Niederlande</option>
                    <option value="Belgien">Belgien</option>
                    <option value="Frankreich">Frankreich</option>
                    <option value="Italien">Italien</option>
                    <option value="Spanien">Spanien</option>
                    <option value="Andere">Andere</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Zusätzliche Informationen</CardTitle>
              <CardDescription>
                Weitere Details und Notizen zum Kunden
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notizen
                </label>
                <textarea
                  value={customer.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Zusätzliche Informationen über den Kunden..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Link href="/customers">
              <Button variant="outline">
                Abbrechen
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Erstellen...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Kunde erstellen
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}
