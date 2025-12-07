import { NextRequest, NextResponse } from 'next/server';
import { loadInvoicesFromDisk } from '@/lib/server-storage';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
        return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
    }

    try {
        // Load invoices specific to this shop
        const invoices = loadInvoicesFromDisk(shop);

        // Sort by date descending
        invoices.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({ invoices });
    } catch (error) {
        console.error('Error fetching shop invoices:', error);
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }
}
