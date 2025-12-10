import { prisma } from '@/lib/prisma'
import { log } from '@/lib/logger'
import { DocumentKind } from '@/lib/document-types'

// Helper to map Prisma Invoice to InvoiceData (compatible with PDF generator)
export function mapPrismaInvoiceToData(invoice: any) {
    return {
        id: invoice.id,
        number: invoice.invoiceNumber,
        date: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        subtotal: Number(invoice.totalNet),
        taxRate: 19, // Default, should be derived from items
        taxAmount: Number(invoice.totalTax),
        total: Number(invoice.totalGross),
        status: invoice.status,
        document_kind: DocumentKind.INVOICE,
        reference_number: invoice.order?.orderNumber,
        customer: {
            name: invoice.customer.name,
            email: invoice.customer.email,
            address: invoice.customer.address,
            city: invoice.customer.city,
            zipCode: invoice.customer.zipCode,
            country: invoice.customer.country
        },
        organization: {
            name: invoice.organization.name,
            address: invoice.organization.address,
            zipCode: invoice.organization.zipCode,
            city: invoice.organization.city,
            country: invoice.organization.country,
            taxId: invoice.organization.taxId,
            bankName: invoice.organization.bankName,
            iban: invoice.organization.iban,
            bic: invoice.organization.bic
        },
        items: invoice.items.map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            total: Number(item.grossAmount)
        }))
    }
}

export async function handleOrderCreate(order: any, shopDomain: string | null) {
    log(`🔄 Handling order create for ${order.name} (Shop: ${shopDomain})`)

    // 1. Find Organization
    let organization = null
    if (shopDomain) {
        const connection = await prisma.shopifyConnection.findFirst({
            where: { shopName: shopDomain },
            include: { organization: true }
        })
        organization = connection?.organization
    }

    if (!organization) {
        // Fallback: Get the first organization
        organization = await prisma.organization.findFirst()
    }

    if (!organization) {
        throw new Error('No organization found. Please set up an organization first.')
    }

    // 2. Find/Create Customer
    const customerData = {
        organizationId: organization.id,
        name: (
            `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() ||
            `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim() ||
            `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`.trim() ||
            order.email ||
            'Gast'
        ),
        email: order.email || '',
        address: order.billing_address?.address1 || '',
        city: order.billing_address?.city || '',
        zipCode: order.billing_address?.zip || '',
        country: order.billing_address?.country_code || 'DE',
        shopifyCustomerId: String(order.customer?.id || '')
    }

    // Upsert customer
    // Note: shopifyCustomerId is unique per organization in our schema logic (ideally)
    // But for now we'll search by email if shopifyId is missing or just create new
    let customer = await prisma.customer.findFirst({
        where: {
            organizationId: organization.id,
            OR: [
                { shopifyCustomerId: customerData.shopifyCustomerId },
                { email: customerData.email }
            ]
        }
    })

    if (!customer) {
        customer = await prisma.customer.create({
            data: customerData
        })
    } else {
        // Update existing customer
        customer = await prisma.customer.update({
            where: { id: customer.id },
            data: customerData
        })
    }

    // 3. Find/Create Order
    const orderData = {
        organizationId: organization.id,
        customerId: customer.id,
        orderNumber: order.name,
        orderDate: new Date(order.created_at),
        totalAmount: order.total_price,
        currency: order.currency,
        status: 'PENDING', // Enum: PENDING, COMPLETED, CANCELLED
        shopifyOrderId: String(order.id)
    }

    let dbOrder = await prisma.order.findFirst({
        where: {
            organizationId: organization.id,
            shopifyOrderId: orderData.shopifyOrderId
        }
    })

    if (!dbOrder) {
        // @ts-ignore
        dbOrder = await prisma.order.create({
            // @ts-ignore
            data: orderData
        })
    }

    // 4. Create Invoice
    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findFirst({
        where: {
            organizationId: organization.id,
            orderId: dbOrder?.id
        },
        include: {
            customer: true,
            organization: true,
            items: true,
            order: true
        }
    })

    if (existingInvoice) {
        log(`⚠️ Invoice for order ${order.name} already exists.`)
        return { ...mapPrismaInvoiceToData(existingInvoice), isNew: false }
    }

    // Get default template
    const template = await prisma.invoiceTemplate.findFirst({
        where: { organizationId: organization.id, isDefault: true }
    }) || await prisma.invoiceTemplate.findFirst({
        where: { organizationId: organization.id }
    })

    // If no template exists, create a default one
    let templateId = template?.id
    if (!templateId) {
        const newTemplate = await prisma.invoiceTemplate.create({
            data: {
                organizationId: organization.id,
                name: 'Standard Template',
                htmlContent: '',
                cssContent: '',
                isDefault: true
            }
        })
        templateId = newTemplate.id
    }

    // Calculate totals
    const items = order.line_items.map((item: any) => {
        const quantity = parseFloat(item.quantity)
        const price = parseFloat(item.price)
        const total = price * quantity
        const taxRate = 19 // Default
        const net = total / 1.19
        const tax = total - net
        return {
            description: item.title,
            quantity,
            unitPrice: net / quantity, // Store Net Unit Price so UI adds tax correctly
            grossAmount: total,
            netAmount: net,
            taxAmount: tax,
            taxRateId: 'default' // Placeholder
        }
    })

    // Add shipping as a line item
    if (order.shipping_lines && order.shipping_lines.length > 0) {
        order.shipping_lines.forEach((shipping: any) => {
            const price = parseFloat(shipping.price)
            if (price > 0) {
                const taxRate = 19 // Default
                const net = price / 1.19
                const tax = price - net
                items.push({
                    description: `Versand: ${shipping.title}`,
                    quantity: 1,
                    unitPrice: net, // Store Net Price
                    grossAmount: price,
                    netAmount: net,
                    taxAmount: tax,
                    taxRateId: 'default'
                })
            }
        })
    }

    const totalGross = items.reduce((sum: number, item: any) => sum + item.grossAmount, 0)
    const totalNet = items.reduce((sum: number, item: any) => sum + item.netAmount, 0)
    const totalTax = items.reduce((sum: number, item: any) => sum + item.taxAmount, 0)

    // Get or create tax rate
    let taxRate = await prisma.taxRate.findFirst({
        where: { organizationId: organization.id, rate: 0.19 }
    })
    if (!taxRate) {
        taxRate = await prisma.taxRate.create({
            data: {
                organizationId: organization.id,
                name: 'MwSt. 19%',
                rate: 0.19,
                isDefault: true
            }
        })
    }

    const newInvoice = await prisma.invoice.create({
        data: {
            organizationId: organization.id,
            customerId: customer.id,
            orderId: dbOrder?.id,
            templateId: templateId,
            invoiceNumber: order.name || `RE-${Date.now()}`,
            issueDate: new Date(order.created_at || Date.now()),
            dueDate: new Date(new Date(order.created_at || Date.now()).getTime() + 14 * 24 * 60 * 60 * 1000),
            totalNet,
            totalGross,
            totalTax,
            status: order.financial_status === 'paid' ? 'PAID' : 'SENT',
            items: {
                create: items.map((item: any) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    grossAmount: item.grossAmount,
                    netAmount: item.netAmount,
                    taxAmount: item.taxAmount,
                    taxRateId: taxRate?.id
                }))
            }
        },
        include: {
            customer: true,
            organization: true,
            items: true,
            order: true
        }
    })

    log(`✅ Invoice created in DB: ${newInvoice.invoiceNumber}`)
    return { ...mapPrismaInvoiceToData(newInvoice), isNew: true }
}

export async function handleOrderUpdate(order: any) {
    // TODO: Implement update logic using Prisma
    return { status: 'skipped' }
}
