# 🇩🇪 E-Mail-Einrichtung für deutsche Anbieter

## Unterstützte Anbieter

### ✅ Web.de
```bash
EMAIL_HOST=smtp.web.de
EMAIL_PORT=587
EMAIL_USER=ihre-email@web.de
EMAIL_PASS=ihr-passwort
EMAIL_FROM=ihre-email@web.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

**Einrichtungsschritte:**
1. Gehen Sie zu [Web.de Einstellungen](https://web.de)
2. Klicken Sie auf "Einstellungen" → "POP3/IMAP"
3. Aktivieren Sie "POP3 und IMAP Zugriff aktivieren"
4. Verwenden Sie Ihre normalen Web.de-Zugangsdaten

### ✅ GMX.de
```bash
EMAIL_HOST=mail.gmx.net
EMAIL_PORT=587
EMAIL_USER=ihre-email@gmx.de
EMAIL_PASS=ihr-passwort
EMAIL_FROM=ihre-email@gmx.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

**Einrichtungsschritte:**
1. Gehen Sie zu [GMX Einstellungen](https://gmx.de)
2. Klicken Sie auf "E-Mail" → "Einstellungen" → "POP3/IMAP"
3. Aktivieren Sie "Externe E-Mail-Programme"
4. Verwenden Sie Ihre normalen GMX-Zugangsdaten

### ✅ T-Online
```bash
EMAIL_HOST=securesmtp.t-online.de
EMAIL_PORT=587
EMAIL_USER=ihre-email@t-online.de
EMAIL_PASS=ihr-passwort
EMAIL_FROM=ihre-email@t-online.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

### ✅ 1&1 (IONOS)
```bash
EMAIL_HOST=smtp.1und1.de
EMAIL_PORT=587
EMAIL_USER=ihre-email@1und1.de
EMAIL_PASS=ihr-passwort
EMAIL_FROM=ihre-email@1und1.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

## Schnelleinrichtung

### 1. Wählen Sie Ihren E-Mail-Anbieter
Wählen Sie den passenden Anbieter aus der Liste oben

### 2. Aktualisieren Sie .env.local
Kopieren Sie die passenden Einstellungen für Ihren Anbieter in die `.env.local` Datei

### 3. Ersetzen Sie Platzhalterdaten
```bash
# Ersetzen Sie diese Werte mit Ihren echten Informationen
EMAIL_USER=ihre-echte-email@web.de
EMAIL_PASS=ihr-echtes-passwort
EMAIL_FROM=ihre-echte-email@web.de
```

### 4. Starten Sie den Server neu
```bash
npm run dev
```

## Automatische Erkennung

Das System erkennt SMTP-Einstellungen automatisch anhand der E-Mail-Adresse:

- `@web.de` → `smtp.web.de:587`
- `@gmx.de` → `mail.gmx.net:587`
- `@gmx.net` → `mail.gmx.net:587`
- `@t-online.de` → `securesmtp.t-online.de:587`
- `@1und1.de` → `smtp.1und1.de:587`

## Einrichtung testen

### 1. Überprüfen Sie die Konsolenprotokolle
```bash
# Sie sollten sehen:
✅ Email configuration verified successfully for Web.de
Creating email transporter for Web.de: {
  host: 'smtp.web.de',
  port: 587,
  secure: false,
  user: '***@web.de'
}
```

### 2. Testen Sie den Rechnungsversand
1. Gehen Sie zu einer beliebigen Rechnung
2. Klicken Sie auf "Per E-Mail senden"
3. Prüfen Sie den Posteingang des Kunden

## Häufige Fehlerbehebung

### Authentifizierungsfehler - Web.de
```
Error: Invalid login: 535 Authentication failed
```

**Lösung:**
1. Stellen Sie sicher, dass POP3/IMAP in den Web.de-Einstellungen aktiviert ist
2. Gehen Sie zu Web.de → Einstellungen → POP3/IMAP → Aktivieren
3. Überprüfen Sie das Passwort

### Authentifizierungsfehler - GMX.de
```
Error: Invalid login: 535 Authentication failed
```

**Lösung:**
1. Aktivieren Sie "Externe E-Mail-Programme" bei GMX
2. Gehen Sie zu GMX → E-Mail → Einstellungen → POP3/IMAP
3. Aktivieren Sie "Zugriff über externe E-Mail-Programme"

### Verbindungsfehler
```
Error: connect ECONNREFUSED
```

**Lösung:**
1. Überprüfen Sie die Internetverbindung
2. Stellen Sie sicher, dass EMAIL_HOST korrekt ist
3. Überprüfen Sie Firewall-Einstellungen

### Verschlüsselungsfehler
```
Error: self signed certificate
```

**Lösung:**
1. Stellen Sie sicher, dass PORT 587 verwendet wird (nicht 465)
2. Stellen Sie sicher, dass `secure: false` in den Einstellungen gesetzt ist

## Zustellungsüberprüfung

### Um die Zustellung sicherzustellen:

1. **Überprüfen Sie den Ordner "Gesendet"** beim E-Mail-Anbieter
2. **Fordern Sie eine Lesebestätigung** vom Kunden an
3. **Überprüfen Sie den Spam-Ordner** beim Kunden
4. **Überwachen Sie die Konsolenprotokolle** auf Fehler

### Beispiel für erfolgreiche Logs:
```
Starting email send process for invoice: RE-2024-001
Creating email transporter for Web.de
Generating PDF for invoice: RE-2024-001
Sending email to: customer@web.de
✅ Email sent successfully: <message-id@smtp.web.de>
```

## Tipps für erfolgreiche Zustellung

### 1. Verbesserung der Zustellrate
- Verwenden Sie eine gültige und verifizierte FROM-Adresse
- Vermeiden Sie verdächtige Wörter im Betreff
- Hängen Sie ein gültiges und unbeschädigtes PDF an

### 2. Vermeidung von Spam-Filtern
- Verwenden Sie HTML- und Nur-Text-Versionen
- Vermeiden Sie verdächtige Links
- Verwenden Sie eine gültige Reply-To-Adresse

### 3. Leistungsüberwachung
- Überwachen Sie Bounce-Raten
- Überprüfen Sie Zustellberichte
- Testen Sie mit verschiedenen Adressen

## Technischer Support

Wenn Sie Probleme haben:

1. **Überprüfen Sie die Konsolenprotokolle** auf detaillierte Fehler
2. **Testen Sie die SMTP-Einstellungen** mit einem anderen E-Mail-Client
3. **Kontaktieren Sie den Anbieter-Support** für Hilfe
4. **Überprüfen Sie den Dienststatus** des Anbieters

## Vollständiges Beispiel - Web.de

```bash
# .env.local
EMAIL_HOST=smtp.web.de
EMAIL_PORT=587
EMAIL_USER=karina@web.de
EMAIL_PASS=mySecurePassword123
EMAIL_FROM=karina@web.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

Nach dieser Einrichtung funktioniert der E-Mail-Versand vollständig mit deutschen Anbietern! 🚀
