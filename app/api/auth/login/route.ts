import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ensureUserDirectory } from '@/lib/file-manager'

import { prisma } from '@/lib/prisma'


// Funktion zum Verschlüsseln des Passworts (für Dateneinrichtung)
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// Funktion zur Passwortüberprüfung
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// Funktion zur JWT-Token-Erstellung
function generateToken(userId: string, email: string, role: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  const payload = {
    userId,
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // läuft in 24 Stunden ab
  }

  return jwt.sign(payload, secret)
}

// Funktion zur E-Mail-Validierung
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ Daten vom Benutzer empfangen
    const body = await request.json()
    const { email, password } = body

    // Überprüfung der erforderlichen Daten
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'E-Mail und Passwort sind erforderlich',
          field: !email ? 'email' : 'password'
        },
        { status: 400 }
      )
    }

    // E-Mail-Format überprüfen
    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          message: 'E-Mail-Format ist ungültig',
          field: 'email'
        },
        { status: 400 }
      )
    }

    // Passwortlänge überprüfen
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: 'Passwort muss mindestens 6 Zeichen lang sein',
          field: 'password'
        },
        { status: 400 }
      )
    }

    // 2️⃣ Benutzer in der Datenbank suchen
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true }
    })

    // 4️⃣ Benutzerexistenz überprüfen
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kein Konto mit dieser E-Mail registriert. Bitte zuerst registrieren',
          field: 'email'
        },
        { status: 404 }
      )
    }

    // 7️⃣ Kontostatus überprüfen (aktiv/inaktiv)
    // Note: isSuspended is the field in schema, defaulting to false. 
    // If you want to check active status, ensure logic matches schema.
    if (user.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ihr Konto ist gesperrt. Bitte kontaktieren Sie den Support.',
          field: 'account'
        },
        { status: 403 }
      )
    }

    // Passwort ist bereits verschlüsselt gespeichert

    console.log('Login-Versuch:', {
      email: email,
      userFound: !!user,
      isSuspended: user.isSuspended,
      passwordLength: password.length
    })

    // 3️⃣ Passwortüberprüfung
    // Note: user.passwordHash is the field in schema
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message: 'Passwort nicht gesetzt. Bitte Passwort zurücksetzen.',
          field: 'password'
        },
        { status: 400 }
      )
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash)

    console.log('Passwortüberprüfungsergebnis:', {
      isPasswordValid,
      inputPassword: password,
      hashedPassword: user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'undefined'
    })

    // 5️⃣ Passwortüberprüfung
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Anmeldedaten sind falsch. Bitte überprüfen Sie Ihr Passwort',
          field: 'password'
        },
        { status: 401 }
      )
    }

    // 6️⃣ JWT-Token nach vollständiger Datenüberprüfung erstellen
    const token = generateToken(user.id, user.email, user.role)

    // Benutzerverzeichnis automatisch erstellen
    try {
      await ensureUserDirectory(user.id)
      console.log(`User directory created/verified for user ${user.id}`)
    } catch (error) {
      console.error('Error creating user directory:', error)
      // Login-Prozess wegen diesem Fehler nicht stoppen
    }

    // Letzten Login aktualisieren
    const loginTime = new Date().toISOString()

    // Response mit Cookie-Einstellung erstellen
    const response = NextResponse.json(
      {
        success: true,
        message: 'Erfolgreich angemeldet',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLogin: loginTime
        },
        token,
        redirectTo: user.role === 'ADMIN' ? '/' : '/'
      },
      { status: 200 }
    )

    // JWT-Token in HTTP-only Cookie für Sicherheit setzen
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 Stunden
      path: '/'
    })

    // Benutzerinformationen in separatem Cookie setzen
    response.cookies.set('user-info', JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }), {
      httpOnly: false, // Von JavaScript aus zugänglich
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Fehler beim Anmelden:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Serverfehler aufgetreten. Bitte versuchen Sie es erneut',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

// Hilfsfunktion zur Passwort-Verschlüsselung (für Entwicklung)
export async function GET() {
  const hashedPassword = await hashPassword('Mkarina321@')
  return NextResponse.json({ hashedPassword })
}
