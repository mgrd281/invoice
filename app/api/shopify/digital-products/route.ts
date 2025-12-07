
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
        return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
    }

    try {
        // Find the organization for this shop
        const connection = await prisma.shopifyConnection.findFirst({
            where: { shopName: shop },
            include: { organization: true }
        });

        if (!connection || !connection.organization) {
            return NextResponse.json({ success: true, data: [] });
        }

        const products = await prisma.digitalProduct.findMany({
            where: {
                organizationId: connection.organization.id
            },
            include: {
                _count: {
                    select: { keys: { where: { isUsed: false } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, data: products });
    } catch (error) {
        console.error('Error fetching shop digital products:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
