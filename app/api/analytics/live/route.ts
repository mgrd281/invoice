import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    let organizationId: string | null = null;
    let isAdmin = false;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        organizationId = (session.user as any).organizationId;
        isAdmin = (session.user as any).isAdmin;

        if (!organizationId && !isAdmin) {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email! },
                select: { organizationId: true, role: true }
            });

            if (!user?.organizationId && user?.role !== 'ADMIN') {
                return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
            }
            organizationId = user?.organizationId;
        }

        // --- Smart Cleanup: End stale sessions ---
        // A session is considered "Ended/Abandoned" if no heartbeat for 90 seconds
        const cleanupThreshold = new Date(Date.now() - 90 * 1000);
        await prisma.visitorSession.updateMany({
            where: {
                organizationId: isAdmin ? undefined : (organizationId || undefined),
                status: 'ACTIVE',
                lastActiveAt: {
                    lt: cleanupThreshold
                }
            },
            data: {
                status: 'ENDED'
            }
        });

        // Consider a visitor "live" if active in the last 30 seconds (more precise for "Live")
        const liveThreshold = new Date(Date.now() - 30 * 1000);

        const liveSessions = await prisma.visitorSession.findMany({
            where: {
                organizationId: isAdmin ? undefined : (organizationId || undefined),
                status: 'ACTIVE',
                lastActiveAt: {
                    gte: liveThreshold
                }
            },
            include: {
                visitor: true,
                events: {
                    orderBy: {
                        timestamp: 'asc'
                    }
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

        liveSessions.forEach((s: any) => {
            if (s.intentLabel === 'High') intentStats.high++;
            else if (s.intentLabel === 'Medium') intentStats.medium++;
            else intentStats.low++;

            const eventTypes = new Set(s.events.map((e: any) => e.type));
            if (eventTypes.has('start_checkout')) funnel.checkout++;
            if (eventTypes.has('add_to_cart')) funnel.cart++;
            if (eventTypes.has('view_product')) funnel.products++;
        });

        const uniqueVisitorIds = new Set(liveSessions.map((s: any) => s.visitorId));

        return NextResponse.json({
            count: liveSessions.length,
            uniqueCount: uniqueVisitorIds.size,
            sessions: liveSessions,
            funnel,
            intentStats
        });

    } catch (error: any) {
        console.error('[Live Analytics] FATAL ERROR:', {
            message: error.message,
            stack: error.stack,
            organizationId: organizationId,
            isAdmin: isAdmin
        });
        return NextResponse.json({ error: error.message, detail: error.stack }, { status: 500 });
    }
}
