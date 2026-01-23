import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const sessionAuth = await getServerSession(authOptions);
        if (!sessionAuth?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const organizationId = (sessionAuth.user as any).organizationId;
        const isAdmin = (sessionAuth.user as any).isAdmin;

        if (!organizationId && !isAdmin) {
            // Fallback for old sessions or missing info
            const user = await prisma.user.findUnique({
                where: { email: sessionAuth.user.email! },
                select: { organizationId: true, role: true }
            });

            if (!user?.organizationId && user?.role !== 'ADMIN') {
                return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
            }

            // @ts-ignore
            organizationId = user?.organizationId;
        }
        const searchParams = request.nextUrl.searchParams
        const fromStr = searchParams.get('from')
        const toStr = searchParams.get('to')
        const range = searchParams.get('range') || '7d'

        let startDate: Date
        let endDate: Date = endOfDay(new Date())

        if (fromStr && toStr) {
            startDate = startOfDay(new Date(fromStr))
            endDate = endOfDay(new Date(toStr))
        } else {
            switch (range) {
                case 'today':
                    startDate = startOfDay(new Date())
                    break
                case 'yesterday':
                    startDate = startOfDay(subDays(new Date(), 1))
                    endDate = endOfDay(subDays(new Date(), 1))
                    break
                case '30d':
                    startDate = startOfDay(subDays(new Date(), 30))
                    break
                case '7d':
                default:
                    startDate = startOfDay(subDays(new Date(), 7))
                    break
            }
        }

        // 1. Fetch Sessions and Events within range
        const sessions = await prisma.visitorSession.findMany({
            where: {
                organizationId: isAdmin ? undefined : (organizationId || undefined),
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                events: true
            }
        })

        const totalSessions = sessions.length
        const totalVisitors = new Set(sessions.map((s: any) => s.visitorId)).size

        // Active visitors (last 30 minutes for aggregation)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
        const activeVisitors = await prisma.visitorSession.count({
            where: {
                organizationId: isAdmin ? undefined : (organizationId || undefined),
                lastActiveAt: { gte: thirtyMinutesAgo },
                status: 'ACTIVE'
            }
        })

        // 2. Calculate KPIs
        let totalDuration = 0
        let totalPages = 0
        let bounceCount = 0
        let conversionCount = 0

        sessions.forEach((session: any) => {
            // Duration
            const duration = (new Date(session.lastActiveAt).getTime() - new Date(session.startTime).getTime()) / 1000
            totalDuration += duration

            // Page Views
            const pageViews = session.events.filter((e: any) => e.type === 'page_view').length
            totalPages += pageViews

            // Bounce (only 1 page view and no other meaningful interaction)
            if (pageViews <= 1 && session.events.length <= 2) {
                bounceCount++
            }

            // Conversion (Order placed)
            if (session.purchaseStatus === 'PAID') {
                conversionCount++
            }
        })

        const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0
        const pagesPerSession = totalSessions > 0 ? parseFloat((totalPages / totalSessions).toFixed(1)) : 0
        const bounceRate = totalSessions > 0 ? Math.round((bounceCount / totalSessions) * 100) : 0
        const conversionRate = totalSessions > 0 ? parseFloat(((conversionCount / totalSessions) * 100).toFixed(1)) : 0

        // 3. Device & System Distribution
        const devices: Record<string, number> = {}
        const osDistribution: Record<string, number> = {}

        sessions.forEach((s: any) => {
            const d = s.deviceType || 'Unknown'
            devices[d] = (devices[d] || 0) + 1

            const o = s.os || 'Unknown'
            osDistribution[o] = (osDistribution[o] || 0) + 1
        })

        // 4. Traffic Sources
        const sources: Record<string, number> = {}
        sessions.forEach((s: any) => {
            const src = s.sourceLabel || 'Direct'
            sources[src] = (sources[src] || 0) + 1
        })

        // 5. Timeline Data (Daily)
        const timelineMap: Record<string, { sessions: number, visitors: number }> = {}
        sessions.forEach((s: any) => {
            const day = format(new Date(s.createdAt), 'yyyy-MM-dd')
            if (!timelineMap[day]) {
                timelineMap[day] = { sessions: 0, visitors: 0 }
            }
            timelineMap[day].sessions++
        })

        // 6. Top Pages Analysis
        const pageStats: Record<string, { views: number, duration: number, exits: number }> = {}
        sessions.forEach((session: any) => {
            const sessionEvents = session.events.filter((e: any) => e.type === 'page_view')
            sessionEvents.forEach((ev: any, idx: number) => {
                const path = ev.path || '/'
                if (!pageStats[path]) {
                    pageStats[path] = { views: 0, duration: 0, exits: 0 }
                }
                pageStats[path].views++

                // Calculate duration on this page (time until next event or end of session)
                const currentIdx = session.events.indexOf(ev);
                const nextEv = session.events[currentIdx + 1]
                const duration = nextEv
                    ? (new Date(nextEv.timestamp).getTime() - new Date(ev.timestamp).getTime()) / 1000
                    : 0
                pageStats[path].duration += duration

                // Exit rate
                if (idx === sessionEvents.length - 1) {
                    pageStats[path].exits++
                }
            })
        })

        const topPages = Object.entries(pageStats)
            .map(([url, stats]) => ({
                url,
                views: stats.views,
                avgDuration: Math.round(stats.duration / stats.views),
                exitRate: Math.round((stats.exits / stats.views) * 100)
            }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10)

        return NextResponse.json({
            success: true,
            kpis: {
                totalVisitors,
                activeVisitors,
                totalSessions,
                avgSessionDuration,
                pagesPerSession,
                bounceRate,
                conversions: conversionCount,
                conversionRate
            },
            distribution: {
                devices: Object.entries(devices).map(([label, value]) => ({ label, value })),
                os: Object.entries(osDistribution).map(([label, value]) => ({ label, value })),
                sources: Object.entries(sources).map(([label, value]) => ({ label, value }))
            },
            timeline: Object.entries(timelineMap).map(([date, data]) => ({
                date,
                sessions: data.sessions
            })).sort((a, b) => a.date.localeCompare(b.date)),
            topPages
        })

    } catch (error) {
        console.error('Analytics API Error:', error)
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
    }
}
