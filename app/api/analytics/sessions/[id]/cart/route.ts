import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sessionId } = await props.params;
        const body = await req.json();
        const { items, totalValue, itemsCount, action } = body;

        const session = await prisma.visitorSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const snapshot = await prisma.cartSnapshot.create({
            data: {
                sessionId,
                items,
                totalValue: parseFloat(totalValue),
                itemsCount: parseInt(itemsCount),
                action
            }
        });

        // NEW: Sync latest cart state to the main session record for "Live View"
        await prisma.visitorSession.update({
            where: { id: sessionId },
            data: {
                cartSnapshot: items, // Store current items JSON
                totalValue: parseFloat(totalValue),
                itemsCount: parseInt(itemsCount),
                lastActiveAt: new Date()
            }
        });

        return NextResponse.json({ success: true, snapshot });
    } catch (error: any) {
        console.error('[Cart Snapshot] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
