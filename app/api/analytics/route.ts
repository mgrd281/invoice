import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get organization ID from user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email! },
            select: { organizationId: true }
        });

        if (!user?.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const organizationId = user.organizationId;

        // 1. Fetch all paid invoices
        const paidInvoices = await prisma.invoice.findMany({
            where: {
                organizationId,
                status: { in: ['PAID', 'SENT'] } // Consider SENT as potentially valid for analytics depending on logic, but usually PAID is best. Let's stick to PAID for revenue.
                // Actually, for revenue we usually count PAID.
            },
            include: {
                customer: true
            }
        });

        // Filter strictly for PAID for revenue calculations if needed, or include SENT if that's the business logic.
        // Let's use PAID for strict revenue.
        const strictlyPaidInvoices = paidInvoices.filter(inv => inv.status === 'PAID');

        // 2. Calculate Total Revenue
        const totalRevenue = strictlyPaidInvoices.reduce((sum, inv) => sum + Number(inv.totalGross), 0);

        // 3. Paid Invoices Count
        const paidInvoicesCount = strictlyPaidInvoices.length;

        // 4. Average Invoice Value
        const averageInvoiceValue = paidInvoicesCount > 0 ? totalRevenue / paidInvoicesCount : 0;

        // 5. Top Customers
        const customerMap = new Map<string, { name: string; email: string; totalSpent: number }>();

        strictlyPaidInvoices.forEach(inv => {
            if (inv.customer) {
                const customerId = inv.customer.id;
                const current = customerMap.get(customerId) || {
                    name: inv.customer.name,
                    email: inv.customer.email || '',
                    totalSpent: 0
                };
                current.totalSpent += Number(inv.totalGross);
                customerMap.set(customerId, current);
            }
        });

        const topCustomers = Array.from(customerMap.values())
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

        strictlyPaidInvoices.forEach(inv => {
            const d = new Date(inv.issueDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyIncomeMap.has(key)) {
                monthlyIncomeMap.set(key, (monthlyIncomeMap.get(key) || 0) + Number(inv.totalGross));
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
