import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureOrganization } from '@/lib/db-operations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const organization = await ensureOrganization()

        const settings = await prisma.telegramSettings.findUnique({
            where: { organizationId: organization.id },
            include: { allowedUsers: true }
        })

        return NextResponse.json(settings || { isEnabled: false, allowedUsers: [] })
    } catch (error) {
        console.error('Error fetching Telegram settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const organization = await ensureOrganization()

        // Upsert settings
        const settings = await prisma.telegramSettings.upsert({
            where: { organizationId: organization.id },
            update: {
                botToken: body.botToken,
                isEnabled: body.isEnabled
            },
            create: {
                organizationId: organization.id,
                botToken: body.botToken,
                isEnabled: body.isEnabled || false
            }
        })

        // Handle allowed users update if provided
        if (body.allowedUsers && Array.isArray(body.allowedUsers)) {
            // Delete existing (simple replacement strategy)
            await prisma.telegramAllowedUser.deleteMany({
                where: { settingsId: settings.id }
            })

            // Create new ones
            if (body.allowedUsers.length > 0) {
                await prisma.telegramAllowedUser.createMany({
                    data: body.allowedUsers.map((u: any) => ({
                        settingsId: settings.id,
                        telegramUserId: u.telegramUserId,
                        name: u.name
                    }))
                })
            }
        }

        const updatedSettings = await prisma.telegramSettings.findUnique({
            where: { id: settings.id },
            include: { allowedUsers: true }
        })

        return NextResponse.json({ success: true, settings: updatedSettings })

    } catch (error) {
        console.error('Error saving Telegram settings:', error)
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }
}
