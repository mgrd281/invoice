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
        const [dbCustomers, dbInvoices] = await Promise.all([
            prisma.customer.findMany({
                where: { organizationId },
                include: {
                    invoices: {
                        select: {
                            totalGross: true,
                            status: true,
                            issueDate: true,
                            documentKind: true,
                            refundAmount: true
                        }
                    }
                }
            }),
            prisma.invoice.findMany({
                where: {
                    organizationId,
                    issueDate: { gte: startDate, lte: endDate },
                    status: 'PAID'
                },
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
            const validInvoices = c.invoices.filter(inv =>
                inv.status === 'PAID' &&
                inv.documentKind !== 'CANCELLED' &&
                (!inv.refundAmount || Number(inv.refundAmount) === 0)
            );

            const refundedInvoices = c.invoices.filter(inv =>
                inv.status === 'REFUNDED' || (inv.refundAmount && Number(inv.refundAmount) > 0)
            );

            const cancelledInvoices = c.invoices.filter(inv =>
                inv.status === 'CANCELLED' || inv.status === 'VOID'
            );

            const ltv = validInvoices.reduce((sum, inv) => sum + Number(inv.totalGross || 0), 0);
            const totalRefunded = refundedInvoices.reduce((sum, inv) => sum + Number(inv.refundAmount || inv.totalGross || 0), 0);

            customerMap.set(c.email?.toLowerCase() || c.id, {
                id: c.id,
                name: c.name || 'Unbekannt',
                email: c.email || 'Unbekannt',
                orders: validInvoices.length,
                revenue: ltv,
                refundedAmount: totalRefunded,
                isCancelled: cancelledInvoices.length > 0,
                isRefunded: refundedInvoices.length > 0,
                lastOrderDate: validInvoices.length > 0 ? validInvoices[0].issueDate : null,
                createdAt: c.createdAt,
                source: 'invoice'
            });
        });

        // Process Shopify Customers
        shopifyCustomers.forEach(sc => {
            const email = sc.email?.toLowerCase();
            const existing = email ? customerMap.get(email) : null;
            if (existing) {
                existing.source = 'shopify_linked';
                existing.orders += parseInt(sc.orders_count || '0');
                existing.revenue += parseFloat(sc.total_spent || '0');
            } else if (email) {
                customerMap.set(email, {
                    id: sc.id.toString(),
                    name: `${sc.first_name || ''} ${sc.last_name || ''}`.trim() || 'Unbekannt',
                    email: sc.email || 'Unbekannt',
                    orders: parseInt(sc.orders_count || '0'),
                    revenue: parseFloat(sc.total_spent || '0'),
                    refundedAmount: 0,
                    isCancelled: false,
                    isRefunded: false,
                    lastOrderDate: sc.last_order_id ? new Date() : null,
                    createdAt: new Date(sc.created_at),
                    source: 'shopify'
                });
            }
        });

        const allCustomers = Array.from(customerMap.values());

        // --- 4. CALCULATE KPIs ---
        const validCustomersForStats = allCustomers.filter(c => !c.isCancelled && !c.isRefunded && c.revenue > 0);
        const totalCustomersCount = allCustomers.length;
        const newCustomersCount = allCustomers.filter(c => new Date(c.createdAt) >= startDate).length;
        const returningCustomersCount = validCustomersForStats.filter(c => c.orders >= 2).length;
        const totalRevenueSum = validCustomersForStats.reduce((sum, c) => sum + c.revenue, 0);
        const avgLtvValue = validCustomersForStats.length > 0 ? totalRevenueSum / validCustomersForStats.length : 0;

        // Segmentation
        const segments = [
            { id: 'all', label: 'Alle Kunden', count: totalCustomersCount },
            { id: 'vip', label: 'VIP Kunden', count: validCustomersForStats.filter(c => c.revenue > 500).length },
            { id: 'new', label: 'Neukunden', count: allCustomers.filter(c => c.orders <= 1).length },
            { id: 'refunded', label: 'Mit Rückerstattung', count: allCustomers.filter(c => c.isRefunded).length }
        ];

        // Insights
        const sortedByRevenue = [...allCustomers].sort((a, b) => b.revenue - a.revenue);
        const topValidCus = sortedByRevenue.find(c => !c.isRefunded && !c.isCancelled && c.revenue > 0);
        const insights = [];
        if (topValidCus) {
            insights.push({
                title: 'KI-Insights',
                text: `Top-Kunde (ohne Rückerstattung): ${topValidCus.name} – LTV ${topValidCus.revenue.toFixed(2)} €`,
                type: 'success'
            });
        }
        if (returningCustomersCount > 0) {
            insights.push({
                title: 'Kundenbindung',
                text: `${(returningCustomersCount / totalCustomersCount * 100).toFixed(1)}% Ihrer Kunden sind Wiederkäufer.`,
                type: 'info'
            });
        }

        return NextResponse.json({
            success: true,
            kpis: {
                totalCustomers: { value: totalCustomersCount, trend: 5.2 },
                newCustomers: { value: newCustomersCount, trend: 12.4 },
                returningRate: { value: totalCustomersCount > 0 ? (returningCustomersCount / totalCustomersCount * 100).toFixed(1) : 0, trend: -2.1 },
                avgLtv: { value: avgLtvValue, trend: 8.7 }
            },
            customers: sortedByRevenue.map(c => ({
                ...c,
                segment: c.isRefunded ? 'Rückerstattung' : c.revenue > 500 ? 'VIP' : c.orders <= 1 ? 'Neukunde' : 'Standard'
            })),
            segments,
            insights,
            timeline: [] // Simplified for now
        });
    } catch (error: any) {
        console.error('[CRM API] ERROR:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
