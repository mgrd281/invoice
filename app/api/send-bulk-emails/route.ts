import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-service'

// Erweiterte Massen-E-Mail-Versand-System
// Unterstützt das Versenden von bis zu 10.000 E-Mails in einem Vorgang

interface BulkEmailRequest {
  invoiceIds: string[]
  batchSize?: number
  delayBetweenBatches?: number
  maxConcurrent?: number
  customSubject?: string
  customMessage?: string
}

interface BulkEmailProgress {
  total: number
  sent: number
  failed: number
  inProgress: boolean
  errors: Array<{
    invoiceId: string
    error: string
    timestamp: string
  }>
  startTime: string
  estimatedCompletion?: string
}

// Zwischenspeicher für den Status laufender Vorgänge
const activeOperations = new Map<string, BulkEmailProgress>()

// Bereinigung alter Vorgänge (mehr als eine Stunde)
const cleanupOldOperations = () => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000)
  const entriesToDelete: string[] = []

  activeOperations.forEach((progress, operationId) => {
    if (new Date(progress.startTime).getTime() < oneHourAgo) {
      entriesToDelete.push(operationId)
    }
  })

  entriesToDelete.forEach(operationId => {
    activeOperations.delete(operationId)
  })
}

// POST - Massen-E-Mail-Versand starten
export async function POST(request: NextRequest) {
  try {
    const body: BulkEmailRequest = await request.json()
    const {
      invoiceIds,
      batchSize = 50,  // Standard-Batch-Größe
      delayBetweenBatches = 2000,  // Verzögerung zwischen Batches (2 Sekunden)
      maxConcurrent = 10,  // Maximale gleichzeitige Sendungen
      customSubject,
      customMessage
    } = body

    if (!invoiceIds || invoiceIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Keine Rechnungen für den Versand ausgewählt' },
        { status: 400 }
      )
    }

    // Eindeutige ID für den Vorgang erstellen
    const operationId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Alte Vorgänge bereinigen
    cleanupOldOperations()

    // Fortschrittsstatus initialisieren
    const progress: BulkEmailProgress = {
      total: invoiceIds.length,
      sent: 0,
      failed: 0,
      inProgress: true,
      errors: [],
      startTime: new Date().toISOString()
    }

    activeOperations.set(operationId, progress)

    // Vorgang im Hintergrund starten
    processBulkEmails(operationId, invoiceIds, batchSize, delayBetweenBatches, maxConcurrent, customSubject, customMessage)
      .catch(error => {
        console.error('Fehler bei der Massen-E-Mail-Verarbeitung:', error)
        const currentProgress = activeOperations.get(operationId)
        if (currentProgress) {
          currentProgress.inProgress = false
          activeOperations.set(operationId, currentProgress)
        }
      })

    return NextResponse.json({
      success: true,
      message: `Versand von ${invoiceIds.length} Rechnungen gestartet`,
      operationId,
      estimatedDuration: Math.ceil((invoiceIds.length / batchSize) * (delayBetweenBatches / 1000)) + ' Sekunden'
    })

  } catch (error) {
    console.error('Fehler beim Starten des Massen-E-Mail-Versands:', error)
    return NextResponse.json(
      { success: false, message: 'Fehler beim Starten des Versandvorgangs' },
      { status: 500 }
    )
  }
}

// GET - Vorgangsstatus abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')

    if (!operationId) {
      return NextResponse.json(
        { success: false, message: 'Vorgangs-ID erforderlich' },
        { status: 400 }
      )
    }

    const progress = activeOperations.get(operationId)

    if (!progress) {
      return NextResponse.json(
        { success: false, message: 'Vorgang nicht gefunden oder abgelaufen' },
        { status: 404 }
      )
    }

    // Geschätzte verbleibende Zeit berechnen
    if (progress.inProgress && progress.sent > 0) {
      const elapsed = Date.now() - new Date(progress.startTime).getTime()
      const avgTimePerEmail = elapsed / progress.sent
      const remaining = progress.total - progress.sent - progress.failed
      const estimatedCompletion = new Date(Date.now() + (remaining * avgTimePerEmail)).toISOString()
      progress.estimatedCompletion = estimatedCompletion
    }

    return NextResponse.json({
      success: true,
      data: progress
    })

  } catch (error) {
    console.error('Fehler beim Abrufen des Vorgangsstatus:', error)
    return NextResponse.json(
      { success: false, message: 'Fehler beim Abrufen des Vorgangsstatus' },
      { status: 500 }
    )
  }
}

// Massen-E-Mail-Verarbeitung im Hintergrund
async function processBulkEmails(
  operationId: string,
  invoiceIds: string[],
  batchSize: number,
  delayBetweenBatches: number,
  maxConcurrent: number,
  customSubject?: string,
  customMessage?: string
) {
  const progress = activeOperations.get(operationId)
  if (!progress) return

  console.log(`🚀 Massen-E-Mail-Versand gestartet: ${invoiceIds.length} Rechnungen`)
  console.log(`📊 Einstellungen: Batch-Größe=${batchSize}, Verzögerung=${delayBetweenBatches}ms, Gleichzeitig=${maxConcurrent}`)

  // Rechnungen in Batches aufteilen
  const batches: string[][] = []
  for (let i = 0; i < invoiceIds.length; i += batchSize) {
    batches.push(invoiceIds.slice(i, i + batchSize))
  }

  console.log(`📦 ${batches.length} Batches erstellt`)

  // Jeden Batch verarbeiten
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]

    console.log(`📤 Verarbeitung Batch ${batchIndex + 1}/${batches.length} (${batch.length} Rechnungen)`)

    // Batch mit Parallelitätskontrolle verarbeiten
    await processBatch(operationId, batch, maxConcurrent, customSubject, customMessage)

    // Verzögerung zwischen Batches (außer beim letzten Batch)
    if (batchIndex < batches.length - 1) {
      console.log(`⏳ Warten ${delayBetweenBatches}ms vor nächstem Batch`)
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }

    // Überprüfen, ob der Vorgang noch aktiv ist
    const currentProgress = activeOperations.get(operationId)
    if (!currentProgress || !currentProgress.inProgress) {
      console.log('❌ Vorgang gestoppt')
      break
    }
  }

  // Vorgang abschließen
  const finalProgress = activeOperations.get(operationId)
  if (finalProgress) {
    finalProgress.inProgress = false
    activeOperations.set(operationId, finalProgress)

    console.log(`✅ Vorgang abgeschlossen: ${finalProgress.sent} erfolgreich, ${finalProgress.failed} fehlgeschlagen`)
  }
}

// Einzelnen Batch mit Parallelitätskontrolle verarbeiten
async function processBatch(operationId: string, invoiceIds: string[], maxConcurrent: number, customSubject?: string, customMessage?: string) {
  const semaphore = new Array(maxConcurrent).fill(null)
  let index = 0

  const processNext = async (): Promise<void> => {
    while (index < invoiceIds.length) {
      const currentIndex = index++
      const invoiceId = invoiceIds[currentIndex]

      try {
        await sendSingleInvoiceEmail(invoiceId, customSubject, customMessage)
        updateProgress(operationId, 'success', invoiceId)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
        updateProgress(operationId, 'error', invoiceId, errorMessage)
      }
    }
  }

  // Parallele Verarbeitung starten
  await Promise.all(semaphore.map(() => processNext()))
}

// Fortschrittsstatus aktualisieren
function updateProgress(operationId: string, status: 'success' | 'error', invoiceId: string, error?: string) {
  const progress = activeOperations.get(operationId)
  if (!progress) return

  if (status === 'success') {
    progress.sent++
  } else {
    progress.failed++
    progress.errors.push({
      invoiceId,
      error: error || 'Unbekannter Fehler',
      timestamp: new Date().toISOString()
    })
  }

  activeOperations.set(operationId, progress)
}

// Einzelne Rechnung versenden - verwendet die gleichen Templates wie Einzelversand
async function sendSingleInvoiceEmail(invoiceId: string, customSubject?: string, customMessage?: string) {
  // Rechnungsdaten abrufen
  const invoiceResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/invoices/${invoiceId}`)

  if (!invoiceResponse.ok) {
    throw new Error(`Fehler beim Abrufen der Rechnung ${invoiceId}`)
  }

  const invoiceData = await invoiceResponse.json()

  // Handle different response structures
  const invoice = invoiceData?.data || invoiceData

  if (!invoice) {
    throw new Error(`Keine Rechnungsdaten für ID ${invoiceId} gefunden`)
  }

  // Debug: Log invoice structure (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Invoice data structure:', JSON.stringify(invoice, null, 2))
  }

  // Check for different email field names - including nested customer object
  const customerEmail = invoice?.customerEmail ||
    invoice?.email ||
    invoice?.customer_email ||
    invoice?.Email ||
    invoice?.customer?.email ||
    invoice?.customer?.customerEmail ||
    invoice?.organization?.email

  if (!customerEmail) {
    console.error('Available invoice fields:', Object.keys(invoice || {}))
    console.error('Customer object:', invoice?.customer)
    console.error('Organization object:', invoice?.organization)

    // Try to find any email field in the invoice object
    const allFields = JSON.stringify(invoice, null, 2)
    const emailMatches = allFields.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)

    if (emailMatches && emailMatches.length > 0) {
      console.log('Found email addresses in invoice data:', emailMatches)
      throw new Error(`E-Mail-Adressen gefunden aber nicht im erwarteten Feld: ${emailMatches.join(', ')}. Bitte überprüfen Sie die Datenstruktur.`)
    }

    throw new Error(`Keine E-Mail-Adresse für Kunden in Rechnung ${invoiceId}. Verfügbare Felder: ${Object.keys(invoice || {}).join(', ')}. Customer: ${JSON.stringify(invoice?.customer || {})}, Organization: ${JSON.stringify(invoice?.organization || {})}`)
  }

  // Kundendaten und Rechnungsnummer mit Fallbacks extrahieren - einschließlich verschachtelter Objekte
  const customerName = invoice?.customerName ||
    invoice?.customer_name ||
    invoice?.name ||
    invoice?.customer?.name ||
    invoice?.customer?.customerName ||
    invoice?.organization?.name ||
    'Kunde'

  const invoiceNumber = invoice?.invoiceNumber || invoice?.number || invoice?.invoice_number || invoiceId
  const total = invoice?.total || invoice?.amount || 0
  const dueDate = invoice?.dueDate || invoice?.due_date || new Date()

  // ✅ VERBESSERUNG: Verwende die gleiche sendInvoiceEmail Funktion wie beim Einzelversand
  // Dies garantiert identische Templates, Formatierung und Funktionalität
  const { sendInvoiceEmail } = await import('@/lib/email-service')
  const { getCompanySettings } = await import('@/lib/company-settings')

  const companySettings = getCompanySettings()

  const result = await sendInvoiceEmail(
    invoiceId,
    customerEmail,
    customerName,
    invoiceNumber,
    companySettings.name,
    customSubject, // ✅ Benutzerdefinierten Betreff verwenden
    customMessage, // ✅ Benutzerdefinierte Nachricht verwenden
    typeof total === 'number' ? `${total.toFixed(2)}€` : `${total}€`,
    dueDate.toString()
  )

  if (!result.success) {
    throw new Error(result.error || 'Fehler beim E-Mail-Versand')
  }

  console.log(`✅ [BULK] Rechnung ${invoiceId} an ${customerEmail} versendet (Message ID: ${result.messageId})`)

  return result
}

