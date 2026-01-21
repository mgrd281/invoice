# Kaufland Integration

Diese Anleitung erklärt, wie Sie die Kaufland-Integration nutzen, um Produkte von Ihrer Anwendung an Ihren Kaufland-Shop zu senden.

## Erstkonfiguration

1. **Öffnen Sie die Einstellungsseite:**
   - Gehen Sie zu `/settings`
   - Klicken Sie auf "Integrationen"
   - Wählen Sie "Kaufland Integration"

2. **Geben Sie die API-Schlüssel ein:**
   - Client Key: `117126fd87983cb8f6594ac288fb407e`
   - Secret Key: `6dfe294b97f943a4c5a7f8de954357842aed6303d2318b7f28d0de699f807b68`
   - Oder verwenden Sie den Button "Standard-Schlüssel verwenden", um die Schlüssel automatisch auszufüllen

3. **Verbindung testen:**
   - Klicken Sie auf "Verbindung testen", um sicherzustellen, dass die Verbindung funktioniert

4. **Einstellungen speichern:**
   - Klicken Sie auf "Speichern"

## Produkte senden

### Ein einzelnes Produkt senden

```typescript
const product = {
  ean: "1234567890123", // EAN erforderlich
  title: "Produktname",
  description: "Produktbeschreibung",
  price: 29.99,
  quantity: 100,
  sku: "SKU-123",
  images: ["https://example.com/image.jpg"],
  shippingTime: 3 // Tage (optional)
}

const response = await fetch('/api/kaufland/products/sync-single', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(product)
})
```

### Mehrere Produkte senden

```typescript
const products = [
  {
    ean: "1234567890123",
    title: "Produkt 1",
    description: "Beschreibung Produkt 1",
    price: 29.99,
    quantity: 100
  },
  {
    ean: "1234567890124",
    title: "Produkt 2",
    description: "Beschreibung Produkt 2",
    price: 39.99,
    quantity: 50
  }
]

const response = await fetch('/api/kaufland/products/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ products })
})
```

## API Endpoints

### GET `/api/kaufland/settings`
Aktuelle Kaufland-Einstellungen abrufen

### POST `/api/kaufland/settings`
Kaufland-Einstellungen speichern

### POST `/api/kaufland/test-connection`
Verbindung zur Kaufland-API testen

### POST `/api/kaufland/products/sync-single`
Ein einzelnes Produkt an Kaufland senden

### POST `/api/kaufland/products/sync`
Mehrere Produkte an Kaufland senden

### GET `/api/kaufland/products`
Produkte von Kaufland abrufen

## Produktanforderungen

- **EAN**: Erforderlich (EAN/Barcode Nummer)
- **Title**: Erforderlich (Produktname)
- **Description**: Erforderlich (Produktbeschreibung)
- **Price**: Erforderlich (Preis)
- **Quantity**: Erforderlich (Verfügbare Menge)
- **SKU**: Optional (SKU Nummer)
- **Images**: Optional (Array von Bild-URLs)
- **ShippingTime**: Optional (Versandzeit in Tagen)

## Wichtige Hinweise

1. **EAN erforderlich**: Jedes Produkt muss eine gültige EAN/Barcode haben
2. **Bilder**: Müssen direkte Bild-URLs sein
3. **Preis**: Muss in Euro (EUR) sein
4. **Menge**: Muss eine ganze Zahl sein

## Fehlerbehebung

### Fehler: "Client Key oder Secret Key fehlt"
- Stellen Sie sicher, dass Client Key und Secret Key in den Einstellungen eingegeben sind

### Fehler: "Verbindungsfehler"
- Überprüfen Sie, ob die Schlüssel korrekt sind
- Stellen Sie sicher, dass die API Basis-URL korrekt ist
- Überprüfen Sie Ihre Internetverbindung

### Fehler: "Produkt benötigt eine EAN/Barcode"
- Stellen Sie sicher, dass jedes Produkt eine gültige EAN hat

## Verwandte Dateien

- `lib/kaufland-settings.ts` - Verwaltung der Kaufland-Einstellungen
- `lib/kaufland-api.ts` - Kaufland API-Bibliothek
- `app/api/kaufland/` - API Endpoints
- `app/settings/kaufland/` - Einstellungsseite (Frontend)
