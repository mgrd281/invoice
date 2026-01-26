import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { ShopifyAPI } from '@/lib/shopify-api'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    let range = '7d';
    let fromStr: string | null = null;
    let toStr: string | null = null;
    try {
        const sessionAuth = await getServerSession(authOptions);
        if (!sessionAuth?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let organizationId = (sessionAuth.user as any).organizationId;
        const isAdmin = (sessionAuth.user as any).isAdmin;

        if (!organizationId && !isAdmin) {
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
        fromStr = searchParams.get('from')
        toStr = searchParams.get('to')
        range = searchParams.get('range') || '7d'

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

        // --- 1. Fetch Application Traffic Sessions (Visitor Tracking) ---
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

        // --- 2. Fetch REAL Shopify Store Data (Orders & Products) ---
        const shopifyApi = new ShopifyAPI()
        const orders = await shopifyApi.getOrders({
            created_at_min: startDate.toISOString(),
            created_at_max: endDate.toISOString(),
            status: 'any'
        })

        // --- 3. Aggregate App Traffic Metrics ---
        const totalSessions = sessions.length
        const totalVisitors = new Set(sessions.map((s: any) => s.visitorId)).size

        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
        const activeVisitors = await prisma.visitorSession.count({
            where: {
                organizationId: isAdmin ? undefined : (organizationId || undefined),
                lastActiveAt: { gte: thirtyMinutesAgo },
                status: 'ACTIVE'
            }
        })

        let totalDuration = 0
        let totalPages = 0
        let bounceCount = 0

        sessions.forEach((session: any) => {
            const duration = (new Date(session.lastActiveAt).getTime() - new Date(session.startTime).getTime()) / 1000
            totalDuration += duration
            const pageViews = session.events.filter((e: any) => e.type === 'page_view').length
            totalPages += pageViews
            if (pageViews <= 1 && session.events.length <= 2) bounceCount++
        })

        // --- 4. Aggregate Shopify Financial Metrics ---
        let totalRevenue = 0
        let orderCount = orders.length
        let totalTax = 0
        let refunds = 0

        orders.forEach(order => {
            const price = parseFloat(order.total_price)
            totalRevenue += price
            totalTax += parseFloat(order.total_tax)
            if (order.financial_status === 'refunded') {
                refunds += price
            }
        })

        const netRevenue = totalRevenue - refunds
        const aov = orderCount > 0 ? parseFloat((totalRevenue / orderCount).toFixed(2)) : 0
        const conversionRate = totalSessions > 0 ? parseFloat(((orderCount / totalSessions) * 100).toFixed(2)) : 0

        // --- 5. Timeline & Distributions ---
        const timelineMap: Record<string, { sessions: number, revenue: number }> = {}

        // Fill sessions
        sessions.forEach((s: any) => {
            const day = format(new Date(s.createdAt), 'yyyy-MM-dd')
            if (!timelineMap[day]) timelineMap[day] = { sessions: 0, revenue: 0 }
            timelineMap[day].sessions++
        })

        // Fill revenue
        orders.forEach(o => {
            const day = format(new Date(o.created_at), 'yyyy-MM-dd')
            if (!timelineMap[day]) timelineMap[day] = { sessions: 0, revenue: 0 }
            timelineMap[day].revenue += parseFloat(o.total_price)
        })

        // Distributions (Devices/Sources) - From Sessions
        const devices: Record<string, number> = {}
        const sources: Record<string, number> = {}
        sessions.forEach((s: any) => {
            const d = s.deviceType || 'Unknown'
            devices[d] = (devices[d] || 0) + 1
            const src = s.sourceLabel || 'Direct'
            sources[src] = (sources[src] || 0) + 1
        })

        return NextResponse.json({
            success: true,
            kpis: {
                totalVisitors,
                activeVisitors,
                totalSessions,
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                netRevenue: parseFloat(netRevenue.toFixed(2)),
                orderCount,
                aov,
                conversionRate,
                bounceRate: totalSessions > 0 ? Math.round((bounceCount / totalSessions) * 100) : 0,
                avgSessionDuration: totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0
            },
            distribution: {
                devices: Object.entries(devices).map(([label, value]) => ({ label, value })),
                sources: Object.entries(sources).map(([label, value]) => ({ label, value }))
            },
            timeline: Object.entries(timelineMap).map(([date, data]) => ({
                date,
                sessions: data.sessions,
                revenue: parseFloat(data.revenue.toFixed(2))
            })).sort((a, b) => a.date.localeCompare(b.date)),
            orders: orders.slice(0, 10) // Small slice for preview
        })

    } catch (error: any) {
        console.error('[Analytics Overview] ERROR:', error);
        return NextResponse.json({
            success: false,
            message: error.message
        }, { status: 500 });
    }
}
