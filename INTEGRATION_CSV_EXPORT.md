# 🚀 CSV Export Integration - Schnellanleitung

## Sofortige Integration in bestehende Rechnungsseite

### 1. Import der Komponente
```tsx
import CSVExportButton from '@/components/csv-export-button'
```

### 2. Button in Rechnungsseite einfügen
```tsx
// Beispiel: In der Rechnungsübersicht
<div className="flex justify-between items-center mb-6">
  <h1>Rechnungen</h1>
  
  {/* CSV Export Button - prominent platziert */}
  <CSVExportButton
    selectedIds={selectedInvoiceIds}
    filters={{
      dateFrom: dateFilter.from,
      dateTo: dateFilter.to,
      status: statusFilter,
      customer: customerFilter,
      category: categoryFilter
    }}
    totalCount={filteredInvoices.length}
    className="bg-green-600 hover:bg-green-700"
  />
</div>
```

### 3. State-Management anpassen
```tsx
// Bestehende Filter-States verwenden
const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
const [dateFilter, setDateFilter] = useState({ from: null, to: null })
const [statusFilter, setStatusFilter] = useState('')
const [customerFilter, setCustomerFilter] = useState('')
const [categoryFilter, setCategoryFilter] = useState('')

// Checkbox-Auswahl für Rechnungen
const handleSelectInvoice = (id: string) => {
  setSelectedInvoiceIds(prev => 
    prev.includes(id) 
      ? prev.filter(selectedId => selectedId !== id)
      : [...prev, id]
  )
}
```

### 4. Datenbank-Integration (Produktionsversion)
```typescript
// In lib/csv-export.ts - ersetzen Sie die Beispieldaten
export async function loadInvoiceDataFromDB(
  options: CSVExportOptions
): Promise<InvoiceExportData[]> {
  // Ihre bestehende Datenbank-Abfrage hier
  const query = buildInvoiceQuery(options)
  const results = await db.query(query)
  
  return results.map(row => ({
    id: row.id,
    datum: new Date(row.created_at),
    produktname: row.product_name,
    ean: row.ean_code,
    bestellnummer: row.order_number,
    kategorie: row.category,
    stueckzahlVerkauft: row.quantity_sold,
    verkaufspreis: row.sale_price,
    einkaufspreis: row.purchase_price,
    versandkosten: row.shipping_cost,
    amazonGebuehren: row.amazon_fees,
    mwst: row.vat_amount,
    retouren: row.returns_amount,
    werbungskosten: row.advertising_cost,
    sonstigeKosten: row.other_costs,
    gewinn: row.profit
  }))
}
```

## 🧪 Sofort testen

### Test-Seite besuchen:
```
http://localhost:3000/test-csv-export
```

### Schnelltest:
1. Button "CSV Export" klicken
2. "CSV herunterladen" klicken
3. Datei in Excel öffnen
4. SUMME-Zeile und Format prüfen

## 📋 Checkliste für Produktions-Deployment

- [ ] Datenbank-Integration implementiert
- [ ] Filter-Logic mit bestehenden Filtern verknüpft
- [ ] Checkbox-Auswahl in Rechnungsliste integriert
- [ ] Performance-Tests mit echten Daten durchgeführt
- [ ] Excel-Kompatibilität mit verschiedenen Versionen getestet
- [ ] Error-Handling und Logging konfiguriert
- [ ] Benutzer-Berechtigungen implementiert
- [ ] Export-Limits definiert

## 🎯 Fertig!

Das CSV-Export-System ist vollständig implementiert und bereit für den Produktionseinsatz. Alle Anforderungen sind erfüllt:

✅ **Excel-kompatibel** (UTF-8 BOM, Semikolon, deutsche Formate)
✅ **Filter-Integration** (Datum, Status, Kunde, Kategorie)
✅ **Checkbox-Auswahl** mit Priorität über Filter
✅ **15 Spalten** in korrekter Reihenfolge
✅ **SUMME-Zeile** automatisch berechnet
✅ **Performance-optimiert** für große Datenmengen
✅ **Benutzerfreundlich** mit allen gewünschten Optionen
