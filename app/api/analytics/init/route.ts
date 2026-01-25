
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        let organizationId = '';
        let userId = '';
        let role = '';

        // 1. Try NextAuth Session
        try {
            const session = await getServerSession(authOptions);
            if (session?.user) {
                organizationId = (session.user as any).organizationId;
                userId = (session.user as any).id;
                role = (session.user as any).role || 'USER';
            }
        } catch (e) {
            // Ignore
        }

        // 2. Fallback: Try custom auth-token if no orgId found
        if (!organizationId) {
            try {
                const cookieStore = await cookies();
                const token = cookieStore.get('auth-token')?.value;

                if (token) {
                    const secret = new TextEncoder().encode(
                        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
                    );
                    const { payload } = await jwtVerify(token, secret);

                    if (payload.userId && typeof payload.userId === 'string') {
                        const user = await prisma.user.findUnique({
                            where: { id: payload.userId },
                            select: { organizationId: true, role: true }
                        });
                        if (user) {
                            organizationId = user.organizationId || '';
                            userId = payload.userId as string;
                            role = user.role || 'USER';
                        }
                    }
                }
            } catch (e) {
                console.error('[Analytics Init] Auth-token check failed:', e);
            }
        }

        if (organizationId) {
            return NextResponse.json({
                success: true,
                organizationId,
                userId,
                role
            });
        }

        return NextResponse.json({
            success: false,
            error: 'No organization found'
        }, { status: 404 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
