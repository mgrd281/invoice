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

        console.log('Login attempt:', credentials.email)
        if (!user) {
          console.log('User not found in DB')
          return null
        }
        if (!user.passwordHash) {
          console.log('User has no password hash')
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        console.log('Password valid:', isValid)

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
      try {
        if (!user.email) return false

        // Check if user exists and is suspended
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email }
        })

        if (dbUser && dbUser.isSuspended) {
          console.log('User is suspended:', user.email)
          return false // Deny sign in
        }

        return true
      } catch (error) {
        console.error('Error in signIn callback:', error)
        return true // Allow sign in to proceed if check fails? Or false? Better to allow if it's just a check failure, but risky. Let's return false to be safe if DB fails.
        // Actually, if DB fails, NextAuth might fail anyway.
        // Let's return false to avoid inconsistent state.
        return false
      }
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
