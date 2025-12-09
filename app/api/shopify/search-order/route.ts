import { NextRequest, NextResponse } from 'next/server'
import { ShopifyAPI, convertShopifyOrderToInvoice } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get('query')

        if (!query) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
        }

        // Clean up query (remove # if present)
        const orderName = query.startsWith('#') ? query : `#${query}`
        const orderNumber = query.replace('#', '')

        console.log(`🔍 Searching Shopify for order: ${orderName} or ${orderNumber}`)

        const settings = getShopifySettings()
        if (!settings.isActive) {
            return NextResponse.json({ error: 'Shopify integration is not active' }, { status: 400 })
        }

        const api = new ShopifyAPI(settings)

        // Try to find the order
        // 1. Search by name (e.g. #1001)
        let orders = await api.getOrders({
            limit: 1,
            name: orderName,
            status: 'any'
        })

        // 2. If not found, try searching by order number directly (sometimes works differently)
        if (orders.length === 0) {
            orders = await api.getOrders({
                limit: 1,
                name: orderNumber,
                status: 'any'
            })
        }

        if (orders.length === 0) {
            return NextResponse.json({ found: false, message: 'Order not found in Shopify' })
        }

        const order = orders[0]
        console.log(`✅ Found order in Shopify: ${order.name} (ID: ${order.id})`)

        // Convert to invoice
        const invoiceData = convertShopifyOrderToInvoice(order, settings)

        // Check if invoice already exists in DB to avoid duplicates
        const existingInvoice = await prisma.invoice.findFirst({
            where: {
                OR: [
                    { number: invoiceData.number },
                    { orderNumber: invoiceData.orderNumber }
                ]
            }
        })

        if (existingInvoice) {
            console.log(`ℹ️ Invoice for order ${order.name} already exists locally.`)
            return NextResponse.json({
                found: true,
                invoice: existingInvoice,
                isNew: false
            })
        }

        // Save new invoice to database
        console.log(`💾 Saving new invoice for order ${order.name}...`)

        // Ensure user ID is attached
        const userId = (session.user as any).id

        const newInvoice = await prisma.invoice.create({
            data: {
                number: invoiceData.number,
                date: new Date(invoiceData.date),
                dueDate: new Date(invoiceData.dueDate),
                status: invoiceData.status,
                customerName: invoiceData.customerName,
                customerEmail: invoiceData.customerEmail,
                customerAddress: invoiceData.customerAddress || '',
                items: {
                    create: invoiceData.items.map((item: any) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total,
                        taxRate: item.taxRate || 19
                    }))
                },
                subtotal: invoiceData.subtotal,
                taxTotal: invoiceData.taxTotal,
                total: invoiceData.total,
                notes: invoiceData.notes,
                userId: userId,
                orderNumber: invoiceData.orderNumber,
                shopifyOrderId: invoiceData.shopifyOrderId,
                paymentMethod: invoiceData.paymentMethod,
                currency: invoiceData.currency
            },
            include: {
                items: true
            }
        })

        return NextResponse.json({
            found: true,
            invoice: newInvoice,
            isNew: true
        })

    } catch (error: any) {
        console.error('Error searching Shopify order:', error)
        return NextResponse.json({ error: error.message || 'Failed to search order' }, { status: 500 })
    }
}
