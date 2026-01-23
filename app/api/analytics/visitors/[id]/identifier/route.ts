import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const visitorId = params.id;
        const { customIdentifier } = await req.json();

        const updatedVisitor = await prisma.visitor.update({
            where: { id: visitorId },
            data: {
                customIdentifier: customIdentifier ?? null,
            }
        });

        // Create Audit Log
        await prisma.auditLog.create({
            data: {
                organizationId: updatedVisitor.organizationId,
                userId: (session.user as any).id,
                action: 'UPDATE_VISITOR_ID',
                entityType: 'VISITOR',
                entityId: visitorId,
                details: {
                    newIdentifier: customIdentifier,
                    timestamp: new Date().toISOString()
                }
            }
        });

        return NextResponse.json({
            success: true,
            customIdentifier: updatedVisitor.customIdentifier,
            message: 'Besucher-ID wurde aktualisiert.'
        });
    } catch (error: any) {
        console.error('[Visitor ID Update] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
