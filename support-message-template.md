
# Support-Nachrichtenvorlage für PDF-Download-Problem

---

**Betreff:** Problem beim Herunterladen der Rechnungs-PDF - Fehler "Fehler beim Herunterladen der PDF-Datei"

**Details zum Problem:**
- **Rechnungsnummer:** [INVOICE_NUMBER]
- **Rechnungs-ID:** [INVOICE_ID] 
- **Zeit und Datum:** [TIMESTAMP]
- **Fehlermeldung:** "Fehler beim Herunterladen der PDF-Datei"
- **Verwendeter Browser:** [BROWSER_NAME] [VERSION]
- **Betriebssystem:** [OS_NAME]

**Symptome:**
- Beim Klicken auf die Schaltfläche zum Herunterladen der Rechnungs-PDF erscheint eine Fehlermeldung
- Es wird keine PDF-Datei heruntergeladen
- Möglicherweise erscheint eine Fehlermeldung in der Browserkonsole

**Schritte zur Reproduktion:**
1. Zur Rechnungsseite gehen
2. Eine bestimmte Rechnung auswählen
3. Auf die Schaltfläche "PDF herunterladen" klicken
4. Die Fehlermeldung erscheint

**Zusätzliche technische Informationen:**
- **API-Status:** [API_STATUS]
- **Größe der Rechnungsdaten:** [DATA_SIZE]
- **JavaScript-Fehler vorhanden:** [JS_ERRORS]
- **Browser-Einstellungen:** [BROWSER_SETTINGS]

**Auswirkung auf die Arbeit:**
- [ ] Niedrig - Rechnung kann auf andere Weise abgerufen werden
- [ ] Mittel - Beeinträchtigt den täglichen Arbeitsablauf
- [ ] Hoch - Verhindert den Abschluss wesentlicher Aufgaben
- [ ] Kritisch - Stoppt die Arbeit vollständig

**Versuchte Lösungen:**
- [ ] Seite neu laden
- [ ] Anderen Browser ausprobieren
- [ ] Cache leeren
- [ ] Browser-Erweiterungen deaktivieren
- [ ] Download-Einstellungen überprüfen

**Bitte um Hilfe:**
Bitte helfen Sie bei der Lösung dieses Problems und stellen Sie eine alternative Lösung zum Herunterladen der Rechnungs-PDF bereit.

**Kontaktinformationen:**
- **Name:** [YOUR_NAME]
- **E-Mail:** [YOUR_EMAIL]
- **Telefonnummer:** [PHONE_NUMBER]
- **Firma:** [COMPANY_NAME]

---

**Für das technische Team:**

**Priorität der Behebung:** Hoch
**Kategorie:** PDF-Generierung / Datei-Download
**Betroffene Komponenten:** 
- Frontend: Funktionalität zum Herunterladen von Rechnungs-PDFs
- Backend: PDF-Generierungsdienst
- Browser: Datei-Download-Mechanismus

**Fehlerprotokolle:**
```
[TIMESTAMP] Error downloading PDF: [ERROR_MESSAGE]
[TIMESTAMP] PDF generation failed for invoice: [INVOICE_ID]
[TIMESTAMP] Browser console errors: [CONSOLE_ERRORS]
```

**Vorgeschlagene Diagnoseschritte:**
1. Serverprotokolle auf Fehler überprüfen
2. PDF-Generierung für die spezifische Rechnung testen
3. jsPDF-Bibliothek und deren Kompatibilität überprüfen
4. Browser-Einstellungen und Berechtigungen überprüfen
5. Auf verschiedenen Browsern testen

**Temporäre Lösung:**
Verwendung des alternativen Endpunkts: `/api/invoices/[id]/download-pdf`

---
