
# Admin- und Benutzer-Dashboards

## Einführung

Sorgfältig gestaltete Dashboards sind das Herzstück der Benutzererfahrung in jeder modernen Webanwendung. In diesem Abschnitt werden wir zwei separate und spezialisierte Dashboards entwerfen und entwickeln: eines für Endbenutzer, die ihre Rechnungen und Kunden verwalten, und eines für Administratoren, die das gesamte System überwachen. Alle Benutzeroberflächen werden auf Deutsch sein, mit Fokus auf Benutzerfreundlichkeit, Klarheit und Effizienz.

## Benutzer-Dashboard (User Dashboard)

Das Benutzer-Dashboard zielt darauf ab, Endbenutzern eine intuitive und umfassende Oberfläche zur Verwaltung aller Aspekte des Rechnungserstellungsprozesses zu bieten. Dieses Dashboard wird mehrere Hauptbereiche umfassen, die jeweils auf spezifische Anforderungen im Arbeitsablauf zugeschnitten sind.

### Hauptbildschirme für Benutzer

#### 1. Upload-Bildschirm (Uploads)

Dieser Bildschirm ermöglicht es Benutzern, Shopify-CSV-Dateien hochzuladen und deren Verarbeitungsstatus zu überwachen. Er umfasst folgende Funktionen:

*   **Drag & Drop-Zone:** Ein klarer visueller Bereich zum Ziehen und Ablegen von CSV-Dateien, mit Anweisungen auf Deutsch wie "CSV-Datei hier ablegen oder klicken zum Auswählen".
*   **Fortschrittsbalken (Progress Bar):** Zeigt den Fortschritt des Datei-Uploads und der Verarbeitung in Echtzeit an.
*   **Upload-Verlauf (Upload History):** Eine Tabelle, die alle früheren Uploads mit Details wie Dateiname, Upload-Datum, Status (Ausstehend, Verarbeitung, Abgeschlossen, Fehlgeschlagen) und Anzahl der verarbeiteten Zeilen anzeigt.
*   **Fehlerdetails (Error Details):** Wenn die Verarbeitung fehlschlägt, werden Fehlerdetails klar und hilfreich für den Benutzer angezeigt.

#### 2. Kunden-Bildschirm (Kunden)

Ermöglicht Benutzern die Verwaltung ihrer Kundendatenbank:

*   **Kundenliste:** Eine durchsuchbare und filterbare Tabelle, die alle Kunden mit grundlegenden Informationen wie Name, E-Mail, Stadt und Datum der letzten Bestellung anzeigt.
*   **Neuen Kunden hinzufügen:** Ein Formular zum manuellen Hinzufügen neuer Kunden mit allen für deutsche Rechnungen erforderlichen Feldern.
*   **Kundendaten bearbeiten:** Möglichkeit, Informationen bestehender Kunden zu aktualisieren.
*   **Kundenhistorie:** Anzeige aller Bestellungen und Rechnungen, die mit einem bestimmten Kunden verknüpft sind.

#### 3. Auftrags-Bildschirm (Aufträge)

Zeigt alle aus Shopify importierten oder manuell erstellten Bestellungen an:

*   **Auftragsliste:** Eine umfassende Tabelle mit Bestellnummer, Kunde, Datum, Gesamtbetrag und Status.
*   **Erweiterte Filter:** Möglichkeit zum Filtern nach Datum, Kunde, Status oder Betrag.
*   **Auftragsdetails:** Detaillierte Ansicht jeder Bestellung, einschließlich Auftragspositionen, Versandinformationen und Zahlung.
*   **Rechnung aus Auftrag erstellen:** Ein Schnellzugriffsknopf, um eine Bestellung in eine Rechnung umzuwandeln.

#### 4. Rechnungs-Bildschirm (Rechnungen)

Der zentrale Hub der Anwendung, in dem Benutzer ihre Rechnungen verwalten:

*   **Rechnungsliste:** Anzeige aller Rechnungen mit Informationen wie Rechnungsnummer, Kunde, Ausstellungsdatum, Betrag und Status (Entwurf, Gesendet, Bezahlt, Überfällig).
*   **Neue Rechnung erstellen:** Ein Schritt-für-Schritt-Assistent zum Erstellen einer neuen Rechnung von Grund auf.
*   **Rechnungsvorschau:** Vorschau der Rechnung vor der Fertigstellung mit Bearbeitungsmöglichkeit.
*   **PDF herunterladen:** Möglichkeit, die PDF-Datei abgeschlossener Rechnungen herunterzuladen.
*   **Rechnung versenden:** Versenden der Rechnung per E-Mail direkt aus der Anwendung.

#### 5. Vorlagen-Bildschirm (Vorlagen)

Ermöglicht Benutzern die Verwaltung von Rechnungsvorlagen:

*   **Vorlagenliste:** Anzeige aller verfügbaren Vorlagen (Standard und Benutzerdefiniert).
*   **Vorlagenvorschau:** Vorschau, wie eine Rechnung mit einer bestimmten Vorlage aussehen wird.
*   **Vorlage anpassen:** Ein visueller Editor zum Anpassen von Farben, Logo und Layout.
*   **Neue Vorlage erstellen:** Möglichkeit, neue benutzerdefinierte Vorlagen zu erstellen.

#### 6. Einstellungs-Bildschirm (Einstellungen)

Ermöglicht Benutzern die Konfiguration ihrer Konten und Organisationen:

*   **Firmeninformationen:** Aktualisieren von Organisationsdetails wie Name, Adresse, USt-IdNr. und Bankdaten.
*   **Rechnungseinstellungen:** Konfigurieren des Rechnungsnummernformats, der Standardzahlungsbedingungen und der Steuersätze.
*   **Shopify-Integration:** Einrichten oder Aktualisieren der Shopify-Verbindung.
*   **Kontoeinstellungen:** Passwort ändern, E-Mail aktualisieren und Benachrichtigungspräferenzen verwalten.

### React/Next.js Seitenstruktur für Benutzer

```typescript
// src/pages/dashboard/index.tsx - Hauptseite des Dashboards
import { NextPage } from 'next';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { DashboardOverview } from '../../components/dashboard/DashboardOverview';

const UserDashboard: NextPage = () => {
  return (
    <DashboardLayout title="Dashboard">
      <DashboardOverview />
    </DashboardLayout>
  );
};

export default UserDashboard;

// src/pages/dashboard/uploads.tsx - Upload-Bildschirm
import { NextPage } from 'next';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { UploadManager } from '../../components/uploads/UploadManager';

const UploadsPage: NextPage = () => {
  return (
    <DashboardLayout title="CSV-Uploads">
      <UploadManager />
    </DashboardLayout>
  );
};

export default UploadsPage;

// src/pages/dashboard/customers.tsx - Kunden-Bildschirm
import { NextPage } from 'next';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { CustomerManager } from '../../components/customers/CustomerManager';

const CustomersPage: NextPage = () => {
  return (
    <DashboardLayout title="Kunden">
      <CustomerManager />
    </DashboardLayout>
  );
};

export default CustomersPage;

// src/pages/dashboard/orders.tsx - Auftrags-Bildschirm
import { NextPage } from 'next';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { OrderManager } from '../../components/orders/OrderManager';

const OrdersPage: NextPage = () => {
  return (
    <DashboardLayout title="Aufträge">
      <OrderManager />
    </DashboardLayout>
  );
};

export default OrdersPage;

// src/pages/dashboard/invoices.tsx - Rechnungs-Bildschirm
import { NextPage } from 'next';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { InvoiceManager } from '../../components/invoices/InvoiceManager';

const InvoicesPage: NextPage = () => {
  return (
    <DashboardLayout title="Rechnungen">
      <InvoiceManager />
    </DashboardLayout>
  );
};

export default InvoicesPage;

// src/pages/dashboard/templates.tsx - Vorlagen-Bildschirm
import { NextPage } from 'next';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { TemplateManager } from '../../components/templates/TemplateManager';

const TemplatesPage: NextPage = () => {
  return (
    <DashboardLayout title="Vorlagen">
      <TemplateManager />
    </DashboardLayout>
  );
};

export default TemplatesPage;

// src/pages/dashboard/settings.tsx - Einstellungs-Bildschirm
import { NextPage } from 'next';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { SettingsManager } from '../../components/settings/SettingsManager';

const SettingsPage: NextPage = () => {
  return (
    <DashboardLayout title="Einstellungen">
      <SettingsManager />
    </DashboardLayout>
  );
};

export default SettingsPage;
```

### Layout- und Navigationskomponenten

```typescript
// src/components/layouts/DashboardLayout.tsx
import React from 'react';
import { Sidebar } from '../navigation/Sidebar';
import { Header } from '../navigation/Header';

interface DashboardLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header title={title} />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// src/components/navigation/Sidebar.tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  HomeIcon, 
  DocumentArrowUpIcon, 
  UsersIcon, 
  ShoppingBagIcon, 
  DocumentTextIcon, 
  DocumentDuplicateIcon, 
  CogIcon 
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'CSV-Uploads', href: '/dashboard/uploads', icon: DocumentArrowUpIcon },
  { name: 'Kunden', href: '/dashboard/customers', icon: UsersIcon },
  { name: 'Aufträge', href: '/dashboard/orders', icon: ShoppingBagIcon },
  { name: 'Rechnungen', href: '/dashboard/invoices', icon: DocumentTextIcon },
  { name: 'Vorlagen', href: '/dashboard/templates', icon: DocumentDuplicateIcon },
  { name: 'Einstellungen', href: '/dashboard/settings', icon: CogIcon },
];

export const Sidebar: React.FC = () => {
  const router = useRouter();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-sm">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-xl font-bold text-gray-900">Rechnungs-App</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = router.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                          isActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

// src/components/navigation/Header.tsx
import React from 'react';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </div>
        <div className="flex flex-1 justify-end">
          <UserMenu />
        </div>
      </div>
    </div>
  );
};
```

## Admin-Dashboard (Admin Dashboard)

Das Admin-Dashboard zielt darauf ab, einen umfassenden Überblick und eine genaue Überwachung aller Systemaspekte zu bieten. Dieses Dashboard konzentriert sich auf die Verwaltung, Überwachung und Steuerung des Systems auf einer höheren Ebene als das normale Benutzer-Dashboard.

### Hauptbildschirme für Administratoren

#### 1. Benutzerverwaltungs-Bildschirm (Benutzerverwaltung)

Ermöglicht Administratoren die Verwaltung aller Benutzer im System:

*   **Benutzerliste:** Eine umfassende Tabelle, die alle Benutzer mit Informationen wie Name, E-Mail, Rolle, Organisation, Datum der letzten Anmeldung und Status (Aktiv/Inaktiv) anzeigt.
*   **Neuen Benutzer hinzufügen:** Ein Formular zum Erstellen neuer Benutzerkonten mit Zuweisung von Rollen und Berechtigungen.
*   **Benutzerdaten bearbeiten:** Aktualisieren von Benutzerinformationen, Ändern von Rollen oder Deaktivieren von Konten.
*   **Benutzeraktivität:** Anzeige eines detaillierten Protokolls der Aktivitäten jedes Benutzers im System.

#### 2. Rollen- und Berechtigungs-Bildschirm (Rollen & Rechte)

Ein auf RBAC (Role-Based Access Control) basierendes System zur Verwaltung von Rollen und Berechtigungen:

*   **Rollenliste:** Anzeige aller im System definierten Rollen (z. B. Admin, User, Manager).
*   **Neue Rolle erstellen:** Möglichkeit, benutzerdefinierte Rollen mit spezifischen Berechtigungen zu erstellen.
*   **Berechtigungen bearbeiten:** Definieren von Berechtigungen für jede Rolle (z. B. Rechnungen lesen, Rechnungen erstellen, Kunden löschen usw.).
*   **Rollen zuweisen:** Verknüpfen von Benutzern mit den entsprechenden Rollen.

#### 3. Organisationsübersichts-Bildschirm (Organisationsübersicht)

Falls das System Mandantenfähigkeit (Multi-Tenancy) unterstützt:

*   **Organisationsliste:** Anzeige aller registrierten Organisationen mit Informationen wie Name, Anzahl der Benutzer, Anzahl der Rechnungen und Status.
*   **Neue Organisation hinzufügen:** Erstellen neuer Organisationen mit Konfiguration der Grundeinstellungen.
*   **Organisationsstatistiken:** Anzeige detaillierter Metriken für jede Organisation wie monatliche Rechnungsanzahl, Umsatz und Wachstumsrate.

#### 4. Systemmetriken-Bildschirm (Systemmetriken)

Ein umfassendes Überwachungs-Dashboard für die Systemleistung:

*   **Leistungsmetriken:** Anzeige von Metriken wie Antwortzeit, Speichernutzung, CPU-Auslastung und Datenbankstatus.
*   **Nutzungsstatistiken:** Anzahl der aktiven Benutzer, Anzahl der täglich/monatlich erstellten Rechnungen und verarbeitetes Datenvolumen.
*   **Fehlerüberwachung:** Anzeige aktueller Fehler, Fehlerrate und kritischer Probleme, die sofortige Aufmerksamkeit erfordern.
*   **Service-Status:** Überwachung des Status verschiedener Dienste wie Datenbank, Dateispeicherung, Warteschlange und Shopify-Integration.

#### 5. Audit-Log-Bildschirm (Audit-Log)

Ein umfassendes Protokoll aller wichtigen Aktivitäten im System:

*   **Aktivitätsprotokoll:** Chronologische Anzeige aller wichtigen Aktionen wie Rechnungserstellung, Aktualisierung von Kundendaten, Anmeldung und Einstellungsänderungen.
*   **Erweiterte Filterung:** Möglichkeit zum Filtern nach Benutzer, Aktivitätstyp, Datum oder Organisation.
*   **Protokolle exportieren:** Möglichkeit, Audit-Protokolle für Compliance- oder Analysezwecke zu exportieren.
*   **Sicherheitswarnungen:** Automatische Warnungen bei verdächtigen oder ungewöhnlichen Aktivitäten.

#### 6. Feature-Flags-Bildschirm (Feature-Flags)

Verwaltung von Funktionen und Steuerung ihrer Verfügbarkeit:

*   **Feature-Liste:** Anzeige aller steuerbaren Funktionen mit ihrem aktuellen Status (Aktiviert/Deaktiviert).
*   **Features aktivieren/deaktivieren:** Möglichkeit, bestimmte Funktionen für das gesamte System oder für bestimmte Organisationen ein- oder auszuschalten.
*   **A/B-Tests:** Einrichten von A/B-Tests für neue Funktionen mit bestimmten Benutzergruppen.
*   **Feature-Scheduling:** Planen der Aktivierung oder Deaktivierung von Funktionen zu bestimmten Zeiten.

### React/Next.js Seitenstruktur für Admins

```typescript
// src/pages/admin/index.tsx - Hauptseite des Admin-Dashboards
import { NextPage } from 'next';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { AdminOverview } from '../../components/admin/AdminOverview';

const AdminDashboard: NextPage = () => {
  return (
    <AdminLayout title="Admin Dashboard">
      <AdminOverview />
    </AdminLayout>
  );
};

export default AdminDashboard;

// src/pages/admin/users.tsx - Benutzerverwaltung
import { NextPage } from 'next';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { UserManagement } from '../../components/admin/UserManagement';

const UsersPage: NextPage = () => {
  return (
    <AdminLayout title="Benutzerverwaltung">
      <UserManagement />
    </AdminLayout>
  );
};

export default UsersPage;

// src/pages/admin/roles.tsx - Rollen & Rechte
import { NextPage } from 'next';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { RoleManagement } from '../../components/admin/RoleManagement';

const RolesPage: NextPage = () => {
  return (
    <AdminLayout title="Rollen & Rechte">
      <RoleManagement />
    </AdminLayout>
  );
};

export default RolesPage;

// src/pages/admin/organizations.tsx - Organisationsübersicht
import { NextPage } from 'next';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { OrganizationOverview } from '../../components/admin/OrganizationOverview';

const OrganizationsPage: NextPage = () => {
  return (
    <AdminLayout title="Organisationsübersicht">
      <OrganizationOverview />
    </AdminLayout>
  );
};

export default OrganizationsPage;

// src/pages/admin/metrics.tsx - Systemmetriken
import { NextPage } from 'next';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { SystemMetrics } from '../../components/admin/SystemMetrics';

const MetricsPage: NextPage = () => {
  return (
    <AdminLayout title="Systemmetriken">
      <SystemMetrics />
    </AdminLayout>
  );
};

export default MetricsPage;

// src/pages/admin/audit.tsx - Audit-Log
import { NextPage } from 'next';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { AuditLog } from '../../components/admin/AuditLog';

const AuditPage: NextPage = () => {
  return (
    <AdminLayout title="Audit-Log">
      <AuditLog />
    </AdminLayout>
  );
};

export default AuditPage;

// src/pages/admin/features.tsx - Feature-Flags
import { NextPage } from 'next';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { FeatureFlags } from '../../components/admin/FeatureFlags';

const FeaturesPage: NextPage = () => {
  return (
    <AdminLayout title="Feature-Flags">
      <FeatureFlags />
    </AdminLayout>
  );
};

export default FeaturesPage;
```

## Route Guards und RBAC-Middleware

Um Sicherheit und Zugriffskontrolle zu gewährleisten, müssen wir Route Guards und RBAC-Middleware implementieren, um Benutzerberechtigungen zu überprüfen, bevor der Zugriff auf bestimmte Seiten oder Funktionen gewährt wird.

### Route Guards

```typescript
// src/components/guards/AuthGuard.tsx
import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
};

// src/components/guards/RoleGuard.tsx
import React from 'react';
import { useSession } from 'next-auth/react';
import { UserRole } from '@prisma/client';
import { AccessDenied } from '../ui/AccessDenied';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { data: session } = useSession();

  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};

// src/components/guards/PermissionGuard.tsx
import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { AccessDenied } from '../ui/AccessDenied';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ permission, children }) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <div>Berechtigungen werden überprüft...</div>;
  }

  if (!hasPermission(permission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};
```

### RBAC Middleware

```typescript
// src/middleware/rbac.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
    organizationId?: string;
  };
}

export function withAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, role: true, organizationId: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    (req as AuthenticatedRequest).user = user;
    return handler(req as AuthenticatedRequest, res);
  };
}

export function withRole(allowedRoles: UserRole[]) {
  return function (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Unzureichende Berechtigung' });
      }

      return handler(req, res);
    });
  };
}

export function withPermission(permission: string) {
  return function (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      // Hier können Sie detaillierte Berechtigungsprüfungslogik implementieren
      // basierend auf dem von Ihnen gewählten Berechtigungssystem
      const hasPermission = await checkUserPermission(req.user.id, permission);

      if (!hasPermission) {
        return res.status(403).json({ error: 'Fehlende Berechtigung für diese Aktion' });
      }

      return handler(req, res);
    });
  };
}

async function checkUserPermission(userId: string, permission: string): Promise<boolean> {
  // Berechtigungsprüfungslogik implementieren
  // Dies könnte auf einer separaten Berechtigungstabelle oder benutzerdefinierter Logik basieren
  // Für dieses Beispiel gehen wir davon aus, dass Admins alle Berechtigungen haben
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    return true;
  }

  // Hier können Sie komplexere Logik hinzufügen, um spezifische Berechtigungen zu prüfen
  return false;
}
```

### Beispiele für Richtlinienprüfungen (Policy Checks)

```typescript
// src/utils/policies.ts
import { User, UserRole } from '@prisma/client';

export class PolicyChecker {
  static canViewInvoices(user: User): boolean {
    return user.role === 'ADMIN' || user.role === 'USER';
  }

  static canCreateInvoices(user: User): boolean {
    return user.role === 'ADMIN' || user.role === 'USER';
  }

  static canDeleteInvoices(user: User): boolean {
    return user.role === 'ADMIN';
  }

  static canManageUsers(user: User): boolean {
    return user.role === 'ADMIN';
  }

  static canViewAuditLogs(user: User): boolean {
    return user.role === 'ADMIN';
  }

  static canAccessAdminDashboard(user: User): boolean {
    return user.role === 'ADMIN';
  }

  static canModifyOrganizationSettings(user: User, organizationId: string): boolean {
    return user.role === 'ADMIN' || 
           (user.role === 'USER' && user.organizationId === organizationId);
  }

  static canViewCustomerData(user: User, customerOrganizationId: string): boolean {
    return user.role === 'ADMIN' || user.organizationId === customerOrganizationId;
  }
}

// Verwendung von Richtlinienprüfungen in Komponenten
// src/components/invoices/InvoiceActions.tsx
import React from 'react';
import { useSession } from 'next-auth/react';
import { PolicyChecker } from '../../utils/policies';
import { Button } from '../ui/Button';

interface InvoiceActionsProps {
  invoiceId: string;
}

export const InvoiceActions: React.FC<InvoiceActionsProps> = ({ invoiceId }) => {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  return (
    <div className="flex space-x-2">
      {PolicyChecker.canViewInvoices(user) && (
        <Button variant="outline">Anzeigen</Button>
      )}
      
      {PolicyChecker.canCreateInvoices(user) && (
        <Button variant="outline">Bearbeiten</Button>
      )}
      
      {PolicyChecker.canDeleteInvoices(user) && (
        <Button variant="destructive">Löschen</Button>
      )}
    </div>
  );
};
```

## Gemeinsame Layout-Komponenten

```typescript
// src/components/layouts/AdminLayout.tsx
import React from 'react';
import { AdminSidebar } from '../navigation/AdminSidebar';
import { Header } from '../navigation/Header';
import { AuthGuard } from '../guards/AuthGuard';
import { RoleGuard } from '../guards/RoleGuard';

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ title, children }) => {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['ADMIN']}>
        <div className="min-h-screen bg-gray-50">
          <AdminSidebar />
          <div className="lg:pl-64">
            <Header title={title} />
            <main className="py-6">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </RoleGuard>
    </AuthGuard>
  );
};

// src/components/navigation/AdminSidebar.tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  HomeIcon, 
  UsersIcon, 
  ShieldCheckIcon, 
  BuildingOfficeIcon, 
  ChartBarIcon, 
  DocumentMagnifyingGlassIcon, 
  FlagIcon 
} from '@heroicons/react/24/outline';

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Benutzerverwaltung', href: '/admin/users', icon: UsersIcon },
  { name: 'Rollen & Rechte', href: '/admin/roles', icon: ShieldCheckIcon },
  { name: 'Organisationen', href: '/admin/organizations', icon: BuildingOfficeIcon },
  { name: 'Systemmetriken', href: '/admin/metrics', icon: ChartBarIcon },
  { name: 'Audit-Log', href: '/admin/audit', icon: DocumentMagnifyingGlassIcon },
  { name: 'Feature-Flags', href: '/admin/features', icon: FlagIcon },
];

export const AdminSidebar: React.FC = () => {
  const router = useRouter();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {adminNavigation.map((item) => {
                  const isActive = router.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                          isActive
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};
```
