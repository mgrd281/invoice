import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: sessionId } = await props.params;
        console.log('[Recording Fetch] Fetching events for session:', sessionId);

        // Fetch all recording chunks for this session
        const recordings = await prisma.sessionRecording.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' }
        });

        console.log(`[Recording Fetch] Found ${recordings.length} chunks for session: ${sessionId}`);

        // Flatten all events into a single array
        const allEvents = recordings.flatMap((r: any) => r.data as any[]);

        console.log(`[Recording Fetch] Total events flattened: ${allEvents.length}`);

        return NextResponse.json({
            success: true,
            events: allEvents
        });
    } catch (error: any) {
        console.error('[Recording Fetch] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
