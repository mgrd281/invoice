
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateArizonaPDFBuffer } from '@/lib/server-pdf-generator'
import { sendTelegramMessage, sendTelegramDocument } from '@/lib/telegram'
import { ImmoscoutProvider } from '@/lib/real-estate/immoscout'
import { RealEstateFilter } from '@/lib/real-estate/types'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

// Access global storage for invoice data
declare global {
    var allInvoices: any[] | undefined
}

// Lazy initialization of OpenAI client (deferred to runtime)
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is not set')
        }
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
    }
    return openaiClient
}

import { loadInvoicesFromDisk } from '@/lib/server-storage'

// Helper function to get invoice statistics
async function getInvoiceStats() {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const startOfYesterday = new Date(startOfDay)
    startOfYesterday.setDate(startOfDay.getDate() - 1)
    const endOfYesterday = new Date(startOfDay)
    endOfYesterday.setMilliseconds(-1)

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1)

    const lastMonthStart = new Date(startOfDay.getFullYear(), startOfDay.getMonth() - 1, 1)
    const lastMonthEnd = new Date(startOfMonth)
    lastMonthEnd.setMilliseconds(-1)

    const thirtyDaysAgo = new Date(startOfDay)
    thirtyDaysAgo.setDate(startOfDay.getDate() - 30)

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
        .map(([name, data]) => `- ${name}: ${data.count} x(€${data.rev.toFixed(2)})`)
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
        .map(([name, total]) => `- ${name}: €${total.toFixed(2)} `)
        .join('\n')

    // 4. Recent Orders
    const recentOrders = validInvoices
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(inv => `- ${new Date(inv.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}: €${getRealRevenue(inv).toFixed(2)} (${inv.customer?.name || 'Gast'})`)
        .join('\n')

    return { stats, topProducts, topCustomers, recentOrders }
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

    let message = `📊 * Bericht für heute * (${startOfDay.toLocaleDateString('de-DE')}) \n\n`
    message += `💰 * Umsatz:* €${totalSales.toFixed(2)} \n`
    message += `📦 * Bestellungen:* ${count} \n\n`

    if (topProducts.length > 0) {
        message += `🏆 * Top Produkte:*\n`
        topProducts.forEach((p, i) => {
            message += `${i + 1}. ${p[0]} (${p[1]}x) \n`
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
            await sendTelegramDocument(token, chatId, buffer, `Rechnung_${invoice.invoiceNumber}.pdf`, `Rechnung ${invoice.invoiceNumber} `)
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

    let message = `🏆 * Top Produkte(letzte 30 Tage) *\n\n`

    if (topProducts.length > 0) {
        topProducts.forEach((p, i) => {
            message += `${i + 1}. * ${p[0]}*\n`
            message += `   📦 ${p[1].count} Stk. | 💰 €${p[1].revenue.toFixed(2)} \n`
        })
    } else {
        message += `_Keine Daten verfügbar._`
    }

    await sendTelegramMessage(token, chatId, message)
}


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
        const systemPrompt = `Du bist der "Immo-Alarm Pro Assistent" - ein intelligenter KI-Berater für Immobilien-Suche.

Deine Aufgaben:
1. Hilf dem Nutzer, den Status seiner Suchaufträge zu verstehen.
2. Erkläre, wie er neue Suchprofile im Dashboard anlegt.
3. Analysiere Immobilien-Angebote, falls der Nutzer Details fragt.

WICHTIG:
- Sei höflich, professionell und präzise.
- Antworte immer auf DEUTSCH.
- Wenn du nicht weiterweißt, verweise auf das Web-Dashboard.

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
// Command: Handle Photo (AI Receipt Scanning)
async function handlePhotoMessage(token: string, chatId: number | string, photoArray: any[], organizationId: string) {
    try {
        await sendTelegramMessage(token, chatId, "📸 Bild empfangen. Analysiere Beleg mit KI... ⏳")

        // 1. Get the largest photo version
        const photo = photoArray[photoArray.length - 1]
        const fileId = photo.file_id

        // 2. Get File Path from Telegram
        const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`)
        const fileData = await fileRes.json()
        const filePath = fileData.result.file_path

        // 3. Download Image
        const imageUrl = `https://api.telegram.org/file/bot${token}/${filePath}`
        const imageRes = await fetch(imageUrl)
        const arrayBuffer = await imageRes.arrayBuffer()
        const base64Image = Buffer.from(arrayBuffer).toString('base64')

        // 4. Analyze with GPT-4o Vision
        const openai = getOpenAIClient()
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Du bist ein Buchhaltungs-Assistent. Extrahiere Daten aus diesem Beleg. Antworte NUR mit validem JSON."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extrahiere folgende Daten als JSON: { supplier (string), date (YYYY-MM-DD), totalAmount (number), taxRate (number, z.B. 19 oder 7), category (string, z.B. 'Bürobedarf', 'Reisekosten', 'Werbung'), description (string) }. Wenn kein Datum gefunden, nimm heute." },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 500,
            response_format: { type: "json_object" }
        })

        const resultText = completion.choices[0]?.message?.content
        if (!resultText) throw new Error("Keine Antwort von KI")

        const data = JSON.parse(resultText)

        // 5. Calculate Net/Tax
        const total = Number(data.totalAmount)
        const rate = Number(data.taxRate)
        const net = total / (1 + rate / 100)
        const tax = total - net

        // 6. Save to Database
        const expense = await prisma.expense.create({
            data: {
                organizationId: organizationId,
                expenseNumber: `EXP-${Date.now().toString().slice(-6)}`,
                date: new Date(data.date),
                supplier: data.supplier,
                category: data.category,
                description: data.description || "Beleg Import",
                totalAmount: total,
                netAmount: net,
                taxRate: rate,
                taxAmount: tax,
                receiptUrl: imageUrl // Note: Telegram URLs expire, ideally upload to S3/Blob
            }
        })

        // 7. Success Message
        const reply = `✅ *Beleg gespeichert!*
🏢 Händler: ${expense.supplier}
💰 Betrag: €${expense.totalAmount.toFixed(2)}
📂 Kategorie: ${expense.category}
📅 Datum: ${expense.date.toLocaleDateString('de-DE')}

_ID: ${expense.expenseNumber}_`

        await sendTelegramMessage(token, chatId, reply)

    } catch (error) {
        console.error("Receipt scanning failed:", error)
        await sendTelegramMessage(token, chatId, "❌ Fehler beim Scannen des Belegs. Bitte versuche es erneut oder gib die Daten manuell ein.")
    }
}

// Command: Handle Support Request
async function handleSupportRequest(token: string, chatId: number | string, query: string) {
    try {
        await sendTelegramMessage(token, chatId, "🔍 Suche Daten und formuliere Antwort... ⏳")

        // 1. Search for context in DB (Orders, Keys, Customers)
        // Simple keyword search for Order IDs (e.g., "RE-2024-001") or Email addresses
        const orderMatch = query.match(/RE-\d{4}-\d+/i) || query.match(/#\d+/);
        let contextData = "Keine spezifischen Bestelldaten gefunden.";

        if (orderMatch) {
            const searchTerm = orderMatch[0].replace('#', '');
            const invoice = await prisma.invoice.findFirst({
                where: {
                    OR: [
                        { invoiceNumber: { contains: searchTerm } },
                        { orderId: { contains: searchTerm } }
                    ]
                },
                include: { items: true, customer: true, payments: true }
            })

            if (invoice) {
                contextData = `
                Gefundene Bestellung: ${invoice.invoiceNumber}
                Kunde: ${invoice.customer.name} (${invoice.customer.email})
                Status: ${invoice.status}
                Bezahlt: ${invoice.payments.some(p => p.status === 'COMPLETED') ? 'JA' : 'NEIN'}
                Produkte: ${invoice.items.map(i => i.description).join(', ')}
                `
            }
        }

        // 2. Generate Draft with GPT-4o
        const openai = getOpenAIClient()
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Du bist ein freundlicher, professioneller Kundensupport-Mitarbeiter.
                    Deine Aufgabe: Formuliere eine Antwort-E-Mail auf die Kundenanfrage.
                    
                    KONTEXT DATEN AUS DATENBANK:
                    ${contextData}
                    
                    REGELN:
                    - Sei höflich und hilfsbereit.
                    - Wenn der Kunde bezahlt hat aber keinen Key hat, entschuldige dich und sage, wir senden ihn sofort.
                    - Wenn nicht bezahlt, bitte freundlich um Zahlung.
                    - Antworte direkt mit dem E-Mail-Text (Betreff + Inhalt).`
                },
                {
                    role: "user",
                    content: `Kundenanfrage: "${query}"`
                }
            ],
            max_tokens: 500
        })

        const draft = completion.choices[0]?.message?.content || "Konnte keinen Entwurf erstellen."

        await sendTelegramMessage(token, chatId, `📝 *Entwurf für deine Antwort:*\n\n${draft}`)

    } catch (error) {
        console.error("Support request failed:", error)
        await sendTelegramMessage(token, chatId, "❌ Fehler beim Erstellen der Antwort.")
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Basic validation
        if (!body.message) {
            return NextResponse.json({ status: 'ignored' })
        }

        const chatId = body.message.chat.id
        const text = body.message.text || ''
        const photo = body.message.photo

        // Check settings
        const settings = await prisma.telegramSettings.findFirst({
            where: { isEnabled: true },
            include: { allowedUsers: true }
        })

        if (!settings || !settings.botToken) {
            return NextResponse.json({ error: 'Bot disabled' }, { status: 403 })
        }

        // Security: Check if user is allowed
        const isAllowed = settings.allowedUsers.some(u => u.telegramUserId === chatId.toString())
        if (!isAllowed) {
            await sendTelegramMessage(settings.botToken, chatId, "⛔ Zugriff verweigert. Deine ID ist nicht registriert.")
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // --- ROUTING ---

        // 1. Handle Photos (Receipts)
        if (photo && photo.length > 0) {
            await handlePhotoMessage(settings.botToken, chatId, photo, settings.organizationId)
            return NextResponse.json({ success: true })
        }

        // 2. Handle Text Commands
        const lowerText = text.toLowerCase()

        if (lowerText.startsWith('/support') || lowerText.startsWith('support')) {
            const query = text.replace(/^\/?support\s*/i, '')
            if (query.length < 5) {
                await sendTelegramMessage(settings.botToken, chatId, "ℹ️ Bitte gib die Kundenanfrage ein. Bsp: `/support Kunde X hat Key nicht erhalten`")
            } else {
                await handleSupportRequest(settings.botToken, chatId, query)
            }
        } else if (lowerText.includes('umsatz heute')) {
            await handleSalesToday(settings.botToken, chatId)
        } else if (lowerText.includes('rechnungen pdf')) {
            await handlePdfInvoices(settings.botToken, chatId)
        } else if (lowerText.includes('top produkte')) {
            await handleTopProducts(settings.botToken, chatId)
        } else if (lowerText.includes('suche jetzt starten')) {
            await sendTelegramMessage(settings.botToken, chatId, "🚀 Suche wird gestartet... Bitte warten.")

            try {
                // Execute search directly
                const profiles = await (prisma as any).realEstateSearchProfile.findMany({
                    where: { organizationId: settings.organizationId, isActive: true }
                })

                if (profiles.length === 0) {
                    await sendTelegramMessage(settings.botToken, chatId, "⚠️ Keine aktiven Suchprofile gefunden.")
                } else {
                    const provider = new ImmoscoutProvider()
                    let foundCount = 0

                    for (const profile of profiles) {
                        await sendTelegramMessage(settings.botToken, chatId, `🔎 Prüfe: ${profile.name}...`, undefined)

                        const filter: RealEstateFilter = {
                            city: profile.city || undefined,
                            zipCode: profile.zipCode || undefined,
                            district: profile.district || undefined,
                            transactionType: profile.transactionType as any,
                            propertyType: profile.propertyType as any,
                            priceMin: profile.priceMin || undefined,
                            priceMax: profile.priceMax || undefined,
                            roomsMin: profile.roomsMin || undefined,
                            areaMin: profile.areaMin || undefined
                        }

                        const listings = await provider.search(filter)

                        // Filter seen
                        const newListings = []
                        for (const listing of listings) {
                            const seen = await (prisma as any).realEstateSeenListing.findUnique({
                                where: {
                                    profileId_externalId: {
                                        profileId: profile.id,
                                        externalId: listing.id
                                    }
                                }
                            })
                            if (!seen) newListings.push(listing)
                        }

                        if (newListings.length > 0) {
                            for (const listing of newListings) {
                                const message = `🏠 *Neues Angebot gefunden!* (${profile.name})
                                
📍 ${listing.title}
🏙️ ${listing.address}

💶 *${listing.price.toLocaleString('de-DE')} ${listing.currency}*
📐 ${listing.area} m² • 🚪 ${listing.rooms} Zi.

🔗 [Exposé ansehen](${listing.link})
_Anbieter: ${listing.provider}_`
                                await sendTelegramMessage(settings.botToken, chatId, message)

                                // Mark as seen
                                await (prisma as any).realEstateSeenListing.create({
                                    data: { profileId: profile.id, externalId: listing.id }
                                })
                            }
                            foundCount += newListings.length
                        } else {
                            // Optional: Feedback for no results
                            // await sendTelegramMessage(settings.botToken, chatId, `✅ Keine neuen Angebote für ${profile.name}.`, undefined)
                        }

                        // Update last run
                        await (prisma as any).realEstateSearchProfile.update({
                            where: { id: profile.id },
                            data: { lastRunAt: new Date() }
                        })
                    }

                    if (foundCount === 0) {
                        await sendTelegramMessage(settings.botToken, chatId, "✅ Suche abgeschlossen. Keine neuen Angebote gefunden.", undefined)
                    } else {
                        await sendTelegramMessage(settings.botToken, chatId, `✅ Suche abgeschlossen. ${foundCount} neue Angebote gefunden!`)
                    }
                }
            } catch (e: any) {
                console.error('Direct search failed:', e)
                const errorMessage = e.message || 'Unbekannter Fehler'
                await sendTelegramMessage(settings.botToken, chatId, `❌ Fehler bei der Suche:\n${errorMessage}`)
            }

        } else if (lowerText.includes('status prüfen')) {
            // Handle Status Check
            const profiles = await (prisma as any).realEstateSearchProfile.findMany({
                where: { organizationId: settings.organizationId, isActive: true }
            })

            let msg = `📊 *System-Status*\n\n`
            msg += `✅ *Bot ist aktiv*\n`
            msg += `🔎 *Aktive Suchprofile:* ${profiles.length}\n\n`

            if (profiles.length > 0) {
                const lastRun = profiles[0].lastRunAt
                    ? new Date(profiles[0].lastRunAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    : 'Noch nie'
                msg += `🕒 Letzter Check: ${lastRun} Uhr\n`
                msg += `🔜 Nächster Check: Automatisch alle 10-60 Min.`
            } else {
                msg += `⚠️ Du hast noch keine aktiven Suchprofile. Bitte erstelle welche im Dashboard.`
            }

            await sendTelegramMessage(settings.botToken, chatId, msg)

        } else if (lowerText.includes('meine suchprofile')) {
            // List Profiles
            const profiles = await (prisma as any).realEstateSearchProfile.findMany({
                where: { organizationId: settings.organizationId }
            })

            if (profiles.length === 0) {
                await sendTelegramMessage(settings.botToken, chatId, "📭 Keine Suchprofile gefunden.")
            } else {
                let msg = `📋 *Deine Suchprofile:*\n\n`
                profiles.forEach((p: any) => {
                    const status = p.isActive ? '✅' : '⏸️'
                    const priceMax = p.priceMax ? `bis ${p.priceMax.toLocaleString('de-DE')}€` : 'kein Preislimit'
                    msg += `${status} *${p.name}*\n`
                    msg += `   📍 ${p.city || p.zipCode} (${p.transactionType === 'RENT' ? 'Miete' : 'Kauf'})\n`
                    msg += `   💰 ${priceMax}\n\n`
                })
                await sendTelegramMessage(settings.botToken, chatId, msg)
            }

        } else if (lowerText === '/start' || lowerText === 'start') {
            const menu = {
                keyboard: [
                    [{ text: "🚀 Suche jetzt starten" }],
                    [{ text: "🔍 Status prüfen" }, { text: "📋 Meine Suchprofile" }],
                    [{ text: "🆘 Hilfe" }]
                ],
                resize_keyboard: true,
                persistent: true
            }

            await sendTelegramMessage(settings.botToken, chatId,
                `👋 *Willkommen beim Immobilien-Alarm Pro!*\n\n` +
                `Ich bin dein persönlicher Assistent für die Immobiliensuche.\n` +
                `Ich überwache den Markt rund um die Uhr für dich.\n\n` +
                `🆔 Deine ID: \`${chatId}\`\n\n` +
                `👇 Wähle eine Option aus dem Menü:`,
                'Markdown',
                { reply_markup: menu }
            )
        } else {
            // Intelligent AI Response for everything else
            await handleAiChat(settings.botToken, chatId, text)
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Telegram Webhook Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
