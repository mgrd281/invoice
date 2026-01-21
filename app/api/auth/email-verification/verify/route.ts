/**
 * API Endpoint: E-Mail-Verifizierungscode verifizieren
 * POST /api/auth/email-verification/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCode, cleanupExpiredCodes } from '@/lib/email-verification'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    // Validierung
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Gültige E-Mail-Adresse erforderlich' },
        { status: 400 }
      )
    }

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Gültiger 6-stelliger Code erforderlich' },
        { status: 400 }
      )
    }

    // IP-Adresse für Logging
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] :
                     request.headers.get('x-real-ip') ||
                     'unknown'

    console.log(`🔍 Verification attempt from ${email} (IP: ${ipAddress}) with code: ${code}`)

    // Cleanup alte Codes
    cleanupExpiredCodes()

    // Code verifizieren
    const verificationResult = await verifyCode(email, code, ipAddress)

    if (verificationResult.success) {
      console.log(`✅ Email verification successful for ${email}`)

      return NextResponse.json({
        success: true,
        message: verificationResult.message,
        verified: true
      })
    } else {
      console.log(`❌ Email verification failed for ${email}: ${verificationResult.message}`)

      return NextResponse.json({
        success: false,
        error: verificationResult.message,
        remainingAttempts: verificationResult.remainingAttempts,
        verified: false
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Error in email verification verify:', error)
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// GET für Code-Status (optional)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-Parameter erforderlich' },
        { status: 400 }
      )
    }

    // Hier könnte man den Status eines aktiven Codes abfragen
    // Für Sicherheit geben wir nur minimale Informationen zurück

    return NextResponse.json({
      success: true,
      message: 'Status-Abfrage erfolgreich'
    })

  } catch (error) {
    console.error('❌ Error in email verification status:', error)
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
