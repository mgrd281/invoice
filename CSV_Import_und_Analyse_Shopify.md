
# CSV-Import und Analyse (Shopify-Bestellungen)

## Einführung

Die Fähigkeit, von Shopify exportierte CSV-Dateien zu importieren und zu analysieren, ist für unsere Anwendung von entscheidender Bedeutung, da diese Dateien den Ausgangspunkt für die Rechnungserstellung bilden. Dieser Prozess erfordert eine robuste und flexible Pipeline, die unterschiedliche Datenmengen verarbeiten, jede Zeile validieren, Fehler effizient behandeln und Datenduplizierung verhindern kann. In diesem Abschnitt werden wir detailliert beschreiben, wie Shopify-Bestell-CSV-Dateien verarbeitet werden, angefangen bei der Definition der erwarteten Spalten bis hin zur Bereitstellung eines praktischen Beispiels für eine Analyse-Pipeline mit Unit-Tests.

## Erwartete Shopify CSV-Spalten

Shopify-Bestell-CSV-Dateien enthalten normalerweise eine Vielzahl von Spalten, die umfassende Details zu Bestellungen, Kunden und Produkten bieten. Wir werden uns auf die für die Rechnungserstellung relevantesten Spalten konzentrieren und diese unserem internen Datenbankschema zuordnen. Es ist wichtig zu beachten, dass Spaltennamen je nach Shopify-Version oder Anpassungen leicht variieren können, wir gehen jedoch von einem Standardsatz von Feldern aus.

Hier ist eine Liste der typischen Spalten, die wir von einer Shopify-Bestell-CSV-Datei erwarten, und wie sie unseren internen Entitäten zugeordnet werden:

| Shopify CSV Spaltenname | Ziel-Entität (Intern) | Ziel-Feld (Intern) | Beschreibung |
| :------------------- | :--------------------- | :--------------------- | :--------------------------------------------- |
| `Name`               | `Order`                | `orderNumber`          | Eindeutige Bestellnummer in Shopify. |
| `Email`              | `Customer`             | `email`                | E-Mail-Adresse des Kunden. |
| `Financial Status`   | `Order`                | `status`               | Zahlungsstatus der Bestellung (z. B. Paid, Pending). |
| `Fulfillment Status` | `Order`                | `status`               | Erfüllungsstatus der Bestellung (z. B. Fulfilled, Unfulfilled). |
| `Subtotal`           | `Order`                | `totalNet`             | Gesamtwert der Produkte vor Steuern und Versand. |
| `Shipping`           | `Order`                | `shippingCost`         | Versandkosten (müssen möglicherweise separat behandelt werden). |
| `Taxes`              | `Order`                | `totalTax`             | Gesamtsteuern für die Bestellung. |
| `Total`              | `Order`                | `totalAmount`          | Gesamtwert der Bestellung inklusive Steuern und Versand. |
| `Currency`           | `Order`                | `currency`             | Währung der Bestellung (z. B. EUR). |
| `Lineitem quantity`  | `InvoiceItem`          | `quantity`             | Menge des Produkts in der Rechnungsposition. |
| `Lineitem name`      | `InvoiceItem`          | `description`          | Produktname/-beschreibung. |
| `Lineitem price`     | `InvoiceItem`          | `unitPrice`            | Einzelpreis des Produkts. |
| `Billing Name`       | `Customer`             | `name`                 | Name des Kunden für die Rechnungsstellung. |
| `Billing Address1`   | `Customer`             | `address`              | Erste Adresszeile des Kunden. |
| `Billing Address2`   | `Customer`             | `address`              | Zweite Adresszeile des Kunden (wird mit der ersten zusammengeführt). |
| `Billing Company`    | `Customer`             | `companyName`          | Firmenname des Kunden (falls vorhanden). |
| `Billing Zip`        | `Customer`             | `zipCode`              | Postleitzahl des Kunden. |
| `Billing City`       | `Customer`             | `city`                 | Stadt des Kunden. |
| `Billing Province`   | `Customer`             | `province`             | Bundesland/Kanton des Kunden. |
| `Billing Country`    | `Customer`             | `country`              | Land des Kunden. |
| `Shipping Name`      | `Customer`             | `shippingName`         | Name des Empfängers für den Versand. |
| `Shipping Address1`  | `Customer`             | `shippingAddress`      | Erste Adresszeile für den Versand. |
| `Shipping Address2`  | `Customer`             | `shippingAddress`      | Zweite Adresszeile für den Versand (wird mit der ersten zusammengeführt). |
| `Shipping Company`   | `Customer`             | `shippingCompanyName`  | Firmenname für den Versand (falls vorhanden). |
| `Shipping Zip`       | `Customer`             | `shippingZipCode`      | Postleitzahl für den Versand. |
| `Shipping City`      | `Customer`             | `shippingCity`         | Stadt für den Versand. |
| `Shipping Province`  | `Customer`             | `shippingProvince`     | Bundesland/Kanton für den Versand. |
| `Shipping Country`   | `Customer`             | `shippingCountry`      | Land für den Versand. |
| `Shopify ID`         | `Order`                | `shopifyOrderId`       | Eindeutige Kennung der Bestellung in Shopify. |
| `Customer ID`        | `Customer`             | `shopifyCustomerId`    | Eindeutige Kennung des Kunden in Shopify. |

**Wichtige Hinweise:**

*   **Mehrere Positionen (Line Items):** Die CSV-Datei enthält oft mehrere Zeilen für dieselbe Bestellung, wenn die Bestellung mehrere Positionen (Produkte) enthält. Diese Zeilen müssen verarbeitet werden, um sie unter einer einzigen Bestellung zu gruppieren.
*   **Finanzdaten:** Finanzfelder (wie `Subtotal`, `Shipping`, `Taxes`, `Total`, `Lineitem price`) müssen in präzise Dezimalzahlen umgewandelt werden.
*   **Adressen:** Adressfelder müssen möglicherweise zusammengeführt (z. B. `Address1` und `Address2`) oder weiter analysiert werden, um unserem internen Modell zu entsprechen.
*   **Status:** `Financial Status` und `Fulfillment Status` können verwendet werden, um den endgültigen Bestellstatus zu bestimmen.

## Robuste Analyse-Pipeline (Robust Parser Pipeline)

Um eine effiziente und zuverlässige Verarbeitung von CSV-Dateien zu gewährleisten, werden wir eine Analyse-Pipeline entwerfen, die sich durch Streaming, Speichereffizienz (memory-safe), Fehlerbehandlung, Zeilenvalidierung und Deduplizierung auszeichnet.

### Hauptkomponenten der Pipeline:

1.  **Vorab-Upload und Erstvalidierung (Pre-upload & Initial Validation):**
    *   **Dateitypprüfung:** Sicherstellen, dass die hochgeladene Datei tatsächlich eine CSV-Datei ist.
    *   **Größenbeschränkungen:** Einschränkungen für die Dateigröße durchsetzen, um Denial-of-Service (DoS)-Angriffe oder übermäßigen Ressourcenverbrauch zu verhindern.
    *   **Virenscan (optional):** In sensiblen Produktionsumgebungen kann ein Virenscan erforderlich sein.

2.  **Temporäre Speicherung (Temporary Storage):**
    *   Die hochgeladene CSV-Datei wird vorübergehend in einem S3-kompatiblen Speicher abgelegt. Dies ermöglicht eine asynchrone Verarbeitung und reduziert den Speicherverbrauch auf dem Hauptserver.

3.  **Hintergrundverarbeitung (Background Processing):**
    *   Die CSV-Analyseaufgabe wird an eine Warteschlange (Queue) zur Hintergrundverarbeitung gesendet. Dies verhindert das Blockieren der Benutzeranfrage und verbessert die Reaktionsfähigkeit des Frontends. Der Status der Upload-Aufgabe (`UploadJob`) wird in der Datenbank aktualisiert.

4.  **Streaming-Lesen (Streaming Read):**
    *   Anstatt die gesamte Datei in den Speicher zu laden, wird die CSV-Datei als Stream gelesen. Dies ist für große Dateien unerlässlich und gewährleistet Speichereffizienz.
    *   Bibliotheken wie `csv-parser` in Node.js können für die Streaming-Verarbeitung verwendet werden.

5.  **Zeilenanalyse (Row Parsing):**
    *   Jede Zeile in der CSV-Datei wird in ein JavaScript-Objekt analysiert. Der Parser muss Trennzeichen, Anführungszeichen und Sonderzeichen korrekt behandeln.

6.  **Zeilenvalidierung (Row-level Validation):**
    *   Das Schema `shopifyOrderCsvRowSchema` (definiert im Abschnitt Datenmodellierung) wird auf jede Zeile angewendet. Jede Zeile, die das Schema nicht erfüllt, wird als Fehler protokolliert und übersprungen.
    *   Fehler werden gesammelt und mit der Upload-Aufgabe (`UploadJob`) verknüpft, um den Benutzer zu informieren.

7.  **Zuordnung und Transformation (Mapping & Transformation):**
    *   Gültige Daten aus einer CSV-Zeile werden dem internen Datenmodell (`Customer`, `Order`, `InvoiceItem`) zugeordnet.
    *   Transformationen umfassen die Umwandlung von Zeichenfolgen in Zahlen (für Beträge und Mengen), das Zusammenführen von Adressfeldern und das Bestimmen des Bestellstatus basierend auf Shopify-Feldern.

8.  **Deduplizierung (Deduplication):**
    *   **Auf Bestellebene:** Eindeutige Bestellungen müssen anhand der `shopifyOrderId` oder `orderNumber` identifiziert werden. Wenn eine vorhandene Bestellung gefunden wird, wird sie aktualisiert, anstatt eine neue zu erstellen.
    *   **Auf Kundenebene:** Eindeutige Kunden müssen anhand der `shopifyCustomerId` oder `email` (falls eindeutig) identifiziert werden. Ein neuer Kunde wird nur erstellt, wenn kein vorhandener Kunde gefunden wird.
    *   **Auf Rechnungspositionsebene:** Rechnungspositionen für dieselbe Bestellung werden gruppiert.

9.  **Transaktionale Verarbeitung (Transactional Processing):**
    *   Das Speichern von Daten in der Datenbank muss als eine einzige Transaktion pro Bestellung (oder Gruppe von Bestellungen) erfolgen, um Konsistenz zu gewährleisten. Wenn ein Teil des Speicherns fehlschlägt, wird der gesamte Vorgang rückgängig gemacht.

10. **Fehlerprotokollierung und Berichterstattung (Error Logging & Reporting):**
    *   Alle Fehler (z. B. ungültige CSV-Zeilen, Datenbankfehler) werden im `AuditLog` protokolliert und mit dem `UploadJob` verknüpft. Der Benutzer wird nach Abschluss der Verarbeitung über eine Fehlerzusammenfassung informiert.

### Beispiel für eine Analyse-Pipeline (Node.js)

```typescript
// src/services/shopify-csv-parser.service.ts
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { shopifyOrderCsvRowSchema } from '../schemas/shopify-order-csv.schema';
import { CreateCustomerDto, CreateOrderDto, CreateInvoiceItemDto } from '../dtos/shopify-data.dto';

const prisma = new PrismaClient();

interface ParsedShopifyOrder {
  customer: CreateCustomerDto;
  order: CreateOrderDto;
  items: CreateInvoiceItemDto[];
}

export class ShopifyCsvParserService {
  async parseAndProcessCsv(fileStream: Readable, organizationId: string, userId: string, uploadJobId: string): Promise<void> {
    let processedRows = 0;
    let failedRows = 0;
    const errors: string[] = [];
    const ordersMap = new Map<string, ParsedShopifyOrder>(); // Map to group line items by order

    return new Promise((resolve, reject) => {
      fileStream
        .pipe(csvParser())
        .on('data', async (row: any) => {
          try {
            // Pause the stream to process data asynchronously
            fileStream.pause();

            const validatedRow = shopifyOrderCsvRowSchema.parse(row);
            const shopifyOrderId = validatedRow['Shopify ID'];

            if (!ordersMap.has(shopifyOrderId)) {
              // Initialize new order entry
              ordersMap.set(shopifyOrderId, {
                customer: this.mapCsvRowToCustomer(validatedRow, organizationId),
                order: this.mapCsvRowToOrder(validatedRow, organizationId),
                items: [],
              });
            }

            const orderEntry = ordersMap.get(shopifyOrderId);
            if (orderEntry) {
              orderEntry.items.push(this.mapCsvRowToInvoiceItem(validatedRow));
            }
            processedRows++;
          } catch (error: any) {
            failedRows++;
            errors.push(`Row ${processedRows + failedRows}: ${error.message || JSON.stringify(error)}`);
          } finally {
            // Resume the stream after processing
            fileStream.resume();
          }
        })
        .on('end', async () => {
          console.log(`CSV parsing finished. Processed: ${processedRows}, Failed: ${failedRows}`);
          await this.processGroupedOrders(Array.from(ordersMap.values()), organizationId, userId, uploadJobId, errors);
          resolve();
        })
        .on('error', (error: any) => {
          console.error('CSV Stream Error:', error);
          errors.push(`CSV Stream Error: ${error.message}`);
          prisma.uploadJob.update({
            where: { id: uploadJobId },
            data: { status: 'FAILED', errorMessage: errors.join('\n'), processedRows, failedRows },
          }).then(() => reject(error));
        });
    });
  }

  private mapCsvRowToCustomer(row: ShopifyOrderCsvRow, organizationId: string): CreateCustomerDto {
    return {
      organizationId,
      name: row['Billing Name'],
      email: row['Email'] || undefined,
      address: `${row['Billing Address1']} ${row['Billing Address2'] || ''}`.trim(),
      zipCode: row['Billing Zip'],
      city: row['Billing City'],
      country: row['Billing Country'],
      shopifyCustomerId: row['Customer ID'] || undefined,
      // companyName: row['Billing Company'] || undefined, // Add if CSV contains this field
    };
  }

  private mapCsvRowToOrder(row: ShopifyOrderCsvRow, organizationId: string): CreateOrderDto {
    const totalAmount = row['Total'];
    const totalTax = row['Taxes'];
    const subtotal = row['Subtotal'];

    return {
      organizationId,
      orderNumber: row['Name'],
      orderDate: new Date(), // Shopify CSV might have an order date field, use that if available
      totalAmount: new Prisma.Decimal(totalAmount),
      totalTax: new Prisma.Decimal(totalTax),
      totalNet: new Prisma.Decimal(subtotal),
      currency: row['Currency'],
      status: this.mapShopifyFinancialStatusToOrderStatus(row['Financial Status'], row['Fulfillment Status']),
      shopifyOrderId: row['Shopify ID'],
    };
  }

  private mapCsvRowToInvoiceItem(row: ShopifyOrderCsvRow): CreateInvoiceItemDto {
    const quantity = row['Lineitem quantity'];
    const unitPrice = row['Lineitem price'];
    const netAmount = quantity * unitPrice;
    // Assuming a default tax rate for now, this should be dynamically determined
    const taxRate = 0.19; // Example: 19% German VAT
    const taxAmount = netAmount * taxRate;
    const grossAmount = netAmount + taxAmount;

    return {
      description: row['Lineitem name'],
      quantity: new Prisma.Decimal(quantity),
      unitPrice: new Prisma.Decimal(unitPrice),
      // taxRateId: 'default-tax-rate-id', // This needs to be fetched dynamically
      netAmount: new Prisma.Decimal(netAmount),
      grossAmount: new Prisma.Decimal(grossAmount),
      taxAmount: new Prisma.Decimal(taxAmount),
    };
  }

  private mapShopifyFinancialStatusToOrderStatus(financialStatus: string, fulfillmentStatus: string): OrderStatus {
    if (financialStatus === 'paid' && fulfillmentStatus === 'fulfilled') {
      return 'COMPLETED';
    } else if (financialStatus === 'pending') {
      return 'PENDING';
    } else if (financialStatus === 'refunded' || financialStatus === 'voided') {
      return 'CANCELLED';
    }
    return 'PENDING'; // Default or other statuses
  }

  private async processGroupedOrders(groupedOrders: ParsedShopifyOrder[], organizationId: string, userId: string, uploadJobId: string, errors: string[]): Promise<void> {
    for (const groupedOrder of groupedOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Deduplicate and create/update customer
          let customer = await tx.customer.findUnique({
            where: { shopifyCustomerId: groupedOrder.customer.shopifyCustomerId || '' },
          });

          if (!customer) {
            customer = await tx.customer.create({ data: groupedOrder.customer });
          } else {
            // Update existing customer if necessary
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: groupedOrder.customer,
            });
          }

          // Deduplicate and create/update order
          let order = await tx.order.findUnique({
            where: { shopifyOrderId: groupedOrder.order.shopifyOrderId || '' },
          });

          if (!order) {
            order = await tx.order.create({
              data: { ...groupedOrder.order, customerId: customer.id },
            });
          } else {
            // Update existing order if necessary
            order = await tx.order.update({
              where: { id: order.id },
              data: { ...groupedOrder.order, customerId: customer.id },
            });
          }

          // Create invoice items (assuming they are always new for a given order import)
          for (const item of groupedOrder.items) {
            // Here, you would fetch the actual taxRateId based on the organization's configured tax rates
            // For simplicity, we'll use a placeholder or a default one.
            const defaultTaxRate = await tx.taxRate.findFirst({ where: { organizationId, isDefault: true } });
            if (!defaultTaxRate) {
              throw new Error('Default tax rate not found for organization.');
            }
            await tx.invoiceItem.create({
              data: { ...item, invoiceId: order.id, taxRateId: defaultTaxRate.id },
            });
          }

          // Optionally, trigger invoice generation here or as a separate background job
          // For now, we just process orders and items.
        });
      } catch (transactionError: any) {
        console.error(`Transaction failed for Shopify Order ID ${groupedOrder.order.shopifyOrderId}:`, transactionError);
        errors.push(`Failed to process order ${groupedOrder.order.orderNumber}: ${transactionError.message}`);
        await prisma.auditLog.create({
          data: {
            organizationId,
            userId,
            action: 'Shopify CSV Order Processing Failed',
            entityType: 'Order',
            entityId: groupedOrder.order.shopifyOrderId,
            details: { error: transactionError.message, orderData: groupedOrder.order },
          },
        });
        failedRows++;
      }
    }

    // Update the upload job status
    await prisma.uploadJob.update({
      where: { id: uploadJobId },
      data: {
        status: errors.length > 0 ? 'FAILED' : 'COMPLETED',
        errorMessage: errors.length > 0 ? errors.join('\n') : null,
        processedRows: processedRows - failedRows,
        failedRows,
      },
    });
  }
}

// src/dtos/shopify-data.dto.ts
import { Prisma } from '@prisma/client';

export interface CreateCustomerDto {
  organizationId: string;
  name: string;
  email?: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  shopifyCustomerId?: string;
}

export interface CreateOrderDto {
  organizationId: string;
  orderNumber: string;
  orderDate: Date;
  totalAmount: Prisma.Decimal;
  totalTax: Prisma.Decimal;
  totalNet: Prisma.Decimal;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  shopifyOrderId?: string;
}

export interface CreateInvoiceItemDto {
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  // taxRateId: string; // Will be added dynamically during processing
  netAmount: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
}
```

**So führen Sie diesen Code aus:**

1.  **Abhängigkeiten installieren:** Stellen Sie sicher, dass `csv-parser`, `zod` und `prisma` installiert sind.
    ```bash
    npm install csv-parser zod @prisma/client
    npm install -D prisma ts-node typescript
    npx prisma init
    ```
2.  **Prisma einrichten:** Konfigurieren Sie `schema.prisma` (wie im vorherigen Abschnitt gezeigt) und führen Sie Datenbankmigrationen durch.
    ```bash
    npx prisma migrate dev --name init
    npx prisma generate
    ```
3.  **DTOs erstellen:** Erstellen Sie die Datei `src/dtos/shopify-data.dto.ts` und kopieren Sie den obigen Inhalt.
4.  **Zod-Schema erstellen:** Erstellen Sie die Datei `src/schemas/shopify-order-csv.schema.ts` und kopieren Sie den Inhalt aus dem Abschnitt

Datenmodellierung und Validierung.
5.  **Analysedienst erstellen:** Erstellen Sie die Datei `src/services/shopify-csv-parser.service.ts` und kopieren Sie den obigen Inhalt.
6.  **Verwendungsbeispiel:** Sie können den Dienst wie folgt verwenden:
    ```typescript
    // src/app.ts (Beispiel für einen Einstiegspunkt)
    import { createReadStream } from 'fs';
    import { ShopifyCsvParserService } from './services/shopify-csv-parser.service';

    async function runParser() {
      const filePath = './sample-shopify-orders.csv'; // Pfad zu Ihrer CSV-Datei
      const organizationId = 'your-organization-id'; // Ihre Organisations-ID
      const userId = 'your-user-id'; // Ihre Benutzer-ID
      const uploadJobId = 'your-upload-job-id'; // Upload-Job-ID

      const fileStream = createReadStream(filePath);
      const parserService = new ShopifyCsvParserService();

      try {
        console.log('Starte CSV-Analyse...');
        await parserService.parseAndProcessCsv(fileStream, organizationId, userId, uploadJobId);
        console.log('CSV-Analyse erfolgreich abgeschlossen.');
      } catch (error) {
        console.error('CSV-Analyse fehlgeschlagen:', error);
      }
    }

    runParser();
    ```

## Beispiel für einen CSV-Ausschnitt

Angenommen, wir haben eine CSV-Datei mit dem Namen `sample-shopify-orders.csv` und folgendem Inhalt:

```csv
Name,Email,Financial Status,Fulfillment Status,Subtotal,Shipping,Taxes,Total,Currency,Lineitem quantity,Lineitem name,Lineitem price,Billing Name,Billing Address1,Billing Zip,Billing City,Billing Country,Shipping Name,Shipping Address1,Shipping Zip,Shipping City,Shipping Country,Shopify ID,Customer ID
#1001,kunde1@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,1,Produkt A,99.99,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,123456789,CUST1
#1002,kunde2@example.com,pending,unfulfilled,49.99,3.00,9.50,62.49,EUR,2,Produkt B,24.99,Erika Mustermann,Beispielweg 2,54321,Beispielstadt,Germany,Erika Mustermann,Beispielweg 2,54321,Beispielstadt,Germany,987654321,CUST2
#1001,kunde1@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,2,Produkt C,10.00,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,123456789,CUST1
```

**Anmerkungen zum Beispiel:**

*   Bestellung `#1001` enthält zwei Positionen (`Produkt A` und `Produkt C`), was zeigt, wie Rechnungspositionen für dieselbe Bestellung gruppiert werden.
*   Bestellung `#1002` ist eine separate Bestellung.
*   Alle für die Validierung und Zuordnung erforderlichen Felder sind enthalten.

## Vollständiges Analysebeispiel mit Unit-Tests

Um die Zuverlässigkeit der Analyse-Pipeline zu gewährleisten, ist es wichtig, umfassende Unit-Tests zu schreiben. Wir werden `jest` (oder alternativ `vitest`) verwenden, um unseren Analysedienst zu testen.

```typescript
// __tests__/shopify-csv-parser.service.test.ts
import { Readable } from 'stream';
import { ShopifyCsvParserService } from '../src/services/shopify-csv-parser.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const prisma = new PrismaClient();
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $transaction: jest.fn((callback) => callback({
      customer: {
        findUnique: jest.fn(() => null),
        create: jest.fn((data) => ({ id: 'new-customer-id', ...data.data })),
        update: jest.fn((data) => ({ id: 'existing-customer-id', ...data.data })),
      },
      order: {
        findUnique: jest.fn(() => null),
        create: jest.fn((data) => ({ id: 'new-order-id', ...data.data })),
        update: jest.fn((data) => ({ id: 'existing-order-id', ...data.data })),
      },
      invoiceItem: {
        create: jest.fn((data) => ({ id: 'new-item-id', ...data.data })),
      },
      taxRate: {
        findFirst: jest.fn(() => ({ id: 'default-tax-rate-id', rate: 0.19 })), // Mock default tax rate
      },
    })),
    uploadJob: {
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  })),
}));

describe('ShopifyCsvParserService', () => {
  let service: ShopifyCsvParserService;
  const organizationId = 'test-org-id';
  const userId = 'test-user-id';
  const uploadJobId = 'test-upload-job-id';

  beforeEach(() => {
    service = new ShopifyCsvParserService();
    // Reset mocks before each test
    (prisma.$transaction as jest.Mock).mockClear();
    (prisma.uploadJob.update as jest.Mock).mockClear();
    (prisma.auditLog.create as jest.Mock).mockClear();
  });

  it('should parse a valid CSV and process orders', async () => {
    const csvContent = `Name,Email,Financial Status,Fulfillment Status,Subtotal,Shipping,Taxes,Total,Currency,Lineitem quantity,Lineitem name,Lineitem price,Billing Name,Billing Address1,Billing Zip,Billing City,Billing Country,Shipping Name,Shipping Address1,Shipping Zip,Shipping City,Shipping Country,Shopify ID,Customer ID
#1001,kunde1@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,1,Produkt A,99.99,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,123456789,CUST1
#1001,kunde1@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,2,Produkt C,10.00,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,123456789,CUST1
#1002,kunde2@example.com,pending,unfulfilled,49.99,3.00,9.50,62.49,EUR,2,Produkt B,24.99,Erika Mustermann,Beispielweg 2,54321,Beispielstadt,Germany,Erika Mustermann,Beispielweg 2,54321,Beispielstadt,Germany,987654321,CUST2
`;
    const stream = Readable.from([csvContent]);

    await service.parseAndProcessCsv(stream, organizationId, userId, uploadJobId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2); // Two distinct orders (#1001, #1002)
    expect(prisma.uploadJob.update).toHaveBeenCalledWith({
      where: { id: uploadJobId },
      data: {
        status: 'COMPLETED',
        errorMessage: null,
        processedRows: 3,
        failedRows: 0,
      },
    });

    // Verify customer creation/update for order #1001
    expect((prisma.$transaction as jest.Mock).mock.calls[0][0]).toHaveBeenCalledWith(expect.any(Function));
    const transactionCallback1 = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    const tx1 = (await transactionCallback1(prisma));
    expect(tx1.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Max Mustermann',
        email: 'kunde1@example.com',
        shopifyCustomerId: 'CUST1',
      }),
    }));
    expect(tx1.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderNumber: '#1001',
        shopifyOrderId: '123456789',
        totalAmount: expect.any(Object), // Prisma.Decimal
      }),
    }));
    expect(tx1.invoiceItem.create).toHaveBeenCalledTimes(2); // Two items for order #1001

    // Verify customer creation/update for order #1002
    const transactionCallback2 = (prisma.$transaction as jest.Mock).mock.calls[1][0];
    const tx2 = (await transactionCallback2(prisma));
    expect(tx2.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Erika Mustermann',
        email: 'kunde2@example.com',
        shopifyCustomerId: 'CUST2',
      }),
    }));
    expect(tx2.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderNumber: '#1002',
        shopifyOrderId: '987654321',
      }),
    }));
    expect(tx2.invoiceItem.create).toHaveBeenCalledTimes(1); // One item for order #1002
  });

  it('should handle invalid rows and report errors', async () => {
    const csvContent = `Name,Email,Financial Status,Fulfillment Status,Subtotal,Shipping,Taxes,Total,Currency,Lineitem quantity,Lineitem name,Lineitem price,Billing Name,Billing Address1,Billing Zip,Billing City,Billing Country,Shipping Name,Shipping Address1,Shipping Zip,Shipping City,Shipping Country,Shopify ID,Customer ID
#1003,invalid-email,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,1,Produkt D,99.99,Invalid Customer,Invalid Address,12345,Invalid City,Germany,Invalid Customer,Invalid Address,12345,Invalid City,Germany,111222333,CUST3
#1004,kunde4@example.com,paid,fulfilled,invalid-subtotal,5.00,19.00,123.99,EUR,1,Produkt E,99.99,Valid Customer,Valid Address,12345,Valid City,Germany,Valid Customer,Valid Address,12345,Valid City,Germany,444555666,CUST4
`;
    const stream = Readable.from([csvContent]);

    await service.parseAndProcessCsv(stream, organizationId, userId, uploadJobId);

    expect(prisma.$transaction).not.toHaveBeenCalled(); // No valid orders to process
    expect(prisma.uploadJob.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: uploadJobId },
      data: expect.objectContaining({
        status: 'FAILED',
        processedRows: 0,
        failedRows: 2,
        errorMessage: expect.stringContaining('Ungültiges E-Mail-Format')
      }),
    }));
    expect(prisma.auditLog.create).not.toHaveBeenCalled(); // Audit log for transaction failures, not row validation
  });

  it('should handle database transaction failures', async () => {
    const csvContent = `Name,Email,Financial Status,Fulfillment Status,Subtotal,Shipping,Taxes,Total,Currency,Lineitem quantity,Lineitem name,Lineitem price,Billing Name,Billing Address1,Billing Zip,Billing City,Billing Country,Shipping Name,Shipping Address1,Shipping Zip,Shipping City,Shipping Country,Shopify ID,Customer ID
#1005,kunde5@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,1,Produkt F,99.99,Test Customer,Test Address,12345,Test City,Germany,Test Customer,Test Address,12345,Test City,Germany,777888999,CUST5
`;
    const stream = Readable.from([csvContent]);

    // Simulate a database error during transaction
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (callback) => {
      throw new Error('Database connection failed');
    });

    await service.parseAndProcessCsv(stream, organizationId, userId, uploadJobId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.uploadJob.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: uploadJobId },
      data: expect.objectContaining({
        status: 'FAILED',
        processedRows: 0,
        failedRows: 1,
        errorMessage: expect.stringContaining('Database connection failed'),
      }),
    }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'Shopify CSV Order Processing Failed',
        entityId: '777888999',
        details: expect.objectContaining({ error: 'Database connection failed' }),
      }),
    }));
  });
});
```

**So führen Sie Unit-Tests aus:**

1.  **Jest installieren:**
    ```bash
    npm install --save-dev jest ts-jest @types/jest
    ```
2.  **`jest.config.js` konfigurieren:**
    ```javascript
    // jest.config.js
    module.exports = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'js', 'json', 'node'],
      rootDir: './',
      testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
    };
    ```
3.  **`package.json` aktualisieren:** Fügen Sie das Testskript hinzu:
    ```json
    {
      "scripts": {
        "test": "jest"
      }
    }
    ```
4.  **Tests ausführen:**
    ```bash
    npm test
    ```

## Checkliste und Akzeptanzkriterien

*   [ ] **Dateitypprüfung:** Nur CSV-Dateien werden akzeptiert.
*   [ ] **Dateigrößenbeschränkung:** Einschränkungen für die Dateigröße werden durchgesetzt (z. B. 10 MB).
*   [ ] **Asynchrone Verarbeitung:** CSV-Dateien werden im Hintergrund über eine Warteschlange verarbeitet.
*   [ ] **Streaming-Lesen:** CSV-Dateien werden per Streaming gelesen, um übermäßigen Speicherverbrauch zu vermeiden.
*   [ ] **Zeilenvalidierung:** Jede Zeile wird mit einem Zod-Schema validiert, und Fehler werden protokolliert.
*   [ ] **Zuordnung und Transformation:** Gültige CSV-Daten werden korrekt den internen Entitäten `Customer`, `Order` und `InvoiceItem` zugeordnet.
*   [ ] **Deduplizierung:** Vorhandene Bestellungen und Kunden werden identifiziert und aktualisiert, anstatt doppelte Datensätze zu erstellen.
*   [ ] **Transaktionale Verarbeitung:** Daten werden innerhalb von Transaktionen in der Datenbank gespeichert, um Konsistenz zu gewährleisten.
*   [ ] **Fehlerprotokollierung:** Alle Fehler werden im `AuditLog` protokolliert und der Status des `UploadJob` wird aktualisiert.
*   [ ] **Unit-Tests:** Es gibt umfassende Unit-Tests, die Erfolgs- und Fehlerszenarien abdecken.
*   [ ] **Fehlermeldungen auf Deutsch:** Klare und hilfreiche Fehlermeldungen werden auf Deutsch bereitgestellt.

Damit haben wir die wesentlichen Aspekte des Imports und der Analyse von Shopify-CSV-Dateien abgedeckt, wobei der Schwerpunkt auf Robustheit, Speichereffizienz und Fehlerbehandlung liegt, ergänzt durch praktische Codebeispiele und Tests.
