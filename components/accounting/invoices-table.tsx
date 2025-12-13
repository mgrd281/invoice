import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AccountingInvoice, getInvoiceStatusLabel, InvoiceStatus } from '@/lib/accounting-types'

interface InvoicesTableProps {
    invoices: AccountingInvoice[]
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
    const getStatusColor = (status: InvoiceStatus) => {
        const colors = {
            'offen': 'bg-blue-100 text-blue-800',
            'bezahlt': 'bg-green-100 text-green-800',
            'erstattet': 'bg-purple-100 text-purple-800',
            'storniert': 'bg-red-100 text-red-800',
            'überfällig': 'bg-orange-100 text-orange-800'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Rechnungen</CardTitle>
                <CardDescription>
                    Alle Rechnungen im gewählten Zeitraum
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rechnungsnr.</TableHead>
                            <TableHead>Kunde</TableHead>
                            <TableHead>Datum</TableHead>
                            <TableHead>Fällig</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Netto</TableHead>
                            <TableHead className="text-right">MwSt</TableHead>
                            <TableHead className="text-right">Brutto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                <TableCell>{invoice.customerName}</TableCell>
                                <TableCell>{new Date(invoice.date).toLocaleDateString('de-DE')}</TableCell>
                                <TableCell>{new Date(invoice.dueDate).toLocaleDateString('de-DE')}</TableCell>
                                <TableCell>
                                    <Badge className={getStatusColor(invoice.status)}>
                                        {getInvoiceStatusLabel(invoice.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">€{invoice.subtotal.toFixed(2)}</TableCell>
                                <TableCell className="text-right">€{invoice.taxAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">€{invoice.totalAmount.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                        {invoices.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                    Keine Rechnungen im gewählten Zeitraum gefunden
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
