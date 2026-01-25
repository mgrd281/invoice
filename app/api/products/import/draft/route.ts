import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopifySettings } from '@/lib/shopify-settings'
import { getOrganizationIdFromShop } from '@/lib/org-helper'

export async function POST(request: NextRequest) {
    try {
        const { url, product, settings } = await request.json()

        if (!product) {
            return NextResponse.json({ error: 'Product data is required' }, { status: 400 })
        }

        // 1. Resolve Organization
        const shopSettings = getShopifySettings()
        const organizationId = await getOrganizationIdFromShop(shopSettings.shopDomain)

        if (!organizationId) {
            // Fallback for dev: if local, create a dummy draft or fail?
            // Since we need to save to DB, we MUST have an org ID.
            // Let's try to query the "default" organization if we are in dev mode or just fail.
            // Given the context of "rechnung 6", let's fail gracefully.
            return NextResponse.json({ error: 'Organization not found for current shop' }, { status: 404 })
        }

        // 2. Create Draft in DB
        const draft = await prisma.importDraft.create({
            data: {
                organizationId,
                sourceUrl: url || product.sourceUrl || 'unknown',
                data: product,
                settings: settings || {},
                status: 'PENDING'
            }
        })

        return NextResponse.json({ success: true, draftId: draft.id })

    } catch (error) {
        console.error('Error creating import draft:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to create draft'
        }, { status: 500 })
    }
}
