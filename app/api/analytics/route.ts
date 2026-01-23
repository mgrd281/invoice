import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { ensureOrganization } from '@/lib/db-operations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email! },
            select: { organizationId: true, role: true }
        });

        // If user is ADMIN, we fetch ALL invoices regardless of organization
        // If user is not ADMIN, we enforce organization check
        let whereClause: any = {
            status: { not: 'CANCELLED' }
        };

        if (user?.role !== 'ADMIN') {
            if (user?.organizationId) {
                whereClause.organizationId = user.organizationId;
            } else {
                // Fallback: try to find default org or ensure it exists
                let org = await prisma.organization.findFirst({
                    where: { id: 'default-org' }
                });

                if (!org) {
                    org = await ensureOrganization();
                }
                whereClause.organizationId = org.id;
            }
        }

        // 1. Fetch relevant documents:
        // We fetch ALL non-cancelled documents (using valid Enum value).
        // We will filter out legacy "STORNIERT" strings in JS if they exist (e.g. from bad imports).
        const allDocuments = await prisma.invoice.findMany({
            where: whereClause,
            include: {
                customer: true
            }
        });

        // Helper for safe number conversion
        const toNumber = (val: any) => {
            if (!val) return 0
            if (typeof val === 'number') return val
            if (val && typeof val === 'object' && 'toNumber' in val) return val.toNumber()
            return Number(val.toString())
        }

        const normalizeStatus = (s: string) => s?.toUpperCase().trim() || ''

        // 2. Calculate Total Revenue (Net after refunds)
        const totalRevenue = allDocuments.reduce((sum, inv) => {
            const s = normalizeStatus(inv.status as any);

            // Double check for cancelled status (including legacy string)
            if (s === 'CANCELLED' || s === 'STORNIERT') return sum;

            const gross = toNumber(inv.totalGross);

            const isRefund = inv.documentKind === 'CREDIT_NOTE' ||
                inv.documentKind === 'REFUND_FULL' ||
                inv.documentKind === 'REFUND_PARTIAL' ||
                s === 'GUTSCHRIFT';

            if (isRefund) {
                return sum - gross;
            }

            // For normal invoices, only count if PAID
            if (s === 'PAID' || s === 'BEZAHLT') {
                // Subtract partial refund amount if present on the invoice
                const refundAmount = inv.refundAmount ? toNumber(inv.refundAmount) : 0;
                return sum + gross - refundAmount;
            }

            return sum;
        }, 0);

        // 3. Paid Invoices Count (Only count actual sales invoices)
        const paidInvoicesCount = allDocuments.filter(inv => {
            const s = normalizeStatus(inv.status as any);
            if (s === 'CANCELLED' || s === 'STORNIERT') return false;

            const isPaid = s === 'PAID' || s === 'BEZAHLT';
            const isInvoice = inv.documentKind === 'INVOICE' || !inv.documentKind;
            return isPaid && isInvoice;
        }).length;

        // 4. Average Invoice Value
        const averageInvoiceValue = paidInvoicesCount > 0 ? totalRevenue / paidInvoicesCount : 0;

        // 5. Top Customers
        const customerMap = new Map<string, { name: string; email: string; totalSpent: number }>();

        allDocuments.forEach(inv => {
            if (inv.customer) {
                const s = normalizeStatus(inv.status as any);
                if (s === 'CANCELLED' || s === 'STORNIERT') return;

                const customerId = inv.customer.id;
                const current = customerMap.get(customerId) || {
                    name: inv.customer.name,
                    email: inv.customer.email || '',
                    totalSpent: 0
                };

                const gross = toNumber(inv.totalGross);

                const isRefund = inv.documentKind === 'CREDIT_NOTE' ||
                    inv.documentKind === 'REFUND_FULL' ||
                    inv.documentKind === 'REFUND_PARTIAL' ||
                    s === 'GUTSCHRIFT';

                if (isRefund) {
                    current.totalSpent -= gross;
                } else if (s === 'PAID' || s === 'BEZAHLT') {
                    // Only add positive revenue for PAID invoices
                    current.totalSpent += gross;
                    if (inv.refundAmount) {
                        current.totalSpent -= toNumber(inv.refundAmount);
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
            const s = normalizeStatus(inv.status as any);
            if (s === 'CANCELLED' || s === 'STORNIERT') return;

            const d = new Date(inv.issueDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyIncomeMap.has(key)) {
                const gross = toNumber(inv.totalGross);

                const isRefund = inv.documentKind === 'CREDIT_NOTE' ||
                    inv.documentKind === 'REFUND_FULL' ||
                    inv.documentKind === 'REFUND_PARTIAL' ||
                    s === 'GUTSCHRIFT';

                let amountToAdd = 0;
                if (isRefund) {
                    amountToAdd = -gross;
                } else if (s === 'PAID' || s === 'BEZAHLT') {
                    amountToAdd = gross;
                    if (inv.refundAmount) {
                        amountToAdd -= toNumber(inv.refundAmount);
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
