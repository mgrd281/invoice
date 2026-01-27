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

  // Get current month budget by default
  const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const categoryId = searchParams.get('categoryId');

    if (!month) {
       return NextResponse.json({ error: 'Month required' }, { status: 400 });
    }

    try {
        const where: any = {
            organizationId: user.organizationId,
            month
        };
        
        if (categoryId) {
            where.categoryId = categoryId;
        } else {
            // If explicit global budget requested, search for null categoryId
            where.categoryId = null; 
        }

        const budget = await prisma.budget.findFirst({
            where
        });

    // If no budget set, return null or default
    return NextResponse.json(budget || { amount: 0, month });
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 });
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
    const { month, amount, categoryId, alert80, alert100 } = await req.json();

    if (!month || amount === undefined || amount === null) { // Added check for amount
         return NextResponse.json({ error: 'Daten fehlen' }, { status: 400 });
    }

    // Create or update budget
    // If categoryId is present, it's a category budget. If null, it's global.
    // Using upsert with unique compound key
    const budget = await prisma.budget.upsert({
        where: {
            organizationId_month_categoryId: {
                organizationId: user.organizationId,
                month,
                categoryId: categoryId || null // Use null for optional categoryId
            }
        } as any, // Bypass TS check if generated types aren't updated yet
        update: {
            amount: parseFloat(amount), // Ensure amount is parsed
            alertThreshold80: alert80 !== undefined ? alert80 : true,
            alertThreshold100: alert100 !== undefined ? alert100 : true
        },
        create: {
            organizationId: user.organizationId,
            month,
            amount: parseFloat(amount), // Ensure amount is parsed
            categoryId: categoryId || null,
            alertThreshold80: alert80 !== undefined ? alert80 : true,
            alertThreshold100: alert100 !== undefined ? alert100 : true
        }
    });
    return NextResponse.json(budget);
  } catch (error) {
    console.error('Error saving budget:', error);
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 });
  }
}
