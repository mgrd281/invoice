# 📧 E-Mail-Einrichtungsanleitung

## Voraussetzungen

Um den tatsächlichen E-Mail-Versand zu aktivieren, müssen Sie einen E-Mail-Dienstanbieter einrichten.

## 🚀 Option 1: Resend (Am einfachsten und besten)

Resend ist die einfachste und zuverlässigste Option für den E-Mail-Versand.

### Schritte:

#### 1. Resend-Konto erstellen
- Gehen Sie zu [resend.com](https://resend.com)
- Erstellen Sie ein kostenloses Konto (3000 E-Mails pro Monat kostenlos)

#### 2. API-Schlüssel erhalten
- Gehen Sie zu **API Keys** im Dashboard
- Klicken Sie auf **Create API Key**
- Wählen Sie einen Namen (z.B. "Rechnungssystem")
- Kopieren Sie den Schlüssel (beginnt mit `re_`)

#### 3. Umgebung einrichten
```bash
# In .env.local hinzufügen
RESEND_API_KEY="re_ihr_api_key_hier"
RESEND_FROM_EMAIL="rechnung@karinex.de"
EMAIL_DEV_MODE="true"  # Zum Testen, für Produktion auf false setzen
```

#### 4. Domain einrichten (Optional)
- Fügen Sie Ihre Domain im Resend-Dashboard hinzu
- Oder verwenden Sie die Sandbox-Domain zum Testen

## 📮 Option 2: SMTP (Gmail, Outlook, etc.)

### Gmail-Einrichtung:

#### 1. 2-Faktor-Authentifizierung aktivieren
#### 2. App-Passwort erstellen
- Gehen Sie zu den Google-Kontoeinstellungen
- Sicherheit → Bestätigung in zwei Schritten → App-Passwörter
- Erstellen Sie ein Passwort für "E-Mail"

#### 3. Umgebung einrichten
```bash
# In .env.local hinzufügen
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="ihre-email@gmail.com"
SMTP_PASS="ihr-16-stelliges-app-passwort"
```

### Outlook/Hotmail-Einrichtung:
```bash
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_USER="ihre-email@outlook.com"
SMTP_PASS="ihr-passwort"
```

## 🧪 Testen

### 1. Entwicklungsmodus
```bash
EMAIL_DEV_MODE="true"
```
Simuliert den E-Mail-Versand ohne tatsächlichen Versand.

### 2. Produktionsmodus
```bash
EMAIL_DEV_MODE="false"
```
Versendet echte E-Mails.

## 🎯 Verwendung

Nach der Einrichtung können Sie:
- Auf den E-Mail-Button neben jeder Rechnung klicken
- Betreff und Nachricht anpassen
- PDF wird automatisch angehängt
- E-Mail-Status wird verfolgt

## 🔧 Fehlerbehebung

### Häufige Probleme:

#### 1. "Authentication failed"
- Überprüfen Sie Benutzername/Passwort
- Für Gmail: Verwenden Sie das App-Passwort, nicht das normale Passwort

#### 2. "Connection refused"
- Überprüfen Sie SMTP-Host und Port
- Stellen Sie sicher, dass die Firewall ausgehende Verbindungen erlaubt

#### 3. "API key invalid"
- Überprüfen Sie, ob der Resend API-Schlüssel korrekt ist
- Stellen Sie sicher, dass er mit `re_` beginnt

### Support:
- Resend: [resend.com/docs](https://resend.com/docs)
- Gmail: [support.google.com](https://support.google.com/accounts/answer/185833)
- Outlook: [support.microsoft.com](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040)

## ✅ Fazit

**Für den Schnellstart:**
1. Bei Resend.com registrieren
2. API-Schlüssel erhalten
3. `RESEND_API_KEY` und `EMAIL_DEV_MODE="true"` zu `.env.local` hinzufügen
4. Rechnungsversand testen!

**Funktionen:**
- ✅ Schneller und zuverlässiger Versand
- ✅ Professionelle E-Mail-Vorlagen
- ✅ Automatischer PDF-Anhang
- ✅ Versandstatus-Verfolgung
- ✅ Sicherer Testmodus

## Erweiterte Sicherheitseinstellungen

### SPF Record
Zu DNS-Einträgen hinzufügen:

```
v=spf1 include:_spf.google.com ~all  # Für Gmail
v=spf1 include:sendgrid.net ~all     # Für SendGrid
```

### DKIM
- Gmail: Automatisch eingerichtet
- SendGrid: In Domain-Authentifizierung eingerichtet
- SES: In Domain-Verifizierung eingerichtet

### DMARC Record
```
v=DMARC1; p=none; rua=mailto:dmarc@ihredomain.com
```

## Versandüberwachung

### Logs
Überprüfen Sie die Konsolenprotokolle auf Fehler:

```bash
# Im Terminal, wo der Server läuft
npm run dev
```

### Senderate
- Gmail: 500 E-Mails/Tag
- SendGrid Free: 100 E-Mails/Tag
- SES: Beginnt bei 200 E-Mails/Tag

## Support

Wenn Sie Probleme haben:

1. Überprüfen Sie die Konsolenprotokolle
2. Stellen Sie sicher, dass die Umgebungsvariablen korrekt sind
3. Testen Sie die Verbindung zum SMTP-Server
4. Überprüfen Sie den Dienststatus (Gmail/SendGrid/SES Status)

## Vollständige Beispiele

### Vollständiges Gmail-Setup

```bash
# .env.local
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=karina@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM=karina@gmail.com
EMAIL_FROM_NAME=Karina Khrystych
```

### Vollständiges SendGrid-Setup

```bash
# .env.local
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=SG.abc123def456ghi789jkl
EMAIL_FROM=karina@ihredomain.com
EMAIL_FROM_NAME=Karina Khrystych
```

Nach korrekter Einrichtung funktioniert der E-Mail-Versand vollständig inklusive PDF-Rechnungsanhang!
