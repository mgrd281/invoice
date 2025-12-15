import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const shop = searchParams.get('shop');

        if (!shop) {
            return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
        }

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        // Get all bundles for this shop
        const bundles = await prisma.productBundle.findMany({
            where: {
                organization: {
                    shopifyDomain: shop
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        await prisma.$disconnect();

        return NextResponse.json({
            success: true,
            bundles
        });

    } catch (error: any) {
        console.error('Error fetching bundles:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch bundles' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { shop, mainProductId, bundleProductIds, title } = body;

        if (!shop || !mainProductId || !bundleProductIds || !Array.isArray(bundleProductIds)) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        // Get organization
        const org = await prisma.organization.findUnique({
            where: { shopifyDomain: shop }
        });

        if (!org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Create bundle
        const bundle = await prisma.productBundle.create({
            data: {
                organizationId: org.id,
                mainProductId: mainProductId.toString(),
                bundleProductIds: bundleProductIds.map((id: any) => id.toString()),
                title: title || 'Neues Bundle',
                active: true
            }
        });

        await prisma.$disconnect();

        return NextResponse.json({
            success: true,
            bundle
        });

    } catch (error: any) {
        console.error('Error creating bundle:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create bundle' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const bundleId = searchParams.get('id');

        if (!bundleId) {
            return NextResponse.json({ error: 'Bundle ID is required' }, { status: 400 });
        }

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        await prisma.productBundle.delete({
            where: { id: bundleId }
        });

        await prisma.$disconnect();

        return NextResponse.json({
            success: true
        });

    } catch (error: any) {
        console.error('Error deleting bundle:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete bundle' },
            { status: 500 }
        );
    }
}
