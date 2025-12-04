# 📧 E-Mail-Einrichtung - Lösung für nicht ankommende Bestätigungsnachrichten

## 🚨 Aktuelles Problem
Das System läuft im Entwicklungsmodus (`EMAIL_DEV_MODE="true"`), was bedeutet, dass es den Versand von Nachrichten nur simuliert und nicht tatsächlich sendet.

## ✅ Schnelle Lösung - Gmail SMTP

### Schritt 1: Konfigurationsdatei erstellen
Erstellen Sie eine Datei `.env.local` im Hauptverzeichnis mit folgendem Inhalt:

```env
# Entwicklungsmodus deaktivieren, um echte Nachrichten zu senden
EMAIL_DEV_MODE="false"

# Gmail SMTP-Einstellungen
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Absenderadresse
EMAIL_FROM="your-email@gmail.com"
EMAIL_FROM_NAME="RechnungsProfi"

# NextAuth (erforderlich)
NEXTAUTH_SECRET="your-very-long-random-secret-key-here-minimum-32-characters"
NEXTAUTH_URL="http://localhost:3000"
```

### Schritt 2: Gmail App-Passwort einrichten

1. **Bei Gmail anmelden**
2. **Zu den Kontoeinstellungen gehen**: [myaccount.google.com](https://myaccount.google.com)
3. **Sicherheit (Security)** → **Bestätigung in zwei Schritten (2-Step Verification)** (muss zuerst aktiviert werden)
4. **App-Passwörter (App Passwords)**
5. **Neues Passwort erstellen** für die App
6. **Passwort kopieren** und in `SMTP_PASS` einfügen

### Schritt 3: Ihre Daten ersetzen
```env
SMTP_USER="your-actual-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
EMAIL_FROM="your-actual-email@gmail.com"
```

## 🔄 Server neu starten
Nach Erstellung der Datei:
```bash
# Server stoppen (Ctrl+C)
# Dann neu starten
npm run dev
```

## 🧪 System testen

### 1. Einstellungen überprüfen
Besuchen Sie: `http://localhost:3000/test-email-verification`

### 2. Versand testen
- Geben Sie Ihre E-Mail-Adresse ein
- Klicken Sie auf "Code senden"
- Die Nachricht sollte innerhalb von 30 Sekunden ankommen

### 3. Vollständige Registrierung testen
- Gehen Sie zu `/auth/register`
- Registrieren Sie sich mit einem neuen Konto
- Die Bestätigungsnachricht sollte sofort ankommen

## 🚀 Alternative Lösungen (für Produktion)

### Resend (empfohlen für Produktion)
```env
EMAIL_DEV_MODE="false"
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

### Outlook/Hotmail SMTP
```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_USER="your-email@outlook.com"
SMTP_PASS="your-password"
```

## 🔍 Fehlerbehebung

### Wenn Nachrichten nicht ankommen:
1. **Konsole überprüfen**: Suchen Sie nach Fehlermeldungen
2. **Spam überprüfen**: Könnte im Spam-Ordner sein
3. **App-Passwort überprüfen**: Stellen Sie sicher, dass es korrekt ist
4. **2FA überprüfen**: Bestätigung in zwei Schritten muss aktiviert sein

### Häufige Fehlermeldungen:
- `Invalid login`: App-Passwort ist falsch
- `Less secure app`: Verwenden Sie ein App-Passwort anstelle des normalen Passworts
- `Authentication failed`: Überprüfen Sie E-Mail und Passwort

## ✅ Erfolgskriterien
- ✅ Nachricht kommt innerhalb von 2 Minuten an
- ✅ "Erneut senden" funktioniert mit neuem Code
- ✅ Anmeldung vor Bestätigung nicht möglich
- ✅ Bestätigung erfolgreich mit korrektem Code
