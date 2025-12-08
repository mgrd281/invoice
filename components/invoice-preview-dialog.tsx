'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ZoomIn, ZoomOut, X, Upload, ChevronDown, ChevronRight, Check } from 'lucide-react'

interface InvoicePreviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    data: {
        customer: any
        invoiceData: any
        items: any[]
        settings: any
    }
}

export function InvoicePreviewDialog({ open, onOpenChange, data }: InvoicePreviewDialogProps) {
    const [zoom, setZoom] = useState(100)
    const [logoSize, setLogoSize] = useState(50)
    const [selectedColor, setSelectedColor] = useState('#1e293b') // Default slate-900
    const [showSettings, setShowSettings] = useState({
        qrCode: false,
        epcQrCode: false,
        customerNumber: true,
        contactPerson: true,
        vatPerItem: false,
        articleNumber: false,
        foldMarks: true
    })

    // Mock colors
    const colors = [
        '#1e293b', // Slate
        '#ef4444', // Red
        '#f97316', // Orange
        '#eab308', // Yellow
        '#22c55e', // Green
        '#06b6d4', // Cyan
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#d946ef', // Fuchsia
    ]

    const { customer, invoiceData, items, settings } = data

    // Calculate totals
    const netTotal = items.reduce((sum: number, item: any) => sum + item.total, 0)
    const vatTotal = items.reduce((sum: number, item: any) => sum + (item.total * (item.vat / 100)), 0)
    const grossTotal = netTotal + vatTotal

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] h-[95vh] p-0 gap-0 flex flex-col md:flex-row overflow-hidden bg-gray-100">

                {/* Left: Preview Area */}
                <div className="flex-1 relative overflow-hidden flex flex-col">
                    {/* Toolbar */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur shadow-sm border rounded-full px-4 py-2 flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(50, z - 10))}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(150, z + 10))}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Scrollable Canvas Container */}
                    <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
                        <div
                            className="bg-white shadow-2xl transition-transform origin-top"
                            style={{
                                width: '210mm',
                                minHeight: '297mm',
                                transform: `scale(${zoom / 100})`,
                                marginBottom: '50px'
                            }}
                        >
                            {/* INVOICE CONTENT */}
                            <div className="p-[20mm] h-full flex flex-col relative">

                                {/* Fold Marks */}
                                {showSettings.foldMarks && (
                                    <>
                                        <div className="absolute left-0 top-[105mm] w-[5mm] border-t border-black"></div>
                                        <div className="absolute left-0 top-[210mm] w-[5mm] border-t border-black"></div>
                                        <div className="absolute left-[10mm] top-[50%] h-[5mm] border-l border-black hidden"></div> {/* Punch mark example */}
                                    </>
                                )}

                                {/* Header / Logo */}
                                <div className="flex justify-between items-start mb-12">
                                    <div className="text-xs text-gray-400 underline decoration-gray-300 underline-offset-4 mb-2">
                                        {/* Sender line above address */}
                                        Ihr Unternehmen • Musterstraße 1 • 12345 Musterstadt
                                    </div>
                                    <div className="w-1/3 flex justify-end">
                                        {/* Logo Placeholder */}
                                        <div
                                            className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs"
                                            style={{ width: `${logoSize * 2}px`, height: `${logoSize}px` }}
                                        >
                                            Logo
                                        </div>
                                    </div>
                                </div>

                                {/* Address Block */}
                                <div className="mb-16 text-sm leading-relaxed">
                                    <div className="font-bold">{customer.companyName}</div>
                                    {customer.type === 'person' && <div>{customer.name}</div>}
                                    <div>{customer.address}</div>
                                    <div>{customer.zipCode} {customer.city}</div>
                                    <div>{customer.country}</div>
                                </div>

                                {/* Info Block (Right side) */}
                                <div className="flex justify-end mb-8">
                                    <div className="w-1/2 grid grid-cols-2 gap-y-1 text-sm">
                                        <div className="text-gray-500">Rechnungs-Nr.</div>
                                        <div className="text-right font-medium">{invoiceData.invoiceNumber}</div>

                                        <div className="text-gray-500">Rechnungsdatum</div>
                                        <div className="text-right">{new Date(invoiceData.date).toLocaleDateString('de-DE')}</div>

                                        <div className="text-gray-500">Lieferdatum</div>
                                        <div className="text-right">{new Date(invoiceData.deliveryDate).toLocaleDateString('de-DE')}</div>

                                        {showSettings.customerNumber && (
                                            <>
                                                <div className="text-gray-500">Kundennummer</div>
                                                <div className="text-right">KD-{(customer.name || '000').substring(0, 3).toUpperCase()}</div>
                                            </>
                                        )}

                                        {showSettings.contactPerson && settings.internalContact && (
                                            <>
                                                <div className="text-gray-500">Ansprechpartner</div>
                                                <div className="text-right">{settings.internalContact}</div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Subject & Intro */}
                                <div className="mb-8">
                                    <h1 className="text-xl font-bold mb-4" style={{ color: selectedColor }}>
                                        {invoiceData.headerSubject || `Rechnung Nr. ${invoiceData.invoiceNumber}`}
                                    </h1>
                                    <p className="text-sm whitespace-pre-wrap">{invoiceData.headerText}</p>
                                </div>

                                {/* Items Table */}
                                <div className="mb-8">
                                    <table className="w-full text-sm">
                                        <thead className="border-b-2 border-gray-100">
                                            <tr>
                                                {showSettings.articleNumber && <th className="py-2 text-left font-semibold text-gray-600">Art-Nr.</th>}
                                                <th className="py-2 text-left font-semibold text-gray-600">Pos.</th>
                                                <th className="py-2 text-left font-semibold text-gray-600">Beschreibung</th>
                                                <th className="py-2 text-right font-semibold text-gray-600">Menge</th>
                                                <th className="py-2 text-right font-semibold text-gray-600">Preis</th>
                                                {showSettings.vatPerItem && <th className="py-2 text-right font-semibold text-gray-600">USt.</th>}
                                                <th className="py-2 text-right font-semibold text-gray-600">Gesamt</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {items.map((item, index) => (
                                                <tr key={item.id || index}>
                                                    {showSettings.articleNumber && <td className="py-3 text-gray-500">A-{index + 100}</td>}
                                                    <td className="py-3 text-gray-500">{index + 1}</td>
                                                    <td className="py-3">
                                                        <div className="font-medium text-gray-900">{item.description}</div>
                                                    </td>
                                                    <td className="py-3 text-right">{item.quantity} {item.unit}</td>
                                                    <td className="py-3 text-right">{Number(item.unitPrice).toFixed(2)} €</td>
                                                    {showSettings.vatPerItem && <td className="py-3 text-right">{item.vat}%</td>}
                                                    <td className="py-3 text-right font-medium">{Number(item.total).toFixed(2)} €</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="flex justify-end mb-12">
                                    <div className="w-1/2 border-t border-gray-200 pt-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Netto</span>
                                            <span>{netTotal.toFixed(2)} €</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Umsatzsteuer 19%</span>
                                            <span>{vatTotal.toFixed(2)} €</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2" style={{ color: selectedColor }}>
                                            <span>Gesamtbetrag</span>
                                            <span>{grossTotal.toFixed(2)} €</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Text */}
                                <div className="mt-auto text-sm text-gray-600 whitespace-pre-wrap">
                                    {invoiceData.footerText}
                                </div>

                                {/* Footer Info (Bank, etc) */}
                                <div className="mt-8 pt-8 border-t border-gray-200 grid grid-cols-3 gap-4 text-[10px] text-gray-500">
                                    <div>
                                        <div className="font-bold text-gray-700 mb-1">Anschrift</div>
                                        Ihr Unternehmen<br />
                                        Musterstraße 1<br />
                                        12345 Musterstadt
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-700 mb-1">Kontakt</div>
                                        Telefon: 0123 456789<br />
                                        Email: info@example.com<br />
                                        Web: www.example.com
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-700 mb-1">Bankverbindung</div>
                                        IBAN: DE12 3456 7890 1234 56<br />
                                        BIC: GENODED1DEF<br />
                                        Bank: Musterbank
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Settings Sidebar */}
                <div className="w-full md:w-[380px] bg-white border-l shadow-xl z-20 overflow-y-auto h-full flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 className="font-semibold text-lg">Vorschau</h2>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="p-6 space-y-8">

                        {/* Logo Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-medium">Dein Firmenlogo</Label>
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-100 transition-colors cursor-pointer">
                                <Button variant="outline" className="mb-2 bg-white">
                                    Logo hochladen
                                </Button>
                                <p className="text-xs text-gray-500">
                                    oder hier hineinziehen<br />
                                    .jpg, .jpeg, .png (max. 10MB)
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500 w-12">Größe</span>
                                <div className="flex-1 flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setLogoSize(s => Math.max(10, s - 10))}>-</Button>
                                    <span className="text-sm flex-1 text-center">{logoSize}%</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setLogoSize(s => Math.min(100, s + 10))}>+</Button>
                                </div>
                            </div>
                        </div>

                        {/* Color Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-medium">Farbe</Label>
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {colors.map(color => (
                                    <button
                                        key={color}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setSelectedColor(color)}
                                    />
                                ))}
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600 cursor-pointer border-2 border-transparent hover:scale-105" />
                            </div>
                        </div>

                        {/* Layout Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-medium">Layout auswählen</Label>
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="aspect-[3/4] border rounded-lg p-2 hover:border-blue-500 cursor-pointer transition-colors bg-gray-50 flex flex-col gap-1">
                                        <div className="h-2 w-full bg-gray-200 rounded-sm" />
                                        <div className="h-1 w-2/3 bg-gray-200 rounded-sm" />
                                        <div className="mt-2 space-y-1">
                                            <div className="h-0.5 w-full bg-gray-200" />
                                            <div className="h-0.5 w-full bg-gray-200" />
                                            <div className="h-0.5 w-full bg-gray-200" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="link" className="text-blue-600 p-0 h-auto">Alle anzeigen</Button>
                        </div>

                        {/* Further Settings */}
                        <div className="space-y-6 pt-4 border-t">
                            <div className="flex justify-between items-center cursor-pointer">
                                <Label className="font-medium cursor-pointer">Weitere Einstellungen</Label>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Sprache</Label>
                                    <Select defaultValue="de">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="de">Deutsch</SelectItem>
                                            <SelectItem value="en">Englisch</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Briefpapier</Label>
                                    <Select defaultValue="none">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Ohne Briefpapier</SelectItem>
                                            <SelectItem value="uploaded">Mein Briefpapier</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="qr-code" className="text-gray-700">QR-Code anzeigen</Label>
                                        <Switch
                                            id="qr-code"
                                            checked={showSettings.qrCode}
                                            onCheckedChange={(c) => setShowSettings(s => ({ ...s, qrCode: c }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="epc-qr" className="text-gray-700">EPC-QR-Code (GiroCode)</Label>
                                        <Switch
                                            id="epc-qr"
                                            checked={showSettings.epcQrCode}
                                            onCheckedChange={(c) => setShowSettings(s => ({ ...s, epcQrCode: c }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="cust-num" className="text-gray-700">Kundennummer</Label>
                                        <Switch
                                            id="cust-num"
                                            checked={showSettings.customerNumber}
                                            onCheckedChange={(c) => setShowSettings(s => ({ ...s, customerNumber: c }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="contact" className="text-gray-700">Kontaktperson</Label>
                                        <Switch
                                            id="contact"
                                            checked={showSettings.contactPerson}
                                            onCheckedChange={(c) => setShowSettings(s => ({ ...s, contactPerson: c }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="vat-item" className="text-gray-700">USt. pro Position</Label>
                                        <Switch
                                            id="vat-item"
                                            checked={showSettings.vatPerItem}
                                            onCheckedChange={(c) => setShowSettings(s => ({ ...s, vatPerItem: c }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="art-num" className="text-gray-700">Artikelnummer</Label>
                                        <Switch
                                            id="art-num"
                                            checked={showSettings.articleNumber}
                                            onCheckedChange={(c) => setShowSettings(s => ({ ...s, articleNumber: c }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="fold-marks" className="text-gray-700">Falz- und Lochmarken</Label>
                                        <Switch
                                            id="fold-marks"
                                            checked={showSettings.foldMarks}
                                            onCheckedChange={(c) => setShowSettings(s => ({ ...s, foldMarks: c }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
