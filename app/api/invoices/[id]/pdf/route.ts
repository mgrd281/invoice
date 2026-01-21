import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateArizonaPDF } from '@/lib/arizona-pdf-generator'

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: any }
) {
    try {
        const { id: invoiceId } = await params

        // Fetch real invoice data
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                customer: true,
                items: true,
                organization: true
            }
        })

        if (!invoice) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            )
        }

        // Map database data to the format expected by generateArizonaPDF
        // Note: generateArizonaPDF uses global companySettings for the sender info,
        // ignoring invoice.organization in the current implementation, but we pass it anyway.
        const invoiceData = {
            id: invoice.id,
            number: invoice.invoiceNumber,
            date: invoice.issueDate.toISOString(),
            dueDate: invoice.dueDate.toISOString(),
            subtotal: Number(invoice.totalNet),
            taxRate: 19, // Default to 19% if not stored
            taxAmount: Number(invoice.totalTax),
            total: Number(invoice.totalGross),
            status: invoice.status,
            customer: {
                name: invoice.customer.name,
                email: invoice.customer.email || '',
                address: invoice.customer.address,
                zipCode: invoice.customer.zipCode.replace(/^'/, ''),
                city: invoice.customer.city,
                country: invoice.customer.country || 'Deutschland'
            },
            organization: {
                name: invoice.organization.name,
                address: invoice.organization.address,
                zipCode: invoice.organization.zipCode,
                city: invoice.organization.city,
                country: invoice.organization.country || 'Deutschland',
                taxId: invoice.organization.taxId || '',
                bankName: invoice.organization.bankName || '',
                iban: invoice.organization.iban || '',
                bic: invoice.organization.bic || ''
            },
            items: invoice.items.map(item => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                total: Number(item.netAmount), // Use netAmount for item total in the PDF generator logic
                ean: item.ean || undefined
            }))
        }

        // Generate PDF using the Arizona template
        const doc = await generateArizonaPDF(invoiceData as any)
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

        // Return PDF with inline disposition for viewing
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${invoiceData.number}.pdf"`,
            },
        })

    } catch (error) {
        console.error('Error generating PDF:', error)
        return NextResponse.json(
            { error: 'Failed to generate PDF' },
            { status: 500 }
        )
    }
}


