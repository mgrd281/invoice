
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
        // 1. Find the connection and organization
        // Try to match exact shop name or without .myshopify.com
        const shopNameClean = shop.replace('.myshopify.com', '');

        const connection = await prisma.shopifyConnection.findFirst({
            where: {
                OR: [
                    { shopName: shop },
                    { shopName: shopNameClean },
                    { shopName: `${shopNameClean}.myshopify.com` }
                ]
            },
            include: {
                organization: {
                    include: {
                        users: {
                            take: 1,
                            orderBy: { createdAt: 'asc' } // Get the first user (likely admin)
                        }
                    }
                }
            }
        });

        if (!connection || !connection.organization) {
            // If no connection found, return empty list but don't error
            return NextResponse.json({ invoices: [], userEmail: null });
        }

        const organization = connection.organization;
        // Identify the user email associated with this shop
        const userEmail = organization.users[0]?.email || 'unknown@example.com';

        // 2. Fetch invoices for this organization
        const invoices = await prisma.invoice.findMany({
            where: { organizationId: organization.id },
            orderBy: { issueDate: 'desc' },
            include: { customer: true }
        });

        // 3. Map to frontend format
        const mappedInvoices = invoices.map(inv => ({
            id: inv.id,
            number: inv.invoiceNumber,
            date: inv.issueDate,
            customerName: inv.customer.name,
            total: Number(inv.totalGross),
            status: inv.status,
            // Simple status color mapping
            statusColor: inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                inv.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                    inv.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
        }));

        return NextResponse.json({
            invoices: mappedInvoices,
            userEmail: userEmail,
            organizationName: organization.name
        });

    } catch (error) {
        console.error('Error fetching shop invoices:', error);
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }
}
