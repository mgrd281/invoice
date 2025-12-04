# 📋 CSV-Vorlagen für verschiedene Rechnungstypen

## 📁 Verfügbare CSV-Dateien

### 1. `rechnungen_vorlage_beispiele.csv`
**Hauptdatei mit allen Rechnungstypen** - Kompatibel mit dem bestehenden System

### 2. `rechnungen_beispiele_komplett.csv`
**Erweiterte Version** mit zusätzlichen deutschen Feldern

## 🧾 Rechnungstypen im Detail

### 1. **Normale Rechnung (Invoice)**
```
Rechnungsnummer: RE-2024-XXX
Status: Bezahlt / Offen / Teilweise bezahlt / Überfällig
Betrag: Positiver Wert (z.B. 119.00)
```

**Beispiele:**
- `RE-2024-001` - Max Mustermann - €119.00 - **Bezahlt**
- `RE-2024-003` - Peter Müller - €234.75 - **Offen**
- `RE-2024-007` - Thomas Klein - €78.25 - **Teilweise bezahlt**
- `RE-2024-008` - Lisa Hoffmann - €299.99 - **Überfällig**

### 2. **Storno-Rechnung (Cancellation)**
```
Rechnungsnummer: ST-2024-XXX
Status: Storniert
Betrag: Negativer Wert (z.B. -119.00)
Original_Rechnung: Verweis auf ursprüngliche Rechnung
Grund: Stornierungsgrund
```

**Beispiele:**
- `ST-2024-001` - Max Mustermann - **-€119.00** - Storno von `RE-2024-001`
  - Grund: "Kunde hat Bestellung storniert"
- `ST-2024-002` - Lisa Hoffmann - **-€299.99** - Storno von `RE-2024-008`
  - Grund: "Kunde unzufrieden mit Qualität"

### 3. **Gutschrift/Rückerstattung (Refund)**
```
Rechnungsnummer: GS-2024-XXX
Status: Gutschrift
Betrag: Negativer Wert (z.B. -44.75)
Original_Rechnung: Verweis auf ursprüngliche Rechnung
Grund: Rückerstattungsgrund
```

**Beispiele:**
- `GS-2024-001` - Anna Schmidt - **-€44.75** - Teilrückerstattung von `RE-2024-002`
  - Grund: "Artikel defekt - Teilrückerstattung"
- `GS-2024-002` - Michael Bauer - **-€9.10** - Einzelrückerstattung von `RE-2024-009`
  - Grund: "Ein Paar Socken hatte Löcher"
- `GS-2024-003` - Thomas Klein - **-€39.13** - Teilrückerstattung von `RE-2024-007`
  - Grund: "Notebook hatte Druckfehler auf Seiten"

## 📊 Wichtige CSV-Spalten

### Grundlegende Felder:
- **Bestellnummer**: Eindeutige Rechnungsnummer
- **Name**: Kundenname
- **Email**: Kunden-E-Mail-Adresse
- **Total**: Rechnungsbetrag (positiv/negativ)
- **Financial Status**: paid, pending, refunded, partially_refunded
- **Created at**: Erstellungsdatum

### Erweiterte Felder:
- **Rechnungstyp**: Rechnung, Storno, Gutschrift
- **Status_Deutsch**: Deutsche Statusbezeichnung
- **Grund**: Grund für Storno/Rückerstattung
- **Original_Rechnung**: Verweis auf ursprüngliche Rechnung

## 🎯 Verwendung im System

### 1. **CSV-Import**
1. Gehen Sie zu `/invoices/csv`
2. Laden Sie eine der CSV-Dateien hoch
3. Das System erkennt automatisch die verschiedenen Rechnungstypen

### 2. **Automatische Erkennung**
- **Positive Beträge** → Normale Rechnungen
- **Negative Beträge + "ST-" Präfix** → Storno-Rechnungen
- **Negative Beträge + "GS-" Präfix** → Gutschriften

### 3. **Status-Mapping**
```
paid → Bezahlt
pending → Offen
partial → Teilweise bezahlt
refunded → Storniert
partially_refunded → Gutschrift
```

## 🔧 Anpassung

### Eigene Daten hinzufügen:
1. Kopieren Sie eine der Vorlagen
2. Ersetzen Sie die Beispieldaten
3. Behalten Sie die Spaltenstruktur bei
4. Achten Sie auf korrekte Rechnungsnummern-Präfixe:
   - `RE-` für normale Rechnungen
   - `ST-` für Stornos
   - `GS-` für Gutschriften

### Neue Rechnungstypen:
- Das System unterstützt die deutschen Rechnungsstandards
- Storno- und Gutschrift-Funktionen sind vollständig implementiert
- E-Mail-Versand funktioniert für alle Rechnungstypen

## 📧 E-Mail-Versand

Alle Rechnungstypen unterstützen den E-Mail-Versand:
- **Normale Rechnungen**: Standard-E-Mail-Template
- **Storno-Rechnungen**: Spezielle Storno-Benachrichtigung
- **Gutschriften**: Rückerstattungs-Benachrichtigung

## 🎨 Beispiel-Daten

Die CSV-Dateien enthalten realistische Beispieldaten:
- **13 verschiedene Kunden**
- **11 normale Rechnungen**
- **2 Storno-Rechnungen**
- **3 Gutschriften**
- **Verschiedene Produktkategorien**
- **Realistische deutsche Adressen**
- **Verschiedene Rechnungsstatus**

Verwenden Sie diese Beispiele als Grundlage für Ihre eigenen Rechnungsdaten! 🚀
