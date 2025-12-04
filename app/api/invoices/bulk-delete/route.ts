import { NextRequest, NextResponse } from 'next/server'

// Access global storage for all invoice data
declare global {
  var csvInvoices: any[] | undefined
  var allInvoices: any[] | undefined
}

// Initialize global storage
if (!global.csvInvoices) {
  global.csvInvoices = []
}
if (!global.allInvoices) {
  global.allInvoices = []
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { 
          error: 'Ungültige Anfrage',
          message: 'Es wurden keine Rechnungs-IDs angegeben.'
        },
        { status: 400 }
      )
    }

    console.log('Bulk deleting invoices with IDs:', ids)

    const results = {
      deleted: 0,
      errors: [] as string[],
      mockInvoicesSkipped: 0
    }

    // Mock invoice IDs that cannot be deleted
    const mockInvoiceIds = ['1', '2', '3']

    for (const invoiceId of ids) {
      // Skip mock invoices
      if (mockInvoiceIds.includes(invoiceId)) {
        results.mockInvoicesSkipped++
        results.errors.push(`Beispiel-Rechnung ${invoiceId} kann nicht gelöscht werden`)
        continue
      }

      let deleted = false

      // Try to delete from CSV invoices
      if (global.csvInvoices) {
        const csvIndex = global.csvInvoices.findIndex((inv: any) => inv.id === invoiceId)
        if (csvIndex !== -1) {
          // Soft delete: add deleted_at timestamp
          global.csvInvoices[csvIndex].deleted_at = new Date().toISOString()
          console.log('Soft deleted CSV invoice:', invoiceId)
          results.deleted++
          deleted = true
          continue
        }
      }

      // Try to delete from all invoices
      if (global.allInvoices && !deleted) {
        const allIndex = global.allInvoices.findIndex((inv: any) => inv.id === invoiceId)
        if (allIndex !== -1) {
          // Soft delete: add deleted_at timestamp
          global.allInvoices[allIndex].deleted_at = new Date().toISOString()
          console.log('Soft deleted invoice:', invoiceId)
          results.deleted++
          deleted = true
          continue
        }
      }

      // Invoice not found
      if (!deleted) {
        results.errors.push(`Rechnung ${invoiceId} nicht gefunden`)
      }
    }

    // Prepare response message
    let message = ''
    if (results.deleted > 0) {
      message = `${results.deleted} Rechnung${results.deleted !== 1 ? 'en' : ''} erfolgreich gelöscht`
    }
    
    if (results.mockInvoicesSkipped > 0) {
      if (message) message += '. '
      message += `${results.mockInvoicesSkipped} Beispiel-Rechnung${results.mockInvoicesSkipped !== 1 ? 'en' : ''} übersprungen`
    }

    if (results.errors.length > 0 && results.deleted === 0) {
      // If all failures are due to mock invoices, respond with 409 Conflict
      const allMock = results.mockInvoicesSkipped > 0 && results.errors.every(e => e.includes('Beispiel-Rechnung'))
      if (allMock) {
        return NextResponse.json(
          {
            error: 'Beispiel-Rechnungen können nicht gelöscht werden',
            message: 'Alle ausgewählten Rechnungen sind Beispiel-/Test-Rechnungen und können nicht gelöscht werden. Sie können sie stattdessen archivieren oder ausblenden.',
            code: 'MOCK_INVOICE',
            details: results.errors
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { 
          error: 'Keine Rechnungen gelöscht',
          message: 'Es konnten keine Rechnungen gelöscht werden.',
          details: results.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message,
      deleted: results.deleted,
      errors: results.errors,
      mockInvoicesSkipped: results.mockInvoicesSkipped
    })

  } catch (error) {
    console.error('Error in bulk delete:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Löschen',
        message: 'Ein unerwarteter Fehler ist aufgetreten.'
      },
      { status: 500 }
    )
  }
}
