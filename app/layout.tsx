import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './animations.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AuthProvider as CustomAuthProvider } from '@/lib/auth-context'
import { NavigationManager } from '@/components/navigation/navigation-manager'
import { Suspense } from 'react'
import { VoiceAssistant } from '@/components/voice-assistant/VoiceAssistant'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rechnungs-Generator',
  description: 'Professionelle deutsche Rechnungserstellung aus Shopify-Bestellungen',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let organizationId = ''

  // 1. Try NextAuth Session
  try {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.organizationId) {
      organizationId = (session.user as any).organizationId
    }
  } catch (e) {
    console.error('NextAuth session check failed:', e)
  }

  // 2. Fallback: Try custom auth-token if no orgId found
  if (!organizationId) {
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get('auth-token')?.value

      if (token) {
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || 'your-secret-key-change-in-production'
        )
        const { payload } = await jwtVerify(token, secret)

        if (payload.userId) {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId as string },
            select: { organizationId: true }
          })
          if (user?.organizationId) {
            organizationId = user.organizationId
          }
        }
      }
    } catch (e) {
      console.error('Auth-token fallback check failed:', e)
    }
  }

  return (
    <html lang="de">
      <head>
        {organizationId && <meta name="organization-id" content={organizationId} />}
        <script src="/analytics-tracker.js" data-org-id={organizationId} defer></script>
      </head>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="light">
          <CustomAuthProvider>
            <AuthProvider>
              <Suspense fallback={null}>
                <NavigationManager />
              </Suspense>
              {children}
              <VoiceAssistant />
            </AuthProvider>
          </CustomAuthProvider>
        </ThemeProvider>
        <script src="/interactive-orbs.js" defer></script>
      </body>
    </html>
  )
}
