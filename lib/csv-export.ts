/**
 * CSV Export System für Rechnungen/Verkäufe
 * Kompatibel mit Excel Deutschland (UTF-8 BOM, Semikolon-Separator)
 */

export interface InvoiceExportData {
  id: string
  datum: Date
  produktname: string
  ean: string
  bestellnummer: string
  kategorie: string
  stueckzahlVerkauft: number
  verkaufspreis: number
  einkaufspreis: number
  versandkosten: number
  amazonGebuehren: number
  mwst: number
  retouren: number
  werbungskosten: number
  sonstigeKosten: number
  gewinn: number
}

export interface CSVExportOptions {
  selectedIds?: string[]
  filters?: {
    dateFrom?: Date
    dateTo?: Date
    status?: string
    customer?: string
    category?: string
    searchQuery?: string
    displayedInvoices?: string[]
  }
  columns?: string[]
  includeSummary?: boolean
  filename?: string
}

export interface CSVExportResult {
  success: boolean
  filename: string
  rowCount: number
  totalAmount: number
  downloadUrl?: string
  error?: string
}

/**
 * CSV-Spalten-Konfiguration (Reihenfolge wichtig!)
 */
export const CSV_COLUMNS = [
  { key: 'datum', label: 'Datum', type: 'date' },
  { key: 'produktname', label: 'Produktname', type: 'text' },
  { key: 'ean', label: 'EAN', type: 'text' },
  { key: 'bestellnummer', label: 'Bestellnummer', type: 'text' },
  { key: 'kategorie', label: 'Kategorie', type: 'text' },
  { key: 'stueckzahlVerkauft', label: 'Stückzahl verkauft', type: 'number' },
  { key: 'verkaufspreis', label: 'Verkaufspreis (€)', type: 'currency' },
  { key: 'einkaufspreis', label: 'Einkaufspreis (€)', type: 'currency' },
  { key: 'versandkosten', label: 'Versandkosten (€)', type: 'currency' },
  { key: 'amazonGebuehren', label: 'Amazon Gebühren (€)', type: 'currency' },
  { key: 'mwst', label: 'MwSt (19%) (€)', type: 'currency' },
  { key: 'retouren', label: 'Retouren (€)', type: 'currency' },
  { key: 'werbungskosten', label: 'Werbungskosten (€)', type: 'currency' },
  { key: 'sonstigeKosten', label: 'Sonstige Kosten (€)', type: 'currency' },
  { key: 'gewinn', label: 'Gewinn (€)', type: 'currency' }
] as const

/**
 * Numerische Spalten für Summenberechnung
 */
export const NUMERIC_COLUMNS = [
  'verkaufspreis',
  'einkaufspreis', 
  'versandkosten',
  'amazonGebuehren',
  'mwst',
  'retouren',
  'werbungskosten',
  'sonstigeKosten',
  'gewinn'
] as const

/**
 * Formatiert Datum für deutschen CSV-Export (dd.MM.yyyy)
 */
export function formatDateForCSV(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatiert Zahl für deutschen CSV-Export (Komma als Dezimaltrennzeichen)
 */
export function formatNumberForCSV(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Escaped CSV-Wert (Anführungszeichen bei Sonderzeichen)
 */
export function escapeCSVValue(value: string): string {
  // Wenn der Wert Semikolon, Anführungszeichen oder Zeilenumbruch enthält
  if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    // Anführungszeichen im Wert verdoppeln und gesamten Wert in Anführungszeichen setzen
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Formatiert einen Wert basierend auf seinem Typ
 */
export function formatValueForCSV(value: any, type: string): string {
  if (value === null || value === undefined) {
    return ''
  }

  switch (type) {
    case 'date':
      return value instanceof Date ? formatDateForCSV(value) : ''
    
    case 'currency':
    case 'number':
      return typeof value === 'number' ? formatNumberForCSV(value) : '0,00'
    
    case 'text':
    default:
      return escapeCSVValue(String(value))
  }
}

/**
 * Generiert CSV-Header mit UTF-8 BOM
 */
export function generateCSVHeader(columns: typeof CSV_COLUMNS): string {
  // UTF-8 BOM für korrekte Darstellung in Excel
  const BOM = '\uFEFF'
  const headers = columns.map(col => escapeCSVValue(col.label)).join(';')
  return BOM + headers
}

/**
 * Konvertiert Datenzeile zu CSV-Format
 */
export function convertRowToCSV(data: InvoiceExportData, columns: typeof CSV_COLUMNS): string {
  const values = columns.map(col => {
    const value = data[col.key as keyof InvoiceExportData]
    return formatValueForCSV(value, col.type)
  })
  
  return values.join(';')
}

/**
 * Berechnet Summen für numerische Spalten
 */
export function calculateSummary(data: InvoiceExportData[]): Record<string, number> {
  const summary: Record<string, number> = {}
  
  NUMERIC_COLUMNS.forEach(column => {
    summary[column] = data.reduce((sum, row) => {
      const value = row[column as keyof InvoiceExportData] as number
      return sum + (typeof value === 'number' ? value : 0)
    }, 0)
  })
  
  return summary
}

/**
 * Generiert SUMME-Zeile für CSV
 */
export function generateSummaryRow(summary: Record<string, number>, columns: typeof CSV_COLUMNS): string {
  const values = columns.map(col => {
    if (col.key === 'datum') {
      return escapeCSVValue('SUMME')
    }
    
    if (NUMERIC_COLUMNS.includes(col.key as any)) {
      const value = summary[col.key] || 0
      return formatNumberForCSV(value)
    }
    
    return '' // Leere Zellen für Text-Spalten
  })
  
  return values.join(';')
}

/**
 * Generiert Dateiname für CSV-Export
 */
export function generateCSVFilename(customName?: string): string {
  const now = new Date()
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .substring(0, 16) // YYYY-MM-DD_HH-mm
  
  return customName || `rechnungen_export_${timestamp}.csv`
}

/**
 * Hauptfunktion: Generiert kompletten CSV-Inhalt
 */
export function generateCSVContent(
  data: InvoiceExportData[], 
  options: CSVExportOptions = {}
): string {
  const columns = options.columns 
    ? CSV_COLUMNS.filter(col => options.columns!.includes(col.key))
    : CSV_COLUMNS

  // Header generieren
  const csvLines: string[] = [generateCSVHeader(columns)]
  
  // Datenzeilen generieren
  data.forEach(row => {
    csvLines.push(convertRowToCSV(row, columns))
  })
  
  // Summenzeile hinzufügen (falls gewünscht)
  if (options.includeSummary !== false && data.length > 0) {
    const summary = calculateSummary(data)
    csvLines.push(generateSummaryRow(summary, columns))
  }
  
  return csvLines.join('\n')
}

/**
 * Simuliert Rechnungsdaten für Demo (wird durch echte DB-Abfrage ersetzt)
 */
export function generateSampleInvoiceData(count: number = 10): InvoiceExportData[] {
  const categories = ['Elektronik', 'Bücher', 'Kleidung', 'Haushalt', 'Sport']
  const products = [
    'iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Air', 'Dell XPS 13',
    'Nike Air Max', 'Adidas Ultraboost', 'Levi\'s Jeans', 'H&M T-Shirt',
    'Kaffeemaschine', 'Staubsauger', 'Mikrowelle', 'Toaster'
  ]
  
  return Array.from({ length: count }, (_, i) => {
    const verkaufspreis = Math.random() * 500 + 50
    const einkaufspreis = verkaufspreis * (0.6 + Math.random() * 0.2)
    const versandkosten = Math.random() * 10 + 2
    const amazonGebuehren = verkaufspreis * 0.15
    const mwst = verkaufspreis * 0.19
    const retouren = Math.random() * 20
    const werbungskosten = Math.random() * 15
    const sonstigeKosten = Math.random() * 5
    const gewinn = verkaufspreis - einkaufspreis - versandkosten - amazonGebuehren - retouren - werbungskosten - sonstigeKosten
    
    return {
      id: `inv_${i + 1}`,
      datum: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Letzte 90 Tage
      produktname: products[Math.floor(Math.random() * products.length)],
      ean: `${Math.floor(Math.random() * 9000000000000) + 1000000000000}`,
      bestellnummer: `ORD-${Math.floor(Math.random() * 900000) + 100000}`,
      kategorie: categories[Math.floor(Math.random() * categories.length)],
      stueckzahlVerkauft: Math.floor(Math.random() * 10) + 1,
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
}

/**
 * Filtert Daten basierend auf Optionen
 */
export function filterInvoiceData(
  data: InvoiceExportData[], 
  options: CSVExportOptions
): InvoiceExportData[] {
  let filtered = [...data]
  
  // Filter nach ausgewählten IDs
  if (options.selectedIds && options.selectedIds.length > 0) {
    filtered = filtered.filter(item => options.selectedIds!.includes(item.id))
  }
  
  // Filter nach Datum
  if (options.filters?.dateFrom) {
    filtered = filtered.filter(item => item.datum >= options.filters!.dateFrom!)
  }
  
  if (options.filters?.dateTo) {
    filtered = filtered.filter(item => item.datum <= options.filters!.dateTo!)
  }
  
  // Filter nach Kategorie
  if (options.filters?.category) {
    filtered = filtered.filter(item => 
      item.kategorie.toLowerCase().includes(options.filters!.category!.toLowerCase())
    )
  }
  
  return filtered
}

/**
 * Hauptexport-Funktion
 */
export async function exportInvoicesToCSV(options: CSVExportOptions = {}): Promise<CSVExportResult> {
  try {
    console.log('🔄 Starting CSV export with options:', options)
    
    // Daten laden (hier Beispieldaten, in Production aus DB)
    const allData = generateSampleInvoiceData(1000)
    
    // Daten filtern
    const filteredData = filterInvoiceData(allData, options)
    
    if (filteredData.length === 0) {
      return {
        success: false,
        filename: '',
        rowCount: 0,
        totalAmount: 0,
        error: 'Keine Daten zum Exportieren gefunden'
      }
    }
    
    // CSV-Inhalt generieren
    const csvContent = generateCSVContent(filteredData, options)
    
    // Dateiname generieren
    const filename = generateCSVFilename(options.filename)
    
    // Gesamtsumme berechnen
    const summary = calculateSummary(filteredData)
    const totalAmount = summary.gewinn || 0
    
    console.log(`✅ CSV export completed: ${filteredData.length} rows, total: €${totalAmount.toFixed(2)}`)
    
    return {
      success: true,
      filename,
      rowCount: filteredData.length,
      totalAmount,
      downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
    }
    
  } catch (error) {
    console.error('❌ CSV export failed:', error)
    return {
      success: false,
      filename: '',
      rowCount: 0,
      totalAmount: 0,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }
  }
}

/**
 * Chunked Export für große Datenmengen (>10k Zeilen)
 */
export async function exportLargeDatasetToCSV(
  options: CSVExportOptions = {},
  chunkSize: number = 1000
): Promise<CSVExportResult> {
  try {
    console.log('🔄 Starting chunked CSV export for large dataset')
    
    // Hier würde man die Daten in Chunks aus der DB laden
    // Für Demo verwenden wir die normale Funktion
    return await exportInvoicesToCSV(options)
    
  } catch (error) {
    console.error('❌ Chunked CSV export failed:', error)
    return {
      success: false,
      filename: '',
      rowCount: 0,
      totalAmount: 0,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }
  }
}
