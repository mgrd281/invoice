import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { email: session.user?.email! },
            select: { organizationId: true }
        });

        if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 404 });

        const blockedIps = await prisma.blockedIp.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ blockedIps });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { ipAddress, reason } = await req.json();
        if (!ipAddress) return NextResponse.json({ error: 'IP Address is required' }, { status: 400 });

        const user = await prisma.user.findUnique({
            where: { email: session.user?.email! },
            select: { organizationId: true }
        });

        if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 404 });

        const blockedIp = await prisma.blockedIp.upsert({
            where: {
                organizationId_ipAddress: {
                    organizationId: user.organizationId,
                    ipAddress
                }
            },
            update: { reason },
            create: {
                organizationId: user.organizationId,
                ipAddress,
                reason
            }
        });

        return NextResponse.json({ blockedIp });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await prisma.blockedIp.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
