import { NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'
import { handleOrderCreate } from '@/lib/shopify-order-handler'
import { loadInvoicesFromDisk } from '@/lib/server-storage'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const settings = getShopifySettings()
        if (!settings.shopDomain || !settings.accessToken) {
            return NextResponse.json({ synced: 0, message: 'Shopify not configured' })
        }

        const api = new ShopifyAPI(settings)

        // 1. Get existing invoices to know what we already have
        // We only need the IDs to check existence
        const existingInvoices = loadInvoicesFromDisk()
        const existingShopifyIds = new Set(
            existingInvoices
                .filter((inv: any) => inv.shopifyOrderId)
                .map((inv: any) => inv.shopifyOrderId?.toString())
        )

        // 2. Determine fetch strategy
        let fetchParams: any = { limit: 10, status: 'any' }

        // If we have NO invoices (or very few), assume we need a full history sync from Nov 1st
        if (existingInvoices.length < 5) {
            console.log('🕳️ Invoice list empty or small. Triggering HISTORICAL SYNC from 2024-11-01...')
            fetchParams = {
                limit: 250, // Fetch up to 250 orders (max per page)
                status: 'any',
                created_at_min: '2024-11-01T00:00:00'
            }
        }

        // 3. Fetch orders from Shopify
        const recentOrders = await api.getOrders(fetchParams)

        let syncedCount = 0
        const newInvoiceIds: string[] = []

        // 4. Check for new orders
        for (const order of recentOrders) {
            const orderIdStr = order.id.toString()

            // If we don't have this order yet
            if (!existingShopifyIds.has(orderIdStr)) {
                console.log(`🔄 Auto-Sync: Found new order #${order.name} (${order.id})`)

                // Process it (Create Invoice + Send Email if configured)
                // handleOrderCreate handles everything: invoice creation, PDF, Email
                const invoiceId = await handleOrderCreate(order, settings.shopDomain)

                if (invoiceId) {
                    syncedCount++
                    newInvoiceIds.push(invoiceId)
                    console.log(`✅ Auto-Sync: Created invoice ${invoiceId} for order #${order.name}`)
                }
            }
        }

        return NextResponse.json({
            synced: syncedCount,
            newInvoiceIds,
            message: syncedCount > 0 ? `Synced ${syncedCount} new orders` : 'No new orders'
        })

    } catch (error: any) {
        console.error('❌ Auto-Sync Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
