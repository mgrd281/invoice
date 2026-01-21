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

    // ---------------------------------------------------------
    // AUTO-CANCEL TEST ORDERS
    // ---------------------------------------------------------
    const namesToCheck = [
        order.customer?.first_name,
        order.customer?.last_name,
        order.billing_address?.first_name,
        order.billing_address?.last_name,
        order.shipping_address?.first_name,
        order.shipping_address?.last_name,
        order.email
    ]

    const isTestOrder = namesToCheck.some(name => {
        if (!name) return false
        const n = name.toLowerCase().trim()
        return n === 'test' || n === 'tester' || n.includes('test@')
    })

    if (isTestOrder) {
        log(`🚫 Detected Test Order (Name/Email match). Auto-cancelling...`)
        try {
            const { ShopifyAPI } = await import('@/lib/shopify-api')
            const api = new ShopifyAPI()
            await api.cancelOrder(order.id)
            log(`✅ Test order ${order.name} cancelled in Shopify.`)

            // Update order object to reflect cancellation for local invoice creation
            order.financial_status = 'voided'
            order.cancelled_at = new Date().toISOString()
        } catch (err) {
            log(`⚠️ Failed to auto-cancel test order: ${err}`)
        }
    }
    // ---------------------------------------------------------

    // 2. Find/Create Customer
    // Helper to get address fields with fallback - improved to check all sources
    const getAddressField = (field: string) => {
        // Try billing address first (most reliable for invoicing)
        if (order.billing_address?.[field]) {
            return order.billing_address[field];
        }
        // Then shipping address
        if (order.shipping_address?.[field]) {
            return order.shipping_address[field];
        }
        // Then customer default address
        if (order.customer?.default_address?.[field]) {
            return order.customer.default_address[field];
        }
        // Finally check customer object directly (some Shopify versions)
        if (order.customer?.[field]) {
            return order.customer[field];
        }
        return '';
    }

    // Get customer name with better fallback logic
    const getCustomerName = () => {
        // Try customer object first
        const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
        if (customerName) return customerName;

        // Try billing address
        const billingName = `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim();
        if (billingName) return billingName;

        // Try shipping address
        const shippingName = `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`.trim();
        if (shippingName) return shippingName;

        // Try email
        if (order.email) return order.email;

        // Last resort
        return 'Gast';
    }

    const customerData = {
        organizationId: organization.id,
        name: getCustomerName(),
        email: order.email || order.customer?.email || '',
        address: getAddressField('address1'),
        city: getAddressField('city'),
        zipCode: getAddressField('zip'),
        country: order.billing_address?.country_code || order.shipping_address?.country_code || order.customer?.default_address?.country_code || order.customer?.country_code || 'DE',
        shopifyCustomerId: String(order.customer?.id || '')
    }

    // Log customer data for debugging
    log(`📋 Customer Data: Name="${customerData.name}", Email="${customerData.email}", City="${customerData.city}", Zip="${customerData.zipCode}", Address="${customerData.address}"`)

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

        // Check if we can improve the payment method for existing invoice
        const currentSettings = existingInvoice.settings as any
        const currentMethod = currentSettings?.paymentMethod || '-'

        if (currentMethod.toLowerCase() === 'manual' || currentMethod.toLowerCase() === 'custom' || currentMethod === '-') {
            log(`🔄 Checking if we can improve payment method for existing invoice ${existingInvoice.invoiceNumber}...`)

            // Re-run detection logic
            let newPaymentMethod = '-'

            // 1. Try payment_gateway_names
            if (order.payment_gateway_names && Array.isArray(order.payment_gateway_names)) {
                const gateways = order.payment_gateway_names as string[]
                if (gateways.length > 0) {
                    const specificGateways = gateways.filter(g => g.toLowerCase() !== 'manual')
                    if (specificGateways.length > 0) {
                        newPaymentMethod = specificGateways[0]
                    } else {
                        newPaymentMethod = 'Vorkasse'
                    }
                }
            }

            // 2. Try legacy gateway
            if (newPaymentMethod === '-' || newPaymentMethod.toLowerCase() === 'manual' || newPaymentMethod.toLowerCase() === 'custom') {
                const legacyGateway = (order as any).gateway
                if (legacyGateway && legacyGateway.toLowerCase() !== 'manual' && legacyGateway.toLowerCase() !== 'custom') {
                    newPaymentMethod = legacyGateway
                }
            }

            // 3. Try transactions
            if (newPaymentMethod.toLowerCase() === 'manual' || newPaymentMethod.toLowerCase() === 'custom') {
                try {
                    const { ShopifyAPI } = await import('@/lib/shopify-api')
                    const api = new ShopifyAPI()
                    const transactions = await api.getTransactions(order.id)

                    if (transactions && transactions.length > 0) {
                        const specificTx = transactions.find((t: any) =>
                            t.gateway &&
                            t.gateway.toLowerCase() !== 'manual' &&
                            t.gateway.toLowerCase() !== 'custom'
                        )
                        if (specificTx) {
                            newPaymentMethod = specificTx.gateway
                        } else {
                            const jsonString = JSON.stringify(transactions).toLowerCase()
                            if (jsonString.includes('vorkasse')) {
                                newPaymentMethod = 'Vorkasse'
                            } else if (jsonString.includes('rechnung') || jsonString.includes('invoice') || jsonString.includes('bank deposit') || jsonString.includes('überweisung')) {
                                newPaymentMethod = 'Rechnung'
                            }
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }

            // 4. Try payment_details
            if ((newPaymentMethod.toLowerCase() === 'manual' || newPaymentMethod.toLowerCase() === 'custom') && (order as any).payment_details) {
                const details = (order as any).payment_details
                if (details.credit_card_company) {
                    newPaymentMethod = details.credit_card_company
                }
            }

            // If we found a better method, update the invoice
            if (newPaymentMethod !== '-' && newPaymentMethod.toLowerCase() !== 'manual' && newPaymentMethod.toLowerCase() !== 'custom' && newPaymentMethod !== currentMethod) {
                log(`✅ Updating existing invoice ${existingInvoice.invoiceNumber} with better payment method: ${newPaymentMethod}`)
                await prisma.invoice.update({
                    where: { id: existingInvoice.id },
                    data: {
                        settings: {
                            ...(currentSettings || {}),
                            paymentMethod: newPaymentMethod
                        }
                    }
                })
                // Update the returned object locally
                existingInvoice.settings = { ...(currentSettings || {}), paymentMethod: newPaymentMethod }
            }
        }

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

    // Extract payment method from Shopify
    // Extract payment method from Shopify
    let paymentMethod = '-'

    // 1. Try payment_gateway_names first
    if (order.payment_gateway_names && Array.isArray(order.payment_gateway_names)) {
        const gateways = order.payment_gateway_names as string[]
        if (gateways.length > 0) {
            const specificGateways = gateways.filter(g => g.toLowerCase() !== 'manual')
            if (specificGateways.length > 0) {
                paymentMethod = specificGateways[0]
            } else {
                // If only 'manual' is present, default to 'Vorkasse' as per requirements
                paymentMethod = 'Vorkasse'
            }
        }
    }

    // 2. If we didn't find it, or if it's generic 'manual'/'custom', try the legacy 'gateway' field
    // This field often contains the specific name (e.g. "Vorkasse") even if payment_gateway_names is ['manual']
    if (paymentMethod === '-' || paymentMethod.toLowerCase() === 'manual' || paymentMethod.toLowerCase() === 'custom') {
        const legacyGateway = (order as any).gateway
        if (legacyGateway && legacyGateway.toLowerCase() !== 'manual' && legacyGateway.toLowerCase() !== 'custom') {
            paymentMethod = legacyGateway
            log(`✅ Extracted better payment method from legacy gateway: ${paymentMethod}`)
        }
    }

    // If payment method is ambiguous (manual or custom), try to get more info from transactions
    if (paymentMethod.toLowerCase() === 'manual' || paymentMethod.toLowerCase() === 'custom') {
        try {
            // We need to dynamically import ShopifyAPI to avoid circular dependencies if any
            const { ShopifyAPI } = await import('@/lib/shopify-api')
            const api = new ShopifyAPI()
            const transactions = await api.getTransactions(order.id)

            if (transactions && transactions.length > 0) {
                // 1. Check transaction gateway
                const specificTx = transactions.find((t: any) =>
                    t.gateway &&
                    t.gateway.toLowerCase() !== 'manual' &&
                    t.gateway.toLowerCase() !== 'custom'
                )

                if (specificTx) {
                    paymentMethod = specificTx.gateway
                    log(`✅ Refined payment method from transaction gateway: ${paymentMethod}`)
                } else {
                    // 2. Check transaction string for keywords
                    const jsonString = JSON.stringify(transactions).toLowerCase()
                    if (jsonString.includes('vorkasse')) {
                        paymentMethod = 'Vorkasse'
                        log(`✅ Detected 'Vorkasse' in transaction details`)
                    } else if (jsonString.includes('rechnung') || jsonString.includes('invoice') || jsonString.includes('bank deposit') || jsonString.includes('überweisung')) {
                        paymentMethod = 'Rechnung'
                        log(`✅ Detected 'Rechnung' (via Bank Transfer) in transaction details`)
                    }
                }
            }
        } catch (err) {
            log(`⚠️ Failed to fetch transactions for refinement: ${err}`)
        }
    }

    // Final fallback: Check order.payment_details if available (sometimes contains credit_card_company or similar)
    if ((paymentMethod.toLowerCase() === 'manual' || paymentMethod.toLowerCase() === 'custom') && (order as any).payment_details) {
        const details = (order as any).payment_details
        if (details.credit_card_company) {
            paymentMethod = details.credit_card_company
            log(`✅ Extracted payment method from payment_details: ${paymentMethod}`)
        }
    }

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
<<<<<<< HEAD
            status: await (async () => {
                const { isUserBlocked } = await import('@/lib/blocklist')
                const blockCheck = await isUserBlocked(customer.email, organization.id)
                if (blockCheck.blocked) {
                    log(`🚫 BLOCKED USER DETECTED: ${customer.email}. Reason: ${blockCheck.reason}. Setting status to BLOCKED.`)
                    return 'BLOCKED'
                }
                return order.financial_status === 'paid' ? 'PAID' :
                    order.financial_status === 'voided' ? 'CANCELLED' : 'SENT'
            })(),
=======
            status: order.financial_status === 'paid' ? 'PAID' :
                order.financial_status === 'voided' ? 'CANCELLED' : 'SENT',
>>>>>>> 8793b24276c73cd5f91877fa145e212ba99499b9
            settings: {
                paymentMethod: paymentMethod
            },
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

    // 5. Create Additional Income (Buchhaltung)
    // Automatically add to accounting as "Einnahme"
    try {
        await prisma.additionalIncome.create({
            data: {
                organizationId: organization.id,
                date: new Date(order.created_at || Date.now()),
                description: `Shopify Order ${order.name}`,
                amount: totalGross,
                type: 'INCOME'
            }
        })
        log(`✅ Additional Income created for order ${order.name}`)
    } catch (err) {
        log(`⚠️ Failed to create Additional Income for order ${order.name}: ${err}`)
    }

    log(`✅ Invoice created in DB: ${newInvoice.invoiceNumber}`)
    return { ...mapPrismaInvoiceToData(newInvoice), isNew: true }
}

export async function handleOrderUpdate(order: any) {
    // TODO: Implement update logic using Prisma
    return { status: 'skipped' }
}
