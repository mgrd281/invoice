import { prisma } from '@/lib/prisma'

export async function isUserBlocked(email: string | null | undefined, organizationId: string): Promise<{ blocked: boolean, reason?: string }> {
    if (!email) return { blocked: false }

    const normalizedEmail = email.trim().toLowerCase()

    // 1. Check Exact Email
    const blockedUser = await prisma.blockedUser.findFirst({
        where: {
            organizationId,
            email: { equals: normalizedEmail, mode: 'insensitive' }
        }
    })

    if (blockedUser) {
        return { blocked: true, reason: blockedUser.reason || 'Email blocked' }
    }

    // 2. Check Domain Block (e.g. "@example.com")
    const domain = normalizedEmail.split('@')[1]
    if (domain) {
        const blockedDomain = await prisma.blockedUser.findFirst({
            where: {
                organizationId,
                email: { equals: `@${domain}`, mode: 'insensitive' }
            }
        })

        if (blockedDomain) {
            return { blocked: true, reason: blockedDomain.reason || 'Domain blocked' }
        }
    }

    return { blocked: false }
}

