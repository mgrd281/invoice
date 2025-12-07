'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Settings,
  TrendingUp,
  Users,
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Key
} from 'lucide-react';
import DigitalProductsView from './DigitalProductsView';

// Types
interface Invoice {
  id: string;
  number: string;
  date: string;
  customerName: string;
  total: number;
  status: string;
  statusColor: string;
}

function ShopifyEmbeddedContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalRevenue: 0, openInvoices: 0, paidInvoices: 0 });

  useEffect(() => {
    if (shop) {
      fetchData();
    }
  }, [shop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shopify/invoices?shop=${shop}`);
      const data = await res.json();

      if (data.userEmail) {
        setUserEmail(data.userEmail);
      }

      if (data.invoices) {
        setInvoices(data.invoices);
        calculateStats(data.invoices);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (invs: Invoice[]) => {
    const total = invs.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const open = invs.filter(i => i.status === 'Offen' || i.status === 'SENT' || i.status === 'DRAFT').length;
    const paid = invs.filter(i => i.status === 'Bezahlt' || i.status === 'PAID').length;
    setStats({ totalRevenue: total, openInvoices: open, paidInvoices: paid });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            RechnungsProfi
          </h1>
          <p className="text-xs text-gray-500 mt-1">{shop}</p>
          {userEmail && (
            <div className="mt-2 flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {userEmail}
            </div>
          )}
        </div>

        <nav className="p-4 space-y-1 flex-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'dashboard'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Übersicht
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'invoices'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <FileText className="w-5 h-5 mr-3" />
            Rechnungen
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Settings className="w-5 h-5 mr-3" />
            Einstellungen
          </button>

          <button
            onClick={() => setActiveTab('digital-products')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'digital-products'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Key className="w-5 h-5 mr-3" />
            Digitale Produkte
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <a
            href="/"
            target="_blank"
            className="flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            In neuem Tab öffnen
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-800">
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'invoices' && 'Alle Rechnungen'}
            {activeTab === 'settings' && 'Einstellungen'}
            {activeTab === 'digital-products' && 'Digitale Produkte'}
          </h2>
          <button
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        <main className="p-8">
          {/* Digital Products View */}
          {activeTab === 'digital-products' && shop && (
            <DigitalProductsView shop={shop} />
          )}

          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500">Gesamtumsatz</h3>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500">Offene Rechnungen</h3>
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.openInvoices}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500">Bezahlte Rechnungen</h3>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.paidInvoices}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Letzte Aktivitäten</h3>
                </div>
                <div className="p-6 text-center text-gray-500 text-sm">
                  {invoices.length > 0 ? (
                    <div className="space-y-3">
                      {invoices.slice(0, 5).map((inv) => (
                        <div key={inv.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-900">{inv.number}</p>
                              <p className="text-xs text-gray-500">{inv.customerName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatCurrency(inv.total)}</p>
                            <p className="text-xs text-gray-500">{new Date(inv.date).toLocaleDateString('de-DE')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Keine Aktivitäten vorhanden.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Invoices View */}
          {activeTab === 'invoices' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-medium text-gray-500">Nummer</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Kunde</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Datum</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Betrag</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                      <th className="px-6 py-4 font-medium text-gray-500">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.length > 0 ? (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{inv.number}</td>
                          <td className="px-6 py-4 text-gray-600">{inv.customerName}</td>
                          <td className="px-6 py-4 text-gray-600">{new Date(inv.date).toLocaleDateString('de-DE')}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{formatCurrency(inv.total)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inv.status === 'Bezahlt' ? 'bg-green-100 text-green-800' :
                              inv.status === 'Offen' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                              Ansehen
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          Keine Rechnungen gefunden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings View */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-2xl">
              <h3 className="text-lg font-semibold mb-6">App Einstellungen</h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Automatische E-Mails</h4>
                    <p className="text-sm text-gray-500">Rechnungen automatisch an Kunden senden</p>
                  </div>
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-green-500 cursor-pointer">
                    <span className="absolute left-6 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out shadow-sm"></span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Synchronisation</h4>
                    <p className="text-sm text-gray-500">Bestellungen automatisch importieren</p>
                  </div>
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-green-500 cursor-pointer">
                    <span className="absolute left-6 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out shadow-sm"></span>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-4">
                    Für erweiterte Einstellungen besuchen Sie bitte das vollständige Dashboard.
                  </p>
                  <a
                    href="/"
                    target="_blank"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Vollständiges Dashboard öffnen
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ShopifyEmbeddedPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <ShopifyEmbeddedContent />
    </Suspense>
  );
}
