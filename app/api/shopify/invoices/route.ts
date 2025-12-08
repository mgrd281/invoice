
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
        // 1. Force Single Tenant Mode: Get the Main Organization
        // This ensures we always show the data from the Desktop version
        const organization = await prisma.organization.findFirst({
            orderBy: { createdAt: 'asc' },
            include: {
                users: {
                    take: 1,
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!organization) {
            return NextResponse.json({ invoices: [], userEmail: null });
        }

        const userEmail = organization.users[0]?.email || 'unknown@example.com';

        // 2. Fetch ALL invoices (Single Tenant Mode - Absolute)
        // We ignore organizationId to ensure we see everything in the DB
        const range = searchParams.get('range') || 'all';
        const status = searchParams.get('status') || 'all';

        let whereClause: any = {};

        // Date Range Filter
        if (range !== 'all') {
            const now = new Date();
            let pastDate = new Date();

            if (range === '7d') pastDate.setDate(now.getDate() - 7);
            if (range === '14d') pastDate.setDate(now.getDate() - 14);
            if (range === '30d') pastDate.setDate(now.getDate() - 30);

            whereClause.issueDate = {
                gte: pastDate
            };
        }

        // Status Filter
        if (status !== 'all') {
            if (status === 'paid') {
                whereClause.status = { in: ['PAID', 'Bezahlt'] };
            } else if (status === 'open') {
                whereClause.status = { in: ['DRAFT', 'SENT', 'Offen'] };
            } else if (status === 'cancelled') {
                whereClause.status = { in: ['CANCELLED', 'REFUNDED', 'Storniert'] };
            }
        }

        // 2. Fetch Filtered invoices
        const invoices = await prisma.invoice.findMany({
            where: whereClause,
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

        let plan = organization.plan;

        // Hardcode Enterprise for the admin shop (relaxed check)
        if (shop && shop.toLowerCase().includes('45dv93-bk')) {
            plan = 'ENTERPRISE';
        }

        return NextResponse.json({
            invoices: mappedInvoices,
            userEmail: userEmail,
            organizationName: organization.name,
            logoUrl: organization.logoUrl,
            plan: plan
        });

    } catch (error) {
        console.error('Error fetching shop invoices:', error);
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }
}
