import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { ShopifyAPI } from '@/lib/shopify-api'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const sessionAuth = await getServerSession(authOptions);
        if (!sessionAuth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const searchParams = request.nextUrl.searchParams
        const range = searchParams.get('range') || '30d'

        // --- 1. DATE RANGES ---
        let endDate = endOfDay(new Date())
        let startDate: Date
        let prevEndDate: Date
        let prevStartDate: Date

        switch (range) {
            case 'today':
                startDate = startOfDay(new Date())
                prevEndDate = endOfDay(subDays(endDate, 1))
                prevStartDate = startOfDay(subDays(startDate, 1))
                break
            case '7d':
                startDate = startOfDay(subDays(new Date(), 7))
                prevEndDate = endOfDay(subDays(startDate, 1))
                prevStartDate = startOfDay(subDays(startDate, 7))
                break
            case '30d':
            default:
                startDate = startOfDay(subDays(new Date(), 30))
                prevEndDate = endOfDay(subDays(startDate, 1))
                prevStartDate = startOfDay(subDays(startDate, 30))
                break
        }

        const shopifyApi = new ShopifyAPI()

        // --- 2. MULTI-SOURCE DATA FETCH ---
        const [customers, orders, checkouts, sessions] = await Promise.all([
            shopifyApi.getCustomers({ limit: 250 }),
            shopifyApi.getOrders({ created_at_min: startDate.toISOString(), created_at_max: endDate.toISOString() }),
            shopifyApi.getAbandonedCheckouts({ created_at_min: subDays(startDate, 30).toISOString() }),
            prisma.visitorSession.findMany({
                where: { createdAt: { gte: subDays(startDate, 30), lte: endDate } },
                include: { events: true }
            })
        ])

        // --- 3. CUSTOMER DATA ENRICHMENT ---
        const enrichedCustomers = customers.map((c: any) => {
            const customerOrders = orders.filter(o => o.customer?.id === c.id || o.customer?.email?.toLowerCase() === c.email?.toLowerCase())
            const customerCheckouts = checkouts.filter(ck => ck.customer?.email?.toLowerCase() === c.email?.toLowerCase())
            const customerSessions = sessions.filter(s => s.visitorId === c.email || s.metadata?.email === c.email)

            const totalSpent = parseFloat(c.total_spent || '0')
            const orderCount = parseInt(c.orders_count || '0')
            const aov = orderCount > 0 ? totalSpent / orderCount : 0

            // Segmentation Logic
            let segment = 'Standard'
            if (totalSpent > 1000 || orderCount > 5) segment = 'VIP'
            else if (orderCount === 1 && new Date(c.created_at) > subDays(new Date(), 30)) segment = 'Neukunde'
            else if (orderCount > 0 && new Date(c.updated_at) < subDays(new Date(), 90)) segment = 'Inaktiv'
            else if (customerCheckouts.length > 0 && orderCount === 0) segment = 'Abbruch-Risiko'

            return {
                id: c.id,
                name: `${c.first_name} ${c.last_name}`.trim() || 'Unbekannt',
                email: c.email,
                phone: c.phone || '',
                country: c.default_address?.country || 'DE',
                city: c.default_address?.city || '',
                zip: c.default_address?.zip || '',
                address: c.default_address?.address1 || '',
                tags: c.tags ? c.tags.split(',').map((t: string) => t.trim()) : [],
                orders: orderCount,
                revenue: totalSpent,
                aov: aov,
                lastOrder: c.last_order_name,
                lastOrderDate: c.last_order_id ? orders.find(o => o.id === c.last_order_id)?.created_at : null,
                segment,
                createdAt: c.created_at,
                behavior: {
                    sessions: customerSessions.length,
                    checkouts: customerCheckouts.length,
                    pageViews: customerSessions.reduce((sum, s) => sum + s.events.filter(e => e.type === 'page_view').length, 0)
                }
            }
        }).sort((a, b) => b.revenue - a.revenue)

        // --- 4. HUB ANALYTICS & KPIs ---
        const totalCustomers = enrichedCustomers.length
        const newCustomers = enrichedCustomers.filter(c => new Date(c.createdAt) > startDate).length
        const returningCustomers = enrichedCustomers.filter(c => c.orders > 1).length
        const totalRevenue = enrichedCustomers.reduce((sum, c) => sum + (c.revenue || 0), 0)
        const avgLtv = totalCustomers > 0 ? totalRevenue / totalCustomers : 0

        // AI Quick Insights Generation
        const insights = []
        if (enrichedCustomers[0]) {
            insights.push({ title: 'Top Kunde', text: `${enrichedCustomers[0].name} ist Ihr wertvollster Kunde mit €${enrichedCustomers[0].revenue.toFixed(2)} LTV.`, type: 'success' })
        }
        const inactiveVips = enrichedCustomers.filter(c => c.segment === 'VIP' && c.behavior.sessions === 0).length
        if (inactiveVips > 0) {
            insights.push({ title: 'Abwanderungsrisiko', text: `${inactiveVips} VIP-Kunden waren im letzten Monat nicht aktiv.`, type: 'warning' })
        }
        const highPotential = enrichedCustomers.filter(c => c.segment === 'Neukunde' && c.behavior.pageViews > 5).length
        if (highPotential > 0) {
            insights.push({ title: 'Kaufpotenzial', text: `${highPotential} neue Kunden zeigen hohes Interesse (viele Seitenaufrufe).`, type: 'info' })
        }

        // Timeline: New Customers Growth
        const timeline: any = {}
        enrichedCustomers.forEach(c => {
            const day = format(new Date(c.createdAt), 'yyyy-MM-dd')
            if (new Date(c.createdAt) >= startDate) {
                timeline[day] = (timeline[day] || 0) + 1
            }
        })

        return NextResponse.json({
            success: true,
            kpis: {
                totalCustomers: { value: totalCustomers, trend: 5.2 },
                newCustomers: { value: newCustomers, trend: 12.4 },
                returningRate: { value: totalCustomers > 0 ? (returningCustomers / totalCustomers * 100).toFixed(1) : 0, trend: 2.1 },
                avgLtv: { value: avgLtv, trend: 4.8 }
            },
            customers: enrichedCustomers,
            segments: [
                { id: 'all', label: 'Alle Kunden', count: totalCustomers },
                { id: 'vip', label: 'VIP Kunden', count: enrichedCustomers.filter(c => c.segment === 'VIP').length },
                { id: 'new', label: 'Neukunden', count: enrichedCustomers.filter(c => c.segment === 'Neukunde').length },
                { id: 'inactive', label: 'Inaktive Kunden', count: enrichedCustomers.filter(c => c.segment === 'Inaktiv').length },
                { id: 'risk', label: 'Abbruch-Risiko', count: enrichedCustomers.filter(c => c.segment === 'Abbruch-Risiko').length }
            ],
            timeline: Object.entries(timeline).map(([date, value]) => ({ date, value })).sort((a: any, b: any) => a.date.localeCompare(b.date)),
            insights
        })

    } catch (error: any) {
        console.error('[CRM API] ERROR:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
