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

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const deviceType = searchParams.get('deviceType');
        const sessionId = searchParams.get('sessionId');

        const user = await prisma.user.findUnique({
            where: { email: session.user.email! },
            select: { organizationId: true, role: true }
        });

        if (!user?.organizationId && user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const where: any = {
            organizationId: user?.role === 'ADMIN' ? undefined : user.organizationId,
        };

        if (deviceType) where.deviceType = deviceType;
        if (sessionId) where.sessionId = sessionId;

        const [sessions, total] = await Promise.all([
            prisma.visitorSession.findMany({
                where,
                include: {
                    visitor: true,
                    events: {
                        orderBy: {
                            timestamp: 'asc'
                        }
                    },
                    _count: {
                        select: { events: true }
                    }
                },
                orderBy: {
                    startTime: 'desc'
                },
                take: limit,
                skip: offset
            }),
            prisma.visitorSession.count({ where })
        ]);

        return NextResponse.json({
            sessions,
            pagination: {
                total,
                limit,
                offset
            }
        });

    } catch (error: any) {
        console.error('[Session History] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
