import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const shop = searchParams.get('shop');

        if (!shop) {
            return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
        }

        // Get Shopify settings from database
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const org = await prisma.organization.findUnique({
            where: { shopifyDomain: shop },
            include: { shopifySettings: true }
        });

        if (!org?.shopifySettings?.accessToken) {
            return NextResponse.json({ error: 'Shopify not configured' }, { status: 400 });
        }

        const { accessToken, apiVersion } = org.shopifySettings;

        // Fetch products from Shopify
        const response = await fetch(
            `https://${shop}/admin/api/${apiVersion || '2024-01'}/products.json?limit=250`,
            {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Shopify API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform products to simpler format
        const products = data.products.map((product: any) => ({
            id: product.id.toString(),
            title: product.title,
            handle: product.handle,
            price: product.variants[0]?.price || '0.00',
            image: product.images[0]?.src || product.image?.src || null,
            variants: product.variants.map((v: any) => ({
                id: v.id.toString(),
                title: v.title,
                price: v.price,
                available: v.inventory_quantity > 0
            }))
        }));

        await prisma.$disconnect();

        return NextResponse.json({
            success: true,
            products
        });

    } catch (error: any) {
        console.error('Error fetching Shopify products:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch products' },
            { status: 500 }
        );
    }
}
