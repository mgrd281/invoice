# 🎯 Detaillierte Schritt-für-Schritt-Anleitung - Shopify-Integration reparieren

## 📋 **Aktuelles Problem:**
- Kunde: "Unbekannt"
- Adresse: "Keine Adresse"
- E-Mail: "Keine E-Mail"

## 🚀 **Umfassende Lösung - 5 Phasen**

---

## **Phase 1: Neue Shopify Private App erstellen** 🔧

### **Schritt 1.1: Zugriff auf Shopify Admin**
1. **Öffnen Sie Ihren Browser** und gehen Sie zu: `https://45dv93-bk.myshopify.com/admin`
2. **Melden Sie sich an** mit dem Administratorkonto
3. Klicken Sie in der Seitenleiste auf **"Einstellungen"**

### **Schritt 1.2: Zugriff auf Apps**
1. Klicken Sie auf der Einstellungsseite auf **"Apps und Verkaufskanäle"**
2. Klicken Sie oben auf **"Apps entwickeln"**
3. Wenn Sie diese Option nicht finden, suchen Sie nach **"Private Apps"**

### **Schritt 1.3: Alte Apps löschen**
1. **Sehr wichtig:** Löschen Sie alle vorhandenen Private Apps
2. Für jede alte App:
   - Klicken Sie auf den App-Namen
   - Klicken Sie auf **"App löschen"**
   - Bestätigen Sie das Löschen

### **Schritt 1.4: Neue App erstellen**
1. Klicken Sie auf **"App erstellen"**
2. **App-Name**: `Invoice System Full Access`
3. **App-URL**: Leer lassen oder `https://localhost` eingeben
4. Klicken Sie auf **"App erstellen"**

### **Schritt 1.5: Berechtigungen festlegen (KRITISCH!)**

**Im Bereich "Admin API access scopes":**

✅ **Diese Berechtigungen müssen unbedingt aktiviert sein:**

| **Scope** | **Beschreibung** | **Status** |
|-----------|------------------|------------|
| `read_orders` | Bestellungen lesen | ✅ **Erforderlich** |
| `read_customers` | Kundendaten lesen | ✅ **Erforderlich** |
| `read_products` | Produkte lesen | ✅ **Erforderlich** |
| `read_inventory` | Inventar lesen | ✅ **Optional** |
| `read_fulfillments` | Versandstatus lesen | ✅ **Optional** |

**⚠️ Stellen Sie sicher, dass `read_orders` und `read_customers` aktiviert sind - sie sind am wichtigsten!**

### **Schritt 1.6: App installieren und Token erhalten**
1. Klicken Sie auf **"Speichern"**
2. Klicken Sie auf **"App installieren"**
3. Auf der Seite **"API-Zugangsdaten"**:
   - Kopieren Sie den **"Admin API access token"** (beginnt mit `shpat_`)
   - **⚠️ Speichern Sie ihn sofort - er wird nicht wieder angezeigt!**

---

## **Phase 2: Datenmaskierung (PII Masking) deaktivieren** 🔓

### **Schritt 2.1: Datenschutzeinstellungen**
1. **Shopify Admin** → **Einstellungen** → **Datenschutz** (Privacy and compliance)
2. Suchen Sie den Abschnitt **"Anfragen zu Kundendaten"**
3. Stellen Sie sicher:
   - **"Anfragen zu Kundendaten automatisch erfüllen"** = **AUS** ❌
   - **"Löschanfragen von Kunden automatisch erfüllen"** = **AUS** ❌

### **Schritt 2.2: Allgemeine Store-Einstellungen**
1. **Einstellungen** → **Allgemein**
2. Im Abschnitt **"Store-Status"**:
   - **"Passwortschutz"** = **AUS** ❌ (Passwortschutz deaktivieren)
   - **"Store-Status"** = **"Onlineshop ist live"** ✅

### **Schritt 2.3: Checkout-Einstellungen**
1. **Einstellungen** → **Checkout**
2. Im Abschnitt **"Kundeninformationen"**:
   - Wählen Sie **"Kontoerstellung nicht erforderlich"** oder **"Konten sind optional"**
3. Im Abschnitt **"Kundenkontakt"**:
   - Wählen Sie **"Kunden können mit ihrer E-Mail-Adresse auschecken"**

---

## **Phase 3: System mit neuem Token aktualisieren** ⚙️

### **Schritt 3.1: Neuen Token testen**
1. **Öffnen Sie das Terminal** im Projektordner
2. Führen Sie den Befehl aus:
```bash
node update-shopify-credentials.js
```
3. **Geben Sie den neuen Token ein**, wenn Sie dazu aufgefordert werden
4. **Stellen Sie sicher, dass der Test erfolgreich ist** - Sie sollten sehen:
   - ✅ Token test successful!
   - ✅ Customer data access: GRANTED
   - ✅ Order data access: GRANTED

### **Schritt 3.2: Systemeinstellungen aktualisieren**
Wenn der Test erfolgreich war, muss der Token im System aktualisiert werden:

**Methode 1: Datei direkt aktualisieren**
1. Öffnen Sie die Datei `/lib/shopify-settings.ts`
2. Ändern Sie `accessToken` zum neuen Token
3. Speichern Sie die Datei

**Methode 2: Umgebungsvariablen verwenden**
1. Erstellen Sie eine Datei `.env.local` im Projektstammverzeichnis
2. Fügen Sie hinzu:
```bash
SHOPIFY_ACCESS_TOKEN=shpat_IHR_NEUER_TOKEN_HIER
```

### **Schritt 3.3: System neu starten**
```bash
# System stoppen (Ctrl+C)
# Dann neu starten
npm run dev
```

---

## **Phase 4: Import einer einzelnen Bestellung testen** 🧪

### **Schritt 4.1: Umfassenden Test ausführen**
```bash
node test-single-order-import.js
```

**Was Sie sehen sollten:**
- ✅ Orders fetched successfully
- ✅ Order conversion working
- ✅ Invoice creation successful
- ✅ Address priority: Shipping → Billing → Default

### **Schritt 4.2: Ergebnisse prüfen**
Wenn Sie sehen:
- **🎉 SUCCESS: All customer data is REAL and COMPLETE!**
  - Herzlichen Glückwunsch! Das Problem ist gelöst
- **⚠️ PARTIAL SUCCESS: Some real data is visible**
  - Gut, warten Sie 24-48 Stunden
- **❌ STILL MASKED: All data is using fallbacks**
  - Weiter zur nächsten Phase

---

## **Phase 5: Test in der Benutzeroberfläche** 🖥️

### **Schritt 5.1: Zugriff auf Shopify-Integration**
1. **Öffnen Sie den Browser** und gehen Sie zu: `http://localhost:3000/shopify`
2. Klicken Sie auf den Tab **"Legacy System"**

### **Schritt 5.2: Bestellungen laden**
1. Im Abschnitt **"Von Datum"**: Geben Sie `2024-06-06` ein
2. Im Abschnitt **"Bis Datum"**: Geben Sie `2025-12-31` ein
3. Im Abschnitt **"Zahlungsstatus"**: Wählen Sie **"Alle Status"**
4. Klicken Sie auf **"Laden"**

### **Schritt 5.3: Daten prüfen**
Sie sollten jetzt sehen:
- **✅ Kunde**: Echter Name (statt "Unbekannt")
- **✅ E-Mail**: Echte E-Mail (statt "Keine E-Mail")
- **✅ Adresse**: Echte Adresse (statt "Keine Adresse")

### **Schritt 5.4: Test der Rechnungserstellung**
1. **Wählen Sie eine Bestellung aus** durch Setzen des Häkchens ✅
2. Klicken Sie auf **"Als Rechnungen erstellen"**
3. Warten Sie auf die Erfolgsmeldung
4. Klicken Sie auf das Symbol **📄**, um das PDF herunterzuladen

---

## **🔧 Fehlerbehebung**

### **Problem 1: "Ungültiger Token"**
```
❌ Error: 401 Unauthorized
```
**Lösung:**
- Stellen Sie sicher, dass der Token vollständig kopiert wurde
- Stellen Sie sicher, dass die Private App installiert ist
- Erstellen Sie einen neuen Token

### **Problem 2: "Unzureichende Berechtigungen"**
```
❌ Error: 403 Forbidden
```
**Lösung:**
- Stellen Sie sicher, dass `read_orders` und `read_customers` aktiviert sind
- Löschen Sie die App und erstellen Sie sie neu
- Warten Sie 24 Stunden

### **Problem 3: "Daten sind immer noch ausgeblendet"**
```
❌ Customer: "Unbekannt"
```
**Lösung:**
- Stellen Sie sicher, dass der Passwortschutz deaktiviert ist
- Überprüfen Sie die Datenschutzeinstellungen
- Warten Sie 48 Stunden, bis die Änderungen wirksam werden

### **Problem 4: "Keine Adressen"**
```
❌ Address: "Keine Adresse"
```
**Dies ist normal, wenn:**
- Kunden keine Adressen eingegeben haben
- Es sich um digitale Produkte handelt (kein Versand erforderlich)
- Es werden professionelle Standardadressen verwendet

---

## **✅ Erfolgszeichen**

### **Nach Anwendung der Lösung sollten Sie sehen:**

**In der Benutzeroberfläche:**
```
✅ Kunde: "Max Mustermann"
✅ E-Mail: "max@example.com"
✅ Adresse: "Musterstraße 123, 12345 Berlin"
```

**Im Rechnungs-PDF:**
- Echter Kundenname
- Vollständige und formatierte Adresse
- Korrekte E-Mail
- Alle Bestelldetails

---

## **📞 Zusätzlicher Support**

### **Wenn die Lösungen nicht funktionieren:**

1. **Shopify Support kontaktieren**
   - Bitten Sie darum, PII Masking manuell zu deaktivieren
   - Erwähnen Sie, dass Sie die Daten für die Rechnungserstellung benötigen

2. **Shop-Plan überprüfen**
   - Einige Funktionen erfordern höhere Pläne
   - Der Basic Plan könnte Einschränkungen haben

3. **Regionale GDPR-Einstellungen**
   - Europäische Shops haben strengere Regeln
   - Möglicherweise ist eine spezielle Zustimmung erforderlich

---

## **⏰ Erwarteter Zeitplan**

- **Sofort**: Private App erstellen und Token aktualisieren
- **30 Minuten**: Datenschutzeinstellungen anwenden
- **2-4 Stunden**: Erscheinen einiger Daten
- **24-48 Stunden**: Vollständiges Erscheinen aller Daten

**Das System ist technisch bereit - es wartet nur auf die echten Daten von Shopify!** 🚀
