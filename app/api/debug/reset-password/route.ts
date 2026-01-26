
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const email = 'mgrdegh@web.de';
        const password = '1532@@@';
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Check if organization exists, if not create one
        let org = await prisma.organization.findFirst({
            where: { slug: 'admin-org' }
        });

        if (!org) {
            // Fallback: check any organization
            org = await prisma.organization.findFirst();

            if (!org) {
                org = await prisma.organization.create({
                    data: {
                        name: 'Admin Organization',
                        slug: 'admin-org',
                        address: 'Admin St',
                        zipCode: '12345',
                        city: 'Admin City'
                    }
                });
            }
        }

        // 2. Upsert User
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                passwordHash: hashedPassword,
                role: 'ADMIN',
                organizationId: org.id
            },
            create: {
                email,
                name: 'Admin User',
                passwordHash: hashedPassword,
                role: 'ADMIN',
                organizationId: org.id
            },
        });

        return NextResponse.json({
            success: true,
            message: `Admin user ${email} password reset successfully to: ${password}`,
            user: { id: user.id, email: user.email, role: user.role }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
