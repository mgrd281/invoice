# Deployment Guide für Rechnungs-Generator

Diese Anleitung zeigt verschiedene Optionen zum Hosten Ihrer Rechnungsanwendung.

## Option 1: Vercel (Empfohlen für Next.js)

### Vorteile:
- Optimiert für Next.js
- Einfache Bereitstellung
- Automatische Skalierung
- Kostenlose Stufe verfügbar

### Schritte:
1. **Vercel Account erstellen**: https://vercel.com
2. **GitHub Repository verbinden**
3. **Umgebungsvariablen konfigurieren**:
   ```
   DATABASE_URL=postgresql://username:password@host:port/database
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=https://your-app.vercel.app
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-email
   SMTP_PASS=your-password
   ```
4. **Deploy**: Vercel erkennt automatisch Next.js und deployed

### Database Setup für Vercel:
- **Neon** (empfohlen): https://neon.tech
- **Supabase**: https://supabase.com
- **PlanetScale**: https://planetscale.com

## Option 2: Railway

### Vorteile:
- Einfache Bereitstellung
- Integrierte PostgreSQL-Datenbank
- Gute Performance

### Schritte:
1. **Railway Account**: https://railway.app
2. **Neues Projekt erstellen**
3. **GitHub Repository verbinden**
4. **PostgreSQL Service hinzufügen**
5. **Umgebungsvariablen konfigurieren**
6. **Deploy**

## Option 3: Render

### Vorteile:
- Kostenlose PostgreSQL-Datenbank
- Einfache Konfiguration
- Gute Dokumentation

### Schritte:
1. **Render Account**: https://render.com
2. **Web Service erstellen**
3. **PostgreSQL-Datenbank erstellen**
4. **Umgebungsvariablen konfigurieren**
5. **Deploy**

## Erforderliche Umgebungsvariablen

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication
NEXTAUTH_SECRET=your-very-long-random-secret
NEXTAUTH_URL=https://your-domain.com

# Email (für Rechnungsversand)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional: File Upload
UPLOAD_DIR=/tmp/uploads
```

## Deployment Checklist

- [ ] Repository auf GitHub/GitLab
- [ ] Umgebungsvariablen konfiguriert
- [ ] Datenbank erstellt und migriert
- [ ] SMTP-Konfiguration getestet
- [ ] Domain konfiguriert (optional)
- [ ] SSL-Zertifikat aktiviert
- [ ] Backup-Strategie implementiert

## Nach dem Deployment

1. **Datenbank migrieren**:
   ```bash
   npx prisma db push
   ```

2. **Admin-Benutzer erstellen**:
   - Registrieren Sie sich über die Web-Oberfläche
   - Oder verwenden Sie die Admin-Konsole

3. **Testen Sie alle Funktionen**:
   - Benutzerregistrierung
   - Rechnungserstellung
   - PDF-Generierung
   - E-Mail-Versand
   - CSV-Upload

## Troubleshooting

### Häufige Probleme:

1. **Database Connection Error**:
   - Überprüfen Sie DATABASE_URL
   - Stellen Sie sicher, dass die Datenbank erreichbar ist

2. **Build Errors**:
   - Überprüfen Sie Node.js-Version (18+)
   - Führen Sie `npm install` lokal aus

3. **Email nicht versendet**:
   - Überprüfen Sie SMTP-Konfiguration
   - Testen Sie mit einem E-Mail-Service wie Gmail

4. **File Upload Probleme**:
   - Überprüfen Sie UPLOAD_DIR-Pfad
   - Stellen Sie sicher, dass Schreibberechtigungen vorhanden sind

## Monitoring und Wartung

- Überwachen Sie die Anwendungsleistung
- Regelmäßige Datenbank-Backups
- Sicherheitsupdates für Abhängigkeiten
- Log-Überwachung für Fehler

## Support

Bei Problemen:
1. Überprüfen Sie die Logs der Hosting-Plattform
2. Testen Sie lokal mit denselben Umgebungsvariablen
3. Überprüfen Sie die Netzwerkverbindungen
