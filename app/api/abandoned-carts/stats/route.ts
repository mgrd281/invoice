import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { startOfDay, subDays, startOfToday } from 'date-fns';

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

        // 3. Fetch all add_to_cart events in the range
        // We use SessionEvent because it's an immutable record of the action
        const events = await prisma.sessionEvent.findMany({
            where: {
                session: { organizationId: orgId },
                type: 'add_to_cart',
                timestamp: { gte: startDate }
            },
            select: { metadata: true }
        });

        // 4. Aggregate Stats
        let totalItemsAdded = 0;
        const uniqueProducts = new Set<string>();
        const productStats: Record<string, {
            title: string;
            image: string;
            count: number;
            productId: string;
            variantId?: string;
        }> = {};

        events.forEach(event => {
            const meta = event.metadata as any;
            if (!meta) return;

            // Handle both legacy and standard event structures
            const items = Array.isArray(meta.items) ? meta.items :
                (meta.product ? [meta.product] : []);

            items.forEach((item: any) => {
                const qty = parseInt(item.quantity || item.qty || 1);
                const productId = (item.product_id || item.id || 'unknown').toString();
                const variantId = (item.variant_id || '').toString();
                const title = item.title || 'Produkt';
                const image = item.image?.src || (typeof item.image === 'string' ? item.image : '');

                totalItemsAdded += qty;
                uniqueProducts.add(productId);

                if (!productStats[productId]) {
                    productStats[productId] = {
                        productId,
                        variantId,
                        title,
                        image,
                        count: 0
                    };
                }
                productStats[productId].count += qty;
            });
        });

        // 5. Format Top Products
        const topProducts = Object.values(productStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return NextResponse.json({
            stats: {
                totalItemsAdded,
                uniqueProductsCount: uniqueProducts.size,
                topProducts
            }
        });

    } catch (error: any) {
        console.error('[Cart Stats API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
