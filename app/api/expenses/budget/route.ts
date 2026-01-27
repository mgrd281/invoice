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
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // YYYY-MM

  try {
    const budget = await prisma.budget.findUnique({
      where: {
        organizationId_month: {
            organizationId: user.organizationId,
            month
        }
      }
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
    const body = await req.json();
    const { month, amount, alert80, alert100 } = body; // month YYYY-MM

    const budget = await prisma.budget.upsert({
      where: {
        organizationId_month: {
          organizationId: user.organizationId,
          month
        }
      },
      update: {
        amount: parseFloat(amount),
        alertThreshold80: alert80 !== undefined ? alert80 : true,
        alertThreshold100: alert100 !== undefined ? alert100 : true
      },
      create: {
        organizationId: user.organizationId,
        month,
        amount: parseFloat(amount),
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
