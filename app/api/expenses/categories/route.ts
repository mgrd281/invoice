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

  try {
    const categories = await prisma.expenseCategory.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
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
    const { name, color, type, rulesKeywords } = await req.json();

    if (!name) return NextResponse.json({ error: 'Name fehlt' }, { status: 400 });

    const category = await prisma.expenseCategory.create({
      data: {
        organizationId: user.organizationId,
        name,
        color: color || '#000000',
        type: type || 'OPERATIONAL',
        rulesKeywords: rulesKeywords // Optional JSON/String
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
