
# Rechnungserstellung (PDF auf Deutsch)

## Einführung

Professionelle und genaue Rechnungen in deutscher Sprache sind das Herzstück dieser Anwendung. In diesem Abschnitt konzentrieren wir uns auf das Design und die Generierung von PDF-Rechnungen, die nicht nur ästhetischen Anforderungen genügen, sondern auch strengen deutschen Rechtsnormen entsprechen. Wir werden ein Standard-Rechnungslayout definieren, Optionen für austauschbare Vorlagen bereitstellen und zeigen, wie PDF-Dateien per Code generiert werden, mit Unterstützung für die Bearbeitung vor der Fertigstellung der Rechnung.

## Professionelles Standard-Rechnungslayout

Um ein professionelles und konsistentes Erscheinungsbild zu gewährleisten, werden wir ein Standard-Rechnungslayout entwerfen, das Best Practices im Design berücksichtigt und leicht lesbar ist. Dieses Layout umfasst folgende Elemente:

### 1. Typografie-Hierarchie (Typography Hierarchy)

*   **Haupttitel (Rechnung):** Groß und deutlich, normalerweise oben auf der Seite.
*   **Abschnittsüberschriften (z. B. Rechnungsdaten, Kundendaten, Positionen):** Kleiner als der Haupttitel, aber deutlich, um den Inhalt zu unterteilen.
*   **Fließtext (Body Text):** Standard-Schriftgröße für gute Lesbarkeit, mit angemessenem Zeilenabstand.
*   **Schriftarten:** Verwendung professioneller und gut lesbarer Schriftarten (z. B. Open Sans, Roboto, Lato), um Klarheit auf Geräten und im Druck zu gewährleisten.

### 2. Abstände und Layout (Spacing and Layout)

*   **Ränder (Margins):** Ausreichend breite Ränder, um der Rechnung ein sauberes und geordnetes Aussehen zu verleihen.
*   **Elementabstand (Element Spacing):** Konsistenter Abstand zwischen Textblöcken, Tabellen und Logos zur Verbesserung der Lesbarkeit.
*   **Rasterlayout (Grid Layout):** Verwendung eines Rastersystems zur konsistenten Anordnung von Elementen, um eine präzise Ausrichtung zu gewährleisten.

### 3. Tabellenlayout (Table Layout)

*   **Positionstabelle:** Der wichtigste Teil der Rechnung. Sie muss klar und gut strukturiert sein.
    *   **Spalten:** `Artikel` (Produkt/Beschreibung), `Menge`, `Einzelpreis`, `MwSt.`, `Gesamt Netto`, `Gesamt Brutto`.
    *   **Formatierung:** Zahlen rechtsbündig, Text linksbündig. Leichte Trennlinien zwischen Zeilen und Spalten zur Verbesserung der Klarheit.
    *   **Summen:** Zwischensummen, Steuern und Gesamtsummen müssen am Ende der Tabelle deutlich und hervorgehoben sein.

### 4. Logo und Branding

*   **Position:** Normalerweise in der oberen linken oder rechten Ecke der Rechnung.
*   **Größe:** Angemessene Größe, die den Inhalt nicht dominiert, aber deutlich sichtbar ist.
*   **Farben:** Verwendung neutraler Farben (z. B. Weiß, Grau, Schwarz) als Grundfarbe, mit der Möglichkeit, die Markenfarbe als Sekundärfarbe zur Hervorhebung zu verwenden.

### 5. Farben

*   **Farbpalette:** Bevorzugt wird eine neutrale und professionelle Farbpalette (z. B. Graustufen, Dunkelblau, Dunkelgrün), um ein elegantes und nicht ablenkendes Erscheinungsbild zu gewährleisten.
*   **Akzentfarben:** Ein oder zwei Markenfarben können sparsam als Akzente für Überschriften oder Buttons verwendet werden.

## Austauschbare deutsche Vorlagen (Classic/Minimal)

Die Anwendung bietet zwei Optionen für Rechnungsvorlagen, um unterschiedlichen Vorlieben gerecht zu werden, mit der Möglichkeit zur Anpassung des Brandings:

1.  **Klassische Vorlage (Classic):** Traditionelles, formelles Design mit vollständigen Details und strukturiertem Layout.
2.  **Minimale Vorlage (Minimal):** Sauberes, modernes Design, das sich auf das Wesentliche konzentriert, mit viel Weißraum.

### Anpassbares Branding (Switchable Branding)

Folgende Elemente sind für jede Vorlage anpassbar:

*   **Logo:** Benutzer können ihr eigenes Logo hochladen.
*   **Farben:** Auswahl einer Primär- und Sekundärfarbe, die zur Marke passt.
*   **Fußzeile:** Benutzerdefinierter Inhalt in der Fußzeile (z. B. Kontaktinformationen, Bankverbindung, rechtliche Hinweise).
*   **AGB/Impressum:** Spezifische Rechtstexte können in die Rechnung aufgenommen oder auf eine separate Seite verlinkt werden.

## PDF-Generierung per Code (Playwright für HTML->PDF)

Wir werden Playwright verwenden, um HTML/CSS-Inhalte in PDF-Dateien umzuwandeln. Dieser Ansatz bietet große Flexibilität im Design, da wir Standard-Webtechnologien (HTML, CSS) verwenden können, um Rechnungen zu gestalten, und diese dann präzise in PDF umwandeln. Dies ermöglicht auch die Wiederverwendung von Frontend-Komponenten für das Rechnungsdesign.

### Schritte zur PDF-Generierung:

1.  **HTML-Inhalt erstellen:** Rechnungsdaten werden in einer HTML-Vorlage zusammengestellt. Diese Vorlage verwendet Tailwind CSS (oder ein anderes CSS) für das Styling.
2.  **Headless Browser starten:** Playwright wird im Headless-Modus (ohne grafische Oberfläche) gestartet.
3.  **HTML-Inhalt laden:** Der generierte HTML-Inhalt wird in die Browserseite geladen.
4.  **PDF generieren:** Die Funktion `page.pdf()` von Playwright wird verwendet, um die PDF-Datei zu erstellen.

### Code-Beispiel (Node.js mit Playwright)

```typescript
// src/services/invoice-pdf.service.ts
import playwright from 'playwright';
import { Invoice, Customer, Organization, InvoiceItem, TaxRate } from '@prisma/client';
import { renderInvoiceHtml } from './invoice-html-renderer.service'; // Wir werden dies später erstellen

export class InvoicePdfService {
  async generatePdf(invoice: Invoice & { customer: Customer; organization: Organization; items: (InvoiceItem & { taxRate: TaxRate })[] }): Promise<Buffer> {
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();

    // Render HTML content for the invoice
    const htmlContent = renderInvoiceHtml(invoice); // This function will generate the HTML string

    // Set the HTML content to the page
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });

    await browser.close();
    return pdfBuffer;
  }
}

// src/services/invoice-html-renderer.service.ts
import { Invoice, Customer, Organization, InvoiceItem, TaxRate } from '@prisma/client';

export function renderInvoiceHtml(invoice: Invoice & { customer: Customer; organization: Organization; items: (InvoiceItem & { taxRate: TaxRate })[] }): string {
  const { customer, organization, items } = invoice;

  // Helper function to format currency
  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: invoice.currency }).format(Number(amount));
  };

  // Helper function to format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE').format(date);
  };

  // Calculate total tax amounts per rate
  const taxSummary = items.reduce((acc, item) => {
    const rate = item.taxRate.rate.toNumber();
    if (!acc[rate]) {
      acc[rate] = { net: 0, tax: 0 };
    }
    acc[rate].net += item.netAmount.toNumber();
    acc[rate].tax += item.taxAmount.toNumber();
    return acc;
  }, {} as Record<number, { net: number; tax: number }>);

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rechnung ${invoice.invoiceNumber}</title>
        <style>
            /* Tailwind CSS would be compiled here or linked from a CDN */
            body {
                font-family: 'Open Sans', sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
                font-size: 10pt;
            }
            .container {
                width: 100%;
                max-width: 210mm; /* A4 width */
                margin: 0 auto;
                padding: 20mm;
                box-sizing: border-box;
            }
            .header,
            .footer {
                width: 100%;
                position: fixed;
                left: 0;
                right: 0;
                background-color: #fff;
            }
            .header {
                top: 0;
                padding: 10mm 20mm 0;
                border-bottom: 1px solid #eee;
            }
            .footer {
                bottom: 0;
                padding: 0 20mm 10mm;
                border-top: 1px solid #eee;
                text-align: center;
                font-size: 8pt;
            }
            .invoice-details,
            .customer-details,
            .company-details {
                margin-bottom: 20px;
            }
            .invoice-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            .invoice-table th,
            .invoice-table td {
                border: 1px solid #eee;
                padding: 8px;
                text-align: left;
            }
            .invoice-table th {
                background-color: #f9f9f9;
                font-weight: bold;
            }
            .text-right {
                text-align: right;
            }
            .total-summary {
                margin-top: 20px;
                width: 40%;
                float: right;
                border: 1px solid #eee;
                padding: 10px;
            }
            .total-summary div {
                display: flex;
                justify-content: space-between;
                padding: 3px 0;
            }
            .total-summary .grand-total {
                font-weight: bold;
                font-size: 1.1em;
                border-top: 1px solid #eee;
                margin-top: 5px;
                padding-top: 5px;
            }
            .clearfix::after {
                content: "";
                clear: both;
                display: table;
            }
            .logo {
                max-width: 150px;
                height: auto;
                float: right;
            }
            .company-info {
                float: left;
            }
            .invoice-header-info {
                float: right;
                text-align: right;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header clearfix">
                ${organization.logoUrl ? `<img src="${organization.logoUrl}" alt="Company Logo" class="logo">` : ''}
                <div class="company-info">
                    <strong>${organization.name}</strong><br>
                    ${organization.address}<br>
                    ${organization.zipCode} ${organization.city}<br>
                    ${organization.country}<br>
                    ${organization.taxId ? `USt-IdNr.: ${organization.taxId}<br>` : ''}
                </div>
                <div class="invoice-header-info">
                    <h1>RECHNUNG</h1>
                    <p><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}</p>
                    <p><strong>Datum:</strong> ${formatDate(invoice.issueDate)}</p>
                    ${invoice.serviceDate ? `<p><strong>Leistungsdatum:</strong> ${formatDate(invoice.serviceDate)}</p>` : ''}
                    <p><strong>Fälligkeitsdatum:</strong> ${formatDate(invoice.dueDate)}</p>
                </div>
            </div>

            <div style="height: 100mm;"></div> <!-- Placeholder for header height -->

            <div class="customer-details">
                <h3>Rechnung an:</h3>
                <strong>${customer.name}</strong><br>
                ${customer.address}<br>
                ${customer.zipCode} ${customer.city}<br>
                ${customer.country}<br>
                ${customer.taxId ? `USt-IdNr.: ${customer.taxId}<br>` : ''}
            </div>

            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Artikel</th>
                        <th class="text-right">Menge</th>
                        <th class="text-right">Einzelpreis</th>
                        <th class="text-right">MwSt.</th>
                        <th class="text-right">Gesamt Netto</th>
                        <th class="text-right">Gesamt Brutto</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td class="text-right">${item.quantity.toFixed(2)}</td>
                            <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                            <td class="text-right">${(item.taxRate.rate.toNumber() * 100).toFixed(0)}%</td>
                            <td class="text-right">${formatCurrency(item.netAmount)}</td>
                            <td class="text-right">${formatCurrency(item.grossAmount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total-summary clearfix">
                <div><span>Zwischensumme Netto:</span> <span>${formatCurrency(invoice.totalNet)}</span></div>
                ${Object.entries(taxSummary).map(([rate, totals]) => `
                    <div><span>MwSt. ${Number(rate) * 100}% (${formatCurrency(totals.net)} Netto):</span> <span>${formatCurrency(totals.tax)}</span></div>
                `).join('')}
                <div class="grand-total"><span>Gesamtbetrag Brutto:</span> <span>${formatCurrency(invoice.totalGross)}</span></div>
            </div>

            <div style="clear: both; margin-top: 50px;">
                <h3>Zahlungsinformationen:</h3>
                <p>
                    Bitte überweisen Sie den Gesamtbetrag von <strong>${formatCurrency(invoice.totalGross)}</strong> bis zum ${formatDate(invoice.dueDate)} auf folgendes Konto:
                </p>
                <p>
                    <strong>Bank:</strong> ${organization.bankName || 'Ihre Bank'}<br>
                    <strong>IBAN:</strong> ${organization.iban || 'DEXXXXXXXXXXXXXXXXXXXXXX'}<br>
                    <strong>BIC:</strong> ${organization.bic || 'XXXXXXXXXXX'}<br>
                </p>
            </div>

            <div class="footer">
                <p>
                    ${organization.name} | ${organization.address}, ${organization.zipCode} ${organization.city} | USt-IdNr.: ${organization.taxId || 'DEXXXXXXXXX'}
                    <br>
                    ${organization.iban ? `IBAN: ${organization.iban} | BIC: ${organization.bic}` : ''}
                    <br>
                    ${/* Add AGB/Impressum links or text here based on template settings */ ''}
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}
```

**So führen Sie diesen Code aus:**

1.  **Playwright installieren:**
    ```bash
    npm install playwright @prisma/client
    npx playwright install chromium
    ```
2.  **Dienstdateien erstellen:** Erstellen Sie die Dateien `src/services/invoice-pdf.service.ts` und `src/services/invoice-html-renderer.service.ts` und kopieren Sie den obigen Inhalt.
3.  **Verwendungsbeispiel:**
    ```typescript
    // src/app.ts (Beispiel für einen Einstiegspunkt)
    import { InvoicePdfService } from './services/invoice-pdf.service';
    import { PrismaClient } from '@prisma/client';
    import { writeFileSync } from 'fs';

    const prisma = new PrismaClient();

    async function generateSampleInvoice() {
      // Dies ist ein Beispiel für Dummy-Rechnungsdaten. In einer echten App kommen diese Daten aus der Datenbank.
      const sampleInvoice = await prisma.invoice.findFirst({
        where: { invoiceNumber: '20230001' }, // Suchen Sie eine vorhandene Rechnung oder erstellen Sie eine zum Testen
        include: {
          customer: true,
          organization: true,
          items: { include: { taxRate: true } },
        },
      });

      if (!sampleInvoice) {
        console.error('Beispielrechnung nicht gefunden. Bitte erstellen Sie zuerst eine in der Datenbank.');
        return;
      }

      const pdfService = new InvoicePdfService();
      try {
        const pdfBuffer = await pdfService.generatePdf(sampleInvoice);
        writeFileSync('./sample-invoice.pdf', pdfBuffer);
        console.log('Beispielrechnung PDF erfolgreich generiert: sample-invoice.pdf');
      } catch (error) {
        console.error('Fehler beim Generieren der PDF:', error);
      }
    }

    generateSampleInvoice();
    ```

## Unterstützung für Bearbeitung vor Fertigstellung (Entwurf vs. Finalisiert)

Um Flexibilität und Compliance zu gewährleisten, unterstützen Rechnungen zwei Hauptstatus:

1.  **Entwurfsstatus (Draft State):**
    *   **Vollständige Bearbeitung:** Alle Rechnungsdetails (Positionen, Mengen, Preise, Adressen usw.) können bearbeitet werden.
    *   **Keine Unveränderlichkeit:** In dieser Phase gelten keine Einschränkungen für Änderungen.
    *   **Temporäre Speicherung:** Entwürfe werden regelmäßig gespeichert (Autosave), um Datenverlust zu vermeiden.
    *   **Rechnungsnummer:** Möglicherweise wird erst bei Fertigstellung eine endgültige Rechnungsnummer zugewiesen.

2.  **Finalisierter Status (Finalized State):**
    *   **Unveränderlichkeit (Immutability):** Sobald eine Rechnung finalisiert ist, wird sie unveränderlich. Dies ist entscheidend für die Einhaltung deutscher Gesetze.
    *   **Hash (Immutable Hash):** Ein eindeutiger Hash des gesamten Rechnungsinhalts (einschließlich aller Daten und Texte) wird generiert und im Feld `immutableHash` der Tabelle `Invoice` gespeichert. Dieser Hash kann verwendet werden, um zu überprüfen, ob die Rechnung nach der Fertigstellung geändert wurde.
    *   **Audit-Protokoll (Audit Log):** Das Ereignis der Rechnungsfertigstellung wird im `AuditLog` protokolliert, wobei die `auditLogId` mit der Rechnung verknüpft ist. Das Audit-Protokoll enthält, wer die Rechnung wann finalisiert hat.
    *   **Fortlaufende Rechnungsnummer:** Bei der Fertigstellung wird der Rechnung eine fortlaufende und eindeutige Rechnungsnummer zugewiesen.

### Prozess der Rechnungsfertigstellung:

1.  Der Benutzer überprüft die Rechnung im Entwurfsstatus.
2.  Der Benutzer klickt auf die Schaltfläche **Rechnung finalisieren**.
3.  Das System führt eine letzte Datenvalidierung durch.
4.  Eine neue fortlaufende Rechnungsnummer wird generiert (falls noch nicht vorhanden).
5.  Die endgültige PDF-Datei der Rechnung wird generiert und im S3-Speicher abgelegt, und die `pdfUrl` wird gespeichert.
6.  Ein Hash des gesamten Rechnungsinhalts (einschließlich der PDF-Datei) wird berechnet und in `immutableHash` gespeichert.
7.  Ein Audit-Protokoll (AuditLog) für den Vorgang der Rechnungsfertigstellung wird erstellt, und die `auditLogId` wird mit der Rechnung verknüpft.
8.  Der Rechnungsstatus ändert sich zu `SENT` oder `FINALIZED`.

## Generierung von Rechnungsdateinamen und Regeln für die Nummernfolge

Rechnungsdateinamen und fortlaufende Nummern sind sowohl für die Organisation als auch für die Einhaltung gesetzlicher Vorschriften von entscheidender Bedeutung, insbesondere in Deutschland, wo strenge Anforderungen an fortlaufende Rechnungsnummern bestehen.

### Regeln für die Nummernfolge (Konfigurierbar)

Das Rechnungsnummerierungssystem muss flexibel und für jede Organisation konfigurierbar sein. Die Regeln können Folgendes umfassen:

*   **Präfix:** Optionales Textpräfix (z. B. `INV-`, `RE-`).
*   **Jahr:** Einbeziehung des aktuellen Jahres (z. B. `2023`).
*   **Monat:** Einbeziehung des aktuellen Monats (z. B. `09`).
*   **Fortlaufender Zähler:** Ein numerischer Zähler, der für jede Rechnung innerhalb der Organisation automatisch erhöht wird.

**Beispiel für Rechnungsnummernformat:** `INV-2023-09-0001`, `RE-23-00005`, `20230001`.

**Generierungsmechanismus:**

1.  Bei der Fertigstellung der Rechnung sucht das System nach der letzten verwendeten Rechnungsnummer für die aktuelle Organisation.
2.  Der fortlaufende Zähler wird erhöht und die neue Rechnungsnummer basierend auf den definierten Regeln (Präfix, Jahr, Monat, Zähler) formatiert.
3.  Diese Nummer wird im Feld `invoiceNumber` der Tabelle `Invoice` gespeichert.

### Generierung von Rechnungsdateinamen

PDF-Dateinamen für Rechnungen sollten beschreibend und eindeutig sein, um eine einfache Identifizierung und Speicherung zu ermöglichen. Der Dateiname kann Folgendes enthalten:

*   **Rechnungsnummer:** Das wichtigste Element zur Identifizierung der Rechnung.
*   **Kundenname:** Um den Kunden schnell zu identifizieren.
*   **Ausstellungsdatum:** Um zeitlichen Kontext zu bieten.

**Beispiel für Dateinamenformat:** `Rechnung_INV-2023-09-0001_Max_Mustermann_2023-09-19.pdf`

## Checkliste und Akzeptanzkriterien

*   [ ] **Standard-Rechnungslayout:** Ein professionelles Rechnungslayout mit Typografie-Hierarchie, Abständen und Tabellenlayout wurde definiert.
*   [ ] **Logo und Branding:** Unterstützung für das Einbinden des Organisationslogos und neutraler Farboptionen.
*   [ ] **Austauschbare Vorlagen:** Bereitstellung von mindestens zwei Vorlagen (Klassisch und Minimal) mit Branding-Anpassung.
*   [ ] **PDF-Generierung mit Playwright:** Verwendung von Playwright zur Umwandlung von HTML/CSS in PDF für Designflexibilität.
*   [ ] **PDF-Inhalt auf Deutsch:** Alle Texte in der endgültigen Rechnung sind auf Deutsch, einschließlich Überschriften, Beschreibungen und Beträge.
*   [ ] **Bearbeitungsunterstützung (Entwurfsstatus):** Rechnungen können im Entwurfsstatus bearbeitet werden.
*   [ ] **Finalisierter Status:** Endgültige Rechnungen sind unveränderlich und es wird ein Hash für sie erstellt.
*   [ ] **Audit-Protokoll:** Der Vorgang der Rechnungsfertigstellung wird im Audit-Protokoll aufgezeichnet.
*   [ ] **Rechnungsnummernfolge:** Fortlaufende und eindeutige Rechnungsnummern werden für jede Organisation generiert und sind konfigurierbar (Präfix, Jahr, Monat, Zähler).
*   [ ] **Rechnungsdateinamen:** Beschreibende und eindeutige PDF-Dateinamen werden generiert.
*   [ ] **Deutsche gesetzliche Anforderungen:** Erfüllung aller gesetzlichen Anforderungen für deutsche Rechnungen (fortlaufende Rechnungsnummer, Ausstellungsdatum, Leistungsdatum, USt-IdNr., vollständige Angaben zu Lieferant und Kunde usw.).

Damit haben wir die Details des Rechnungserstellungsprozesses abgeschlossen, wobei der Schwerpunkt auf Qualität, Flexibilität und Einhaltung deutscher Anforderungen liegt.
