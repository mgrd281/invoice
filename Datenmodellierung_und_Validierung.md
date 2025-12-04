
# Datenmodellierung und Validierung

## Einführung

Eine solide Datenbasis ist entscheidend für den Erfolg und die Zuverlässigkeit jeder Anwendung, insbesondere wenn es um Finanzdaten und Rechnungen geht. In diesem Abschnitt definieren wir das Datenbankschema unter Verwendung von Prisma und legen Validierungsregeln mit Zod fest, um die Datenintegrität und die Einhaltung deutscher Standards sicherzustellen.

## Prisma Schema (PostgreSQL)

Das folgende Schema definiert die Datenmodelle für unsere Anwendung. Es umfasst Benutzer, Organisationen, Kunden, Bestellungen, Rechnungen und andere unterstützende Entitäten.

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  USER
  MANAGER
}

enum OrderStatus {
  PENDING
  PROCESSED
  FAILED
  CANCELLED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
  FINALIZED
}

enum UploadStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model User {
  id             String    @id @default(uuid())
  email          String    @unique
  passwordHash   String
  name           String?
  role           UserRole  @default(USER)
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  // Relations
  accounts       Account[]
  sessions       Session[]
  uploadJobs     UploadJob[]
  auditLogs      AuditLog[]
}

model Account {
  id                 String  @id @default(uuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String? @db.Text
  access_token       String? @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String? @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Organization {
  id          String    @id @default(uuid())
  name        String
  address     String?
  zipCode     String?
  city        String?
  country     String?   @default("Deutschland")
  taxId       String?   // USt-IdNr.
  iban        String?
  bic         String?
  bankName    String?
  logoUrl     String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  users       User[]
  customers   Customer[]
  invoices    Invoice[]
  orders      Order[]
  taxRates    TaxRate[]
  uploadJobs  UploadJob[]
  auditLogs   AuditLog[]
  shopifyConnection ShopifyConnection?
}

model Customer {
  id             String    @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  shopifyCustomerId String? // External ID from Shopify
  name           String
  email          String?
  address        String?
  zipCode        String?
  city           String?
  country        String?
  taxId          String?   // USt-IdNr.
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  invoices       Invoice[]
  orders         Order[]

  @@unique([organizationId, shopifyCustomerId])
}

model Order {
  id             String    @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  customerId     String
  customer       Customer  @relation(fields: [customerId], references: [id])
  shopifyOrderId String?   @unique // External ID from Shopify
  orderNumber    String
  orderDate      DateTime
  totalAmount    Decimal   @db.Decimal(10, 2)
  currency       String    @default("EUR")
  status         OrderStatus @default(PENDING)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  invoices       Invoice[] // An order can be converted to one or more invoices
}

model Invoice {
  id             String    @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  customerId     String
  customer       Customer  @relation(fields: [customerId], references: [id])
  orderId        String?
  order          Order?    @relation(fields: [orderId], references: [id])
  templateId     String?   // ID of the template used
  
  invoiceNumber  String    // Sequential invoice number (fortlaufende Rechnungsnummer)
  issueDate      DateTime  // Ausstellungsdatum
  serviceDate    DateTime? // Leistungsdatum
  dueDate        DateTime  // Fälligkeitsdatum
  
  status         InvoiceStatus @default(DRAFT)
  currency       String    @default("EUR")
  
  totalNet       Decimal   @db.Decimal(10, 2)
  totalGross     Decimal   @db.Decimal(10, 2)
  totalTax       Decimal   @db.Decimal(10, 2)
  
  pdfUrl         String?   // URL to stored PDF in S3
  immutableHash  String?   // Hash of the finalized invoice for immutability check
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  items          InvoiceItem[]
  payments       Payment[]
  auditLog       AuditLog? @relation(fields: [auditLogId], references: [id])
  auditLogId     String?

  @@unique([organizationId, invoiceNumber])
}

model InvoiceItem {
  id            String    @id @default(uuid())
  invoiceId     String
  invoice       Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  description   String
  quantity      Decimal   @db.Decimal(10, 2)
  unitPrice     Decimal   @db.Decimal(10, 2)
  taxRateId     String
  taxRate       TaxRate   @relation(fields: [taxRateId], references: [id])
  netAmount     Decimal   @db.Decimal(10, 2)
  grossAmount   Decimal   @db.Decimal(10, 2)
  taxAmount     Decimal   @db.Decimal(10, 2)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model TaxRate {
  id             String    @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  rate           Decimal   @db.Decimal(5, 4) // e.g., 0.19 for 19%
  isDefault      Boolean   @default(false)
  invoiceItems   InvoiceItem[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([organizationId, name])
}

model Payment {
  id            String    @id @default(uuid())
  invoiceId     String
  invoice       Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  amount        Decimal   @db.Decimal(10, 2)
  paymentDate   DateTime
  method        String
  transactionId String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model UploadJob {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  userId         String
  user           User         @relation(fields: [userId], references: [id])
  fileName       String
  fileUrl        String
  status         UploadStatus @default(PENDING)
  totalRows      Int?
  processedRows  Int?
  failedRows     Int?
  errorMessage   String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model AuditLog {
  id             String    @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  userId         String?
  user           User?     @relation(fields: [userId], references: [id])
  action         String
  entityType     String
  entityId       String?
  details        Json?
  ipAddress      String?
  createdAt      DateTime  @default(now())

  invoices       Invoice[] // For linking finalized invoices to their audit log entry
}

model ShopifyConnection {
  id             String       @id @default(uuid())
  organizationId String       @unique // One-to-one per organization
  organization   Organization @relation(fields: [organizationId], references: [id])
  shopName       String
  accessToken    String // Encrypted
  scopes         String
  isActive       Boolean      @default(true)
  lastSyncAt     DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

**Anmerkungen zum Prisma-Schema:**

*   **Benutzerdefinierte Typen (Enums):** `UserRole`, `OrderStatus`, `InvoiceStatus` und `UploadStatus` wurden definiert, um spezifische und kontrollierte Werte für relevante Felder bereitzustellen.
*   **`@default(uuid())`:** Wird verwendet, um automatisch eindeutige UUIDs zu generieren, wenn ein neuer Datensatz erstellt wird.
*   **`@default(now())` und `@updatedAt`:** Werden verwendet, um Zeitstempel automatisch zu verwalten.
*   **`@unique`:** Stellt sicher, dass Werte im angegebenen Feld eindeutig sind.
*   **`@relation`:** Definiert Beziehungen zwischen Tabellen. `onDelete: Cascade` bedeutet, dass beim Löschen eines Benutzers alle zugehörigen Sitzungen und Konten automatisch gelöscht werden.
*   **`@db.Decimal(10, 2)` und `@db.Decimal(5, 4)`:** Definiert die Genauigkeit und den Bereich von Dezimalzahlen, was für Finanzdaten entscheidend ist.
*   **`Json?`:** Ermöglicht das Speichern flexibler JSON-Daten im Feld `details` von `AuditLog`.
*   **`@@unique([field1, field2])`:** Wird verwendet, um Eindeutigkeit über eine Kombination von Feldern zu erzwingen, z. B. `[organizationId, shopifyCustomerId]`, um sicherzustellen, dass eine Shopify-Kunden-ID innerhalb jeder Organisation eindeutig ist.
*   **Token:** `refreshToken` und `accessToken` in `Account` sowie `accessToken` in `ShopifyConnection` sollten beim Speichern in der Datenbank verschlüsselt werden, um die Sicherheit zu erhöhen.

## Validierungsschemata (Validation Schemas)

Wir werden die Bibliothek [Zod](https://zod.dev/) verwenden, um Validierungsschemata in TypeScript zu definieren. Zod bietet eine robuste und typsichere Möglichkeit, eingehende Daten zu validieren, um sicherzustellen, dass die Daten den definierten Regeln entsprechen, bevor sie verarbeitet oder gespeichert werden. Wir werden Schemata zur Validierung von importierten CSV-Zeilen und API-Payloads definieren.

### 1. Validierung von CSV-Zeilen (Shopify-Bestellungen)

Beim Importieren von CSV-Dateien aus Shopify müssen wir jede Zeile validieren, um sicherzustellen, dass die Daten vollständig und korrekt sind, bevor wir versuchen, sie zu verarbeiten und in interne Entitäten (wie `Order` und `Customer`) umzuwandeln. Wir gehen davon aus, dass die CSV-Datei typische Felder für Shopify-Bestellungen enthält. Diese Felder müssen unserem internen Schema zugeordnet werden.

```typescript
// src/schemas/shopify-order-csv.schema.ts
import { z } from 'zod';

export const shopifyOrderCsvRowSchema = z.object({
  'Order Name': z.string().min(1, { message: 'Order Name darf nicht leer sein.' }),
  'Email': z.string().email({ message: 'Ungültiges E-Mail-Format.' }).optional().or(z.literal('')), // Optional, but if present, must be valid email
  'Financial Status': z.string().min(1, { message: 'Financial Status darf nicht leer sein.' }),
  'Fulfillment Status': z.string().min(1, { message: 'Fulfillment Status darf nicht leer sein.' }),
  'Subtotal': z.string().regex(/^\d+(\.\d{1,2})?$/, { message: 'Ungültiges Subtotal-Format.' }).transform(Number), // Convert to number
  'Shipping': z.string().regex(/^\d+(\.\d{1,2})?$/, { message: 'Ungültiges Shipping-Format.' }).transform(Number),
  'Taxes': z.string().regex(/^\d+(\.\d{1,2})?$/, { message: 'Ungültiges Taxes-Format.' }).transform(Number),
  'Total': z.string().regex(/^\d+(\.\d{1,2})?$/, { message: 'Ungültiges Total-Format.' }).transform(Number),
  'Currency': z.string().length(3, { message: 'Währung muss 3 Zeichen lang sein.' }).default('EUR'),
  'Lineitem quantity': z.string().regex(/^\d+$/, { message: 'Ungültiges Mengenformat.' }).transform(Number),
  'Lineitem name': z.string().min(1, { message: 'Lineitem Name darf nicht leer sein.' }),
  'Lineitem price': z.string().regex(/^\d+(\.\d{1,2})?$/, { message: 'Ungültiges Lineitem Price-Format.' }).transform(Number),
  'Billing Name': z.string().min(1, { message: 'Billing Name darf nicht leer sein.' }),
  'Billing Address1': z.string().min(1, { message: 'Billing Address1 darf nicht leer sein.' }),
  'Billing Zip': z.string().min(1, { message: 'Billing Zip darf nicht leer sein.' }),
  'Billing City': z.string().min(1, { message: 'Billing City darf nicht leer sein.' }),
  'Billing Country': z.string().min(1, { message: 'Billing Country darf nicht leer sein.' }).default('Germany'),
  'Shipping Name': z.string().min(1, { message: 'Shipping Name darf nicht leer sein.' }),
  'Shipping Address1': z.string().min(1, { message: 'Shipping Address1 darf nicht leer sein.' }),
  'Shipping Zip': z.string().min(1, { message: 'Shipping Zip darf nicht leer sein.' }),
  'Shipping City': z.string().min(1, { message: 'Shipping City darf nicht leer sein.' }),
  'Shipping Country': z.string().min(1, { message: 'Shipping Country darf nicht leer sein.' }).default('Germany'),
  'Shopify ID': z.string().min(1, { message: 'Shopify ID darf nicht leer sein.' }),
  // Add other relevant Shopify CSV fields as needed
});

export type ShopifyOrderCsvRow = z.infer<typeof shopifyOrderCsvRowSchema>;
```

**Anmerkungen zum Schema `shopifyOrderCsvRowSchema`:**

*   **`z.string().min(1)`:** Stellt sicher, dass das Feld vorhanden und nicht leer ist.
*   **`z.string().email().optional().or(z.literal(''))`:** Erlaubt, dass das E-Mail-Feld optional oder eine leere Zeichenfolge ist, aber wenn es vorhanden ist, muss es ein gültiges E-Mail-Format haben.
*   **`z.string().regex(...).transform(Number)`:** Wird verwendet, um sicherzustellen, dass das Feld einem numerischen Muster entspricht (mit Unterstützung für Dezimalzahlen), und wandelt es dann in den Typ `Number` um.
*   **`default()`:** Bietet einen Standardwert, wenn das Feld fehlt.
*   **Fehlermeldungen auf Deutsch:** Es wurden klare und spezifische Fehlermeldungen auf Deutsch bereitgestellt, um Benutzer besser anzuleiten.

### 2. Validierung von API-Payloads (API Payloads)

Wir werden Zod-Schemata für API-Payloads definieren, um sicherzustellen, dass die an das Backend gesendeten Daten gültig sind. Zum Beispiel ein Schema zum Erstellen einer neuen Rechnung.

```typescript
// src/schemas/invoice.schema.ts
import { z } from 'zod';

export const createInvoiceSchema = z.object({
  organizationId: z.string().uuid({ message: 'Ungültige Organisations-ID.' }),
  customerId: z.string().uuid({ message: 'Ungültige Kunden-ID.' }),
  orderId: z.string().uuid({ message: 'Ungültige Bestell-ID.' }).optional(),
  templateId: z.string().uuid({ message: 'Ungültige Vorlagen-ID.' }),
  issueDate: z.string().datetime({ message: 'Ungültiges Ausstellungsdatum-Format.' }),
  serviceDate: z.string().datetime({ message: 'Ungültiges Leistungsdatum-Format.' }).optional(),
  dueDate: z.string().datetime({ message: 'Ungültiges Fälligkeitsdatum-Format.' }),
  currency: z.string().length(3, { message: 'Währung muss 3 Zeichen lang sein.' }).default('EUR'),
  items: z.array(z.object({
    description: z.string().min(1, { message: 'Beschreibung darf nicht leer sein.' }),
    quantity: z.number().positive({ message: 'Menge muss positiv sein.' }),
    unitPrice: z.number().positive({ message: 'Einzelpreis muss positiv sein.' }),
    taxRateId: z.string().uuid({ message: 'Ungültige Steuersatz-ID.' }),
  })).min(1, { message: 'Mindestens ein Rechnungsposten erforderlich.' }),
});

export type CreateInvoicePayload = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  id: z.string().uuid({ message: 'Ungültige Rechnungs-ID.' }),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'], { message: 'Ungültiger Rechnungsstatus.' }).optional(),
});

export type UpdateInvoicePayload = z.infer<typeof updateInvoiceSchema>;
```

**Anmerkungen zu API-Schemata:**

*   **`z.string().uuid()`:** Überprüft, ob die Zeichenfolge eine gültige UUID ist.
*   **`z.string().datetime()`:** Überprüft, ob die Zeichenfolge ein gültiges Datums- und Zeitformat hat.
*   **`z.array(...).min(1)`:** Stellt sicher, dass das Array mindestens ein Element enthält.
*   **`z.number().positive()`:** Stellt sicher, dass die Zahl positiv ist.
*   **`createInvoiceSchema.partial().extend(...)`:** Zeigt, wie ein Aktualisierungsschema erstellt wird, indem alle Felder optional gemacht und dann neue Felder hinzugefügt oder bestehende Felder geändert werden.
*   **`z.enum(...)`:** Beschränkt die zulässigen Werte für das Feld `status` auf eine vordefinierte Menge.

### 3. Deutsche Rechnungsanforderungen (Constraints)

Um die Einhaltung der gesetzlichen Anforderungen für deutsche Rechnungen sicherzustellen, müssen folgende Einschränkungen auf Anwendungs- und Datenbankebene angewendet werden:

*   **`fortlaufende Rechnungsnummer`:** Jede Rechnung muss eine eindeutige und fortlaufende Nummer innerhalb der Organisation haben. Dies wird durch das eindeutige Feld `invoiceNumber` in der Tabelle `Invoice` in Verbindung mit `organizationId` erzwungen.
*   **`Ausstellungsdatum`:** Das Feld `issueDate` ist in der Tabelle `Invoice` obligatorisch.
*   **`Leistungsdatum`:** Das Feld `serviceDate` ist optional, wird aber in der Tabelle `Invoice` empfohlen.
*   **`USt-IdNr.`:** Das Feld `taxId` in `Organization` und `Customer` ist optional, aber in bestimmten Kontexten erforderlich (z. B. B2B-Rechnungen innerhalb der EU).
*   **`Steuersätze (z. B. 19%/7%)`:** Werden in der Tabelle `TaxRate` gespeichert und auf `InvoiceItem` angewendet.
*   **`Netto/Brutto`:** Netto- und Bruttobeträge sowie Steuerbeträge müssen für jeden Rechnungsposten und die Gesamtrechnung klar berechnet und angezeigt werden.
*   **`IBAN/BIC`:** Die Felder `iban` und `bic` in `Organization` sind optional, werden aber empfohlen, um Zahlungsinformationen in Rechnungen aufzunehmen.
*   **`Adresse/PLZ/Ort`:** Vollständige Adressfelder sind sowohl für die Organisation als auch für den Kunden erforderlich.
*   **`vollständige Anbieter-/Kundenangaben`:** Rechnungen müssen vollständige Informationen sowohl über den Rechnungsaussteller (Organisation) als auch über den Kunden enthalten.

## Fazit

Durch dieses sorgfältige Design des Datenbankschemas und der Validierungsschemata stellen wir sicher, dass die Anwendung Finanzdaten sicher, konsistent und in Übereinstimmung mit den deutschen gesetzlichen Anforderungen verarbeitet. Die Verwendung von Prisma und Zod bietet eine solide Grundlage für die Entwicklung einer stabilen und wartbaren Anwendung.
