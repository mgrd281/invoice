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
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const categoryId = searchParams.get('categoryId');

  try {
    const where: any = {
      organizationId: user.organizationId,
    };

    if (from && to) {
      where.date = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        expenseCategory: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  //@ts-ignore
  const user = session?.user;

  if (!user || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
        amount,
        currency = 'EUR',
        date,
        categoryId,
        description,
        paymentMethod,
        receiptUrl,
        supplier
    } = body;

    // Use or create category logic is handled on frontend (passing ID)
    // If supplier is passed as string, we store it.
    
    // Calculate net/tax if needed, but for "Daily Expenses" we usually just imput total.
    // The model requires netAmount, taxRate, taxAmount.
    // We will assume 0 tax or calculate if provided, but for simple "Quick Add" usually user enters Total.
    // Let's just set total = net and tax = 0 if not provided.
    
    const totalVal = parseFloat(amount);
    const netVal = body.netAmount ? parseFloat(body.netAmount) : totalVal;
    const taxVal = body.taxAmount ? parseFloat(body.taxAmount) : 0;
    const taxRateVal = body.taxRate ? parseFloat(body.taxRate) : 0;

    const expenseNumber = `EXP-${Date.now()}`; // Simple generation

    const expense = await prisma.expense.create({
      data: {
        organizationId: user.organizationId,
        expenseNumber,
        date: new Date(date || new Date()),
        categoryId: categoryId || undefined,
        category: "General", // Legacy field fallback
        description,
        supplier: supplier || description,
        netAmount: netVal,
        taxRate: taxRateVal,
        taxAmount: taxVal,
        totalAmount: totalVal,
        paymentMethod: paymentMethod || 'CASH',
        receiptUrl: receiptUrl
      }
    });

    return NextResponse.json(expense);

  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
