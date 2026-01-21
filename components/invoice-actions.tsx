'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InvoiceType, ExtendedInvoice } from '@/lib/invoice-types'
import { XCircle, RotateCcw } from 'lucide-react'

interface InvoiceActionsProps {
  invoice: ExtendedInvoice
  onInvoiceUpdated: () => void
}

export function InvoiceActions({ invoice, onInvoiceUpdated }: InvoiceActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundItems, setRefundItems] = useState<Record<string, number>>({})

  // Prüfen ob Aktionen verfügbar sind
  const canCancel = invoice.type === InvoiceType.REGULAR && invoice.status !== 'Storniert'
  const canRefund = invoice.type === InvoiceType.REGULAR && invoice.status !== 'Storniert'

  const handleCancelInvoice = async () => {
    if (!cancelReason.trim()) {
      alert('Bitte geben Sie einen Grund für die Stornierung an')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelReason,
          processingNotes: `Storniert am ${new Date().toLocaleDateString('de-DE')}`
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.message}`)
        setShowCancelDialog(false)
        setCancelReason('')
        onInvoiceUpdated()
      } else {
        alert(`❌ Fehler: ${result.error}`)
      }
    } catch (error) {
      console.error('Fehler beim Stornieren:', error)
      alert('❌ Fehler beim Stornieren der Rechnung')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRefundInvoice = async () => {
    const hasRefundItems = Object.values(refundItems).some(qty => qty > 0)
    if (!hasRefundItems) {
      alert('Bitte wählen Sie mindestens eine Position für die Rückerstattung aus')
      return
    }

    if (!refundReason.trim()) {
      alert('Bitte geben Sie einen Grund für die Rückerstattung an')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refundItems,
          reason: refundReason,
          refundMethod: 'bank_transfer',
          processingNotes: `Rückerstattung am ${new Date().toLocaleDateString('de-DE')}`
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.message}\nRückerstattungsbetrag: €${result.refundAmount.toFixed(2)}`)
        setShowRefundDialog(false)
        setRefundReason('')
        setRefundItems({})
        onInvoiceUpdated()
      } else {
        alert(`❌ Fehler: ${result.error}`)
      }
    } catch (error) {
      console.error('Fehler bei der Rückerstattung:', error)
      alert('❌ Fehler bei der Rückerstattung')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex gap-2">
      {/* Storno Button */}
      {canCancel && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowCancelDialog(true)}
          disabled={isProcessing}
          title="Stornieren"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}

      {/* Rückerstattung Button */}
      {canRefund && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRefundDialog(true)}
          disabled={isProcessing}
          title="Rückerstattung"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}

      {/* Storno Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Rechnung stornieren</h3>
            <p className="text-sm text-gray-600 mb-4">
              Möchten Sie die Rechnung <strong>{invoice.number}</strong> wirklich stornieren?
              Dies erstellt eine Stornorechnung und markiert die ursprüngliche Rechnung als storniert.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Grund für die Stornierung *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="z.B. Stornierung auf Kundenwunsch, Fehlerhafte Bestellung..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={isProcessing}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelInvoice}
                disabled={isProcessing || !cancelReason.trim()}
              >
                {isProcessing ? 'Storniere...' : 'Stornieren'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rückerstattung Dialog */}
      {showRefundDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Rückerstattung erstellen</h3>
            <p className="text-sm text-gray-600 mb-4">
              Wählen Sie die Positionen und Mengen für die Rückerstattung der Rechnung <strong>{invoice.number}</strong>:
            </p>

            {/* Rechnungspositionen */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Rechnungspositionen:</h4>
              <div className="space-y-2">
                {invoice.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{item.description}</div>
                      <div className="text-sm text-gray-600">
                        Menge: {item.quantity} × €{item.unitPrice.toFixed(2)} = €{item.total.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Rückerstatten:</label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={refundItems[item.id] || 0}
                        onChange={(e) => setRefundItems(prev => ({
                          ...prev,
                          [item.id]: parseInt(e.target.value) || 0
                        }))}
                        className="w-16 p-1 border border-gray-300 rounded text-center"
                        title={`Rückerstattungsmenge für ${item.description}`}
                        aria-label={`Rückerstattungsmenge für ${item.description}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Grund für die Rückerstattung *
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="z.B. Defekte Ware, Teilstornierung, Kundenreklamation..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRefundDialog(false)}
                disabled={isProcessing}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleRefundInvoice}
                disabled={isProcessing || !refundReason.trim()}
              >
                {isProcessing ? 'Erstelle Gutschrift...' : 'Gutschrift erstellen'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
