import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveTelegramSettings, sendTelegramDocument, sendTelegramMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // 1. Settings check
        const settings = await getActiveTelegramSettings()
        if (!settings || !settings.isEnabled || !settings.botToken) {
            return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 400 })
        }

        // 2. Determine "Last Month" range
        const now = new Date()
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0) // Last day of previous month
        endOfLastMonth.setHours(23, 59, 59, 999)

        // 3. Fetch Invoices (Income)
        const invoices = await prisma.invoice.findMany({
            where: {
                createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
                status: { notIn: ['CANCELLED', 'DRAFT'] }
            },
            include: { customer: true }
        })

        // 4. Fetch Expenses (Costs)
        const expenses = await prisma.expense.findMany({
            where: {
                date: { gte: startOfLastMonth, lte: endOfLastMonth }
            }
        })

        // 5. Generate CSV Content (German Format: Semicolon separated, Comma decimal)
        const rows = []
        rows.push(['TYP', 'DATUM', 'NUMMER', 'PARTNER', 'BESCHREIBUNG', 'NETTO', 'STEUER', 'BRUTTO'].join(';'))

        // Add Invoices
        for (const inv of invoices) {
            rows.push([
                'EINNAHME',
                new Date(inv.createdAt).toLocaleDateString('de-DE'),
                inv.invoiceNumber,
                inv.customer?.name || 'Gast',
                'Warenverkauf',
                Number(inv.totalNet).toFixed(2).replace('.', ','),
                Number(inv.totalTax).toFixed(2).replace('.', ','),
                Number(inv.totalGross).toFixed(2).replace('.', ',')
            ].join(';'))
        }

        // Add Expenses
        for (const exp of expenses) {
            rows.push([
                'AUSGABE',
                new Date(exp.date).toLocaleDateString('de-DE'),
                exp.expenseNumber,
                exp.supplier,
                exp.category,
                `-${Number(exp.netAmount).toFixed(2).replace('.', ',')}`,
                `-${Number(exp.taxAmount).toFixed(2).replace('.', ',')}`,
                `-${Number(exp.totalAmount).toFixed(2).replace('.', ',')}`
            ].join(';'))
        }

        const csvContent = rows.join('\n')
        const buffer = Buffer.from(csvContent, 'utf-8')
        const filename = `Buchhaltung_${startOfLastMonth.getFullYear()}_${startOfLastMonth.getMonth() + 1}.csv`

        // 6. Send to Telegram
        for (const user of settings.allowedUsers) {
            await sendTelegramMessage(settings.botToken, user.telegramUserId, `📊 *Monatsabschluss fertig!*\nZeitraum: ${startOfLastMonth.toLocaleDateString('de-DE')} - ${endOfLastMonth.toLocaleDateString('de-DE')}`)
            await sendTelegramDocument(settings.botToken, user.telegramUserId, buffer, filename, "Hier ist der Export für den Steuerberater.")
        }

        return NextResponse.json({ success: true, count: rows.length - 1 })

    } catch (error) {
        console.error('Monthly report failed:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
