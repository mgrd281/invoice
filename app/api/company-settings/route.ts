import { NextRequest, NextResponse } from 'next/server'
import { getCompanySettings, updateCompanySettings } from '@/lib/company-settings'

export async function GET() {
  try {
    const settings = getCompanySettings()
    
    // Map backend field names to frontend field names
    const mappedSettings = {
      companyName: settings.companyName || settings.name,
      taxNumber: settings.taxNumber || settings.taxId,
      address: settings.address,
      postalCode: settings.zip || settings.zipCode,
      city: settings.city,
      country: settings.country,
      bankName: settings.bankName,
      iban: settings.iban,
      bic: settings.bic,
      logoPath: settings.logoUrl || settings.logo,
      phone: settings.phone,
      email: settings.email
    }
    
    return NextResponse.json(mappedSettings)
  } catch (error) {
    console.error('Error fetching company settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Map frontend field names to backend field names
    const mappedSettings = {
      // New field names (primary)
      companyName: body.companyName || body.name,
      taxNumber: body.taxNumber || body.taxId,
      zip: body.postalCode || body.zipCode,
      logoUrl: body.logoPath || body.logo,
      // Keep backward compatibility
      name: body.companyName || body.name,
      taxId: body.taxNumber || body.taxId,
      zipCode: body.postalCode || body.zipCode,
      logo: body.logoPath || body.logo,
      // Common fields
      address: body.address,
      city: body.city,
      country: body.country,
      bankName: body.bankName,
      iban: body.iban,
      bic: body.bic,
      phone: body.phone,
      email: body.email
    }
    
    const updatedSettings = updateCompanySettings(mappedSettings)
    
    console.log('Company settings updated:', updatedSettings)
    
    return NextResponse.json({
      message: 'Company settings updated successfully',
      settings: updatedSettings
    })
  } catch (error) {
    console.error('Error updating company settings:', error)
    return NextResponse.json(
      { error: 'Failed to update company settings' },
      { status: 500 }
    )
  }
}
