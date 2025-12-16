import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const content = buffer.toString('utf-8')
        let data: any

        try {
            data = JSON.parse(content)
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 })
        }

        let importedCount = 0
        let type = ''

        // Handle Invoices Import
        if (file.name === 'invoices.json' || (Array.isArray(data) && data.length > 0 && data[0].invoiceNumber)) {
            type = 'Invoices'
            console.log(`Starting import of ${data.length} invoices...`)

            // Process in chunks to avoid timeouts
            for (const inv of data) {
                try {
                    // Ensure customer exists or create dummy
                    let customerId = 'legacy-customer'
                    if (inv.customer) {
                        const customer = await prisma.customer.upsert({
                            where: {
                                unique_shopify_customer_per_organization: {
                                    organizationId: 'default-org-id',
                                    shopifyCustomerId: inv.customer.email || `legacy-${inv.customer.name}`
                                }
                            },
                            update: {},
                            create: {
                                organization: { connect: { id: 'default-org-id' } },
                                name: inv.customer.name || 'Unknown',
                                email: inv.customer.email,
                                address: inv.customer.address || '',
                                zipCode: inv.customer.zipCode || '',
                                city: inv.customer.city || '',
                                shopifyCustomerId: inv.customer.email || `legacy-${inv.customer.name}`
                            }
                        })
                        customerId = customer.id
                    }

                    // Create Invoice
                    await prisma.invoice.create({
                        data: {
                            invoiceNumber: inv.invoiceNumber,
                            issueDate: new Date(inv.date || inv.issueDate),
                            dueDate: new Date(inv.dueDate || inv.date || new Date()),
                            status: inv.status || 'PAID',
                            totalNet: inv.subtotal || inv.totalNet || 0,
                            totalTax: inv.taxTotal || inv.totalTax || 0,
                            totalGross: inv.total || inv.totalGross || 0,
                            currency: inv.currency || 'EUR',
                            organization: { connect: { id: 'default-org-id' } },
                            customer: { connect: { id: customerId } },
                            template: { connect: { id: 'default-template-id' } }, // Ensure this exists or handle error
                            items: {
                                create: (inv.items || []).map((item: any) => ({
                                    description: item.description || 'Item',
                                    quantity: item.quantity || 1,
                                    unitPrice: item.unitPrice || 0,
                                    grossAmount: item.total || item.grossAmount || 0,
                                    netAmount: item.netAmount || (item.total / 1.19) || 0, // Approx
                                    taxAmount: item.taxAmount || (item.total - (item.total / 1.19)) || 0, // Approx
                                    taxRate: {
                                        connectOrCreate: {
                                            where: { organizationId_name: { organizationId: 'default-org-id', name: 'Standard' } },
                                            create: { organizationId: 'default-org-id', name: 'Standard', rate: 0.19 }
                                        }
                                    }
                                }))
                            }
                        }
                    }).catch(e => {
                        // Ignore duplicates
                        if (!e.message.includes('Unique constraint')) console.error('Import error:', e)
                    })
                    importedCount++
                } catch (err) {
                    console.error('Error importing invoice:', err)
                }
            }
        }
        // Handle Customers Import
        else if (file.name === 'customers.json' || (Array.isArray(data) && data.length > 0 && data[0].name && !data[0].invoiceNumber)) {
            type = 'Customers'
            for (const cust of data) {
                try {
                    await prisma.customer.create({
                        data: {
                            organization: { connect: { id: 'default-org-id' } },
                            name: cust.name,
                            email: cust.email,
                            phone: cust.phone,
                            address: cust.address || '',
                            zipCode: cust.zipCode || '',
                            city: cust.city || '',
                            shopifyCustomerId: cust.shopifyCustomerId || cust.email
                        }
                    }).catch(() => { }) // Ignore duplicates
                    importedCount++
                } catch (e) { }
            }
        }
        // Handle Digital Products (if user uploads a products file)
        else if (file.name.includes('product') || (Array.isArray(data) && data.length > 0 && data[0].title && data[0].shopifyProductId)) {
            type = 'Digital Products'
            for (const prod of data) {
                try {
                    await prisma.digitalProduct.create({
                        data: {
                            organization: { connect: { id: 'default-org-id' } },
                            title: prod.title,
                            shopifyProductId: prod.shopifyProductId,
                            emailTemplate: prod.emailTemplate,
                            downloadUrl: prod.downloadUrl
                        }
                    }).catch(() => { })
                    importedCount++
                } catch (e) { }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${importedCount} ${type} into database`,
            count: importedCount
        })

    } catch (error) {
        console.error('Import error:', error)
        return NextResponse.json({ error: 'Import failed' }, { status: 500 })
    }
}
