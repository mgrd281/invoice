```typescript
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const invoiceId = params.id

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

        // Map database data to the format expected by the template
        const invoiceData = {
            id: invoice.id,
            number: invoice.invoiceNumber,
            date: invoice.issueDate,
            dueDate: invoice.dueDate,
            subtotal: Number(invoice.totalNet),
            taxRate: 19, // Default to 19% if not stored, or calculate
            taxAmount: Number(invoice.totalTax),
            total: Number(invoice.totalGross),
            status: invoice.status,
            customer: {
                name: invoice.customer.name,
                email: invoice.customer.email,
                address: invoice.customer.addressLine1 || '',
                zipCode: invoice.customer.postalCode || '',
                city: invoice.customer.city || '',
                country: invoice.customer.country || 'Deutschland'
            },
            organization: {
                name: invoice.organization.name,
                address: invoice.organization.street || '',
                zipCode: invoice.organization.postalCode || '',
                city: invoice.organization.city || '',
                country: invoice.organization.country || 'Deutschland',
                taxId: invoice.organization.taxId || '',
                bankName: invoice.organization.bankName || '',
                iban: invoice.organization.iban || '',
                bic: invoice.organization.bic || ''
            },
            items: invoice.items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                total: Number(item.totalPrice)
            }))
        }

        // Generate HTML content for the invoice
        const htmlContent = generateInvoiceHTML(invoiceData)

        // Return HTML with inline disposition for viewing
        const response = new NextResponse(htmlContent, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `inline; filename = "${invoiceData.number}.html"`,
            },
        })

        return response

    } catch (error) {
        console.error('Error generating PDF:', error)
        return NextResponse.json(
            { error: 'Failed to generate PDF' },
            { status: 500 }
        )
    }
}

function generateInvoiceHTML(invoice: any): string {
    return `
    < !DOCTYPE html >
        <html lang="de" >
            <head>
            <meta charset="UTF-8" >
                <meta name="viewport" content = "width=device-width, initial-scale=1.0" >
                    <title>Rechnung ${ invoice.number } </title>
                        <style>
        body {
    font - family: Arial, sans - serif;
    max - width: 800px;
    margin: 0 auto;
    padding: 20px;
    line - height: 1.6;
    color: #333;
}
        .header {
    display: flex;
    justify - content: space - between;
    margin - bottom: 40px;
    border - bottom: 2px solid #2563eb;
    padding - bottom: 20px;
}
        .company - info {
    flex: 1;
}
        .invoice - info {
    text - align: right;
    flex: 1;
}
        .invoice - title {
    font - size: 28px;
    font - weight: bold;
    color: #2563eb;
    margin - bottom: 10px;
}
        .addresses {
    display: flex;
    justify - content: space - between;
    margin - bottom: 40px;
}
        .address - block {
    flex: 1;
    margin - right: 20px;
}
        .address - block: last - child {
    margin - right: 0;
}
        .address - title {
    font - weight: bold;
    margin - bottom: 10px;
    color: #374151;
}
        .items - table {
    width: 100 %;
    border - collapse: collapse;
    margin - bottom: 30px;
}
        .items - table th,
        .items - table td {
    border: 1px solid #d1d5db;
    padding: 12px;
    text - align: left;
}
        .items - table th {
    background - color: #f3f4f6;
    font - weight: bold;
}
        .items - table.text - right {
    text - align: right;
}
        .items - table.text - center {
    text - align: center;
}
        .totals {
    margin - left: auto;
    width: 300px;
}
        .totals - row {
    display: flex;
    justify - content: space - between;
    padding: 8px 0;
}
        .totals - row.total {
    border - top: 2px solid #374151;
    font - weight: bold;
    font - size: 18px;
    margin - top: 10px;
    padding - top: 15px;
}
        .bank - details {
    margin - top: 40px;
    padding: 20px;
    background - color: #f9fafb;
    border - radius: 8px;
}
        .bank - title {
    font - weight: bold;
    margin - bottom: 10px;
    color: #374151;
}
        .footer {
    margin - top: 40px;
    text - align: center;
    font - size: 12px;
    color: #6b7280;
    border - top: 1px solid #d1d5db;
    padding - top: 20px;
}
@media print {
            body { margin: 0; }
            .no - print { display: none; }
}
</style>
    </head>
    < body >
    <div class="header" >
        <div class="company-info" >
            <h1>${ invoice.organization.name } </h1>
                <p>
                ${ invoice.organization.address } <br>
    ${ invoice.organization.zipCode } ${ invoice.organization.city } <br>
        ${ invoice.organization.country }
</p>
    < p > <strong>Steuer - ID: </strong> ${invoice.organization.taxId}</p >
        </div>
        < div class="invoice-info" >
            <div class="invoice-title" > RECHNUNG </div>
                < p > <strong>Nummer: </strong> ${invoice.number}</p >
                    <p><strong>Datum: </strong> ${new Date(invoice.date).toLocaleDateString('de-DE')}</p >
                        <p><strong>Fällig am: </strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p >
                            </div>
                            </div>

                            < div class="addresses" >
                                <div class="address-block" >
                                    <div class="address-title" > Rechnungsempfänger: </div>
                                        < p >
                                        <strong>${ invoice.customer.name } </strong><br>
                ${ invoice.customer.address } <br>
    ${ invoice.customer.zipCode } ${ invoice.customer.city } <br>
        ${ invoice.customer.country } <br>
            <br>
            E - Mail: ${ invoice.customer.email }
</p>
    </div>
    </div>

    < table class="items-table" >
        <thead>
        <tr>
        <th>Beschreibung </th>
        < th class="text-center" > Menge </th>
            < th class="text-right" > Einzelpreis </th>
                < th class="text-right" > Gesamt </th>
                    </tr>
                    </thead>
                    <tbody>
            ${
    invoice.items.map((item: any) => `
                <tr>
                    <td>${item.description}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">€${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right">€${item.total.toFixed(2)}</td>
                </tr>
            `).join('')
}
</tbody>
    </table>

    < div class="totals" >
        <div class="totals-row" >
            <span>Zwischensumme: </span>
                <span>€${ invoice.subtotal.toFixed(2) } </span>
                    </div>
                    < div class="totals-row" >
                        <span>MwSt. (${ invoice.taxRate } %): </span>
                            <span>€${ invoice.taxAmount.toFixed(2) } </span>
                                </div>
                                < div class="totals-row total" >
                                    <span>Gesamtsumme: </span>
                                        <span>€${ invoice.total.toFixed(2) } </span>
                                            </div>
                                            </div>

                                            < div class="bank-details" >
                                                <div class="bank-title" > Bankverbindung für Überweisungen: </div>
                                                    < p >
                                                    <strong>Bank: </strong> ${invoice.organization.bankName}<br>
                                                        < strong > IBAN: </strong> ${invoice.organization.iban}<br>
                                                            < strong > BIC: </strong> ${invoice.organization.bic}
                                                                </p>
                                                                < p > <strong>Verwendungszweck: </strong> ${invoice.number}</p >
                                                                    </div>

                                                                    < div class="footer" >
                                                                        <p>Vielen Dank für Ihr Vertrauen! </p>
                                                                            < p > Diese Rechnung wurde automatisch erstellt und ist ohne Unterschrift gültig.</p>
                                                                                </div>
                                                                                </body>
                                                                                </html>
                                                                                    `
}
