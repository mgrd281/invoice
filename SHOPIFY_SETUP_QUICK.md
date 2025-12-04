# 🚀 Shopify Schnell-Setup

## 📋 Ihre Shopify-Daten

### Shop-Informationen:
- **Shop Domain:** `45dv93-bk.myshopify.com`
- **Admin URL:** https://admin.shopify.com/store/45dv93-bk

### API-Zugangsdaten:
- **API-Schlüssel:** `SHOPIFY_API_KEY_PLACEHOLDER`
- **Geheimer API-Schlüssel:** `SHOPIFY_SECRET_KEY_PLACEHOLDER`
- **Admin API-Token:** `SHOPIFY_ACCESS_TOKEN_PLACEHOLDER`

## ⚡ Schnell-Einrichtung (2 Minuten)

### Schritt 1: Shopify-Integration öffnen
```
http://localhost:3000/shopify
```

### Schritt 2: Einstellungen eingeben
```
Shop Domain: 45dv93-bk.myshopify.com
Access Token: SHOPIFY_ACCESS_TOKEN_PLACEHOLDER
API Version: 2024-01
Standard Steuersatz: 19%
Zahlungsziel: 14 Tage
```

### Schritt 3: Verbindung testen
1. Klicken Sie auf **"Verbindung testen"**
2. Warten Sie auf grüne Bestätigung
3. Klicken Sie auf **"Speichern"**

### Schritt 4: Erste Bestellungen importieren
1. Wechseln Sie zum Tab **"Import"**
2. Klicken Sie auf **"Bestellungen jetzt importieren"**
3. Folgen Sie dem Import-Assistenten

## 🎯 Was passiert beim Import?

### Automatische Konvertierung:
```
Shopify Order #1001 → KARNEX Rechnung RE-SH-1001
€119.00 (Brutto) → €100.00 (Netto) + €19.00 (19% MwSt)
Kunde: Max Mustermann → Rechnungsempfänger
Bezahlt → Status: Bezahlt
```

### Importierte Daten:
- ✅ **Kundeninformationen** (Name, E-Mail, Adresse)
- ✅ **Bestellpositionen** (Produkte, Mengen, Preise)
- ✅ **Steuern und Gesamtbeträge**
- ✅ **Zahlungsstatus** (nur bezahlte Bestellungen)

## 🔄 Nach dem Import

### Rechnungen finden:
```
http://localhost:3000/invoices
```
- Suchen Sie nach Rechnungen mit Präfix **"SH-"**
- Diese sind automatisch als **"Bezahlt"** markiert

### Verfügbare Aktionen:
- ✅ **PDF generieren** und herunterladen
- ✅ **E-Mail versenden** an Kunden
- ✅ **Bulk-E-Mail** für mehrere Rechnungen
- ✅ **Storno/Gutschrift** erstellen

## ⚙️ Automatischer Import (Optional)

### Aktivierung:
1. Gehen Sie zu **Shopify → Einstellungen**
2. Aktivieren Sie **"Automatischen Import aktivieren"**
3. Stellen Sie Intervall ein (empfohlen: 60 Minuten)
4. Speichern Sie die Einstellungen

### Vorteile:
- 🤖 **Automatische Synchronisation** neuer Bestellungen
- ⏰ **Regelmäßiger Import** (stündlich/täglich)
- 📧 **Sofortige Rechnungsstellung** möglich
- 📊 **Immer aktuelle Daten**

## 🛡️ Sicherheit

### Ihre Daten sind sicher:
- ✅ **Verschlüsselte Speicherung** des Access Tokens
- ✅ **Nur Lesezugriff** auf Shopify (keine Änderungen)
- ✅ **Lokale Verarbeitung** (keine Cloud-Übertragung)
- ✅ **DSGVO-konform** (nur notwendige Daten)

## 🆘 Hilfe & Support

### Bei Problemen:
1. **Verbindung fehlgeschlagen?**
   - Prüfen Sie Shop Domain und Access Token
   - Stellen Sie sicher, dass die Private App aktiv ist

2. **Keine Bestellungen gefunden?**
   - Prüfen Sie ob bezahlte Bestellungen vorhanden sind
   - Erweitern Sie den Zeitraum (letzte 30 Tage)

3. **Import-Fehler?**
   - Öffnen Sie Browser-Konsole (F12)
   - Prüfen Sie die Fehlermeldungen
   - Versuchen Sie einzelne Bestellung zu importieren

### Debug-Modus:
```javascript
// In Browser-Konsole eingeben:
localStorage.setItem('shopify-debug', 'true')
// Dann Seite neu laden
```

## ✅ Checkliste

- [ ] Shopify-Integration geöffnet (`/shopify`)
- [ ] Einstellungen eingegeben und gespeichert
- [ ] Verbindung erfolgreich getestet
- [ ] Ersten Import durchgeführt
- [ ] Importierte Rechnungen geprüft (`/invoices`)
- [ ] PDF-Generierung getestet
- [ ] E-Mail-Versendung getestet
- [ ] Automatischer Import aktiviert (optional)

---

## 🎉 Fertig!

Ihr Shopify-Shop ist jetzt mit dem KARNEX Rechnungssystem verbunden!

**Nächste Schritte:**
1. Testen Sie den Import mit echten Bestellungen
2. Versenden Sie Test-E-Mails an Kunden
3. Aktivieren Sie den automatischen Import
4. Genießen Sie die automatisierte Rechnungsstellung! 🚀

Bei Fragen schauen Sie in die ausführliche Dokumentation: `SHOPIFY_INTEGRATION_GUIDE.md`
