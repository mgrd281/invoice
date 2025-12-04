'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Building2, Palette, Bell, Shield, Save, Loader2, ArrowLeft, Settings, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { setCompanySettingsClient } from '@/lib/company-settings'

interface CompanySettings {
  companyName: string
  taxNumber: string
  address: string
  postalCode: string
  city: string
  country: string
  bankName: string
  iban: string
  bic: string
  phone?: string
  email?: string
  logoPath?: string
}

interface AppSettings {
  // Notifications
  emailNotifications: boolean
  invoiceReminders: boolean
  paymentAlerts: boolean
  
  // Security
  twoFactorAuth: boolean
  sessionTimeout: number
  
  // Display
  theme: string
  compactMode: boolean
}

export default function SettingsPage() {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: '',
    taxNumber: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'Deutschland',
    bankName: '',
    iban: '',
    bic: '',
    logoPath: ''
  })

  const [settings, setSettings] = useState<AppSettings>({
    // Notifications
    emailNotifications: true,
    invoiceReminders: true,
    paymentAlerts: true,
    
    // Security
    twoFactorAuth: false,
    sessionTimeout: 60,
    
    // Display
    theme: 'light',
    compactMode: false
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const { showToast, ToastContainer } = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      // Load company settings
      const companyResponse = await fetch('/api/company-settings')
      if (companyResponse.ok) {
        const companyData = await companyResponse.json()
        setCompanySettings(companyData)
        if (companyData.logoPath) {
          setLogoPreview(`/uploads/${companyData.logoPath}`)
        }
      }

      // Load app settings
      const settingsResponse = await fetch('/api/settings')
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSettings(settingsData)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      showToast('Fehler beim Laden der Einstellungen', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Die Datei ist zu groß. Maximale Größe: 5MB', 'error')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Bitte wählen Sie eine gültige Bilddatei aus', 'error')
      return
    }

    try {
      // Upload logo immediately
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      // Update company settings with new logo path
      setCompanySettings(prev => ({ ...prev, logoPath: result.filename }))
      setLogoPreview(`/uploads/${result.filename}`)
      
      showToast('Logo erfolgreich hochgeladen', 'success')
    } catch (error) {
      console.error('Error uploading logo:', error)
      showToast('Fehler beim Hochladen des Logos', 'error')
    }
  }

  const handleDeleteLogo = async () => {
    try {
      // Clear logo from company settings
      setCompanySettings(prev => ({ ...prev, logoPath: '' }))
      setLogoPreview('')
      
      // Clear the file input
      const fileInput = document.getElementById('logo') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
      
      // Update client-side settings immediately for PDF generation
      const updatedSettings = {
        ...companySettings,
        logoPath: ''
      }
      
      const mappedSettings = {
        id: 'default-org',
        // New field names (primary)
        companyName: updatedSettings.companyName,
        taxNumber: updatedSettings.taxNumber,
        zip: updatedSettings.postalCode,
        logoUrl: null, // Clear logo
        // Keep backward compatibility
        name: updatedSettings.companyName,
        taxId: updatedSettings.taxNumber,
        zipCode: updatedSettings.postalCode,
        logo: null, // Clear logo
        // Common fields
        address: updatedSettings.address,
        city: updatedSettings.city,
        country: updatedSettings.country,
        bankName: updatedSettings.bankName,
        iban: updatedSettings.iban,
        bic: updatedSettings.bic,
        phone: updatedSettings.phone || '',
        email: updatedSettings.email || '',
        pdfTemplateEnabled: false,
        pdfTemplateCode: '',
        pdfTemplateMode: 'custom_only' as const
      }
      
      // Use helper function to update client-side settings
      setCompanySettingsClient(mappedSettings)
      
      showToast('Logo erfolgreich entfernt', 'success')
    } catch (error) {
      console.error('Error deleting logo:', error)
      showToast('Fehler beim Entfernen des Logos', 'error')
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Save company settings
      const companyResponse = await fetch('/api/company-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companySettings),
      })

      if (!companyResponse.ok) {
        throw new Error('Failed to save company settings')
      }

      // Save app settings
      const settingsResponse = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!settingsResponse.ok) {
        throw new Error('Failed to save app settings')
      }

      // Update client-side settings for immediate PDF generation
      const mappedSettings = {
        id: 'default-org',
        // New field names (primary)
        companyName: companySettings.companyName,
        taxNumber: companySettings.taxNumber,
        zip: companySettings.postalCode,
        logoUrl: companySettings.logoPath || null,
        // Keep backward compatibility
        name: companySettings.companyName,
        taxId: companySettings.taxNumber,
        zipCode: companySettings.postalCode,
        logo: companySettings.logoPath || null,
        // Common fields
        address: companySettings.address,
        city: companySettings.city,
        country: companySettings.country,
        bankName: companySettings.bankName,
        iban: companySettings.iban,
        bic: companySettings.bic,
        phone: companySettings.phone || '',
        email: companySettings.email || '',
        pdfTemplateEnabled: false,
        pdfTemplateCode: '',
        pdfTemplateMode: 'custom_only' as const
      }
      
      // Use helper function to update client-side settings
      setCompanySettingsClient(mappedSettings)
      
      showToast('Einstellungen erfolgreich gespeichert', 'success')
    } catch (error) {
      console.error('Error saving settings:', error)
      showToast('Fehler beim Speichern der Einstellungen', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
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
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <Settings className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Einstellungen
              </h1>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Company Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2 text-blue-600" />
            Firmeneinstellungen
          </CardTitle>
          <CardDescription>
            Grundlegende Informationen über Ihr Unternehmen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Firmenname *</Label>
              <Input
                id="companyName"
                value={companySettings.companyName}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Ihre Firma GmbH"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxNumber">Steuernummer *</Label>
              <Input
                id="taxNumber"
                value={companySettings.taxNumber}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, taxNumber: e.target.value }))}
                placeholder="DE452578048"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              value={companySettings.address}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Musterstraße 123"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postleitzahl *</Label>
              <Input
                id="postalCode"
                value={companySettings.postalCode}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, postalCode: e.target.value }))}
                placeholder="12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Stadt *</Label>
              <Input
                id="city"
                value={companySettings.city}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Berlin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Land *</Label>
              <Input
                id="country"
                value={companySettings.country}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, country: e.target.value }))}
                placeholder="Deutschland"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bankname</Label>
              <Input
                id="bankName"
                value={companySettings.bankName}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="Deutsche Bank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={companySettings.iban}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, iban: e.target.value }))}
                placeholder="DE89 3704 0044 0532 0130 00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bic">BIC</Label>
              <Input
                id="bic"
                value={companySettings.bic}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, bic: e.target.value }))}
                placeholder="COBADEFFXXX"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="logo">Firmenlogo</Label>
            <div className="flex items-center space-x-4">
              {logoPreview && (
                <div className="w-16 h-16 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1 flex items-center space-x-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="flex-1"
                />
                {logoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteLogo}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Logo entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Unterstützte Formate: JPG, PNG, GIF. Maximale Größe: 5MB
              {logoPreview && (
                <span className="block text-xs text-gray-500 mt-1">
                  Klicken Sie auf das Papierkorb-Symbol, um das Logo zu entfernen
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="h-5 w-5 mr-2 text-purple-600" />
            Anzeige-Einstellungen
          </CardTitle>
          <CardDescription>
            Personalisieren Sie das Aussehen der Anwendung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Design-Theme</Label>
              <p className="text-sm text-muted-foreground">
                Wählen Sie zwischen hellem und dunklem Design
              </p>
            </div>
            <Select 
              value={settings.theme} 
              onValueChange={(value: string) => setSettings(prev => ({ ...prev, theme: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Hell</SelectItem>
                <SelectItem value="dark">Dunkel</SelectItem>
                <SelectItem value="auto">Automatisch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Kompakter Modus</Label>
              <p className="text-sm text-muted-foreground">
                Reduziert Abstände für mehr Inhalte auf dem Bildschirm
              </p>
            </div>
            <Switch
              checked={settings.compactMode}
              onCheckedChange={(checked: boolean) => setSettings(prev => ({ ...prev, compactMode: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2 text-yellow-600" />
            Benachrichtigungen
          </CardTitle>
          <CardDescription>
            Verwalten Sie Ihre Benachrichtigungseinstellungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>E-Mail-Benachrichtigungen</Label>
              <p className="text-sm text-muted-foreground">
                Erhalten Sie wichtige Updates per E-Mail
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked: boolean) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Rechnungserinnerungen</Label>
              <p className="text-sm text-muted-foreground">
                Automatische Erinnerungen für überfällige Rechnungen
              </p>
            </div>
            <Switch
              checked={settings.invoiceReminders}
              onCheckedChange={(checked: boolean) => setSettings(prev => ({ ...prev, invoiceReminders: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Zahlungsbenachrichtigungen</Label>
              <p className="text-sm text-muted-foreground">
                Benachrichtigungen bei eingehenden Zahlungen
              </p>
            </div>
            <Switch
              checked={settings.paymentAlerts}
              onCheckedChange={(checked: boolean) => setSettings(prev => ({ ...prev, paymentAlerts: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2 text-orange-600" />
            Rechnungserinnerungen
          </CardTitle>
          <CardDescription>
            Automatische Erinnerungen für überfällige Rechnungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Erinnerungssystem konfigurieren</Label>
              <p className="text-sm text-muted-foreground">
                Zeitplan, Vorlagen und automatische Erinnerungen verwalten
              </p>
            </div>
            <Link href="/settings/reminders">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Verwalten
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-red-600" />
            Sicherheitseinstellungen
          </CardTitle>
          <CardDescription>
            Konfigurieren Sie Sicherheitsoptionen für Ihr Konto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Zwei-Faktor-Authentifizierung</Label>
              <p className="text-sm text-muted-foreground">
                Zusätzliche Sicherheitsebene für Ihr Konto
              </p>
            </div>
            <Link href="/settings/two-factor">
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Verwalten
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sitzungs-Timeout (Minuten)</Label>
              <p className="text-sm text-muted-foreground">
                Automatische Abmeldung nach Inaktivität
              </p>
            </div>
            <Input
              type="number"
              min="5"
              max="480"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 60 }))}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      <ToastContainer />
      </div>
    </div>
  )
}
