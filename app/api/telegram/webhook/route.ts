import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateArizonaPDFBuffer } from '@/lib/server-pdf-generator'

export const dynamic = 'force-dynamic'

// Helper to send text message
async function sendTelegramMessage(token: string, chatId: number | string, text: string) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        })
    })
}

// Helper to send document
async function sendTelegramDocument(token: string, chatId: number | string, buffer: Buffer, filename: string, caption: string = '') {
    const url = `https://api.telegram.org/bot${token}/sendDocument`
    const formData = new FormData()

    // Create a Blob from the Buffer
    const blob = new Blob([buffer as any], { type: 'application/pdf' })
    formData.append('chat_id', chatId.toString())
    formData.append('document', blob, filename)
    if (caption) formData.append('caption', caption)

    await fetch(url, {
        method: 'POST',
        body: formData
    })
}

// Command: Sales Today
async function handleSalesToday(token: string, chatId: number | string) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const invoices = await prisma.invoice.findMany({
        where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: { not: 'CANCELLED' } // Assuming we count all valid invoices
        },
        include: { items: true }
    })

    const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.totalGross), 0)
    const count = invoices.length

    // Top products today
    const productMap = new Map<string, number>()
    invoices.forEach(inv => {
        inv.items.forEach(item => {
            const current = productMap.get(item.description) || 0
            productMap.set(item.description, current + Number(item.quantity))
        })
    })

    const topProducts = Array.from(productMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

    let message = `📊 *Bericht für heute* (${startOfDay.toLocaleDateString('de-DE')})\n\n`
    message += `💰 *Umsatz:* €${totalSales.toFixed(2)}\n`
    message += `📦 *Bestellungen:* ${count}\n\n`

    if (topProducts.length > 0) {
        message += `🏆 *Top Produkte:*\n`
        topProducts.forEach((p, i) => {
            message += `${i + 1}. ${p[0]} (${p[1]}x)\n`
        })
    } else {
        message += `_Keine Verkäufe heute._`
    }

    await sendTelegramMessage(token, chatId, message)
}

// Command: PDF Invoices
async function handlePdfInvoices(token: string, chatId: number | string) {
    await sendTelegramMessage(token, chatId, "⏳ Generiere PDFs...")

    const invoices = await prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { status: { not: 'DRAFT' } } // Only finalized invoices
    })

    if (invoices.length === 0) {
        await sendTelegramMessage(token, chatId, "Keine Rechnungen gefunden.")
        return
    }

    for (const invoice of invoices) {
        const buffer = await generateArizonaPDFBuffer(invoice.id)
        if (buffer) {
            await sendTelegramDocument(token, chatId, buffer, `Rechnung_${invoice.invoiceNumber}.pdf`, `Rechnung ${invoice.invoiceNumber}`)
        }
    }
}

// Command: Top Products 30 Days
async function handleTopProducts(token: string, chatId: number | string) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const invoices = await prisma.invoice.findMany({
        where: {
            createdAt: { gte: thirtyDaysAgo },
            status: { not: 'CANCELLED' }
        },
        include: { items: true }
    })

    const productStats = new Map<string, { count: number, revenue: number }>()

    invoices.forEach(inv => {
        inv.items.forEach(item => {
            const current = productStats.get(item.description) || { count: 0, revenue: 0 }
            productStats.set(item.description, {
                count: current.count + Number(item.quantity),
                revenue: current.revenue + Number(item.grossAmount) // or netAmount
            })
        })
    })

    const topProducts = Array.from(productStats.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue) // Sort by revenue
        .slice(0, 10)

    let message = `🏆 *Top Produkte (letzte 30 Tage)*\n\n`

    if (topProducts.length > 0) {
        topProducts.forEach((p, i) => {
            message += `${i + 1}. *${p[0]}*\n`
            message += `   📦 ${p[1].count} Stk. | 💰 €${p[1].revenue.toFixed(2)}\n`
        })
    } else {
        message += `_Keine Daten verfügbar._`
    }

    await sendTelegramMessage(token, chatId, message)
}

export async function POST(request: NextRequest) {
    try {
        const update = await request.json()
        const message = update.message

        if (!message || !message.text) {
            return NextResponse.json({ ok: true })
        }

        const chatId = message.chat.id
        const userId = message.from.id.toString()
        const text = message.text.trim()

        // Fetch Settings
        const settings = await prisma.telegramSettings.findFirst({
            include: { allowedUsers: true }
        })

        if (!settings || !settings.isEnabled || !settings.botToken) {
            return NextResponse.json({ ok: true })
        }

        // Auth Check
        const isAllowed = settings.allowedUsers.some(u => u.telegramUserId === userId)
        if (!isAllowed) {
            await sendTelegramMessage(settings.botToken, chatId, `⛔ Zugriff verweigert. Ihre ID: \`${userId}\``)
            return NextResponse.json({ ok: true })
        }

        // Log Command (Fire and forget)
        prisma.telegramLog.create({
            data: {
                organizationId: settings.organizationId,
                telegramUserId: userId,
                command: text,
                status: 'RECEIVED'
            }
        }).catch(console.error)

        // Route Commands
        const lowerText = text.toLowerCase()

        if (lowerText.includes('umsatz heute')) {
            await handleSalesToday(settings.botToken, chatId)
        }
        else if (lowerText.includes('rechnungen pdf')) {
            await handlePdfInvoices(settings.botToken, chatId)
        }
        else if (lowerText.includes('top produkte')) {
            await handleTopProducts(settings.botToken, chatId)
        }
        else if (lowerText === '/start' || lowerText === 'start') {
            await sendTelegramMessage(settings.botToken, chatId, `🤖 *RechnungsProfi Bot*

Verfügbare Befehle:
🔹 *Umsatz heute* (Zeigt den heutigen Umsatz)
🔹 *Rechnungen PDF* (Sendet die letzten Rechnungen als PDF)
🔹 *Top Produkte* (Zeigt die Bestseller der letzten 30 Tage)

💡 *Du kannst mir auch normale Fragen stellen!*
Z.B. "Wie lief der letzte Monat?" oder "Welches Produkt verkauft sich am schlechtesten?"
`)
        }
        else {
            // Intelligent AI Response for everything else
            await handleAiChat(settings.botToken, chatId, text)
        }

    } catch (error) {
        console.error('Telegram Webhook Error:', error)
    }

    return NextResponse.json({ ok: true })
}

// AI Chat Handler
import OpenAI from 'openai'

async function handleAiChat(token: string, chatId: number | string, userMessage: string) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            await sendTelegramMessage(token, chatId, "⚠️ *Fehler:* OpenAI API Key ist nicht konfiguriert.")
            return
        }

        // 1. Gather Context Data - DEEP INSIGHTS
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))

        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0))
        const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999))

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // Fetch ALL relevant data (optimized)
        const allInvoices = await prisma.invoice.findMany({
            where: {
                createdAt: { gte: lastMonthStart },
                status: { notIn: ['CANCELLED', 'DRAFT'] }
            },
            include: {
                items: true,
                customer: true,
                payments: true // Include payments to check for refunds
            }
        })

        // --- ANALYSIS ---

        // Helper to calculate real revenue (STRICT MODE)
        const getRealRevenue = (inv: any) => {
            // 1. Check if explicitly cancelled in status
            if (inv.status === 'CANCELLED') return 0;

            // 2. Check if any payment is marked as REFUNDED
            const hasRefundedPayment = inv.payments?.some((p: any) => p.status === 'REFUNDED' || p.method === 'REFUND');
            if (hasRefundedPayment) return 0;

            // 3. Calculate based on refundAmount field
            const gross = Number(inv.totalGross) || 0
            const refund = Number(inv.refundAmount) || 0

            // If refund equals or exceeds gross, it's fully refunded
            if (refund >= gross) return 0;

            return Math.max(0, gross - refund)
        }

        // Filter out fully refunded invoices AND items with 0 revenue
        const validInvoices = allInvoices.filter(inv => getRealRevenue(inv) > 0)

        // 1. Time Periods
        const todayInvoices = validInvoices.filter(inv => new Date(inv.createdAt) >= startOfDay)
        const yesterdayInvoices = validInvoices.filter(inv => {
            const d = new Date(inv.createdAt)
            return d >= startOfYesterday && d <= endOfYesterday
        })
        const monthInvoices = validInvoices.filter(inv => new Date(inv.createdAt) >= startOfMonth)
        const lastMonthInvoices = validInvoices.filter(inv => {
            const d = new Date(inv.createdAt)
            return d >= lastMonthStart && d <= lastMonthEnd
        })

        const calcRevenue = (invs: any[]) => invs.reduce((sum, inv) => sum + getRealRevenue(inv), 0)

        const stats = {
            today: { rev: calcRevenue(todayInvoices), count: todayInvoices.length },
            yesterday: { rev: calcRevenue(yesterdayInvoices), count: yesterdayInvoices.length },
            month: { rev: calcRevenue(monthInvoices), count: monthInvoices.length },
            lastMonth: { rev: calcRevenue(lastMonthInvoices), count: lastMonthInvoices.length }
        }

        // 2. Top Products (30 Days) - Only from valid invoices
        const productMap = new Map<string, { count: number, rev: number }>()
        validInvoices.filter(inv => new Date(inv.createdAt) >= thirtyDaysAgo).forEach(inv => {
            inv.items.forEach(item => {
                // Calculate item share of revenue (proportional to total invoice revenue)
                // This prevents refunded items from counting fully if the invoice is partial
                const itemTotal = Number(item.grossAmount)
                if (itemTotal > 0) {
                    const current = productMap.get(item.description) || { count: 0, rev: 0 }
                    productMap.set(item.description, {
                        count: current.count + Number(item.quantity),
                        rev: current.rev + itemTotal
                    })
                }
            })
        })
        const topProducts = Array.from(productMap.entries())
            .sort((a, b) => b[1].rev - a[1].rev)
            .slice(0, 5)
            .map(([name, data]) => `- ${name}: ${data.count}x (€${data.rev.toFixed(2)})`)
            .join('\n')

        // 3. Top Customers (All time in selection)
        const customerMap = new Map<string, number>()
        validInvoices.forEach(inv => {
            const name = inv.customer?.name || 'Gast'
            customerMap.set(name, (customerMap.get(name) || 0) + getRealRevenue(inv))
        })
        const topCustomers = Array.from(customerMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, total]) => `- ${name}: €${total.toFixed(2)}`)
            .join('\n')

        // 4. Recent Orders
        const recentOrders = validInvoices
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map(inv => `- ${new Date(inv.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}: €${getRealRevenue(inv).toFixed(2)} (${inv.customer?.name || 'Gast'})`)
            .join('\n')

        // 2. Build System Prompt
        const systemPrompt = `Du bist der "RechnungsProfi Business Analyst" - ein hochintelligenter KI-Berater für den Shop-Besitzer.

📊 **FINANZ-ANALYSE (Netto-Verkäufe):**
- **Heute:** €${stats.today.rev.toFixed(2)} (${stats.today.count} Best.) vs. Gestern: €${stats.yesterday.rev.toFixed(2)}
  -> Trend: ${stats.today.rev >= stats.yesterday.rev ? '📈 Steigend' : '📉 Fallend'}
- **Dieser Monat:** €${stats.month.rev.toFixed(2)} vs. Letzter Monat: €${stats.lastMonth.rev.toFixed(2)}

🏆 **TOP PRODUKTE (letzte 30 Tage):**
${topProducts || 'Keine Daten'}

💎 **TOP KUNDEN (VIPs):**
${topCustomers}

⏱️ **LETZTE 5 BESTELLUNGEN:**
${recentOrders}

**WICHTIGE ANWEISUNGEN:**
1. **Daten-Integrität:** Diese Daten beinhalten NUR erfolgreiche Verkäufe. Stornierte oder erstattete Bestellungen sind bereits herausgefiltert.
2. **Formatierung:**
   - Nutze **fette Schrift** für wichtige Zahlen.
   - Nutze Listen und Absätze für Lesbarkeit.
   - Sei **elegant, modern und professionell**.
   - Keine langen Textwüsten. Kurz, knackig, auf den Punkt.
3. **Intelligenz:**
   - Analysiere die Daten. Gib nicht nur wieder, was oben steht.
   - Wenn der Nutzer fragt "Wie läuft es?", gib eine qualifizierte Einschätzung (z.B. "Exzellent, wir liegen über dem Vormonat" oder "Ruhiger Tag heute").
4. **Sprache:** Antworte IMMER in der Sprache des Nutzers (DE/AR/UA/EN).

Nutzerfrage: "${userMessage}"`

        // 3. Call OpenAI (Using GPT-4o for maximum intelligence)
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
            max_tokens: 1000
        })

        const reply = completion.choices[0]?.message?.content || "Entschuldigung, ich konnte darauf keine Antwort finden."

        await sendTelegramMessage(token, chatId, reply)

    } catch (error) {
        console.error('AI Chat Error:', error)
        await sendTelegramMessage(token, chatId, "🤯 Entschuldigung, ich bin gerade überlastet. Versuch es später nochmal.")
    }
}
