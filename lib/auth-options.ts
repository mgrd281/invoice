import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { loadUsersFromDisk, saveUsersToDisk } from '@/lib/server-storage'

export const authOptions: NextAuthOptions = {
    // Removed PrismaAdapter to fix DB connection issues
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            allowDangerousEmailAccountLinking: true,
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

                console.log('Login attempt:', credentials.email)
                if (!user) {
                    console.log('User not found in JSON storage')
                    return null
                }

                // Support both 'password' (legacy/seed) and 'passwordHash'
                const storedHash = user.password || user.passwordHash

                if (!storedHash) {
                    console.log('User has no password hash')
                    return null
                }

                const isValid = await bcrypt.compare(credentials.password, storedHash)
                console.log('Password valid:', isValid)

                if (!isValid) {
                    return null
                }

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
        async signIn({ user, account }) {
            try {
                if (!user.email) return false

                const users = loadUsersFromDisk()
                const existingUser = users.find((u: any) => u.email === user.email)

                if (existingUser) {
                    if (existingUser.isSuspended) {
                        console.log('User is suspended:', user.email)
                        return false
                    }
                    // Update user info if needed (e.g. image from Google)
                    if (user.image && user.image !== existingUser.image) {
                        existingUser.image = user.image
                        saveUsersToDisk(users)
                    }
                } else {
                    // Create new user for social login
                    if (account?.provider === 'google' || account?.provider === 'apple') {
                        const newUser = {
                            id: user.id || `user_${Date.now()}`,
                            email: user.email,
                            name: user.name || '',
                            image: user.image || '',
                            role: 'USER',
                            provider: account.provider,
                            createdAt: new Date().toISOString(),
                            isVerified: true
                        }
                        users.push(newUser)
                        saveUsersToDisk(users)
                        console.log('Created new user from social login:', user.email)
                    }
                }

                return true
            } catch (error) {
                console.error('Error in signIn callback:', error)
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
