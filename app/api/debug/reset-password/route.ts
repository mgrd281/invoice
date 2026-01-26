import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const email = searchParams.get('email');
        const password = searchParams.get('password');
        const secret = searchParams.get('secret');

        // Simple protection
        if (secret !== 'GEMINI_FIX_2026') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.upsert({
            where: { email },
            update: {
                passwordHash: hashedPassword,
                password: hashedPassword
            },
            create: {
                email,
                passwordHash: hashedPassword,
                password: hashedPassword,
                name: 'Admin',
                role: 'ADMIN' // Ensure role is set
            }
        });

        return NextResponse.json({
            success: true,
            message: `Password updated for ${email}`,
            userId: user.id
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
