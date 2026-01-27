import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  //@ts-ignore
  const user = session?.user;

  if (!user || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const from = fromStr ? new Date(fromStr) : startOfMonth;
  const to = toStr ? new Date(toStr) : endOfMonth;

  try {
    // 1. Get Expenses Sum
    const expensesAggregate = await prisma.expense.aggregate({
      where: {
        organizationId: user.organizationId,
        date: { gte: from, lte: to }
      },
      _sum: { totalAmount: true }
    });
    const totalExpenses = Number(expensesAggregate._sum.totalAmount || 0);

    // 2. Get Revenue (Invoices Paid + Orders Paid?)
    // Simplified: Paid Invoices
    const revenueAggregate = await prisma.invoice.aggregate({
      where: {
        organizationId: user.organizationId,
        status: 'PAID',
        issueDate: { gte: from, lte: to }
      },
      _sum: { totalGross: true }
    });
    const totalRevenue = Number(revenueAggregate._sum.totalGross || 0);

    // 3. Get Budget for current month (approximation if range spans multiple months, just take start month)
    const monthStr = from.toISOString().slice(0, 7);
    const budget = await prisma.budget.findUnique({
      where: {
        organizationId_month: {
            organizationId: user.organizationId,
            month: monthStr
        }
      }
    });

    const budgetAmount = Number(budget?.amount || 0);

    // 4. Category breakdown
    const expensesByCategory = await prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
            organizationId: user.organizationId,
            date: { gte: from, lte: to }
        },
        _sum: { totalAmount: true }
    });

    // Resolve category names
    // This is a bit manual, but efficient enough
    const categoryIds = expensesByCategory.map(e => e.categoryId).filter(Boolean) as string[];
    const categories = await prisma.expenseCategory.findMany({
        where: { id: { in: categoryIds } }
    });
    
    const categoryStats = expensesByCategory.map(item => {
        const cat = categories.find(c => c.id === item.categoryId);
        return {
            name: cat?.name || 'Uncategorized',
            color: cat?.color || '#ccc',
            total: Number(item._sum.totalAmount || 0)
        };
    }).sort((a, b) => b.total - a.total);


    // 4. Get Daily Trend (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Group expenses by day
    const dailyExpenses = await prisma.expense.groupBy({
        by: ['date'],
        where: {
            organizationId: user.organizationId,
            date: { gte: thirtyDaysAgo }
        },
        _sum: {
            totalAmount: true
        }
    });

    // Format for chart
    const dailyTrend = dailyExpenses.map(item => ({
        date: item.date.toISOString().split('T')[0],
        amount: Number(item._sum.totalAmount)
    })).sort((a,b) => a.date.localeCompare(b.date));

    // 5. Net Profit
    // Revenue is already calculated (paid invoices)
    const netProfit = totalRevenue - totalExpenses;

    // 6. Revenue vs Expenses (Monthly comparison optional)
    
    return NextResponse.json({
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: netProfit,
      budget: budgetAmount,
      budgetConsumedPercent: budgetAmount > 0 ? (totalExpenses / budgetAmount) * 100 : 0,
      categoryStats,
      dailyTrend
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
