import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { subDays, startOfToday } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || '7d';

        // 1. Determine Organization
        const user = await prisma.user.findUnique({
            where: { email: session.user?.email! },
            select: { organizationId: true }
        });

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'No organization' }, { status: 404 });
        }

        const orgId = user.organizationId;

        // 2. Determine Date Filter
        let startDate = subDays(new Date(), 7);
        if (range === 'today') startDate = startOfToday();
        else if (range === '30d') startDate = subDays(new Date(), 30);
        else if (range === 'all') startDate = new Date(0);

        // 3. Fetch cart-related events in the range
        // We look for both 'add_to_cart' and 'update_cart' since many themes only trigger update
        const events = await prisma.sessionEvent.findMany({
            where: {
                session: { organizationId: orgId },
                type: { in: ['add_to_cart', 'update_cart'] },
                timestamp: { gte: startDate }
            },
            select: {
                sessionId: true,
                metadata: true,
                type: true,
                timestamp: true
            },
            orderBy: { timestamp: 'asc' }
        });

        // 4. Aggregate Stats with Deduplication
        // Strategy: Track the "items ever seen" in each session to derive total additions
        let totalItemsAdded = 0;
        const uniqueProductsGlobal = new Set<string>();
        const productStats: Record<string, {
            title: string;
            image: string;
            count: number;
            productId: string;
        }> = {};

        // Track what we've already counted as "added" for each session to avoid double-counting snapshots
        const sessionSeenItems = new Map<string, Set<string>>();

        events.forEach(event => {
            const meta = event.metadata as any;
            if (!meta) return;

            const cartData = meta.cart || meta;
            const items = Array.isArray(cartData.items) ? cartData.items :
                (cartData.product ? [cartData.product] : []);

            if (!sessionSeenItems.has(event.sessionId)) {
                sessionSeenItems.set(event.sessionId, new Set());
            }
            const seenInThisSession = sessionSeenItems.get(event.sessionId)!;

            items.forEach((item: any) => {
                const productId = (item.product_id || item.id || 'unknown').toString();
                const variantId = (item.variant_id || '').toString();
                const key = `${productId}-${variantId}`;

                // If we haven't seen this item in this session yet, or if its quantity increased
                // (Simplification: we count unique product-variant occurrences as "additions" for global stats)
                if (!seenInThisSession.has(key)) {
                    const qty = parseInt(item.quantity || item.qty || 1);
                    const title = item.title || 'Produkt';
                    const image = item.image?.src || (typeof item.image === 'string' ? item.image : '');

                    totalItemsAdded += qty;
                    uniqueProductsGlobal.add(productId);

                    if (!productStats[productId]) {
                        productStats[productId] = {
                            productId,
                            title,
                            image,
                            count: 0
                        };
                    }
                    productStats[productId].count += qty;
                    seenInThisSession.add(key);
                }
            });
        });

        // 5. Format Top Products (Expanded to 20)
        const topProductsItems = Object.values(productStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        return NextResponse.json({
            stats: {
                totalItemsAdded,
                uniqueProductsCount: uniqueProductsGlobal.size,
                topProducts: topProductsItems
            }
        });

    } catch (error: any) {
        console.error('[Cart Stats API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
