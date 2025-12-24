// ========================================
// KAUFLAND INTEGRATION SETTINGS
// ========================================

export interface KauflandSettings {
  enabled: boolean
  clientKey: string // Client Key from Kaufland
  secretKey: string // Secret Key from Kaufland
  apiBaseUrl?: string // API base URL (default: https://sellerapi.kaufland.com)
  autoSync: boolean // Automatically sync products
  syncInterval: number // minutes
  lastSync?: string // ISO date string
  defaultCategory?: string // Default product category
  defaultShippingTime?: number // Default shipping time in days
}

export const DEFAULT_KAUFLAND_SETTINGS: KauflandSettings = {
  enabled: false,
  clientKey: '',
  secretKey: '',
  apiBaseUrl: 'https://sellerapi.kaufland.com',
  autoSync: false,
  syncInterval: 60, // 1 hour
  defaultShippingTime: 3, // 3 days
}

// ========================================
// SETTINGS MANAGEMENT
// ========================================

/**
 * Get Kaufland settings from storage
 */
export function getKauflandSettings(): KauflandSettings {
  // Always prioritize Environment Variables if they exist
  const envSettings = {
    clientKey: process.env.KAUFLAND_CLIENT_KEY,
    secretKey: process.env.KAUFLAND_SECRET_KEY,
  }

  if (typeof window === 'undefined') {
    // Server-side: load from file or database
    const fileSettings = loadKauflandSettingsFromFile()
    const hasEnvVars = !!(envSettings.clientKey && envSettings.secretKey)
    
    return {
      ...fileSettings,
      // Override with env vars if present
      clientKey: envSettings.clientKey || fileSettings.clientKey,
      secretKey: envSettings.secretKey || fileSettings.secretKey,
      // Auto-enable if environment variables are present
      enabled: hasEnvVars ? true : fileSettings.enabled,
    }
  }

  // Client-side: load from localStorage
  const stored = localStorage.getItem('kaufland-settings')
  if (stored) {
    try {
      return { ...DEFAULT_KAUFLAND_SETTINGS, ...JSON.parse(stored) }
    } catch (error) {
      console.error('Error parsing Kaufland settings:', error)
    }
  }

  return DEFAULT_KAUFLAND_SETTINGS
}

/**
 * Save Kaufland settings to storage
 */
export function saveKauflandSettings(settings: KauflandSettings): void {
  if (typeof window === 'undefined') {
    // Server-side: save to file or database
    saveKauflandSettingsToFile(settings)
  } else {
    // Client-side: save to localStorage
    localStorage.setItem('kaufland-settings', JSON.stringify(settings))
  }
}

/**
 * Load settings from file (server-side)
 */
function loadKauflandSettingsFromFile(): KauflandSettings {
  try {
    const fs = require('fs')
    const path = require('path')

    const isVercel = process.env.VERCEL === '1'
    const settingsPath = isVercel
      ? path.join('/tmp', 'kaufland-settings.json')
      : path.join(process.cwd(), 'user-storage', 'kaufland-settings.json')

    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      return { ...DEFAULT_KAUFLAND_SETTINGS, ...JSON.parse(data) }
    }
  } catch (error) {
    console.error('Error loading Kaufland settings from file:', error)
  }

  return DEFAULT_KAUFLAND_SETTINGS
}

/**
 * Save settings to file (server-side)
 */
function saveKauflandSettingsToFile(settings: KauflandSettings): void {
  try {
    const fs = require('fs')
    const path = require('path')

    const isVercel = process.env.VERCEL === '1'
    // On Vercel, we can only write to /tmp
    const userStorageDir = isVercel ? '/tmp' : path.join(process.cwd(), 'user-storage')
    const settingsPath = path.join(userStorageDir, 'kaufland-settings.json')

    // Create directory if it doesn't exist
    if (!fs.existsSync(userStorageDir)) {
      fs.mkdirSync(userStorageDir, { recursive: true })
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('Error saving Kaufland settings to file:', error)
  }
}

// ========================================
// VALIDATION HELPERS
// ========================================

/**
 * Validate Kaufland settings
 */
export function validateKauflandSettings(settings: KauflandSettings): string[] {
  const errors: string[] = []

  if (settings.enabled) {
    if (!settings.clientKey) {
      errors.push('Client Key ist erforderlich')
    } else if (settings.clientKey.length < 20) {
      errors.push('Client Key scheint ungültig zu sein')
    }

    if (!settings.secretKey) {
      errors.push('Secret Key ist erforderlich')
    } else if (settings.secretKey.length < 20) {
      errors.push('Secret Key scheint ungültig zu sein')
    }

    if (settings.defaultShippingTime && (settings.defaultShippingTime < 1 || settings.defaultShippingTime > 30)) {
      errors.push('Versandzeit muss zwischen 1 und 30 Tagen liegen')
    }
  }

  return errors
}

/**
 * Test Kaufland connection
 */
export async function testKauflandConnection(settings: KauflandSettings): Promise<{ success: boolean; message: string }> {
  try {
    // Create basic auth header
    const credentials = Buffer.from(`${settings.clientKey}:${settings.secretKey}`).toString('base64')
    
    const apiUrl = settings.apiBaseUrl || 'https://sellerapi.kaufland.com'
    
    // Try multiple endpoints to test connection
    const endpoints = [
      '/units',
      '/api/units',
      '/v1/units',
      '/seller-api/units',
      '/'
    ]
    
    let lastError: string = ''
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })

        // If we get any response (even 401/403), it means the API is reachable
        if (response.status === 200 || response.status === 401 || response.status === 403) {
          return {
            success: true,
            message: 'Verbindung erfolgreich! Kaufland API ist erreichbar.'
          }
        }
        
        if (response.status === 404) {
          lastError = `Endpoint nicht gefunden: ${endpoint}`
          continue // Try next endpoint
        }
        
        const errorText = await response.text().catch(() => '')
        lastError = `Status ${response.status}: ${errorText.substring(0, 100)}`
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unbekannter Fehler'
        continue
      }
    }
    
    // If all endpoints failed, return helpful message
    return {
      success: false,
      message: `Verbindungsfehler: ${lastError || 'API nicht erreichbar. Bitte überprüfen Sie die API Base URL und Anmeldedaten.'}`
    }
  } catch (error) {
    return {
      success: false,
      message: `Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    }
  }
}

