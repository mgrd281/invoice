import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import { NextAuthOptions } from 'next-auth'
import jwt from 'jsonwebtoken'

// Simple user storage for demo purposes
// In production, use a proper database
interface User {
  id: string
  email: string
  name: string
  image?: string
  provider: string
}

const users: User[] = []

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
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
        // This is where you would validate credentials against your database
        // For demo purposes, we'll accept any email/password combination
        if (credentials?.email && credentials?.password) {
          const user = {
            id: '1',
            email: credentials.email,
            name: credentials.email.split('@')[0],
            provider: 'credentials'
          }
          return user
        }
        return null
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Store user in our simple storage system
      if (user.email) {
        const existingUser = users.find(u => u.email === user.email)
        if (!existingUser) {
          users.push({
            id: user.id || crypto.randomUUID(),
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image || undefined,
            provider: account?.provider || 'unknown'
          })
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.provider = account?.provider
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.provider = token.provider as string
      }
      return session
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
