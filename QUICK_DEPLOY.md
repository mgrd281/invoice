# Schnelle Bereitstellung - Rechnungs-Generator

## 🚀 Empfohlene Deployment-Option: Vercel + Neon Database

### Schritt 1: Database Setup (5 Minuten)
1. Gehen Sie zu [Neon.tech](https://neon.tech) und erstellen Sie ein kostenloses Konto
2. Erstellen Sie eine neue PostgreSQL-Datenbank
3. Kopieren Sie die Connection String (DATABASE_URL)

### Schritt 2: Vercel Deployment (5 Minuten)
1. Gehen Sie zu [Vercel.com](https://vercel.com) und melden Sie sich an
2. Klicken Sie auf "New Project"
3. Importieren Sie Ihr Git Repository oder laden Sie den Ordner hoch
4. Konfigurieren Sie die Umgebungsvariablen:

```env
DATABASE_URL=postgresql://username:password@host/database
NEXTAUTH_SECRET=your-very-long-random-secret-key-here
NEXTAUTH_URL=https://your-app-name.vercel.app
```

5. Klicken Sie auf "Deploy"

### Schritt 3: Nach dem Deployment
1. Öffnen Sie die Vercel-Konsole für Ihr Projekt
2. Gehen Sie zu "Functions" → "View Function Logs"
3. Führen Sie die Datenbank-Migration aus:
   - In den Vercel-Einstellungen → "Functions" → "Add Environment Variable"
   - Fügen Sie alle erforderlichen Umgebungsvariablen hinzu
   - Redeploy das Projekt

## 🔧 Alternative: Railway (Alles-in-einem)

### Warum Railway?
- Integrierte PostgreSQL-Datenbank
- Einfache Bereitstellung
- Automatische HTTPS

### Schritte:
1. Gehen Sie zu [Railway.app](https://railway.app)
2. Klicken Sie auf "Start a New Project"
3. Wählen Sie "Deploy from GitHub repo"
4. Verbinden Sie Ihr Repository
5. Railway erkennt automatisch Next.js
6. Fügen Sie PostgreSQL-Service hinzu
7. Konfigurieren Sie Umgebungsvariablen
8. Deploy!

## 📋 Erforderliche Umgebungsvariablen

```env
# Database (wird automatisch von Railway/Neon bereitgestellt)
DATABASE_URL=postgresql://...

# Authentication (generieren Sie einen langen zufälligen String)
NEXTAUTH_SECRET=your-secret-key-min-32-characters-long
NEXTAUTH_URL=https://your-domain.com

# Email (optional, für Rechnungsversand)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## ✅ Deployment Checklist

- [ ] Datenbank erstellt (Neon/Railway)
- [ ] Umgebungsvariablen konfiguriert
- [ ] App deployed (Vercel/Railway)
- [ ] Domain funktioniert
- [ ] Registrierung getestet
- [ ] Rechnung erstellt und PDF generiert
- [ ] E-Mail-Versand getestet (falls konfiguriert)

## 🆘 Schnelle Hilfe

### Build-Fehler?
```bash
# Lokal testen:
npm install
npm run build
npm start
```

### Database-Fehler?
- Überprüfen Sie die DATABASE_URL
- Stellen Sie sicher, dass die Datenbank erreichbar ist
- Führen Sie `npx prisma db push` aus

### Login funktioniert nicht?
- Überprüfen Sie NEXTAUTH_SECRET (muss mindestens 32 Zeichen haben)
- Überprüfen Sie NEXTAUTH_URL (muss mit Ihrer Domain übereinstimmen)

## 🎯 Nächste Schritte nach Deployment

1. **Admin-Benutzer erstellen**: Registrieren Sie sich über die Web-Oberfläche
2. **Organisation einrichten**: Fügen Sie Ihre Firmeninformationen hinzu
3. **Logo hochladen**: In den Einstellungen
4. **Erste Rechnung testen**: Erstellen Sie eine Testrechnung
5. **E-Mail konfigurieren**: Für automatischen Rechnungsversand

## 📞 Support

Ihre App ist jetzt bereit! Bei Problemen:
1. Überprüfen Sie die Logs in der Hosting-Plattform
2. Testen Sie lokal mit denselben Umgebungsvariablen
3. Überprüfen Sie die Datenbankverbindung
