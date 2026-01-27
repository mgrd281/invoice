import { NextRequest, NextResponse } from 'next/server';
import { PayPalService } from '@/lib/paypal-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();

  try {
    const service = new PayPalService(session.user.organizationId);
    const transactions = await service.listTransactions(from, to);
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching PayPal transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const body = await req.json();
        const service = new PayPalService(session.user.organizationId);

        if (body.action === 'sync') {
            // Trigger manual sync for a period or specific id?
            // For MVP, maybe just "Check recent"
            // Or if body has 'captureId'
            if (body.captureId) {
                const tx = await service.syncTransaction(body.captureId);
                return NextResponse.json(tx);
            }
        }
        
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Error in PayPal POST:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
