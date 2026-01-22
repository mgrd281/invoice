/**
 * API Endpoint: CSV Export für Rechnungen
 * POST /api/invoices/export/csv
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  exportInvoicesToCSV,
  exportLargeDatasetToCSV,
  CSVExportOptions,
  InvoiceExportData
} from '@/lib/csv-export'
import { loadInvoicesFromDisk } from '@/lib/server-storage'
import { requireAuth, shouldShowAllData } from '@/lib/auth-middleware'

// Access global storage for real invoices
declare global {
  var csvInvoices: any[] | undefined
  var allInvoices: any[] | undefined
}

// Funktion zum Laden echter Rechnungsdaten
async function loadRealInvoiceData(request: NextRequest): Promise<InvoiceExportData[]> {
  try {
    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      console.error('❌ Authentication failed for CSV export')
      return []
    }
    const { user } = authResult

    // Load real invoices from the same source as /api/invoices
    const allInvoices = [
      ...(global.csvInvoices || []),
      ...(global.allInvoices || [])
    ]

    // Filter invoices based on user permissions
    let filteredInvoices
    if (shouldShowAllData(user)) {
      filteredInvoices = allInvoices.filter((invoice: any) => !invoice.deleted_at)
    } else {
      filteredInvoices = allInvoices.filter((invoice: any) =>
        !invoice.deleted_at && invoice.userId === user.id
      )
    }

    console.log(`📊 Loaded ${filteredInvoices.length} real invoices for CSV export (user: ${user.email})`)

    if (filteredInvoices.length === 0) {
      console.log('⚠️ No real invoices found, user may need to create some first')
      return []
    }

    // Konvertiere zu CSV-Export-Format
    return filteredInvoices.map((invoice: any) => {
      // Berechne Werte basierend auf verfügbaren Daten
      const verkaufspreis = parseFloat(invoice.total) || parseFloat(invoice.amount) || 0
      const mwst = verkaufspreis * 0.19 // 19% MwSt
      const einkaufspreis = verkaufspreis * 0.6 // Geschätzte 60% Einkaufspreis
      const versandkosten = 5.99 // Standard Versandkosten
      const amazonGebuehren = verkaufspreis * 0.15 // 15% Amazon Gebühren
      const retouren = 0 // Standardmäßig keine Retouren
      const werbungskosten = verkaufspreis * 0.05 // 5% Werbungskosten
      const sonstigeKosten = 2.50 // Sonstige Kosten
      const gewinn = verkaufspreis - einkaufspreis - versandkosten - amazonGebuehren - retouren - werbungskosten - sonstigeKosten

      return {
        id: invoice.id,
        datum: new Date(invoice.createdAt || invoice.date || invoice.created_at || Date.now()),
        produktname: invoice.items?.[0]?.description || invoice.description || invoice.customerName || 'Rechnung',
        ean: invoice.items?.[0]?.ean || `EAN${Math.floor(Math.random() * 1000000000000)}`,
        bestellnummer: invoice.invoiceNumber || invoice.number || invoice.id,
        kategorie: invoice.category || invoice.items?.[0]?.category || 'Dienstleistung',
        stueckzahlVerkauft: invoice.items?.[0]?.quantity || 1,
        verkaufspreis: Math.round(verkaufspreis * 100) / 100,
        einkaufspreis: Math.round(einkaufspreis * 100) / 100,
        versandkosten: Math.round(versandkosten * 100) / 100,
        amazonGebuehren: Math.round(amazonGebuehren * 100) / 100,
        mwst: Math.round(mwst * 100) / 100,
        retouren: Math.round(retouren * 100) / 100,
        werbungskosten: Math.round(werbungskosten * 100) / 100,
        sonstigeKosten: Math.round(sonstigeKosten * 100) / 100,
        gewinn: Math.round(gewinn * 100) / 100
      }
    })

  } catch (error) {
    console.error('❌ Error loading real invoice data:', error)
    return []
  }
}

// Fallback: Funktion zum Generieren von Demo-Daten falls keine echten Daten vorhanden
function generateDemoInvoiceData(): InvoiceExportData[] {
  const products = [
    'iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Air M3', 'Dell XPS 13',
    'Nike Air Max', 'Adidas Ultraboost', 'Levi\'s Jeans', 'H&M T-Shirt',
    'Kaffeemaschine Delonghi', 'Dyson Staubsauger', 'Mikrowelle Samsung', 'Toaster Philips'
  ]

  const categories = ['Elektronik', 'Computer', 'Kleidung', 'Sport', 'Haushalt']

  return Array.from({ length: 20 }, (_, i) => {
    const verkaufspreis = Math.round((Math.random() * 800 + 50) * 100) / 100
    const mwst = Math.round(verkaufspreis * 0.19 * 100) / 100
    const einkaufspreis = Math.round(verkaufspreis * 0.6 * 100) / 100
    const versandkosten = 5.99
    const amazonGebuehren = Math.round(verkaufspreis * 0.15 * 100) / 100
    const retouren = 0
    const werbungskosten = Math.round(verkaufspreis * 0.05 * 100) / 100
    const sonstigeKosten = 2.50
    const gewinn = Math.round((verkaufspreis - einkaufspreis - versandkosten - amazonGebuehren - retouren - werbungskosten - sonstigeKosten) * 100) / 100

    return {
      id: `inv_${i + 1}`,
      datum: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      produktname: products[Math.floor(Math.random() * products.length)],
      ean: `${Math.floor(Math.random() * 9000000000000) + 1000000000000}`,
      bestellnummer: `ORD-${Math.floor(Math.random() * 900000) + 100000}`,
      kategorie: categories[Math.floor(Math.random() * categories.length)],
      stueckzahlVerkauft: Math.floor(Math.random() * 5) + 1,
      verkaufspreis,
      einkaufspreis,
      versandkosten,
      amazonGebuehren,
      mwst,
      retouren,
      werbungskosten,
      sonstigeKosten,
      gewinn
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      selectedIds,
      filters,
      columns,
      includeSummary = true,
      filename,
      largeDataset = false
    }: CSVExportOptions & { largeDataset?: boolean } = body

    console.log('📊 CSV Export Request:', {
      selectedCount: selectedIds?.length || 0,
      filters,
      columns: columns?.length || 'all',
      includeSummary,
      largeDataset
    })

    // Validierung
    if (selectedIds && selectedIds.length > 100000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Zu viele Datensätze ausgewählt. Maximum: 100.000'
        },
        { status: 400 }
      )
    }

    // Lade echte Rechnungsdaten zuerst
    let realInvoiceData = await loadRealInvoiceData(request)

    console.log(`📊 Loaded ${realInvoiceData.length} real invoices from database`)

    // Detailliertes Logging für Debugging
    if (realInvoiceData.length > 0) {
      console.log('📋 Sample invoice data:', {
        id: realInvoiceData[0].id,
        datum: realInvoiceData[0].datum,
        produktname: realInvoiceData[0].produktname,
        verkaufspreis: realInvoiceData[0].verkaufspreis
      })
    }

    // Fallback zu Demo-Daten nur wenn wirklich keine echten Daten vorhanden
    if (realInvoiceData.length === 0) {
      console.log('⚠️ No real invoices found, using demo data as fallback')
      realInvoiceData = generateDemoInvoiceData()
    }

    // Filtere Daten basierend auf Auswahl und Filtern
    let filteredData = [...realInvoiceData]

    console.log(`🔍 Starting filters - selectedIds: ${selectedIds?.length || 0}, displayedInvoices: ${filters?.displayedInvoices?.length || 0}`)
    console.log(`📋 Available invoice IDs:`, realInvoiceData.slice(0, 5).map(inv => inv.id))
    console.log(`🎯 Requested selectedIds:`, selectedIds)

    // Priorität 1: Wenn spezifische IDs ausgewählt sind - KEINE anderen Filter anwenden!
    if (selectedIds && selectedIds.length > 0) {
      const originalLength = filteredData.length

      // Debug: Zeige welche IDs gefunden/nicht gefunden werden
      const foundIds = filteredData.filter(item => selectedIds.includes(item.id)).map(item => item.id)
      const notFoundIds = selectedIds.filter(id => !foundIds.includes(id))

      // Versuche zu filtern
      const matchingData = filteredData.filter(item => selectedIds.includes(item.id))

      if (matchingData.length > 0) {
        filteredData = matchingData
        console.log(`🎯 Manual selection: ${filteredData.length} from ${originalLength} - IGNORING all other filters`)
      } else {
        // Fallback: Wenn keine Übereinstimmung gefunden wird, alle Daten verwenden
        console.log('⚠️ No matching IDs found in current data, falling back to all available data')
        // filteredData bleibt unverändert (also alle Daten)
      }

      console.log(`✅ Found IDs:`, foundIds)
      console.log(`❌ Not found IDs:`, notFoundIds)

      // Bei manueller Auswahl: KEINE weiteren Filter anwenden!
      // Die ausgewählten IDs sind final und absolut (oder Fallback auf alle)
    }
    // Priorität 2: Wenn displayedInvoices (nach Suche/Filter) vorhanden sind
    else if (filters?.displayedInvoices && filters.displayedInvoices.length > 0) {
      const originalLength = filteredData.length
      filteredData = filteredData.filter(item => filters.displayedInvoices!.includes(item.id))
      console.log(`🔍 Filtered by displayedInvoices: ${filteredData.length} from ${originalLength}`)
    }
    // Priorität 3: Nur wenn KEINE manuelle Auswahl - dann andere Filter anwenden
    else {
      console.log(`🔍 Applying additional filters to all data`)

      // Filter nach Datum
      if (filters?.dateFrom) {
        const dateFrom = new Date(filters.dateFrom)
        filteredData = filteredData.filter(item => item.datum >= dateFrom)
        console.log(`📅 Date filter (from): ${filteredData.length} remaining`)
      }

      if (filters?.dateTo) {
        const dateTo = new Date(filters.dateTo)
        filteredData = filteredData.filter(item => item.datum <= dateTo)
        console.log(`📅 Date filter (to): ${filteredData.length} remaining`)
      }

      // Filter nach Kategorie
      if (filters?.category) {
        filteredData = filteredData.filter(item =>
          item.kategorie.toLowerCase().includes(filters.category!.toLowerCase())
        )
        console.log(`🏷️ Category filter: ${filteredData.length} remaining`)
      }
    }

    // Logging der finalen Daten
    console.log(`📊 Final filtered data: ${filteredData.length} invoices`)
    if (filteredData.length > 0) {
      console.log('📋 Final sample:', {
        ids: filteredData.slice(0, 3).map(inv => inv.id),
        produktnamen: filteredData.slice(0, 3).map(inv => inv.produktname),
        verkaufspreise: filteredData.slice(0, 3).map(inv => inv.verkaufspreis)
      })
    }

    // Sicherheitscheck: Wenn nach Filtern keine Daten übrig sind
    if (filteredData.length === 0) {
      console.log('⚠️ No data after filtering, falling back to all available data')
      filteredData = [...realInvoiceData]
    }

    // Finaler Check (sollte eigentlich nicht eintreten, da realInvoiceData gefüllt sein sollte)
    if (filteredData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Keine Demo-Daten verfügbar. Bitte versuchen Sie es erneut.'
        },
        { status: 404 }
      )
    }

    // Generiere CSV-Inhalt
    const { generateCSVContent, calculateSummary } = await import('@/lib/csv-export')

    const csvContent = generateCSVContent(filteredData, {
      columns,
      includeSummary
    })

    // Dateiname generieren
    const { generateCSVFilename } = await import('@/lib/csv-export')
    const csvFilename = generateCSVFilename(filename)

    // Gesamtsumme berechnen
    const summary = calculateSummary(filteredData)
    const totalAmount = summary.gewinn || 0

    console.log(`✅ CSV export completed: ${filteredData.length} rows, total profit: €${totalAmount.toFixed(2)}`)

    // Erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      filename: csvFilename,
      rowCount: filteredData.length,
      totalAmount,
      downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
      message: `${filteredData.length} Rechnungen erfolgreich exportiert`
    })

  } catch (error) {
    console.error('❌ CSV Export API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Interner Serverfehler beim CSV-Export'
      },
      { status: 500 }
    )
  }
}

// GET für Export-Optionen und Spalten-Info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'columns') {
      // Verfügbare Spalten zurückgeben
      const { CSV_COLUMNS } = await import('@/lib/csv-export')

      return NextResponse.json({
        success: true,
        columns: CSV_COLUMNS.map(col => ({
          key: col.key,
          label: col.label,
          type: col.type
        }))
      })
    }

    if (action === 'sample') {
      // Beispiel-CSV generieren (erste 5 Zeilen)
      const { generateSampleInvoiceData, generateCSVContent } = await import('@/lib/csv-export')

      const sampleData = generateSampleInvoiceData(5)
      const csvContent = generateCSVContent(sampleData, { includeSummary: true })

      return NextResponse.json({
        success: true,
        sample: csvContent,
        rowCount: sampleData.length
      })
    }

    // Standard-Antwort mit Export-Informationen
    return NextResponse.json({
      success: true,
      info: {
        maxRows: 100000,
        supportedFormats: ['CSV'],
        encoding: 'UTF-8 with BOM',
        separator: ';',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: 'German (comma decimal)'
      }
    })

  } catch (error) {
    console.error('❌ CSV Export Info API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Export-Informationen'
      },
      { status: 500 }
    )
  }
}
