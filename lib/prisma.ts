import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Function to get the database URL with enforced connection limits
const getDatabaseUrl = () => {
  let url = process.env.DATABASE_URL
  if (!url) return undefined

  if (!url.includes('connection_limit')) {
    const separator = url.includes('?') ? '&' : '?'
    url = `${url}${separator}connection_limit=1&pgbouncer=true`
  }
  return url
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
