import { NextRequest, NextResponse } from 'next/server'
import { InvoiceType, generateInvoiceNumber, calculateStornoAmounts, createStornoItems, ExtendedInvoice } from '@/lib/invoice-types'

// Mock storage - in einer echten Anwendung würde dies eine Datenbank sein
declare global {
  var csvInvoices: any[] | undefined
}

if (!global.csvInvoices) {
  global.csvInvoices = []
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reason, processingNotes } = await request.json()
    const invoiceId = params.id

    // Ursprüngliche Rechnung finden
    const originalInvoice = global.csvInvoices?.find(inv => inv.id === invoiceId)
    
    if (!originalInvoice) {
      return NextResponse.json(
        { error: 'Rechnung nicht gefunden' },
        { status: 404 }
      )
    }

    // Prüfen ob bereits storniert
    if (originalInvoice.status === 'Storniert') {
      return NextResponse.json(
        { error: 'Diese Rechnung wurde bereits storniert' },
        { status: 400 }
      )
    }

    // Prüfen ob Rechnung stornierbar ist
    if (originalInvoice.type !== InvoiceType.REGULAR) {
      return NextResponse.json(
        { error: 'Nur normale Rechnungen können storniert werden' },
        { status: 400 }
      )
    }

    // Neue Rechnungsnummer für Storno generieren
    const stornoNumber = generateInvoiceNumber(
      InvoiceType.CANCELLATION, 
      (global.csvInvoices?.length || 0) + 1
    )

    // Storno-Beträge berechnen
    const stornoAmounts = calculateStornoAmounts(originalInvoice)
    
    // Storno-Positionen erstellen
    const stornoItems = createStornoItems(originalInvoice.items)

    // Stornorechnung erstellen
    const stornoInvoice: ExtendedInvoice = {
      id: `storno-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: stornoNumber,
      type: InvoiceType.CANCELLATION,
      customerId: originalInvoice.customerId,
      customerName: originalInvoice.customerName,
      customerEmail: originalInvoice.customerEmail,
      customerAddress: originalInvoice.customerAddress,
      customerCity: originalInvoice.customerCity,
      customerZip: originalInvoice.customerZip,
      customerCountry: originalInvoice.customerCountry,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0], // Storno sofort fällig
      items: stornoItems,
      subtotal: stornoAmounts.subtotal,
      taxRate: originalInvoice.taxRate,
      taxAmount: stornoAmounts.taxAmount,
      total: stornoAmounts.total,
      status: 'Storniert',
      statusColor: 'bg-red-100 text-red-800',
      amount: `€${Math.abs(stornoAmounts.total).toFixed(2)}`,
      createdAt: new Date().toISOString(),
      
      // Storno-spezifische Felder
      originalInvoiceId: originalInvoice.id,
      originalInvoiceNumber: originalInvoice.number,
      reason: reason || 'Stornierung auf Kundenwunsch',
      refundMethod: 'bank_transfer',
      processingNotes: processingNotes
    }

    // Stornorechnung zur Liste hinzufügen
    global.csvInvoices!.push(stornoInvoice)

    // Ursprüngliche Rechnung als storniert markieren
    const originalIndex = global.csvInvoices!.findIndex(inv => inv.id === invoiceId)
    if (originalIndex !== -1) {
      global.csvInvoices![originalIndex] = {
        ...originalInvoice,
        status: 'Storniert',
        statusColor: 'bg-red-100 text-red-800',
        processingNotes: `Storniert durch ${stornoNumber} am ${new Date().toLocaleDateString('de-DE')}`
      }
    }

    console.log(`✅ Stornorechnung ${stornoNumber} für Rechnung ${originalInvoice.number} erstellt`)

    return NextResponse.json({
      success: true,
      message: `Stornorechnung ${stornoNumber} wurde erfolgreich erstellt`,
      stornoInvoice,
      originalInvoiceUpdated: true
    })

  } catch (error) {
    console.error('Fehler beim Erstellen der Stornorechnung:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Stornorechnung' },
      { status: 500 }
    )
  }
}
