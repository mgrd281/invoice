import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopifySettings } from '@/lib/shopify-settings'
import { getOrganizationIdFromShop } from '@/lib/org-helper'

export async function POST(request: NextRequest) {
    try {
        const { url, product, settings } = await request.json()

        if (!url && !product) {
            return NextResponse.json({ error: 'URL or Product data is required' }, { status: 400 })
        }

        // 1. Resolve Organization
        const shopSettings = getShopifySettings()
        const organizationId = await getOrganizationIdFromShop(shopSettings.shopDomain)

        if (!organizationId) {
            return NextResponse.json({ error: 'Organization not found for current shop' }, { status: 404 })
        }

        // Verify Organization exists in DB to prevent foreign key errors
        const orgExists = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { id: true }
        })

        if (!orgExists) {
            return NextResponse.json({ error: 'Organization record mismatch' }, { status: 500 })
        }

        // 2. Create Draft in DB
        // If product is provided, status is READY, otherwise PENDING
        const initialStatus = product ? 'READY' : 'PENDING'

        const draft = await prisma.importDraft.create({
            data: {
                organizationId,
                sourceUrl: url || product?.sourceUrl || 'unknown',
                data: product || {}, // Empty data initially if pending
                settings: settings || {},
                status: initialStatus
            }
        })

        return NextResponse.json({ success: true, draftId: draft.id, status: initialStatus })

    } catch (error) {
        console.error('Error creating import draft:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to create draft'
        }, { status: 500 })
    }
}
