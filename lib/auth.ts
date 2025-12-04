import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export interface User {
  id: number
  email: string
  name: string
  role: string
}

export interface AuthResult {
  isAuthenticated: boolean
  user: User | null
  error?: string
}

// Funktion zur serverseitigen Authentifizierungsprüfung
export async function getServerAuth(): Promise<AuthResult> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'Kein Token vorhanden'
      }
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    const decoded = jwt.verify(token, secret) as any

    // Überprüfung des Token-Ablaufs
    if (decoded.exp && decoded.exp <= Math.floor(Date.now() / 1000)) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'Sitzung abgelaufen'
      }
    }

    const user: User = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name || 'Benutzer',
      role: decoded.role
    }

    return {
      isAuthenticated: true,
      user
    }

  } catch (error) {
    console.error('Fehler bei der Authentifizierungsprüfung:', error)
    return {
      isAuthenticated: false,
      user: null,
      error: 'Fehler bei der Authentifizierungsprüfung'
    }
  }
}

// Funktion zur clientseitigen Authentifizierungsprüfung
export function getClientAuth(): AuthResult {
  try {
    if (typeof window === 'undefined') {
      return {
        isAuthenticated: false,
        user: null,
        error: 'Browser nicht erreichbar'
      }
    }

    // Benutzerinformationen aus Cookie lesen
    const userInfoCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-info='))
      ?.split('=')[1]

    if (!userInfoCookie) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'Keine Benutzerinformationen vorhanden'
      }
    }

    const user = JSON.parse(decodeURIComponent(userInfoCookie)) as User

    return {
      isAuthenticated: true,
      user
    }

  } catch (error) {
    console.error('Fehler beim Lesen der Benutzerinformationen:', error)
    return {
      isAuthenticated: false,
      user: null,
      error: 'Fehler beim Lesen der Benutzerinformationen'
    }
  }
}

// Funktion zur clientseitigen Abmeldung
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      // Seite neu laden, um Änderungen anzuwenden
      window.location.href = '/landing'
      return true
    } else {
      console.error('Abmeldung fehlgeschlagen')
      return false
    }

  } catch (error) {
    console.error('Fehler bei der Abmeldung:', error)
    return false
  }
}

// Funktion zur Berechtigungsprüfung
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'admin': 3,
    'manager': 2,
    'user': 1
  }

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userLevel >= requiredLevel
}

// Funktion zur Überprüfung der Ressourceneigentümerschaft
export function canAccessResource(userId: number, resourceOwnerId: number, userRole: string): boolean {
  // Admin kann auf alle Ressourcen zugreifen
  if (userRole === 'admin') {
    return true
  }

  // Benutzer kann nur auf eigene Ressourcen zugreifen
  return userId === resourceOwnerId
}
