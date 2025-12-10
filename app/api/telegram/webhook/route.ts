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

        if (lowerText.includes('مبيعات اليوم') || lowerText.includes('umsatz heute')) {
            await handleSalesToday(settings.botToken, chatId)
        }
        else if (lowerText.includes('فواتير pdf') || lowerText.includes('rechnungen pdf')) {
            await handlePdfInvoices(settings.botToken, chatId)
        }
        else if (lowerText.includes('افضل مبيعات') || lowerText.includes('top produkte')) {
            await handleTopProducts(settings.botToken, chatId)
        }
        else {
            await sendTelegramMessage(settings.botToken, chatId,
                "🤖 *RechnungsProfi Bot*\n\n" +
                "Verfügbare Befehle:\n" +
                "🔹 *Umsatz heute* (ارسل لي مبيعات اليوم)\n" +
                "🔹 *Rechnungen PDF* (ارسل لي فواتير pdf)\n" +
                "🔹 *Top Produkte* (ما افضل مبيعات اخر ٣٠ يوم)"
            )
        }

    } catch (error) {
        console.error('Telegram Webhook Error:', error)
    }

    return NextResponse.json({ ok: true })
}
