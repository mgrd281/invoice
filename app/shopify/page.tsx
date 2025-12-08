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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('FREE');
  const [stats, setStats] = useState({ totalRevenue: 0, openInvoices: 0, paidInvoices: 0 });

  // New State for Filters & Actions
  const [dateRange, setDateRange] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  useEffect(() => {
    if (shop) {
      // Frontend override for admin shop
      if (shop.toLowerCase().includes('45dv93-bk')) {
        setCurrentPlan('ENTERPRISE');
      }
      initShop();
    }
  }, [shop]);

  // Refetch when filters change
  useEffect(() => {
    if (shop) {
      fetchData();
    }
  }, [dateRange, statusFilter]);

  const initShop = async () => {
    try {
      // 1. Ensure Organization exists
      await fetch('/api/shopify/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop })
      });

      // 2. Fetch Data
      fetchData();
    } catch (error) {
      console.error('Setup failed:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Append filters to URL
      const res = await fetch(`/api/shopify/invoices?shop=${shop}&range=${dateRange}&status=${statusFilter}`);
      const data = await res.json();

      if (data.userEmail) {
        setUserEmail(data.userEmail);
      }

      if (data.logoUrl) {
        setLogoUrl(data.logoUrl);
      }

      if (data.plan) {
        setCurrentPlan(data.plan);
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

  const handleBulkAction = async (action: 'download' | 'refund') => {
    if (action === 'download') {
      // Download all selected PDFs
      selectedInvoices.forEach(id => {
        window.open(`/api/invoices/${id}/pdf`, '_blank');
      });
    } else if (action === 'refund') {
      if (!confirm(`${selectedInvoices.length} Rechnungen erstatten?`)) return;
      // Implement refund logic here (call API)
      alert('Funktion folgt in Kürze.');
    }
  };

  const handlePlanSelect = async (plan: string) => {
    if (!confirm(`Möchten Sie wirklich zum ${plan} Plan wechseln?`)) return;

    try {
      const res = await fetch('/api/shopify/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, shop })
      });

      const data = await res.json();
      if (data.success) {
        setCurrentPlan(data.plan);
        alert('Plan erfolgreich aktualisiert!');
      } else {
        alert('Fehler beim Aktualisieren des Plans.');
      }
    } catch (error) {
      console.error('Failed to update plan', error);
      alert('Ein Fehler ist aufgetreten.');
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
          {logoUrl ? (
            <div className="mb-3">
              <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
            </div>
          ) : (
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              RechnungsProfi
            </h1>
          )}
          <p className="text-xs text-gray-500 mt-1">{shop}</p>
          <div className="mt-2 flex items-center gap-2">
            {userEmail && (
              <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                {userEmail}
              </div>
            )}
            <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded uppercase">{currentPlan}</span>
          </div>
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
              {/* Filters */}
              <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Gesamter Zeitraum</option>
                  <option value="7d">Letzte 7 Tage</option>
                  <option value="14d">Letzte 14 Tage</option>
                  <option value="30d">Letzte 30 Tage</option>
                  <option value="this_year">Dieses Jahr</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Alle Status</option>
                  <option value="paid">Bezahlt</option>
                  <option value="open">Offen</option>
                  <option value="cancelled">Storniert/Erstattet</option>
                </select>
              </div>

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
              {/* Bulk Actions Bar */}
              {selectedInvoices.length > 0 && (
                <div className="bg-blue-50 px-6 py-3 flex items-center justify-between border-b border-blue-100">
                  <span className="text-sm text-blue-800 font-medium">
                    {selectedInvoices.length} ausgewählt
                  </span>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleBulkAction('download')}
                      className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-50 font-medium flex items-center"
                    >
                      <Download className="w-3 h-3 mr-1.5" />
                      Herunterladen
                    </button>
                    <button
                      onClick={() => handleBulkAction('refund')}
                      className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded hover:bg-red-50 font-medium"
                    >
                      Erstatten
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInvoices(invoices.map(i => i.id));
                            } else {
                              setSelectedInvoices([]);
                            }
                          }}
                          checked={invoices.length > 0 && selectedInvoices.length === invoices.length}
                        />
                      </th>
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
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedInvoices.includes(inv.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInvoices([...selectedInvoices, inv.id]);
                                } else {
                                  setSelectedInvoices(selectedInvoices.filter(id => id !== inv.id));
                                }
                              }}
                            />
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{inv.number}</td>
                          <td className="px-6 py-4 text-gray-600">{inv.customerName}</td>
                          <td className="px-6 py-4 text-gray-600">{new Date(inv.date).toLocaleDateString('de-DE')}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{formatCurrency(inv.total)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inv.status === 'Bezahlt' || inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                              inv.status === 'Offen' || inv.status === 'SENT' ? 'bg-yellow-100 text-yellow-800' :
                                inv.status === 'CANCELLED' || inv.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 flex items-center space-x-3">
                            <button
                              onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, '_blank')}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="PDF herunterladen"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, '_blank')}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                            >
                              Ansehen
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
            <div className="space-y-8 max-w-4xl mx-auto">

              {/* Subscription Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                      Abonnement & Pläne
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Wählen Sie den passenden Plan für Ihr Geschäft</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wide">
                    Aktueller Plan: {currentPlan}
                  </span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Free Plan */}
                  <div className={`border rounded-xl p-6 relative hover:shadow-md transition-shadow ${currentPlan === 'FREE' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
                    <h4 className="text-lg font-bold text-gray-900">Starter</h4>
                    <p className="text-3xl font-bold text-gray-900 mt-4">0€ <span className="text-sm font-normal text-gray-500">/Monat</span></p>
                    <ul className="mt-6 space-y-3 text-sm text-gray-600">
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> 10 Rechnungen/Monat</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Standard Support</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> PDF Export</li>
                    </ul>
                    <button
                      onClick={() => handlePlanSelect('FREE')}
                      className={`w-full mt-8 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${currentPlan === 'FREE'
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border border-blue-600 text-blue-600 hover:bg-blue-50'}`}
                      disabled={currentPlan === 'FREE'}
                    >
                      {currentPlan === 'FREE' ? 'Aktiver Plan' : 'Wählen'}
                    </button>
                  </div>

                  {/* Pro Plan */}
                  <div className={`border rounded-xl p-6 relative shadow-lg transform scale-105 bg-white ${currentPlan === 'PRO' ? 'border-blue-600 ring-2 ring-blue-600' : 'border-blue-100'}`}>
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                      BELIEBT
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Professional</h4>
                    <p className="text-3xl font-bold text-gray-900 mt-4">29€ <span className="text-sm font-normal text-gray-500">/Monat</span></p>
                    <ul className="mt-6 space-y-3 text-sm text-gray-600">
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Unbegrenzte Rechnungen</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Premium Support</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Eigenes Branding</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Digitale Produkte</li>
                    </ul>
                    <button
                      onClick={() => handlePlanSelect('PRO')}
                      className={`w-full mt-8 py-2 px-4 rounded-lg text-sm font-medium transition-colors shadow-md ${currentPlan === 'PRO'
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      disabled={currentPlan === 'PRO'}
                    >
                      {currentPlan === 'PRO' ? 'Aktiver Plan' : 'Jetzt upgraden'}
                    </button>
                  </div>

                  {/* Enterprise Plan */}
                  <div className={`border rounded-xl p-6 hover:shadow-md transition-shadow ${currentPlan === 'ENTERPRISE' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
                    <h4 className="text-lg font-bold text-gray-900">Enterprise</h4>
                    <p className="text-3xl font-bold text-gray-900 mt-4">99€ <span className="text-sm font-normal text-gray-500">/Monat</span></p>
                    <ul className="mt-6 space-y-3 text-sm text-gray-600">
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Alles aus Professional</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> API Zugriff</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Dedicated Manager</li>
                    </ul>
                    <button
                      onClick={() => handlePlanSelect('ENTERPRISE')}
                      className={`w-full mt-8 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${currentPlan === 'ENTERPRISE'
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border border-blue-600 text-blue-600 hover:bg-blue-50'}`}
                      disabled={currentPlan === 'ENTERPRISE'}
                    >
                      {currentPlan === 'ENTERPRISE' ? 'Aktiver Plan' : 'Kontaktieren'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-gray-500" />
                    Allgemeine Einstellungen
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Automatische E-Mails</h4>
                        <p className="text-xs text-gray-500">Rechnungen automatisch senden</p>
                      </div>
                      <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out rounded-full bg-green-500 cursor-pointer">
                        <span className="absolute left-5 top-0.5 bg-white w-4 h-4 rounded-full shadow-sm"></span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Bestell-Synchronisation</h4>
                        <p className="text-xs text-gray-500">Auto-Import von Shopify</p>
                      </div>
                      <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out rounded-full bg-green-500 cursor-pointer">
                        <span className="absolute left-5 top-0.5 bg-white w-4 h-4 rounded-full shadow-sm"></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-gray-500" />
                    Rechnungseinstellungen
                  </h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">Rechnungsvorlage</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Standard (Modern)</span>
                        <span className="text-xs text-blue-600 font-medium">Ändern</span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">Nummernkreis</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">RE-{'{JAHR}'}-...</span>
                        <span className="text-xs text-blue-600 font-medium">Bearbeiten</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <a
                  href="/"
                  target="_blank"
                  className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Zum vollständigen Dashboard wechseln
                </a>
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
