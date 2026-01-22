import { NextRequest, NextResponse } from 'next/server'
import { getKauflandSettings, saveKauflandSettings, validateKauflandSettings } from '@/lib/kaufland-settings'

// GET: Get current Kaufland settings
export async function GET() {
  try {
    const settings = getKauflandSettings()
    
    // Don't send sensitive data to client
    const safeSettings = {
      ...settings,
      clientKey: settings.clientKey ? `${settings.clientKey.substring(0, 10)}...${settings.clientKey.slice(-4)}` : '',
      secretKey: settings.secretKey ? '***' : ''
    }
    
    return NextResponse.json({
      success: true,
      settings: safeSettings
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Laden der Kaufland-Einstellungen' 
      },
      { status: 500 }
    )
  }
}

// POST: Save Kaufland settings
export async function POST(request: NextRequest) {
  try {
    const settings = await request.json()
    
    console.log('💾 Saving Kaufland settings:', {
      enabled: settings.enabled,
      hasClientKey: !!settings.clientKey,
      hasSecretKey: !!settings.secretKey,
      autoSync: settings.autoSync
    })
    
    // Validate settings
    const errors = validateKauflandSettings(settings)
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ungültige Einstellungen',
          details: errors
        },
        { status: 400 }
      )
    }
    
    // Save settings
    saveKauflandSettings(settings)
    
    return NextResponse.json({
      success: true,
      message: 'Kaufland-Einstellungen gespeichert'
    })
  } catch (error) {
    console.error('❌ Error saving Kaufland settings:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Speichern der Kaufland-Einstellungen' 
      },
      { status: 500 }
    )
  }
}

// PUT: Update specific Kaufland settings
export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json()
    const currentSettings = getKauflandSettings()
    
    // Merge with current settings
    const newSettings = { ...currentSettings, ...updates }
    
    console.log('🔄 Updating Kaufland settings:', {
      enabled: newSettings.enabled,
      hasClientKey: !!newSettings.clientKey,
      hasSecretKey: !!newSettings.secretKey,
      autoSync: newSettings.autoSync
    })
    
    // Validate merged settings
    const errors = validateKauflandSettings(newSettings)
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ungültige Einstellungen',
          details: errors
        },
        { status: 400 }
      )
    }
    
    // Save updated settings
    saveKauflandSettings(newSettings)
    
    return NextResponse.json({
      success: true,
      message: 'Kaufland-Einstellungen aktualisiert'
    })
  } catch (error) {
    console.error('❌ Error updating Kaufland settings:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Aktualisieren der Kaufland-Einstellungen' 
      },
      { status: 500 }
    )
  }
}

