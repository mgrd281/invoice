import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { sessionId: rawSessionId, organizationId, events } = await req.json();

        if (!rawSessionId || !events || events.length === 0) {
            return NextResponse.json({ success: false });
        }

        // Find internal session ID
        const session = await prisma.visitorSession.findUnique({
            where: { sessionId: rawSessionId }
        });

        if (!session) {
            console.error('[Recording API] Session not found for rawSessionId:', rawSessionId);
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        console.log(`[Recording API] Storing ${events.length} events for session: ${session.id}`);

        // Store Recording Chunk
        await prisma.sessionRecording.create({
            data: {
                sessionId: session.id,
                data: events as any
            }
        });

        // Update recording status on the session if it's not already AVAILABLE
        if (session.recordingStatus !== 'AVAILABLE') {
            await prisma.visitorSession.update({
                where: { id: session.id },
                data: { recordingStatus: 'AVAILABLE' }
            });
        }

        const response = NextResponse.json({ success: true });
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
    } catch (error: any) {
        console.error('[Recording API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}
