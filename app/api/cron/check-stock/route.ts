import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveTelegramSettings, sendTelegramMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // 1. Get active Telegram settings
        const settings = await getActiveTelegramSettings()
        if (!settings || !settings.isEnabled || !settings.botToken) {
            return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 400 })
        }

        // 2. Fetch all digital products with their keys
        const products = await prisma.digitalProduct.findMany({
            include: {
                keys: {
                    where: { isUsed: false }
                }
            }
        })

        // 3. Check stock levels
        const LOW_STOCK_THRESHOLD = 5
        const alerts: string[] = []

        for (const product of products) {
            const remainingKeys = product.keys.length

            if (remainingKeys <= LOW_STOCK_THRESHOLD) {
                alerts.push(`⚠️ *ACHTUNG: Niedriger Bestand!*\n📦 ${product.title}\n🔢 Verbleibend: *${remainingKeys}*`)
            }
        }

        // 4. Send alerts if any
        if (alerts.length > 0) {
            const message = alerts.join('\n\n')

            // Send to all allowed users
            for (const user of settings.allowedUsers) {
                await sendTelegramMessage(settings.botToken, user.telegramUserId, message)
            }

            return NextResponse.json({ success: true, alertsSent: alerts.length })
        }

        return NextResponse.json({ success: true, message: 'Stock levels healthy' })

    } catch (error) {
        console.error('Stock check failed:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
