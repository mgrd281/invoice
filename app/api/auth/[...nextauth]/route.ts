import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import { NextAuthOptions } from 'next-auth'
import { loadUsersFromDisk, saveUsersToDisk } from '@/lib/server-storage'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

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
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const users = loadUsersFromDisk()
        const user = users.find((u: any) => u.email === credentials.email)

        if (!user) {
          return null
        }

        // Check password
        // If user has no password (e.g. Google auth only), this will fail, which is correct
        if (!user.password) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          return null
        }

        // Optional: Check verification status
        // if (!user.isVerified) {
        //   throw new Error('Please verify your email first')
        // }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth providers (Google/Apple), we need to create/update the user in our DB
      if (account?.provider === 'google' || account?.provider === 'apple') {
        const users = loadUsersFromDisk()
        let existingUser = users.find((u: any) => u.email === user.email)

        if (!existingUser) {
          existingUser = {
            id: user.id || crypto.randomUUID(),
            email: user.email,
            name: user.name || user.email?.split('@')[0],
            image: user.image,
            provider: account.provider,
            isVerified: true, // OAuth emails are trusted/verified by provider
            createdAt: new Date().toISOString()
          }
          users.push(existingUser)
          saveUsersToDisk(users)
        } else {
          // Update existing user with provider info if missing
          if (!existingUser.provider) {
            existingUser.provider = account.provider
            saveUsersToDisk(users)
          }
        }

        // Ensure the session gets the correct ID from our DB
        user.id = existingUser.id
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id as string
        // @ts-ignore
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
