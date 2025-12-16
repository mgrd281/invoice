import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { ensureOrganization } from '@/lib/db-operations';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get organization ID from user or fallback to default
        let organizationId: string | undefined;

        const user = await prisma.user.findUnique({
            where: { email: session.user.email! },
            select: { organizationId: true }
        });

        if (user?.organizationId) {
            organizationId = user.organizationId;
        } else {
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
            return NextResponse.json({ error: 'Organization not found and could not be created' }, { status: 404 });
        }

        // 1. Fetch relevant documents:
        // - Invoices: Must be PAID (or SENT if we want to include open, but user said "Nur Bezahlt") -> Let's stick to PAID for positive revenue.
        // - Credit Notes / Refunds: Any status except CANCELLED should count as a deduction.
        const allDocuments = await prisma.invoice.findMany({
            where: {
                organizationId,
                status: { not: 'CANCELLED' }, // Exclude cancelled globally
                OR: [
                    { status: 'PAID' }, // Paid invoices
                    { documentKind: { in: ['CREDIT_NOTE', 'REFUND_FULL', 'REFUND_PARTIAL'] } } // Any valid credit note
                ]
            },
            include: {
                customer: true
            }
        });

        // 2. Calculate Total Revenue (Net after refunds)
        const totalRevenue = allDocuments.reduce((sum, inv) => {
            const gross = Number(inv.totalGross);
            const isRefund = inv.documentKind === 'CREDIT_NOTE' ||
                inv.documentKind === 'REFUND_FULL' ||
                inv.documentKind === 'REFUND_PARTIAL';

            if (isRefund) {
                return sum - gross;
            }

            // For normal invoices, only count if PAID
            if (inv.status === 'PAID') {
                // Subtract partial refund amount if present on the invoice
                const refundAmount = inv.refundAmount ? Number(inv.refundAmount) : 0;
                return sum + gross - refundAmount;
            }

            return sum;
        }, 0);

        // 3. Paid Invoices Count (Only count actual sales invoices)
        const paidInvoicesCount = allDocuments.filter(inv =>
            inv.status === 'PAID' && (inv.documentKind === 'INVOICE' || !inv.documentKind)
        ).length;

        // 4. Average Invoice Value
        const averageInvoiceValue = paidInvoicesCount > 0 ? totalRevenue / paidInvoicesCount : 0;

        // 5. Top Customers
        const customerMap = new Map<string, { name: string; email: string; totalSpent: number }>();

        allDocuments.forEach(inv => {
            if (inv.customer) {
                const customerId = inv.customer.id;
                const current = customerMap.get(customerId) || {
                    name: inv.customer.name,
                    email: inv.customer.email || '',
                    totalSpent: 0
                };

                const gross = Number(inv.totalGross);
                const isRefund = inv.documentKind === 'CREDIT_NOTE' ||
                    inv.documentKind === 'REFUND_FULL' ||
                    inv.documentKind === 'REFUND_PARTIAL';

                if (isRefund) {
                    current.totalSpent -= gross;
                } else if (inv.status === 'PAID') {
                    // Only add positive revenue for PAID invoices
                    current.totalSpent += gross;
                    if (inv.refundAmount) {
                        current.totalSpent -= Number(inv.refundAmount);
                    }
                }

                customerMap.set(customerId, current);
            }
        });

        const topCustomers = Array.from(customerMap.values())
            .filter(c => c.totalSpent > 0) // Only show customers with positive total spent
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5);

        // 6. Monthly Income (Last 12 Months)
        const monthlyIncomeMap = new Map<string, number>();
        const now = new Date();

        // Initialize last 12 months with 0
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyIncomeMap.set(key, 0);
        }

        allDocuments.forEach(inv => {
            const d = new Date(inv.issueDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyIncomeMap.has(key)) {
                const gross = Number(inv.totalGross);
                const isRefund = inv.documentKind === 'CREDIT_NOTE' ||
                    inv.documentKind === 'REFUND_FULL' ||
                    inv.documentKind === 'REFUND_PARTIAL';

                let amountToAdd = 0;
                if (isRefund) {
                    amountToAdd = -gross;
                } else if (inv.status === 'PAID') {
                    amountToAdd = gross;
                    if (inv.refundAmount) {
                        amountToAdd -= Number(inv.refundAmount);
                    }
                }

                if (amountToAdd !== 0) {
                    monthlyIncomeMap.set(key, (monthlyIncomeMap.get(key) || 0) + amountToAdd);
                }
            }
        });

        const monthlyIncome = Array.from(monthlyIncomeMap.entries()).map(([name, total]) => ({
            name,
            total
        }));

        return NextResponse.json({
            totalRevenue,
            paidInvoicesCount,
            averageInvoiceValue,
            topCustomers,
            monthlyIncome
        });

    } catch (error: any) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: `Analytics Error: ${error.message}` },
            { status: 500 }
        );
    }
}
