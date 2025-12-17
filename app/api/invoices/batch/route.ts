import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { ensureOrganization, ensureTaxRate, ensureDefaultTemplate } from '@/lib/db-operations'
import { DocumentStatus } from '@/lib/document-types'
import { logInvoiceEvent } from '@/lib/invoice-history'

export const dynamic = 'force-dynamic'

function mapStatusToPrisma(status: string): 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' {
    switch (status) {
        case DocumentStatus.BEZAHLT: return 'PAID'
        case DocumentStatus.OFFEN: return 'SENT'
        case DocumentStatus.UEBERFAELLIG: return 'OVERDUE'
        case DocumentStatus.STORNIERT: return 'CANCELLED'
        case DocumentStatus.GUTSCHRIFT: return 'PAID'
        default: return 'SENT'
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request)
        if ('error' in authResult) {
            return authResult.error
        }

        const { user } = authResult

        // Get organization ID from user or fallback to default
        const userOrg = await prisma.organization.findFirst({
            where: { users: { some: { id: user.id } } }
        })

        const org = userOrg || await prisma.organization.findFirst() || await ensureOrganization()
        const body = await request.json()

        // Handle Bulk Status Update
        if (body.action === 'updateStatus') {
            const { ids, status } = body

            if (!ids || !Array.isArray(ids) || !status) {
                return NextResponse.json({ error: 'Invalid data for status update' }, { status: 400 })
            }

            const prismaStatus = mapStatusToPrisma(status)

            await prisma.invoice.updateMany({
                where: {
                    id: { in: ids },
                    organizationId: org.id
                },
                data: {
                    status: prismaStatus
                }
            })

            // Log events
            await Promise.all(ids.map((id: string) =>
                logInvoiceEvent(id, 'STATUS_CHANGE', `Status geändert zu ${status}`)
            ))

            return NextResponse.json({
                success: true,
                message: `Status updated to ${status} for ${ids.length} invoices`
            })
        }

        // Handle Batch Import (Existing Logic)
        const { invoices, importTarget = 'invoices', accountingType = 'income' } = body

        if (!invoices || !Array.isArray(invoices)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        let createdCount = 0
        const errors = []

        // Ensure tax rate (assuming 19% for now as per upload logic)
        const taxRate = await ensureTaxRate(org.id, 19)
        const template = await ensureDefaultTemplate(org.id)

        for (const invoice of invoices) {
            try {
                // 1. Handle Invoice Creation
                if (importTarget === 'invoices' || importTarget === 'both') {
                    // 1. Find or Create Customer
                    let customer = null
                    if (invoice.customerEmail) {
                        customer = await prisma.customer.findFirst({
                            where: { organizationId: org.id, email: invoice.customerEmail }
                        })
                    }

                    if (customer) {
                        // Update customer info to keep it fresh
                        customer = await prisma.customer.update({
                            where: { id: customer.id },
                            data: {
                                name: invoice.customerName,
                                address: invoice.customerAddress,
                                city: invoice.customerCity,
                                zipCode: invoice.customerZip,
                                country: invoice.customerCountry,
                            }
                        })
                    } else {
                        customer = await prisma.customer.create({
                            data: {
                                organizationId: org.id,
                                name: invoice.customerName,
                                email: invoice.customerEmail,
                                address: invoice.customerAddress,
                                city: invoice.customerCity,
                                zipCode: invoice.customerZip,
                                country: invoice.customerCountry,
                            }
                        })
                    }

                    // 2. Create Invoice
                    // Check for existing invoice number
                    const existingInvoice = await prisma.invoice.findFirst({
                        where: { organizationId: org.id, invoiceNumber: invoice.number }
                    })

                    if (!existingInvoice) {
                        const newInvoice = await prisma.invoice.create({
                            data: {
                                organizationId: org.id,
                                customerId: customer.id,
                                templateId: template.id,
                                invoiceNumber: invoice.number,
                                issueDate: new Date(invoice.date),
                                dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(invoice.date),
                                status: mapStatusToPrisma(invoice.status),
                                totalNet: invoice.subtotal,
                                totalTax: invoice.taxAmount,
                                totalGross: invoice.total,
                                documentKind: invoice.document_kind,
                                orderNumber: invoice.orderNumber || invoice.shopifyOrderNumber,
                                paymentMethod: invoice.paymentMethod,
                                settings: {
                                    paymentMethod: invoice.paymentMethod || '-'
                                },
                                items: {
                                    create: invoice.items.map((item: any) => ({
                                        description: item.description,
                                        quantity: item.quantity,
                                        unitPrice: item.unitPrice,
                                        taxRateId: taxRate.id,
                                        netAmount: item.netAmount,
                                        grossAmount: item.grossAmount,
                                        taxAmount: item.taxAmount,
                                        ean: item.ean
                                    }))
                                }
                            }
                        })
                        await logInvoiceEvent(newInvoice.id, 'CREATED', 'Rechnung importiert')
                    } else {
                        console.log(`Invoice ${invoice.number} already exists. Skipping invoice creation.`)
                    }
                }

                // 2. Handle Accounting Creation
                if (importTarget === 'accounting' || importTarget === 'both') {
                    if (accountingType === 'expense') {
                        // Create Expense
                        await prisma.expense.create({
                            data: {
                                organizationId: org.id,
                                expenseNumber: invoice.number || `EXP-${Date.now()}`,
                                date: new Date(invoice.date),
                                category: 'IMPORT', // Or allow user to select?
                                description: invoice.items?.[0]?.description || 'Importierte Ausgabe',
                                supplier: invoice.customerName || 'Unbekannt',
                                netAmount: invoice.subtotal,
                                taxRate: 19, // Default
                                taxAmount: invoice.taxAmount,
                                totalAmount: invoice.total
                            }
                        })
                    } else {
                        // Create Additional Income (Income or Other)
                        const baseDescription = invoice.items?.[0]?.description || (accountingType === 'income' ? 'Importierte Einnahme' : 'Sonstiges')
                        // Prepend order number if available to preserve it
                        const description = invoice.number ? `[Order #${invoice.number}] ${baseDescription}` : baseDescription

                        await prisma.additionalIncome.create({
                            data: {
                                organizationId: org.id,
                                date: new Date(invoice.date),
                                description: description,
                                amount: invoice.total,
                                type: accountingType === 'income' ? 'INCOME' : 'OTHER'
                            }
                        })
                    }
                }

                createdCount++
            } catch (err) {
                console.error(`Error saving record for ${invoice.number}:`, err)
                errors.push(invoice.number)
            }
        }

        return NextResponse.json({
            success: true,
            count: createdCount,
            errors: errors.length > 0 ? errors : undefined,
            debug: { organizationId: org.id }
        })

    } catch (error) {
        console.error('Batch create error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
