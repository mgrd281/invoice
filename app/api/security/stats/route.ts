import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopifySettings } from '@/lib/shopify-settings'
import { getOrganizationIdFromShop } from '@/lib/org-helper'

export async function GET(request: NextRequest) {
    try {
        const shopSettings = getShopifySettings()
        const organizationId = await getOrganizationIdFromShop(shopSettings.shopDomain)

        if (!organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        const [blockedEmails, blockedIps, recentAttempts] = await Promise.all([
            prisma.blockedUser.count({ where: { organizationId } }),
            prisma.blockedIp.count({ where: { organizationId } }),
            prisma.blockedUserAttempt.count({
                where: {
                    organizationId,
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            })
        ])

        return NextResponse.json({
            blockedEmails,
            blockedIps,
            recentAttempts
        })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
