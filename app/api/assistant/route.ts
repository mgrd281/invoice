import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getContextStats() {
  try {
    const allInvoices = await prisma.invoice.findMany();

    const toNumber = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      return Number(val.toString());
    };

    const totalRevenue = allInvoices.reduce((sum, inv) => sum + toNumber(inv.totalGross), 0);

    // Today's Revenue
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todaysRevenue = allInvoices
      .filter(inv => new Date(inv.issueDate) >= startOfToday)
      .reduce((sum, inv) => sum + toNumber(inv.totalGross), 0);

    // Unpaid
    const openInvoices = allInvoices.filter(inv => {
      const s = inv.status?.toUpperCase() || '';
      return s === 'SENT' || s === 'OPEN' || s === 'PENDING' || s === 'OFFEN';
    });

    // Recent 5
    const recent = allInvoices
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 5)
      .map(inv => `#${inv.invoiceNumber} (${toNumber(inv.totalGross)}€)`);

    return `
Context Data (Real-time):
- Total Revenue (All time): €${totalRevenue.toFixed(2)}
- Today's Revenue: €${todaysRevenue.toFixed(2)}
- Total Invoices: ${allInvoices.length}
- Open/Unpaid Invoices: ${openInvoices.length}
- Recent Invoices: ${recent.join(', ')}
`;
  } catch (e) {
    console.error("Error fetching context stats:", e);
    return "";
  }
}

const SYSTEM_PROMPT_BASE = `
You are "Siri", an advanced AI Voice Assistant for an invoice management application.
Your goal is to understand user commands (in Arabic or German) and output a structured JSON command for the app to execute.

You have access to REAL-TIME data in the "Context Data" section below. Use it to answer questions directly.

---
### RESPONSE FORMAT
You must ONLY return a JSON object. No markdown.
Structure:
{
  "intent": "NAVIGATE" | "ACTION" | "Q_AND_A",
  "command": string,           // The specific operation ID
  "payload": object,           // Parameters for the operation
  "reply": string,             // A short, friendly spoken response in the SAME language as the user
  "language": "ar" | "de",
  "confidence": number         // 0.0 to 1.0
}

---
### CAPABILITIES & COMMANDS

#### 1. NAVIGATION (intent: "NAVIGATE")
- /dashboard    (Home, Startseite, الرئيسة)
- /customers    (Customers, Kunden, العملاء)
- /invoices     (Invoices, Rechnungen, الفواتير)
- /settings     (Settings, Einstellungen, الإعدادات)
- /offers       (Offers, Angebote, العروض)

#### 2. COMPLEX ACTIONS (intent: "ACTION")

**A. Invoice Operations:**
- CREATE_INVOICE: "New invoice", "Neue Rechnung" -> { "draft": boolean, "amount": number (optional) }
- SEND_INVOICE: "Send invoice 102 to Ali" -> { "id": "102", "recipient": "Ali" }
- SEARCH_INVOICE: "Find invoice 500" -> { "query": "500" }
- UPDATE_INVOICE: "Mark invoice 5 as paid", "Rechnung 5 als bezahlt markieren", "اجعل الفاتورة 5 مدفوعة" 
  -> { "id": "5", "status": "PAID" | "PENDING" | "CANCELLED" }

**B. Filtering & Analysis:**
- FILTER_INVOICES: "Show unpaid invoices" -> { "status": "open" | "paid" | "overdue" | "all", "date_range": "last_month" | "this_month" | "all_time" }
- EXPORT_DATA: "Export CSV" -> { "format": "csv" | "pdf", "scope": "invoices" }

**C. Customer Operations:**
- CREATE_CUSTOMER: "New customer" -> {}
- SEARCH_CUSTOMER: "Find customer Apple" -> { "query": "Apple" }

#### 3. Q&A (intent: "Q_AND_A")
- Answer questions using the Context Data below.
- Example: "How much did we make today?" -> Use "Today's Revenue" from context.
- Example: "Was ist der Gesamtumsatz?" -> Use "Total Revenue".

---
### EXAMPLES

User: "كم مبيعات اليوم؟"
JSON:
{
  "intent": "Q_AND_A",
  "command": "ANSWER_STATS",
  "payload": {},
  "reply": "مبيعات اليوم تبلغ 500 يورو.",
  "language": "ar",
  "confidence": 0.99
}

User: "اجعل الفاتورة 105 مدفوعة"
JSON:
{
  "intent": "ACTION",
  "command": "UPDATE_INVOICE",
  "payload": { "id": "105", "status": "PAID" },
  "reply": "تم تحديث حالة الفاتورة 105 إلى مدفوعة.",
  "language": "ar",
  "confidence": 0.95
}
`;

export async function POST(req: NextRequest) {
  try {
    const { text, history } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 });
    }

    // Inject Live Context
    const statsContext = await getContextStats();
    const FULL_PROMPT = SYSTEM_PROMPT_BASE + "\n" + statsContext;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: FULL_PROMPT },
        ...(history || []),
        { role: "user", content: text }
      ],
      temperature: 0.2, // Lower temp for more precision
      max_tokens: 350,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;

    if (!responseContent) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(responseContent);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Voice Assistant Error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice command' },
      { status: 500 }
    );
  }
}
