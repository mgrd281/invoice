import { NextRequest, NextResponse } from 'next/server'
import { ShopifyAPI, convertShopifyOrderToInvoice } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { ensureOrganization, ensureCustomer, ensureTaxRate, ensureDefaultTemplate } from '@/lib/db-operations'
import { Prisma } from '@prisma/client'

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
        if (!settings.enabled) {
            return NextResponse.json({ error: 'Shopify integration is not active' }, { status: 400 })
        }

        const api = new ShopifyAPI(settings)

        // Try to find the order using multiple strategies
        let orders: any[] = []

        // Strategy 1: Search by name (e.g. "#2000")
        console.log(`Trying strategy 1: name=${orderName}`)
        orders = await api.getOrders({
            limit: 1,
            name: orderName,
            status: 'any'
        })

        // Strategy 2: Search by number only (e.g. "2000")
        if (orders.length === 0) {
            console.log(`Trying strategy 2: name=${orderNumber}`)
            orders = await api.getOrders({
                limit: 1,
                name: orderNumber,
                status: 'any'
            })
        }

        // Strategy 3: General query search (if supported/needed, usually name covers it)
        // But sometimes 'name' is strict. Let's rely on the above for now as getOrders uses specific params.

        if (orders.length === 0) {
            console.log('❌ Order not found with any strategy.')
            return NextResponse.json({ found: false, message: 'Order not found in Shopify' })
        }

        const order = orders[0]
        console.log(`✅ Found order in Shopify: ${order.name} (ID: ${order.id})`)

        // Ensure Organization
        const org = await ensureOrganization()

        // Check if invoice already exists in DB to avoid duplicates
        // We check by invoiceNumber (which usually matches order name) or by shopifyOrderId on the Order model
        const existingInvoice = await prisma.invoice.findFirst({
            where: {
                organizationId: org.id,
                invoiceNumber: order.name
            },
            include: {
                customer: true,
                items: true
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

        // Convert to invoice data
        const invoiceData = convertShopifyOrderToInvoice(order, settings)

        // Ensure Customer
        const customerObj = await ensureCustomer(org.id, {
            name: invoiceData.customerName,
            email: invoiceData.customerEmail,
            address: invoiceData.customerAddress,
            // Split address if possible or just store in address field
            // The ensureCustomer function expects simple fields
        })

        // Ensure Template
        const templateObj = await ensureDefaultTemplate(org.id)

        // Ensure Order (Optional but good for linking)
        // Check if order exists
        let dbOrder = await prisma.order.findFirst({
            where: {
                organizationId: org.id,
                shopifyOrderId: order.id.toString()
            }
        })

        if (!dbOrder) {
            // Create Order
            dbOrder = await prisma.order.create({
                data: {
                    organizationId: org.id,
                    customerId: customerObj.id,
                    orderNumber: order.name,
                    orderDate: new Date(order.created_at),
                    totalAmount: order.total_price,
                    currency: order.currency,
                    status: 'COMPLETED', // Assuming imported orders are completed or use mapping
                    shopifyOrderId: order.id.toString()
                }
            })
        }

        // Save new invoice to database
        console.log(`💾 Saving new invoice for order ${order.name}...`)

        // Calculate totals
        let totalNet = 0
        let totalGross = 0
        let totalTax = 0

        // Prepare items
        const processedItems = []
        for (const item of invoiceData.items) {
            const quantity = Number(item.quantity)
            const unitPrice = Number(item.unitPrice)
            const total = Number(item.total)
            const taxRateVal = item.taxRate || 19

            // Ensure Tax Rate
            const taxRateObj = await ensureTaxRate(org.id, taxRateVal)

            // Calculate amounts (assuming unitPrice is gross or net? convertShopifyOrderToInvoice logic matters)
            // Usually Shopify sends gross prices.
            // Let's assume item.total is gross.
            // Net = Gross / (1 + rate)
            const gross = total
            const net = gross / (1 + (taxRateVal / 100))
            const tax = gross - net

            totalNet += net
            totalGross += gross
            totalTax += tax

            processedItems.push({
                description: item.description,
                quantity: quantity,
                unitPrice: unitPrice,
                taxRateId: taxRateObj.id,
                netAmount: net,
                grossAmount: gross,
                taxAmount: tax,
                ean: null // Add if available
            })
        }

        const newInvoice = await prisma.invoice.create({
            data: {
                organizationId: org.id,
                customerId: customerObj.id,
                orderId: dbOrder.id,
                templateId: templateObj.id,
                invoiceNumber: invoiceData.number, // or order.name
                issueDate: new Date(invoiceData.date),
                dueDate: new Date(invoiceData.dueDate),
                totalNet: totalNet,
                totalGross: totalGross,
                totalTax: totalTax,
                currency: invoiceData.currency,
                status: 'PAID', // Imported orders are usually paid
                items: {
                    create: processedItems
                },
                settings: {
                    paymentMethod: invoiceData.paymentMethod
                }
            } as any, // Cast to any to avoid strict type checking on JSON field if types are outdated
            include: {
                items: true,
                customer: true
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
