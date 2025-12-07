import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true, // Allow linking if email matches
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || '',
      clientSecret: process.env.APPLE_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          return null
        }

        // Check if suspended
        // @ts-ignore - isSuspended is not yet in the generated type but will be
        if (user.isSuspended) {
          throw new Error('Account suspended')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      // Check if user exists and is suspended
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email }
      })

      if (dbUser && dbUser.isSuspended) {
        return false // Deny sign in
      }

      return true
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id as string
        // @ts-ignore
        session.user.provider = token.provider as string
        // @ts-ignore
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider
        // Check admin status
        const isAdmin = ['mgrdegh@web.de', 'Mkarina321@'].includes((user.email || '').toLowerCase())
        token.isAdmin = isAdmin
      }
      return token
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
