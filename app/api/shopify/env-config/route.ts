import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;

        if (!shopDomain) {
            return NextResponse.json({
                success: false,
                error: 'SHOPIFY_SHOP_DOMAIN not configured'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            shopDomain
        });

    } catch (error: any) {
        console.error('Error fetching env config:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch config' },
            { status: 500 }
        );
    }
}
