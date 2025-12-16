import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { ShopifyAPI } from '@/lib/shopify-api'
import { InvoiceStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const api = new ShopifyAPI()

        // 1. Fetch all orders from Shopify
        console.log('Fetching all orders from Shopify...')
        const orders = await api.getOrders({ limit: 999999, status: 'any' })
        console.log(`Fetched ${orders.length} orders from Shopify.`)

        let importedCount = 0
        let skippedCount = 0

        // 2. Process each order
        for (const order of orders) {
            try {
                // Check if invoice already exists
                const existingInvoice = await prisma.invoice.findFirst({
                    where: {
                        OR: [
                            { invoiceNumber: order.name }, // e.g. #1001
                            { invoiceNumber: order.name.replace('#', '') } // e.g. 1001
                        ]
                    }
                })

                if (existingInvoice) {
                    skippedCount++
                    continue
                }

                // Create Customer if needed
                let customerId = 'legacy-customer'
                if (order.customer) {
                    const customerName = order.customer.first_name
                        ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
                        : (order.customer.email || 'Unknown')

                    const customer = await prisma.customer.upsert({
                        where: {
                            unique_shopify_customer_per_organization: {
                                organizationId: 'default-org-id',
                                shopifyCustomerId: order.customer.email || `shopify-${order.customer.id}`
                            }
                        },
                        update: {},
                        create: {
                            organization: { connect: { id: 'default-org-id' } },
                            name: customerName,
                            email: order.customer.email || '',
                            phone: order.customer.phone || '',
                            address: order.billing_address?.address1 || '',
                            zipCode: order.billing_address?.zip || '',
                            city: order.billing_address?.city || '',
                            shopifyCustomerId: order.customer.email || `shopify-${order.customer.id}`
                        }
                    })
                    customerId = customer.id
                }

                // Create Invoice
                await prisma.invoice.create({
                    data: {
                        invoiceNumber: order.name,
                        issueDate: new Date(order.created_at),
                        dueDate: new Date(order.created_at), // Default to creation date
                        status: (order.financial_status === 'paid' ? 'PAID' : 'PENDING') as InvoiceStatus,
                        totalNet: parseFloat(order.subtotal_price),
                        totalTax: parseFloat(order.total_tax),
                        totalGross: parseFloat(order.total_price),
                        currency: order.currency,
                        organization: { connect: { id: 'default-org-id' } },
                        customer: { connect: { id: customerId } },
                        template: { connect: { id: 'default-template-id' } },
                        items: {
                            create: order.line_items.map((item: any) => ({
                                description: item.title,
                                quantity: item.quantity,
                                unitPrice: parseFloat(item.price),
                                grossAmount: parseFloat(item.price) * item.quantity,
                                netAmount: (parseFloat(item.price) * item.quantity) / 1.19, // Approx
                                taxAmount: (parseFloat(item.price) * item.quantity) - ((parseFloat(item.price) * item.quantity) / 1.19), // Approx
                                taxRate: {
                                    connectOrCreate: {
                                        where: { organizationId_name: { organizationId: 'default-org-id', name: 'Standard' } },
                                        create: { organizationId: 'default-org-id', name: 'Standard', rate: 0.19 }
                                    }
                                }
                            }))
                        }
                    }
                })
                importedCount++
            } catch (e) {
                console.error(`Failed to import order ${order.name}:`, e)
            }
        }

        return NextResponse.json({
            success: true,
            imported: importedCount,
            skipped: skippedCount,
            total: orders.length
        })

    } catch (error: any) {
        console.error('Shopify Import Error:', error)
        return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 })
    }
}
