import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { subHours } from 'date-fns'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // @ts-ignore
        const organizationId = session.user.organizationId
        const whereClause = organizationId ? { organizationId } : {}

        const now = new Date()
        const last24h = subHours(now, 24)

        const [
            activeThreats,
            blockedToday,
            failedLogins,
            totalBlockedIps,
            totalBlockedEmails
        ] = await Promise.all([
            // Active threats: recent failed attempts that are NOT yet blocked? 
            // Or maybe blocked user attempts in last hour.
            // Let's count BlockedIp + BlockedUser entries for "Total Active Constraints"
            // But "Active Threats" implies ongoing attack. Let's use Failed Attempts in last 1h.
            prisma.blockedUserAttempt.count({
                where: {
                    ...whereClause,
                    createdAt: { gte: subHours(now, 1) },
                    blocked: false // Failed but not yet blocked? Or just failed attempts.
                }
            }),
            // Blocked Today (Attempts that were blocked)
            prisma.blockedUserAttempt.count({
                where: {
                    ...whereClause,
                    createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                    blocked: true
                }
            }),
            // Failed Logins 24h
            prisma.blockedUserAttempt.count({
                where: {
                    ...whereClause,
                    createdAt: { gte: last24h },
                    attemptType: 'LOGIN_FAILED'
                }
            }),
            prisma.blockedIp.count({ where: whereClause }),
            prisma.blockedUser.count({ where: whereClause })
        ])

        // Calculate Risk Level based on failed logins in last 1h
        // Simple logic: > 50 = High, > 10 = Medium, else Low
        let riskLevel = 'Low'
        if (activeThreats > 50) riskLevel = 'High'
        else if (activeThreats > 10) riskLevel = 'Medium'

        return NextResponse.json({
            activeThreats,
            blockedToday,
            failedLogins,
            riskLevel,
            totalBlocked: totalBlockedIps + totalBlockedEmails
        })
    } catch (error) {
        console.error('Security stats error:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
