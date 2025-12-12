import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureOrganization } from '@/lib/db-operations'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const org = await ensureOrganization()
        const settings = await prisma.telegramSettings.findUnique({
            where: { organizationId: org.id },
            include: { allowedUsers: true }
        })

        if (!settings) return NextResponse.json({ error: 'No settings found for organization', orgId: org.id })
        if (!settings.botToken) return NextResponse.json({ error: 'No bot token configured' })

        const results = []

        // Try to send to all allowed users
        if (settings.allowedUsers.length === 0) {
            return NextResponse.json({ error: 'No allowed users found', settings })
        }

        for (const user of settings.allowedUsers) {
            // Trim token just in case
            const token = settings.botToken.trim()
            const url = `https://api.telegram.org/bot${token}/sendMessage`

            console.log(`Testing Telegram for user ${user.telegramUserId} with token prefix ${token.substring(0, 5)}...`)

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.telegramUserId,
                    text: '🔔 Dies ist eine Test-Nachricht vom System-Check.',
                })
            })

            const text = await res.text()
            results.push({
                user: user.name,
                telegramId: user.telegramUserId,
                httpStatus: res.status,
                isOk: res.ok,
                telegramResponse: text
            })
        }

        return NextResponse.json({
            status: 'Check completed',
            tokenConfigured: true,
            tokenPrefix: settings.botToken.substring(0, 5) + '...',
            results
        })

    } catch (e: any) {
        return NextResponse.json({ error: 'Internal Error', message: e.message, stack: e.stack })
    }
}
