import { NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'

export async function GET() {
    try {
        const api = new ShopifyAPI()

        // 1. Fetch Orders (Last 30 days, PAID only)
        // User Requirement: Only show orders from the last 30 days that are fully PAID.
        // Exclude refunded or partially refunded orders.
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const orders = await api.getOrders({
            limit: 1000,
            status: 'any',
            financial_status: 'paid',
            created_at_min: thirtyDaysAgo.toISOString()
        })

        // 2. Fetch Abandoned Checkouts
        const checkouts = await api.getAbandonedCheckouts({ limit: 50 })

        // --- Process Top Customers ---
        const customerMap = new Map<string, {
            id: number,
            name: string,
            email: string,
            totalSpent: number,
            orderCount: number,
            lastOrderDate: string
        }>()

        orders.forEach(order => {
            if (!order.customer) return

            // Double check financial status just in case
            if (order.financial_status !== 'paid') return

            const customerId = order.customer.id.toString()
            const current = customerMap.get(customerId) || {
                id: order.customer.id,
                name: `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || order.customer.email || 'Unbekannt',
                email: order.customer.email || '',
                totalSpent: 0,
                orderCount: 0,
                lastOrderDate: ''
            }

            current.totalSpent += parseFloat(order.total_price)
            current.orderCount += 1
            if (!current.lastOrderDate || new Date(order.created_at) > new Date(current.lastOrderDate)) {
                current.lastOrderDate = order.created_at
            }

            customerMap.set(customerId, current)
        })

        const topCustomers = Array.from(customerMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10) // Top 10

        // --- Process Popular Products (Last 30 Days - already filtered) ---
        const productMap = new Map<string, {
            id: number,
            title: string,
            quantitySold: number,
            revenue: number
        }>()

        orders.forEach(order => {
            // Double check financial status just in case
            if (order.financial_status !== 'paid') return

            order.line_items.forEach(item => {
                const productId = item.product_id.toString()
                const current = productMap.get(productId) || {
                    id: item.product_id,
                    title: item.title,
                    quantitySold: 0,
                    revenue: 0
                }

                current.quantitySold += item.quantity
                current.revenue += parseFloat(item.price) * item.quantity
                productMap.set(productId, current)
            })
        })

        const popularProducts = Array.from(productMap.values())
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 10)

        // --- Process Abandoned Checkouts ---
        const abandonedCarts = checkouts.map((c: any) => ({
            id: c.id,
            url: c.abandoned_checkout_url,
            createdAt: c.created_at,
            customer: {
                name: c.customer ? `${c.customer.first_name || ''} ${c.customer.last_name || ''}`.trim() : 'Gast',
                email: c.email || c.customer?.email
            },
            totalPrice: c.total_price,
            lineItems: c.line_items?.map((i: any) => `${i.quantity}x ${i.title}`).join(', ')
        })).slice(0, 10)

        return NextResponse.json({
            success: true,
            data: {
                topCustomers,
                popularProducts,
                abandonedCarts
            }
        })

    } catch (error: any) {
        console.error('Analytics Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
