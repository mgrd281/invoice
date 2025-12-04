# 🔐 Shopify PII Masking - Vollständige Lösung

## 🚨 **Problem identifiziert:**

Ihre Shopify-Integration zeigt nur Platzhalter, weil **PII (Personally Identifiable Information) Masking** aktiviert ist:

```
❌ Kunde: "Shopify Kunde #9693637312779"
❌ E-Mail: "Keine E-Mail" 
❌ Adresse: "Keine Adresse"
```

**Root Cause:** Shopify anonymisiert automatisch Kundendaten in bestimmten Situationen.

---

## 🎯 **Lösung: 3-Schritte-Plan**

### **Schritt 1: Shopify Private App neu erstellen** 🔧

#### **1.1 Alte App löschen (falls vorhanden)**
1. Gehen Sie zu: **Shopify Admin → Einstellungen → Apps und Vertriebskanäle**
2. Klicken Sie auf **"Apps und Vertriebskanäle verwalten"**
3. Suchen Sie nach bestehenden Private Apps
4. **Löschen Sie alle alten Private Apps**

#### **1.2 Neue Private App erstellen**
1. **Shopify Admin → Einstellungen → Apps und Vertriebskanäle**
2. **"Private Apps entwickeln" → "Private App erstellen"**
3. **App-Name:** `Invoice System Full Access`
4. **App-URL:** `https://your-domain.com` (optional)

#### **1.3 KRITISCHE Admin API-Berechtigungen setzen**

**⚠️ WICHTIG: Diese exakten Berechtigungen sind erforderlich:**

| **Bereich** | **Berechtigung** | **Zweck** |
|-------------|------------------|-----------|
| **Orders** | `read_orders` | ✅ Bestellungen lesen |
| **Customers** | `read_customers` | ✅ Kundendaten lesen |
| **Products** | `read_products` | ✅ Produktdaten lesen |
| **Inventory** | `read_inventory` | ✅ Lagerbestände lesen |
| **Fulfillments** | `read_fulfillments` | ✅ Versandstatus lesen |

#### **1.4 Webhook-Berechtigungen (optional)**
- **Orders:** `orders/create`, `orders/updated`, `orders/paid`
- **Customers:** `customers/create`, `customers/update`

#### **1.5 Private App aktivieren**
1. **"App erstellen"** klicken
2. **Access Token kopieren** (beginnt mit `shpat_`)
3. **⚠️ Token sicher speichern - wird nur einmal angezeigt!**

---

### **Schritt 2: Shopify-Einstellungen aktualisieren** ⚙️

#### **2.1 Neue Credentials in System eingeben**

Aktualisieren Sie diese Datei: `/lib/shopify-settings.ts`

```typescript
export const SHOPIFY_SETTINGS = {
  enabled: true,
  shopDomain: '45dv93-bk.myshopify.com',
  accessToken: 'IHR_NEUER_ACCESS_TOKEN_HIER', // ← Neuen Token hier einfügen
  apiVersion: '2024-01',
  autoImport: false,
  importInterval: 60,
  defaultTaxRate: 19,
  defaultPaymentTerms: 14
}
```

#### **2.2 Environment Variables setzen (empfohlen)**

Erstellen Sie `.env.local`:

```bash
SHOPIFY_SHOP_DOMAIN=45dv93-bk.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_IHR_NEUER_TOKEN_HIER
SHOPIFY_API_VERSION=2024-01
```

---

### **Schritt 3: PII Masking deaktivieren** 🔓

#### **3.1 Shopify-Einstellungen prüfen**

1. **Shopify Admin → Einstellungen → Datenschutz**
2. **"Kundendaten-Anonymisierung"** → **DEAKTIVIEREN**
3. **"GDPR-Compliance-Modus"** → **AUF MANUELL SETZEN**

#### **3.2 Store-Einstellungen überprüfen**

1. **Shopify Admin → Einstellungen → Allgemein**
2. **"Store-Status"** → Muss **"Online"** sein
3. **"Passwort-Schutz"** → **DEAKTIVIEREN**

#### **3.3 Customer Privacy Settings**

1. **Shopify Admin → Einstellungen → Checkout**
2. **"Customer information"** → **"Require customers to create an account"** ✅
3. **"Customer contact"** → **"Customers can only checkout with email"** ✅

---

## 🔧 **Technische Implementierung**

### **API-Anfrage mit vollständigen Feldern**

Aktualisierte API-Anfrage für vollständige Kundendaten:

```typescript
const fields = [
  // Order fields
  'id', 'name', 'email', 'created_at', 'updated_at',
  'total_price', 'subtotal_price', 'total_tax', 'currency',
  'financial_status', 'fulfillment_status',
  
  // Customer fields (VOLLSTÄNDIG)
  'customer[id]', 'customer[email]', 'customer[first_name]', 'customer[last_name]',
  'customer[phone]', 'customer[created_at]', 'customer[updated_at]',
  'customer[state]', 'customer[verified_email]',
  
  // Address fields (VOLLSTÄNDIG)
  'customer[default_address][first_name]', 'customer[default_address][last_name]',
  'customer[default_address][company]', 'customer[default_address][address1]',
  'customer[default_address][address2]', 'customer[default_address][city]',
  'customer[default_address][zip]', 'customer[default_address][province]',
  'customer[default_address][country]', 'customer[default_address][country_code]',
  'customer[default_address][phone]',
  
  // Billing address
  'billing_address[first_name]', 'billing_address[last_name]',
  'billing_address[company]', 'billing_address[address1]', 'billing_address[address2]',
  'billing_address[city]', 'billing_address[zip]', 'billing_address[province]',
  'billing_address[country]', 'billing_address[country_code]', 'billing_address[phone]',
  
  // Shipping address
  'shipping_address[first_name]', 'shipping_address[last_name]',
  'shipping_address[company]', 'shipping_address[address1]', 'shipping_address[address2]',
  'shipping_address[city]', 'shipping_address[zip]', 'shipping_address[province]',
  'shipping_address[country]', 'shipping_address[country_code]', 'shipping_address[phone]',
  
  // Additional fields
  'line_items', 'tax_lines', 'note', 'note_attributes'
].join(',')

const url = `https://${shopDomain}/admin/api/2024-01/orders.json?fields=${fields}&limit=250&status=any&financial_status=any`
```

### **Adress-Priorität implementiert** 🏠

```typescript
// NEUE Priorität: Billing → Shipping → Default (wie gewünscht)
const address1 = order.billing_address?.address1 ||     // 1. Rechnungsadresse
                 order.shipping_address?.address1 ||    // 2. Lieferadresse  
                 order.customer?.default_address?.address1 || '' // 3. Standard

const city = order.billing_address?.city ||
             order.shipping_address?.city ||
             order.customer?.default_address?.city ||
             order.billing_address?.province ||  // Fallback: Bundesland
             order.shipping_address?.province || ''
```

---

## 🧪 **Test-Script für Validierung**

Erstellen Sie `test-pii-fix.js`:

```javascript
#!/usr/bin/env node

async function testPIIFix() {
  console.log('🧪 Testing PII Masking Fix...')
  
  const settings = {
    shopDomain: '45dv93-bk.myshopify.com',
    accessToken: 'IHR_NEUER_TOKEN_HIER', // ← Neuen Token hier
    apiVersion: '2024-01'
  }

  const url = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders.json?limit=1&status=any&financial_status=any`
  
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': settings.accessToken,
      'Content-Type': 'application/json'
    }
  })

  if (response.ok) {
    const data = await response.json()
    const order = data.orders[0]
    
    console.log('✅ Test Results:')
    console.log(`   Customer Email: "${order.customer?.email || 'STILL MASKED'}"`)
    console.log(`   Customer Name: "${order.customer?.first_name || 'STILL MASKED'} ${order.customer?.last_name || 'STILL MASKED'}"`)
    console.log(`   Billing Address: "${order.billing_address?.address1 || 'STILL MASKED'}"`)
    
    if (order.customer?.email && order.customer?.email !== 'undefined') {
      console.log('🎉 SUCCESS: PII Masking deaktiviert!')
    } else {
      console.log('❌ FAILED: PII Masking noch aktiv')
    }
  } else {
    console.log('❌ API Error:', response.status, response.statusText)
  }
}

testPIIFix().catch(console.error)
```

---

## 🚨 **Häufige Probleme & Lösungen**

### **Problem 1: "Access Token ungültig"**
```
❌ Error: 401 Unauthorized
```
**Lösung:** 
- Neuen Private App Access Token generieren
- Token in System aktualisieren
- Cache leeren und neu starten

### **Problem 2: "Insufficient permissions"**
```
❌ Error: 403 Forbidden
```
**Lösung:**
- Private App löschen und neu erstellen
- ALLE erforderlichen Scopes aktivieren
- 24h warten (Shopify-Propagation)

### **Problem 3: "Daten noch immer maskiert"**
```
❌ Customer: "Shopify Kunde #..."
```
**Lösung:**
- Store-Passwort-Schutz deaktivieren
- GDPR-Compliance auf manuell setzen
- Customer Privacy Settings prüfen
- 48h warten (kann dauern)

### **Problem 4: "Keine Adressen verfügbar"**
```
❌ Address: "Keine Adresse"
```
**Lösung:**
- Kunden haben möglicherweise keine Adressen hinterlegt
- Bei digitalen Produkten normal
- Fallback-Adressen werden automatisch generiert

---

## ✅ **Erfolgskontrolle**

Nach der Implementierung sollten Sie sehen:

```
✅ Kunde: "Max Mustermann"
✅ E-Mail: "max@example.com"  
✅ Adresse: "Musterstraße 123, 12345 Berlin, Germany"
✅ Telefon: "+49 123 456789"
```

---

## 🔄 **Nächste Schritte**

1. **✅ Private App neu erstellen** (mit allen Scopes)
2. **✅ Access Token aktualisieren** 
3. **✅ PII Masking deaktivieren**
4. **✅ Test-Script ausführen**
5. **✅ 24-48h warten** (Shopify-Propagation)
6. **✅ Vollständige Tests durchführen**

---

## 📞 **Support**

Falls das Problem weiterhin besteht:

1. **Shopify Support kontaktieren** - PII Masking kann manchmal nur von Shopify deaktiviert werden
2. **Store-Plan prüfen** - Manche Features erfordern höhere Pläne
3. **Region-spezifische GDPR-Einstellungen** - EU-Stores haben strengere Regeln

**Wichtig:** PII Masking ist oft eine **Shopify-seitige Sicherheitsmaßnahme** und kann 24-48h dauern, bis Änderungen wirksam werden.
