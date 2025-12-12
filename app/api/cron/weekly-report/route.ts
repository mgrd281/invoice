import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveTelegramSettings, sendTelegramMessage } from '@/lib/telegram'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // 1. Get active Telegram settings
        const settings = await getActiveTelegramSettings()
        if (!settings || !settings.isEnabled || !settings.botToken) {
            return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 400 })
        }

        // 2. Fetch last week's data
        const today = new Date()
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(today.getDate() - 7)

        const invoices = await prisma.invoice.findMany({
            where: {
                createdAt: { gte: lastWeekStart },
                status: { notIn: ['CANCELLED', 'DRAFT'] }
            },
            include: { items: true, customer: true, payments: true }
        })

        // Helper for net revenue
        const getRealRevenue = (inv: any) => {
            if (inv.status === 'CANCELLED') return 0;
            const hasRefundedPayment = inv.payments?.some((p: any) => p.status === 'REFUNDED' || p.method === 'REFUND');
            if (hasRefundedPayment) return 0;
            const gross = Number(inv.totalGross) || 0
            const refund = Number(inv.refundAmount) || 0
            if (refund >= gross) return 0;
            return Math.max(0, gross - refund)
        }

        const totalRevenue = invoices.reduce((sum, inv) => sum + getRealRevenue(inv), 0)
        const totalOrders = invoices.filter(inv => getRealRevenue(inv) > 0).length

        // Top Products Analysis
        const productMap = new Map<string, { count: number, rev: number }>()
        invoices.forEach(inv => {
            if (getRealRevenue(inv) > 0) {
                inv.items.forEach(item => {
                    const current = productMap.get(item.description) || { count: 0, rev: 0 }
                    productMap.set(item.description, {
                        count: current.count + Number(item.quantity),
                        rev: current.rev + Number(item.grossAmount)
                    })
                })
            }
        })
        const topProducts = Array.from(productMap.entries())
            .sort((a, b) => b[1].rev - a[1].rev)
            .slice(0, 5)
            .map(([name, data]) => `- ${name}: ${data.count}x (€${data.rev.toFixed(2)})`)
            .join('\n')

        // 3. Generate AI Report
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        const systemPrompt = `Du bist ein strategischer Unternehmensberater.
Erstelle einen "Wöchentlichen Strategie-Bericht" für den Shop-Besitzer basierend auf den Daten der letzten 7 Tage.

DATEN:
- Zeitraum: Letzte 7 Tage
- Gesamtumsatz: €${totalRevenue.toFixed(2)}
- Bestellungen: ${totalOrders}
- Top Produkte:
${topProducts}

AUFGABE:
Schreibe einen Bericht für Telegram (Markdown), der Folgendes enthält:
1. 📊 **Wochen-Fazit:** Kurze Bewertung der Woche (Exzellent/Gut/Schwach) mit Begründung.
2. 💡 **Strategische Erkenntnis:** Was lief besonders gut oder schlecht? (z.B. "Produkt X dominiert, wir sollten...")
3. 🚀 **Handlungsempfehlung:** Eine konkrete Aktion für nächste Woche (z.B. "Preis für Y anpassen", "Newsletter senden").

Stil: Professionell, motivierend, auf den Punkt. Nutze Emojis.`

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }],
            max_tokens: 800
        })

        const report = completion.choices[0]?.message?.content || "Konnte Bericht nicht generieren."

        // 4. Send to Telegram
        for (const user of settings.allowedUsers) {
            await sendTelegramMessage(settings.botToken, user.telegramUserId, `📅 *Wöchentlicher Strategie-Report*\n\n${report}`)
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Weekly report failed:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
