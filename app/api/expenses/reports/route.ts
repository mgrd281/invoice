import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Adjust path if needed

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const format = searchParams.get('format') || 'json';

  try {
      const where: any = {
          organizationId: user.organizationId
      };
      
      if (from || to) {
          where.date = {};
          if (from) where.date.gte = new Date(from);
          if (to) where.date.lte = new Date(to);
      }

      const expenses = await prisma.expense.findMany({
          where,
          include: { expenseCategory: true },
          orderBy: { date: 'desc' }
      });

      if (format === 'csv') {
          // specific CSV logic
          const header = "Datum,Kategorie,Beschreibung,Zahlart,Netto,Steuer,Brutto\n";
          const rows = expenses.map((e: any) => {
              return [
                new Date(e.date).toLocaleDateString('de-DE'),
                e.expenseCategory?.name || 'Allgemein',
                `"${e.description.replace(/"/g, '""')}"`,
                e.paymentMethod,
                e.netAmount,
                e.taxAmount,
                e.totalAmount
              ].join(',');
          }).join("\n");
          
          return new NextResponse(header + rows, {
              headers: {
                  'Content-Type': 'text/csv',
                  'Content-Disposition': `attachment; filename="ausgaben-export-${new Date().toISOString().slice(0,10)}.csv"`
              }
          });
      }

      return NextResponse.json(expenses);
  } catch(e) {
      console.error(e);
      return NextResponse.json({ error: 'Error generating report' }, { status: 500 });
  }
}
