
# 📄 Deutsches Rechnungsverwaltungssystem

Ein umfassendes System zur Verwaltung und Erstellung von Rechnungen auf Deutsch mit CSV-Unterstützung und E-Mail-Versand.

## ✨ Funktionen

- 🧾 **Professionelle Rechnungserstellung** mit deutschem Standarddesign
- 📊 **CSV-Import** von Shopify und anderen Systemen
- 📧 **Automatischer E-Mail-Versand** mit PDF-Anhang
- 🏢 **Verwaltung von Unternehmen** und Kunden
- 🎨 **Moderne Benutzeroberfläche** mit Tailwind CSS
- 🔐 **Sicheres Authentifizierungssystem**
- 📱 **Responsives Design** für alle Geräte

## 🚀 Verwendete Technologien

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Datenbank:** PostgreSQL
- **Authentifizierung:** NextAuth.js
- **PDF-Generierung:** jsPDF
- **E-Mail:** Resend API
- **UI-Komponenten:** Radix UI

## 📦 Installation

1. **Projekt klonen:**
   ```bash
   git clone <repository-url>
   cd rechnung
   ```

2. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

3. **Datenbank einrichten:**
   ```bash
   cp .env.example .env.local
   # Fügen Sie DATABASE_URL in .env.local hinzu
   npx prisma db push
   ```

4. **Anwendung starten:**
   ```bash
   npm run dev
   ```

## 🔧 Umgebungsvariablen

```env
# Datenbank
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentifizierung
NEXTAUTH_SECRET="your-secret-key-32-characters-minimum"
NEXTAUTH_URL="http://localhost:3000"

# E-Mail (Resend)
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="rechnung@yourdomain.com"
EMAIL_DEV_MODE="true"
```

## 📧 E-Mail-Einrichtung

1. **Resend-Konto erstellen:**
   - Gehen Sie zu [resend.com](https://resend.com)
   - Erstellen Sie ein kostenloses Konto

2. **API-Schlüssel erhalten:**
   - Im Dashboard ← API Keys
   - Erstellen Sie einen neuen Schlüssel

3. **Schlüssel hinzufügen:**
   ```env
   RESEND_API_KEY="re_your_api_key"
   EMAIL_DEV_MODE="false"  # Für den tatsächlichen Versand
   ```

## 📊 CSV-Import

Das System unterstützt den Import von CSV-Dateien aus:
- Shopify
- WooCommerce
- Anderen Systemen

**Erforderliches CSV-Format:**
```csv
Name,Email,Lineitem name,Lineitem price,Lineitem quantity,Lineitem sku
John Doe,john@example.com,Produktname,19.99,2,SKU123
```

## 🏗️ Build und Deployment

```bash
# Build für Produktion
npm run build

# Produktion starten
npm start

# Code-Überprüfung
npm run lint
```

## 🌐 Deployment

### Vercel (Empfohlen):
1. Code auf GitHub hochladen
2. Projekt mit Vercel verbinden
3. Umgebungsvariablen hinzufügen
4. Automatisches Deployment!

### Railway:
1. Neues Projekt erstellen
2. GitHub-Repository verbinden
3. PostgreSQL-Datenbank hinzufügen
4. Umgebungsvariablen konfigurieren

## 📁 Projektstruktur

```
├── app/                 # Next.js App Router
├── components/          # React Components
├── lib/                # Utilities & Services
├── prisma/             # Database Schema
├── public/             # Statische Assets
└── user-storage/       # Benutzer-Uploads
```

## 🔐 Sicherheit

- Sichere Authentifizierung mit NextAuth.js
- Passwortverschlüsselung
- Schutz von API-Routen
- Datenvalidierung

## 🐛 Fehlerbehebung

### Häufige Probleme:

1. **Datenbankfehler:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

2. **Build-Probleme:**
   ```bash
   rm -rf .next
   npm install
   npm run build
   ```

3. **E-Mail-Probleme:**
   - Überprüfen Sie RESEND_API_KEY
   - Stellen Sie sicher, dass EMAIL_DEV_MODE korrekt eingestellt ist

## 📞 Support

- 📧 E-Mail: support@example.com
- 📖 Dokumentation: Siehe Hilfedateien im Ordner
- 🐛 Fehler: Erstellen Sie ein Issue auf GitHub

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

---

**Entwickelt mit ❤️ für deutsches Rechnungsmanagement**
