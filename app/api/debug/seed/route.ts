
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Get Organization
        const organization = await prisma.organization.findFirst();
        if (!organization) {
            return NextResponse.json({ error: 'No organization found. Please set up the app first.' }, { status: 400 });
        }

        // 2. Get or Create Customer
        let customer = await prisma.customer.findFirst({
            where: { organizationId: organization.id }
        });

        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    organizationId: organization.id,
                    name: 'Test Customer',
                    address: 'Test Street 1',
                    zipCode: '12345',
                    city: 'Test City',
                    country: 'DE'
                }
            });
        }

        // 3. Get or Create Template
        let template = await prisma.invoiceTemplate.findFirst({
            where: { organizationId: organization.id }
        });

        if (!template) {
            template = await prisma.invoiceTemplate.create({
                data: {
                    organizationId: organization.id,
                    name: 'Default',
                    htmlContent: '',
                    cssContent: ''
                }
            });
        }

        // 4. Create Invoices with different dates
        const now = new Date();

        const dates = [
            { daysAgo: 0, label: 'Today' },
            { daysAgo: 5, label: '5 Days Ago' },
            { daysAgo: 15, label: '15 Days Ago' },
            { daysAgo: 45, label: '45 Days Ago' },
            { daysAgo: 400, label: '400 Days Ago (Last Year)' }
        ];

        const createdInvoices = [];

        for (const d of dates) {
            const date = new Date(now);
            date.setDate(date.getDate() - d.daysAgo);

            const inv = await prisma.invoice.create({
                data: {
                    organizationId: organization.id,
                    customerId: customer.id,
                    templateId: template.id,
                    invoiceNumber: `TEST-${d.daysAgo}D-${Date.now()}`,
                    issueDate: date,
                    dueDate: new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000),
                    totalNet: 100,
                    totalGross: 119,
                    totalTax: 19,
                    status: 'PAID',
                    items: {
                        create: {
                            description: `Test Item (${d.label})`,
                            quantity: 1,
                            unitPrice: 100,
                            netAmount: 100,
                            grossAmount: 119,
                            taxAmount: 19,
                            taxRate: {
                                connectOrCreate: {
                                    where: { organizationId_name: { organizationId: organization.id, name: '19%' } },
                                    create: { organizationId: organization.id, name: '19%', rate: 0.19 }
                                }
                            }
                        }
                    }
                }
            });
            createdInvoices.push(inv);
        }

        return NextResponse.json({
            success: true,
            message: `Created ${createdInvoices.length} test invoices across different dates.`,
            invoices: createdInvoices.map(i => ({ id: i.id, date: i.issueDate, number: i.invoiceNumber }))
        });

    } catch (error) {
        console.error('Seeding failed:', error);
        return NextResponse.json({ error: 'Seeding failed', details: String(error) }, { status: 500 });
    }
}

