import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText, Trash2, Filter, Download, CheckCircle, AlertTriangle, Pencil } from 'lucide-react'

interface Receipt {
    id: string
    date: string
    filename: string
    description: string
    category: string
    url: string
    amount?: number
}

interface ReceiptsListProps {
    receipts: Receipt[]
    selectedReceipts: string[]
    setSelectedReceipts: React.Dispatch<React.SetStateAction<string[]>>
    onDeleteSelected: () => void
    onDelete: (id: string) => void
    onEdit: (receipt: Receipt) => void
}

export function ReceiptsList({
    receipts,
    selectedReceipts,
    setSelectedReceipts,
    onDeleteSelected,
    onDelete,
    onEdit
}: ReceiptsListProps) {

    const toggleSelectAll = () => {
        if (selectedReceipts.length === receipts.length) {
            setSelectedReceipts([])
        } else {
            setSelectedReceipts(receipts.map(r => r.id))
        }
    }

    const toggleSelectOne = (id: string) => {
        if (selectedReceipts.includes(id)) {
            setSelectedReceipts(prev => prev.filter(i => i !== id))
        } else {
            setSelectedReceipts(prev => [...prev, id])
        }
    }

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Beleg-Eingang</CardTitle>
                    <CardDescription>Zuletzt hochgeladene Dokumente</CardDescription>
                </div>
                <div className="flex space-x-2">
                    {selectedReceipts.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={onDeleteSelected}
                            className="animate-in fade-in zoom-in"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {selectedReceipts.length} löschen
                        </Button>
                    )}
                    <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={receipts.length > 0 && selectedReceipts.length === receipts.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Datei</TableHead>
                            <TableHead>Datum</TableHead>
                            <TableHead>Kategorie</TableHead>
                            <TableHead className="text-right">Betrag</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Aktion</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {receipts.map((receipt) => (
                            <TableRow key={receipt.id}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedReceipts.includes(receipt.id)}
                                        onCheckedChange={() => toggleSelectOne(receipt.id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center space-x-2">
                                        <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                                            <FileText className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="truncate max-w-[150px] font-medium" title={receipt.description || receipt.filename}>
                                                {receipt.description || receipt.filename}
                                            </span>
                                            {receipt.description && receipt.description !== receipt.filename && (
                                                <span className="text-xs text-gray-500 truncate max-w-[150px]">{receipt.filename}</span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{new Date(receipt.date).toLocaleDateString('de-DE')}</TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${receipt.category === 'INCOME' ? 'bg-green-100 text-green-700' :
                                        receipt.category === 'EXPENSE' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {receipt.category === 'INCOME' ? 'Einnahme' :
                                            receipt.category === 'EXPENSE' ? 'Ausgabe' : 'Sonstiges'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {receipt.amount ? `€${parseFloat(receipt.amount.toString()).toFixed(2)}` : '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                    {receipt.amount ? (
                                        <div className="flex items-center justify-center text-green-600" title="Automatisch erkannt">
                                            <CheckCircle className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center text-orange-500" title="Bitte prüfen">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => onEdit(receipt)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => onDelete(receipt.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {receipts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                            <FileText className="h-6 w-6 text-gray-300" />
                                        </div>
                                        <p>Keine Belege vorhanden</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
