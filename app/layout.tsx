import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './animations.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AuthProvider as CustomAuthProvider } from '@/lib/auth-context'
import { NavigationManager } from '@/components/navigation/navigation-manager'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rechnungs-Generator',
  description: 'Professionelle deutsche Rechnungserstellung aus Shopify-Bestellungen',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <ThemeProvider defaultTheme="light">
          <CustomAuthProvider>
            <AuthProvider>
              <Suspense fallback={null}>
                <NavigationManager />
              </Suspense>
              {children}
            </AuthProvider>
          </CustomAuthProvider>
        </ThemeProvider>
        <script src="/interactive-orbs.js" defer></script>
      </body>
    </html>
  )
}
