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
        if (!sessionAuth?.user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        const organizationId = (sessionAuth.user as any).organizationId;
        const searchParams = request.nextUrl.searchParams;
        const range = searchParams.get('range') || '30d';

        // --- 1. DATE RANGES ---
        let endDate = endOfDay(new Date());
        let startDate: Date;

        switch (range) {
            case 'today':
                startDate = startOfDay(new Date());
                break;
            case '7d':
                startDate = startOfDay(subDays(new Date(), 7));
                break;
            case '30d':
            default:
                startDate = startOfDay(subDays(new Date(), 30));
                break;
        }

        // --- 2. FETCH REAL DATA ---
        // Fetch local database customers and invoices
        const [dbCustomers, dbInvoices] = await Promise.all([
            prisma.customer.findMany({
                where: { organizationId },
                include: { invoices: { select: { totalGross: true, status: true, issueDate: true } } }
            }),
            prisma.invoice.findMany({
                where: { organizationId, issueDate: { gte: startDate, lte: endDate } },
                select: { issueDate: true, totalGross: true, status: true }
            })
        ]);

        // Attempt to fetch Shopify data if connected
        let shopifyCustomers: any[] = [];
        try {
            const shopifyApi = new ShopifyAPI();
            shopifyCustomers = await shopifyApi.getCustomers({ limit: 100 });
        } catch (e: any) {
            console.warn('[CRM-API] Shopify not connected or sync failed', e.message);
        }

        // --- 3. AGGREGATE & NORMALIZE ---
        const customerMap = new Map<string, any>();

        // Process DB Customers
        dbCustomers.forEach(c => {
            const paidInvoices = c.invoices.filter(inv => inv.status === 'PAID');
            const ltv = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalGross || 0), 0);

            customerMap.set(c.email?.toLowerCase() || c.id, {
                id: c.id,
                name: c.name || 'Unbekannt',
                email: c.email || 'Unbekannt',
                phone: c.phone || '',
                address: c.address || '',
                orders: c.invoices.length,
                revenue: ltv,
                lastOrderDate: c.invoices.length > 0 ? c.invoices[0].issueDate : null,
                createdAt: c.createdAt,
                source: 'invoice'
            });
        });

        // Process Shopify Customers (Merge by email)
        shopifyCustomers.forEach(sc => {
            const email = sc.email?.toLowerCase();
            const existing = email ? customerMap.get(email) : null;

            if (existing) {
                // Merge Shopify metrics into local record
                existing.source = 'shopify_linked';
                existing.orders += parseInt(sc.orders_count || '0');
                existing.revenue += parseFloat(sc.total_spent || '0');
            } else if (email) {
                customerMap.set(email, {
                    id: sc.id.toString(),
                    name: `${sc.first_name || ''} ${sc.last_name || ''}`.trim() || 'Unbekannt',
                    email: sc.email || 'Unbekannt',
                    phone: sc.phone || '',
                    orders: parseInt(sc.orders_count || '0'),
                    revenue: parseFloat(sc.total_spent || '0'),
                    lastOrderDate: sc.last_order_id ? new Date() : null,
                    createdAt: new Date(sc.created_at),
                    source: 'shopify'
                });
            }
        });

        const allCustomers = Array.from(customerMap.values());

        // --- 4. CALCULATE KPIs ---
        const totalCustomersCount = allCustomers.length;
        const newCustomersCount = allCustomers.filter(c => new Date(c.createdAt) >= startDate).length;
        const returningCustomersCount = allCustomers.filter(c => c.orders >= 2).length;
        const totalRevenueSum = allCustomers.reduce((sum, c) => sum + c.revenue, 0);
        const avgLtvValue = totalCustomersCount > 0 ? totalRevenueSum / totalCustomersCount : 0;

        // Segmentation
        const segments = [
            { id: 'all', label: 'Alle Kunden', count: totalCustomersCount },
            { id: 'vip', label: 'VIP Kunden', count: allCustomers.filter(c => c.revenue > 500).length },
            { id: 'new', label: 'Neukunden', count: allCustomers.filter(c => c.orders === 1).length },
            { id: 'inactive', label: 'Inaktive Kunden', count: 0 },
            { id: 'risk', label: 'Abbruch-Risiko', count: 0 }
        ];

        // Timeline (Growth)
        const timelineMap = new Map<string, number>();
        allCustomers.forEach(c => {
            const day = format(new Date(c.createdAt), 'yyyy-MM-dd');
            if (new Date(c.createdAt) >= startDate) {
                timelineMap.set(day, (timelineMap.get(day) || 0) + 1);
            }
        });

        // Insights
        const sortedByRevenue = [...allCustomers].sort((a, b) => b.revenue - a.revenue);
        const insights = [];
        if (sortedByRevenue[0] && sortedByRevenue[0].revenue > 0) {
            insights.push({
                title: 'Top Kunde',
                text: `${sortedByRevenue[0].name} ist Ihr wertvollster Kunde mit €${sortedByRevenue[0].revenue.toFixed(2)} LTV.`,
                type: 'success'
            });
        } else {
            insights.push({
                title: 'Keine Daten',
                text: 'Erstellen Sie Favoriten oder verbinden Sie Shopify für tiefere CRM Insights.',
                type: 'info'
            });
        }

        return NextResponse.json({
            success: true,
            kpis: {
                totalCustomers: { value: totalCustomersCount, trend: 0 },
                newCustomers: { value: newCustomersCount, trend: 0 },
                returningRate: { value: totalCustomersCount > 0 ? (returningCustomersCount / totalCustomersCount * 100).toFixed(1) : 0, trend: 0 },
                avgLtv: { value: avgLtvValue, trend: 0 }
            },
            customers: sortedByRevenue.map(c => ({
                ...c,
                segment: c.revenue > 500 ? 'VIP' : c.orders === 1 ? 'Neukunde' : 'Standard'
            })),
            segments,
            timeline: Object.entries(Object.fromEntries(timelineMap))
                .map(([date, value]) => ({ date, value }))
                .sort((a: any, b: any) => a.date.localeCompare(b.date)),
            insights
        });

    } catch (error: any) {
        console.error('[CRM API] ERROR:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
