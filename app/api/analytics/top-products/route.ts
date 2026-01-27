import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { ensureOrganization } from '@/lib/db-operations';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { organizationId: true }
        });

        let organizationId = user?.organizationId;

        if (!organizationId) {
            // Fallback: try to find default org or ensure it exists
            let org = await prisma.organization.findFirst({
                where: { id: 'default-org' }
            });

            if (!org) {
                org = await ensureOrganization();
            }
            organizationId = org.id;
        }

        if (!organizationId) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 });
        }

        // Get all invoices for the organization
        const invoices = await prisma.invoice.findMany({
            where: {
                organizationId: organizationId,
                status: { in: ['PAID', 'SENT'] }
            },
            select: {
                items: true,
                totalGross: true,
                createdAt: true
            }
        });

        // Calculate product statistics
        const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};

        invoices.forEach((invoice: any) => {
            if (invoice.items && Array.isArray(invoice.items)) {
                invoice.items.forEach((item: any) => {
                    const productName = item.description || item.name || 'Unbekanntes Produkt';
                    const quantity = Number(item.quantity) || 1;
                    const price = Number(item.unitPrice || item.price || 0); // Use unitPrice if available
                    const revenue = quantity * price;

                    if (!productStats[productName]) {
                        productStats[productName] = {
                            name: productName,
                            quantity: 0,
                            revenue: 0
                        };
                    }

                    productStats[productName].quantity += quantity;
                    productStats[productName].revenue += revenue;
                });
            }
        });

        // Convert to array and sort by quantity
        const topProducts = Object.values(productStats)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        return NextResponse.json({
            success: true,
            topProducts
        });

    } catch (error: any) {
        console.error('Error fetching top products:', error);
        return NextResponse.json(
            { error: `Failed to fetch top products: ${error.message}` },
            { status: 500 }
        );
    }
}
