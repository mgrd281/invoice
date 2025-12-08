
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
            // Reset time to end of day for consistency in comparisons if needed, 
            // but usually we just want to set the start date correctly.

            if (range === 'today') {
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                whereClause.issueDate = { gte: startOfToday };
            } else if (range === '7d') {
                const pastDate = new Date();
                pastDate.setDate(now.getDate() - 7);
                whereClause.issueDate = { gte: pastDate };
            } else if (range === '14d') {
                const pastDate = new Date();
                pastDate.setDate(now.getDate() - 14);
                whereClause.issueDate = { gte: pastDate };
            } else if (range === '30d') {
                const pastDate = new Date();
                pastDate.setDate(now.getDate() - 30);
                whereClause.issueDate = { gte: pastDate };
            } else if (range === 'this_month') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                whereClause.issueDate = { gte: startOfMonth };
            } else if (range === 'this_year') {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                whereClause.issueDate = { gte: startOfYear };
            } else if (range === 'custom') {
                const startStr = searchParams.get('start');
                const endStr = searchParams.get('end');

                if (startStr && endStr) {
                    const startDate = new Date(startStr);
                    const endDate = new Date(endStr);
                    // Set end date to end of day to include the full day
                    endDate.setHours(23, 59, 59, 999);

                    whereClause.issueDate = {
                        gte: startDate,
                        lte: endDate
                    };
                }
            }
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
