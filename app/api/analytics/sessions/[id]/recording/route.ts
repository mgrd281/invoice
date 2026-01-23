import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionId = params.id;

        // Fetch all recording chunks for this session
        const recordings = await prisma.sessionRecording.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' }
        });

        // Flatten all events into a single array
        const allEvents = recordings.flatMap(r => r.data as any[]);

        return NextResponse.json({
            success: true,
            events: allEvents
        });
    } catch (error: any) {
        console.error('[Recording Fetch] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
