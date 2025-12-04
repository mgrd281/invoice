import { NextRequest, NextResponse } from 'next/server'

// Geschützte Seiten, die eine Anmeldung erfordern
const protectedRoutes = [
  '/dashboard',
  '/invoices',
  '/customers',
  '/organizations',
  '/upload',
  '/settings',
  '/shopify'
]

// Öffentliche Seiten, die keine Anmeldung erfordern
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Zugriff auf statische Dateien und API erlauben
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Note: Since we're using client-side authentication with localStorage,
  // we can't check authentication status in middleware (server-side)
  // The actual authentication check happens in the AuthProvider on the client

  // Allow all routes to pass through - authentication is handled by AuthProvider
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
  runtime: 'nodejs'
}
