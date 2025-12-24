'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Loader2, Save, CheckCircle2, XCircle, Store, TestTube } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface KauflandSettings {
  enabled: boolean
  clientKey: string
  secretKey: string
  apiBaseUrl?: string
  autoSync: boolean
  syncInterval: number
  defaultShippingTime?: number
}

export default function KauflandSettingsPage() {
  const [settings, setSettings] = useState<KauflandSettings>({
    enabled: false,
    clientKey: '',
    secretKey: '',
    apiBaseUrl: 'https://sellerapi.kaufland.com',
    autoSync: false,
    syncInterval: 60,
    defaultShippingTime: 3
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null)
  const { showToast, ToastContainer } = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/kaufland/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          // Restore full keys if we have them stored (for editing)
          const stored = localStorage.getItem('kaufland-settings-full')
          if (stored) {
            try {
              const fullSettings = JSON.parse(stored)
              setSettings(fullSettings)
            } catch {
              setSettings({ ...data.settings, clientKey: '', secretKey: '' })
            }
          } else {
            setSettings({ ...data.settings, clientKey: '', secretKey: '' })
          }
        }
      }
    } catch (error) {
      console.error('Error loading Kaufland settings:', error)
      showToast('Fehler beim Laden der Einstellungen', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Store full settings locally for editing
      localStorage.setItem('kaufland-settings-full', JSON.stringify(settings))

      const response = await fetch('/api/kaufland/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      showToast('Kaufland-Einstellungen erfolgreich gespeichert', 'success')
      setConnectionStatus(null) // Clear connection status after save
    } catch (error) {
      console.error('Error saving Kaufland settings:', error)
      showToast(
        error instanceof Error ? error.message : 'Fehler beim Speichern der Einstellungen',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      setConnectionStatus(null)

      const response = await fetch('/api/kaufland/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      })

      const data = await response.json()

      if (data.success) {
        setConnectionStatus({ success: true, message: data.message })
        showToast('Verbindung erfolgreich!', 'success')
      } else {
        setConnectionStatus({ success: false, message: data.error || 'Verbindung fehlgeschlagen' })
        showToast(data.error || 'Verbindung fehlgeschlagen', 'error')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
      setConnectionStatus({ success: false, message })
      showToast('Fehler beim Testen der Verbindung', 'error')
    } finally {
      setTesting(false)
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
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <Store className="h-8 w-8 text-orange-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Kaufland Integration
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={testing || !settings.clientKey || !settings.secretKey}
                variant="outline"
                className="min-w-[140px]"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Teste...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Verbindung testen
                  </>
                )}
              </Button>
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
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Connection Status */}
        {connectionStatus && (
          <Card className={connectionStatus.success ? 'border-green-500' : 'border-red-500'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {connectionStatus.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className={`font-medium ${connectionStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                    {connectionStatus.success ? 'Verbindung erfolgreich' : 'Verbindung fehlgeschlagen'}
                  </p>
                  <p className="text-sm text-gray-600">{connectionStatus.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>API-Einstellungen</CardTitle>
            <CardDescription>
              Konfigurieren Sie Ihre Kaufland API-Anmeldedaten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Kaufland Integration aktivieren</Label>
                <p className="text-sm text-muted-foreground">
                  Aktivieren Sie die Integration, um Produkte zu Kaufland zu synchronisieren
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="clientKey">Client Key *</Label>
                <Input
                  id="clientKey"
                  type="password"
                  value={settings.clientKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, clientKey: e.target.value }))}
                  placeholder="117126fd87983cb8f6594ac288fb407e"
                />
                <p className="text-xs text-muted-foreground">
                  Ihr Kaufland Client Key
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key *</Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={settings.secretKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, secretKey: e.target.value }))}
                  placeholder="6dfe294b97f943a4c5a7f8de954357842aed6303d2318b7f28d0de699f807b68"
                />
                <p className="text-xs text-muted-foreground">
                  Ihr Kaufland Secret Key
                </p>
                {!settings.clientKey && !settings.secretKey && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev,
                        clientKey: '117126fd87983cb8f6594ac288fb407e',
                        secretKey: '6dfe294b97f943a4c5a7f8de954357842aed6303d2318b7f28d0de699f807b68'
                      }))
                    }}
                  >
                    Standard-Schlüssel verwenden
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl">API Base URL</Label>
                <Input
                  id="apiBaseUrl"
                  value={settings.apiBaseUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
                  placeholder="https://sellerapi.kaufland.com"
                />
                <p className="text-xs text-muted-foreground">
                  Standard: https://sellerapi.kaufland.com
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Synchronisierungseinstellungen</CardTitle>
            <CardDescription>
              Konfigurieren Sie automatische Synchronisierung
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Automatische Synchronisierung</Label>
                <p className="text-sm text-muted-foreground">
                  Produkte automatisch zu Kaufland synchronisieren
                </p>
              </div>
              <Switch
                checked={settings.autoSync}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoSync: checked }))}
                disabled={!settings.enabled}
              />
            </div>

            {settings.autoSync && (
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Synchronisierungsintervall (Minuten)</Label>
                <Input
                  id="syncInterval"
                  type="number"
                  min="5"
                  max="1440"
                  value={settings.syncInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) || 60 }))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Wie oft sollen Produkte synchronisiert werden? (5-1440 Minuten)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="defaultShippingTime">Standard-Versandzeit (Tage)</Label>
              <Input
                id="defaultShippingTime"
                type="number"
                min="1"
                max="30"
                value={settings.defaultShippingTime}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultShippingTime: parseInt(e.target.value) || 3 }))}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Standard-Versandzeit für neue Produkte (1-30 Tage)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">Wie funktioniert es?</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Geben Sie Ihre Kaufland API-Anmeldedaten ein</li>
                <li>Testen Sie die Verbindung, um sicherzustellen, dass alles funktioniert</li>
                <li>Speichern Sie die Einstellungen</li>
                <li>Verwenden Sie die API-Endpunkte, um Produkte zu synchronisieren</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <ToastContainer />
      </div>
    </div>
  )
}

