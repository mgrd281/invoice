import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to static files and auth API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') || // Allow auth endpoints (login, register, callback)
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Get the session token
  // This works for both Google OAuth and Credentials
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  const requestHeaders = new Headers(request.headers)

  if (token) {
    // User is authenticated
    // Construct user info object matching what requireAuth expects
    const userInfo = {
      id: token.id, // This comes from our customized JWT callback
      email: token.email,
      name: token.name,
      image: token.image,
      provider: token.provider
    }

    // Set the header for API routes to read
    // Safe Base64 encode to handle special characters (umlauts, emojis, etc.)
    const userInfoStr = JSON.stringify(userInfo)
    const userInfoBase64 = btoa(encodeURIComponent(userInfoStr).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      }))
    requestHeaders.set('x-user-info', userInfoBase64)
  } else {
    // User is NOT authenticated

    // List of protected page routes
    const protectedPageRoutes = [
      '/dashboard',
      '/invoices',
      '/customers',
      '/settings',
      '/settings'
    ]

    if (protectedPageRoutes.some(route => pathname.startsWith(route))) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
