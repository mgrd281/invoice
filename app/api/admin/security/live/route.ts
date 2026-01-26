import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const sessionAuth = await auth();
        if (!sessionAuth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { email: sessionAuth.user.email! },
            select: { organizationId: true }
        });

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 });
        }

        // Fetch recent session events for "Live Events"
        // We want: IP | Page | Time | Status
        // We can get this from SessionEvent joined with VisitorSession
        const events = await prisma.sessionEvent.findMany({
            where: {
                session: {
                    organizationId: user.organizationId
                }
            },
            take: 50,
            orderBy: { timestamp: 'desc' },
            include: {
                session: {
                    select: {
                        ipv4: true,
                        ipv6: true,
                        ipMasked: true,
                        status: true
                    }
                }
            }
        });

        const formattedEvents = events.map(event => ({
            id: event.id,
            ip: event.session.ipv4 || event.session.ipv6 || event.session.ipMasked || 'Unknown',
            page: event.path || event.url,
            time: event.timestamp,
            status: event.session.status, // ACTIVE, ENDED, BLOCKED
            type: event.type
        }));

        return NextResponse.json(formattedEvents);
    } catch (error: any) {
        console.error('[Live Events API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
