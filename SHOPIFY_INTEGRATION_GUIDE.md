# 🛍️ Shopify Integration - Vollständiger Leitfaden

## 📋 Übersicht

Diese Anleitung führt Sie durch die komplette Einrichtung der Shopify-Integration für Ihr Rechnungssystem. Nach der Einrichtung können Sie automatisch Bestellungen aus Ihrem Shopify-Shop als Rechnungen importieren.

## 🔧 Schritt 1: Shopify Private App erstellen

### 1.1 Shopify Admin öffnen
- Gehen Sie zu Ihrem Shopify Admin: `https://admin.shopify.com/store/45dv93-bk`
- Melden Sie sich mit Ihren Shopify-Zugangsdaten an

### 1.2 Private App erstellen
1. **Einstellungen** → **Apps und Verkaufskanäle** → **Apps entwickeln**
2. Klicken Sie auf **"Private App erstellen"**
3. Geben Sie folgende Informationen ein:
   - **App-Name:** "KARNEX Rechnungssystem"
   - **Entwickler-E-Mail:** Ihre E-Mail-Adresse

### 1.3 Admin API-Berechtigungen konfigurieren
Aktivieren Sie folgende Berechtigungen:

#### **Orders (Bestellungen):**
- ✅ `read_orders` - Bestellungen lesen
- ✅ `read_all_orders` - Alle Bestellungen lesen

#### **Products (Produkte):**
- ✅ `read_products` - Produkte lesen

#### **Customers (Kunden):**
- ✅ `read_customers` - Kunden lesen

### 1.4 App speichern und Token erhalten
1. Klicken Sie auf **"App erstellen"**
2. Notieren Sie sich das **Admin API Access Token**
3. Ihre Shop-Domain ist: `45dv93-bk.myshopify.com`

## 🔑 Schritt 2: Integration konfigurieren

### 2.1 Rechnungssystem öffnen
- Öffnen Sie Ihr Rechnungssystem: `http://localhost:3000`
- Navigieren Sie zu **Shopify Integration**: `http://localhost:3000/shopify`

### 2.2 Verbindungseinstellungen
Geben Sie folgende Daten ein:
### **معلومات الاتصال الفعلية:**
```
Shop Domain: 45dv93-bk.myshopify.com
Admin URL: https://admin.shopify.com/store/45dv93-bk
API-Schlüssel: SHOPIFY_API_KEY_PLACEHOLDER
Geheimer API-Schlüssel: SHOPIFY_SECRET_KEY_PLACEHOLDER
Admin API Token: SHOPIFY_ACCESS_TOKEN_PLACEHOLDER
API Version: 2024-01
```

### 2.3 Weitere Einstellungen
```
Standard Steuersatz: 19% (für Deutschland)
Zahlungsziel: 14 Tage
```

### 2.4 Verbindung testen
1. Klicken Sie auf **"Verbindung testen"**
2. Bei Erfolg sollten Sie eine grüne Bestätigung sehen
3. Klicken Sie auf **"Speichern"**

## 📥 Schritt 3: Bestellungen importieren

### 3.1 Manueller Import
1. Wechseln Sie zum Tab **"Import"**
2. Klicken Sie auf **"Bestellungen jetzt importieren"**
3. Der Import-Assistent führt Sie durch den Prozess

### 3.2 Automatischer Import (Optional)
1. Aktivieren Sie **"Automatischen Import aktivieren"**
2. Stellen Sie das gewünschte Intervall ein (empfohlen: 60 Minuten)
3. Speichern Sie die Einstellungen

## 🎯 Schritt 4: Import-Prozess verstehen

### 4.1 Was wird importiert?
- ✅ **Nur bezahlte Bestellungen** (`financial_status: paid`)
- ✅ **Kundeninformationen** (Name, E-Mail, Adresse)
- ✅ **Bestellpositionen** (Produkte, Mengen, Preise)
- ✅ **Steuern und Gesamtbeträge**

### 4.2 Wie werden Rechnungen erstellt?
```
Shopify Bestellung → KARNEX Rechnung
Order #1001 → RE-SH-1001
Order #1002 → RE-SH-1002
```

### 4.3 Datenkonvertierung
- **Brutto-Preise** werden in **Netto + Steuer** aufgeteilt
- **Shopify-Steuern** werden korrekt übernommen
- **Kundenadresse** wird als Rechnungsadresse verwendet
- **Zahlungsstatus** wird entsprechend gesetzt

## 🔄 Schritt 5: Workflow nach Import

### 5.1 Importierte Rechnungen finden
1. Gehen Sie zu **"Rechnungen"**: `http://localhost:3000/invoices`
2. Suchen Sie nach Rechnungen mit Präfix **"SH-"**
3. Diese sind automatisch als **"Bezahlt"** markiert

### 5.2 Rechnungen bearbeiten
- ✅ **PDF generieren** und herunterladen
- ✅ **E-Mail versenden** an Kunden
- ✅ **Status ändern** (falls nötig)
- ✅ **Storno/Gutschrift** erstellen

### 5.3 Automatische E-Mail-Versendung
- Importierte Rechnungen können automatisch per E-Mail versendet werden
- Nutzen Sie die **Bulk-E-Mail-Funktion** für mehrere Rechnungen

## ⚙️ Erweiterte Einstellungen

### 6.1 API-Limits beachten
- Shopify erlaubt **2 Requests pro Sekunde**
- Bei vielen Bestellungen wird automatisch eine Pause eingelegt
- Import läuft in **Batches** von 50 Bestellungen

### 6.2 Fehlerbehandlung
- **Doppelte Importe** werden automatisch übersprungen
- **Fehlerhafte Bestellungen** werden protokolliert
- **Detaillierte Logs** in der Browser-Konsole

### 6.3 Datenvalidierung
```typescript
// Automatische Validierung:
✅ E-Mail-Adresse vorhanden
✅ Kundenname vorhanden  
✅ Bestellsumme > 0
✅ Mindestens 1 Artikel
```

## 🛡️ Sicherheit und Datenschutz

### 7.1 API-Token Sicherheit
- ✅ Token wird verschlüsselt gespeichert
- ✅ Nur notwendige Berechtigungen
- ✅ Keine Schreibzugriffe auf Shopify

### 7.2 Datenverarbeitung
- ✅ Nur bezahlte Bestellungen werden importiert
- ✅ Kundendaten werden DSGVO-konform verarbeitet
- ✅ Keine Speicherung von Zahlungsdaten

## 🔧 Fehlerbehebung

### 8.1 Häufige Probleme

#### **"Verbindung fehlgeschlagen"**
```
Lösung:
1. Shop-Domain prüfen (45dv93-bk.myshopify.com)
2. Access Token prüfen
3. API-Berechtigungen in Shopify prüfen
```

#### **"Keine Bestellungen gefunden"**
```
Lösung:
1. Prüfen Sie ob bezahlte Bestellungen vorhanden sind
2. Zeitraum erweitern (letzte 30 Tage)
3. Shopify Admin auf neue Bestellungen prüfen
```

#### **"Import-Fehler"**
```
Lösung:
1. Browser-Konsole öffnen (F12)
2. Fehlermeldungen prüfen
3. Einzelne Bestellung manuell prüfen
```

### 8.2 Debug-Modus
```javascript
// In Browser-Konsole eingeben:
localStorage.setItem('shopify-debug', 'true')
// Dann Seite neu laden
```

## 📊 Monitoring und Statistiken

### 9.1 Import-Statistiken
- **Letzte Synchronisation:** Wird automatisch gespeichert
- **Anzahl importierter Bestellungen:** Pro Import-Vorgang
- **Fehlerrate:** Überwachung fehlgeschlagener Importe

### 9.2 Performance-Optimierung
```
Empfohlene Einstellungen:
- Import-Intervall: 60 Minuten
- Batch-Größe: 50 Bestellungen
- Timeout: 30 Sekunden pro Request
```

## 🚀 Best Practices

### 10.1 Regelmäßiger Import
- ✅ **Täglicher Import** für aktive Shops
- ✅ **Stündlicher Import** für sehr aktive Shops
- ✅ **Manueller Import** bei Bedarf

### 10.2 Rechnungsmanagement
- ✅ **Sofortige E-Mail-Versendung** nach Import
- ✅ **Regelmäßige Backup-Erstellung**
- ✅ **Archivierung alter Rechnungen**

### 10.3 Kundenservice
- ✅ **Schnelle Rechnungsstellung** durch Automatisierung
- ✅ **Konsistente Rechnungsformate**
- ✅ **Automatische Zahlungserinnerungen**

## 📞 Support und Hilfe

### 11.1 Technischer Support
- **Dokumentation:** Diese Anleitung
- **Logs:** Browser-Konsole (F12)
- **Test-Modus:** Einzelne Bestellung testen

### 11.2 Shopify-spezifische Hilfe
- **Shopify Help Center:** https://help.shopify.com
- **API-Dokumentation:** https://shopify.dev/api
- **Community Forum:** https://community.shopify.com

## ✅ Checkliste für Go-Live

### Vor dem ersten Import:
- [ ] Shopify Private App erstellt
- [ ] API-Berechtigungen konfiguriert
- [ ] Verbindung erfolgreich getestet
- [ ] Einstellungen gespeichert
- [ ] Test-Import durchgeführt

### Nach dem ersten Import:
- [ ] Importierte Rechnungen geprüft
- [ ] PDF-Generierung getestet
- [ ] E-Mail-Versendung getestet
- [ ] Automatischer Import aktiviert (optional)
- [ ] Backup-Strategie implementiert

---

## 🎉 Herzlichen Glückwunsch!

Ihre Shopify-Integration ist jetzt vollständig eingerichtet. Bestellungen aus Ihrem Shopify-Shop werden automatisch als professionelle Rechnungen in Ihr System importiert.

**Nächste Schritte:**
1. Testen Sie den Import mit einer echten Bestellung
2. Aktivieren Sie den automatischen Import
3. Konfigurieren Sie E-Mail-Templates nach Ihren Wünschen

Bei Fragen oder Problemen können Sie jederzeit auf diese Dokumentation zurückgreifen oder den Debug-Modus aktivieren.

**Viel Erfolg mit Ihrer automatisierten Rechnungsstellung!** 🚀
