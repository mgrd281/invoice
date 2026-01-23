import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email! },
            select: { organizationId: true, role: true }
        });

        if (!user?.organizationId && user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const organizationId = user?.organizationId;

        // Consider a visitor "live" if active in the last 3 minutes (180 seconds)
        const liveThreshold = new Date(Date.now() - 180 * 1000);

        const liveSessions = await prisma.visitorSession.findMany({
            where: {
                organizationId: user?.role === 'ADMIN' ? undefined : organizationId,
                lastActiveAt: {
                    gte: liveThreshold
                },
                endTime: null // Session hasn't explicitly ended
            },
            include: {
                visitor: true,
                events: {
                    orderBy: {
                        timestamp: 'desc'
                    },
                    take: 5
                }
            },
            orderBy: {
                lastActiveAt: 'desc'
            }
        });

        // Aggregate Funnel Data
        const funnel = {
            products: 0,
            cart: 0,
            checkout: 0
        };

        const intentStats = {
            high: 0,
            medium: 0,
            low: 0
        };

        liveSessions.forEach(s => {
            if (s.intentLabel === 'High') intentStats.high++;
            else if (s.intentLabel === 'Medium') intentStats.medium++;
            else intentStats.low++;

            const eventTypes = new Set(s.events.map(e => e.type));
            if (eventTypes.has('start_checkout')) funnel.checkout++;
            if (eventTypes.has('add_to_cart')) funnel.cart++;
            if (eventTypes.has('view_product')) funnel.products++;
        });

        return NextResponse.json({
            count: liveSessions.length,
            sessions: liveSessions,
            funnel,
            intentStats
        });

    } catch (error: any) {
        console.error('[Live Analytics] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
