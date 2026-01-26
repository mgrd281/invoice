'use client';

import { HeaderNavIcons } from '@/components/navigation/header-nav-icons';
import { useEffect, useState, useMemo } from 'react';
import {
  Users, TrendingUp, ArrowRight, Search,
  ShoppingCart, AlertCircle, Plus, Download,
  Zap, Activity, DollarSign, Package, UserPlus, Sparkles, RefreshCw, Brain, ChevronRight, Filter, X
} from 'lucide-react';
import {
  Card, CardContent,
} from '@/components/ui/card';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import NextLink from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// CRM Components
import { Customer360Drawer } from '@/components/customers/customer-360-drawer';
import { CustomerEmptyState } from '@/components/customers/customer-empty-state';
import { ImportSuccessBanner } from '@/components/ui/import-success-banner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CRMTab = 'overview' | 'list' | 'segments' | 'profiles';

export default function CustomersPage() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CRMTab>('overview');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  useEffect(() => {
    const fetchCRMData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/crm/data?range=${range}`);
        const json = await res.json();
        if (json.success) setData(json);
      } catch (err) {
        console.error('Failed to fetch CRM data', err);
        toast.error('Fehler beim Laden der CRM-Daten');
      } finally {
        setLoading(false);
      }
    };
    fetchCRMData();
  }, [range]);

  if (loading && !data) return <CRMLoading />;
  if (!data) return <CustomerEmptyState />;

  const openProfile = (customer: any) => {
    setSelectedCustomer(customer);
    setDrawerOpen(true);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-20">
      <ImportSuccessBanner />
      <div className="p-6 space-y-10">
        {/* Header - German Only */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <HeaderNavIcons />
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-black uppercase tracking-widest text-[10px]">
                <Users className="w-3 h-3 mr-1" /> Kundenintelligenz
              </Badge>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
              CRM & INTELLIGENCE HUB
            </h1>
            <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[11px]">REAL-TIME SHOPIFY CRM, BEHAVIOR TRACKING & AI INSIGHTS</p>
          </div>

          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            {['today', '7d', '30d'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  range === r ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {r === 'today' ? 'Heute' : r === '7d' ? '7 Tage' : '30 Tage'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation - German Only */}
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          {[
            { id: 'overview', label: 'Übersicht' },
            { id: 'list', label: 'Kundenliste' },
            { id: 'segments', label: 'Segmente' },
            { id: 'profiles', label: 'Kundenprofile' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'overview' && <OverviewTab data={data} setInsightsOpen={setInsightsOpen} />}
          {activeTab === 'list' && <KundenlisteTab data={data} onOpenProfile={openProfile} />}
          {activeTab === 'segments' && <SegmentsTab data={data} />}
          {activeTab === 'profiles' && <ProfilesTab data={data} onOpenProfile={openProfile} />}
        </div>

        {/* Customer 360 Drawer */}
        <Customer360Drawer
          customer={selectedCustomer}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />

        {/* KI-Insights Drawer */}
        <Sheet open={insightsOpen} onOpenChange={setInsightsOpen}>
          <SheetContent className="w-full sm:w-[540px] bg-slate-900 text-white border-l-white/10 p-0">
            <div className="p-10 h-full flex flex-col">
              <SheetHeader className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <SheetTitle className="text-2xl font-black uppercase italic tracking-tight text-white">KI-Insights & Analysen</SheetTitle>
                </div>
                <SheetDescription className="text-slate-400 font-medium">
                  Automatisierte Erkenntnisse basierend auf Ihrem Kundenverhalten und Transaktionsdaten.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
                {data.insights.map((insight: any, i: number) => (
                  <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors space-y-3">
                    <Badge className={cn("border-none text-[9px] font-black uppercase px-3 h-6",
                      insight.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                    )}>{insight.title}</Badge>
                    <p className="text-lg font-bold leading-tight">{insight.text}</p>
                  </div>
                ))}

                <div className="p-8 bg-blue-600/20 rounded-[2.5rem] border border-blue-500/30 space-y-4">
                  <Brain className="w-8 h-8 text-blue-400" />
                  <h4 className="text-xl font-black uppercase">Nächste Schritte</h4>
                  <p className="text-sm text-blue-100/70 leading-relaxed">
                    Basierend auf Ihrer aktuellen Wiederkehr-Rate von {data.kpis.returningRate.value}% empfehlen wir eine automatisierte Win-Back Kampagne für Kunden, die seit 60 Tagen nicht bestellt haben.
                  </p>
                  <Button className="w-full bg-white text-blue-900 font-black text-[10px] uppercase tracking-widest rounded-2xl h-12 hover:bg-blue-50">Kampagne planen</Button>
                </div>
              </div>

              <div className="pt-10 border-t border-white/5">
                <Button variant="outline" onClick={() => setInsightsOpen(false)} className="w-full border-white/10 text-white hover:bg-white/5 font-black uppercase tracking-widest h-14 rounded-2xl">Schließen</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

// --- CRM SUB-COMPONENTS ---

function OverviewTab({ data, setInsightsOpen }: any) {
  const kpis = [
    { label: 'Gesamtkunden', value: data.kpis.totalCustomers.value, trend: data.kpis.totalCustomers.trend, icon: Users },
    { label: 'Neukunden (30t)', value: data.kpis.newCustomers.value, trend: data.kpis.newCustomers.trend, icon: UserPlus },
    { label: 'Wiederkehr-Rate', value: `${data.kpis.returningRate.value}%`, trend: data.kpis.returningRate.trend, icon: RefreshCw },
    { label: 'Durchschnittl. LTV', value: data.kpis.avgLtv.value, trend: data.kpis.avgLtv.trend, icon: DollarSign, isCurrency: true }
  ];

  return (
    <div className="space-y-10">
      {/* KPI Section with Overflow Fix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <Card key={i} className="border-none shadow-sm bg-white rounded-3xl p-8 group hover:shadow-md transition-shadow min-h-[180px] flex flex-col justify-between overflow-visible">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-900 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <kpi.icon className="w-5 h-5" />
              </div>
              <Badge className={cn(
                "border-none font-black text-[9px] uppercase",
                kpi.trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest break-words overflow-wrap-anywhere">{kpi.label}</p>
              <h3 className="text-3xl font-black text-slate-900 truncate" title={kpi.isCurrency ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(kpi.value) : kpi.value}>
                {kpi.isCurrency ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(kpi.value) : kpi.value}
              </h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm bg-white rounded-[2.5rem] p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Kunden-Wachstum</h3>
              <p className="text-sm text-slate-400 font-medium tracking-tight">Neuregistrierungen über die Zeit</p>
            </div>
          </div>
          <div className="h-[350px]">
            {/* Charts remain standard */}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                />
                <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={4} fillOpacity={0} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-8">
          {/* CRM AI INSIGHTS PANEL */}
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] p-8 h-auto min-h-[400px] flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Sparkles className="w-32 h-32 text-blue-400" />
            </div>

            <div className="relative z-10 mb-8">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> CRM AI Insights
              </h3>
              <p className="text-2xl font-black italic tracking-tight">KUNDEN INTELLIGENZ</p>
            </div>

            <div className="relative z-10 space-y-4 flex-1">
              {/* Insight 1: Top Kunde */}
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                    <Users className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Top Kunde des Monats</span>
                </div>
                <p className="font-bold text-lg">Max Mustermann</p>
                <p className="text-[10px] text-slate-400 mt-1">Höchster CLV • 12 Bestellungen</p>
              </div>

              {/* Insight 2: Kaufpotenzial */}
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hohes Kaufpotenzial</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-lg">12 Kunden</p>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] uppercase">Aktiv</Badge>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Warenkorb-Abbrecher &lt; 24h</p>
              </div>
            </div>

            <div className="relative z-10 mt-8">
              <Button
                onClick={() => setInsightsOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest h-12 rounded-xl border border-blue-500/50 shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
              >
                Alle Analysen öffnen <ChevronRight className="w-3 h-3 ml-2" />
              </Button>
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-[2.5rem] p-8">
            <h3 className="text-sm font-black uppercase tracking-tight mb-6 italic">CRM Status</h3>
            <div className="space-y-3">
              <div className="w-full text-left px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between">
                Live Synchronisation
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="w-full text-left px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between text-slate-400">
                DB Quelle: Prisma + Shopify
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KundenlisteTab({ data, onOpenProfile }: any) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false); // default: false (exclude refunds/cancelled)

  const filtered = useMemo(() => {
    let list = [...data.customers];

    // Basic Search
    if (search) {
      list = list.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Default Filter: Top Buyers (Excluding Refunds/Cancellations)
    if (!showAll) {
      list = list.filter(c => !c.isRefunded && !c.isCancelled && c.revenue > 0);
    }

    return list;
  }, [data.customers, search, showAll]);

  return (
    <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
      <div className="p-8 pb-6 border-b border-slate-50 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Kunde suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-slate-900/5 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-12 px-6 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest">
              <Download className="w-4 h-4 mr-2" /> Exportieren
            </Button>
            <Button className="h-12 px-8 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200">
              <Plus className="w-4 h-4 mr-2" /> Neuer Kunde
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
              !showAll ? "bg-blue-50 text-blue-600 border-blue-100 shadow-sm" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
            )}
          >
            <Filter className="w-3 h-3" /> Nur valide Käufer anzeigen
          </button>
          {!showAll && (
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Exkludiert Rückerstattungen & Stornierungen
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-50">
            <tr>
              {['Kunde', 'E-Mail', 'Bestellungen (gültig)', 'Umsatz (gültig)', 'Rückerstattet', 'Storniert', 'Letzter Kauf', 'Aktion'].map(h => (
                <th key={h} className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((c: any) => (
              <tr key={c.id} onClick={() => onOpenProfile(c)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors uppercase italic">
                      {(c.name || 'U').charAt(0)}
                    </div>
                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{c.name || 'Unbekannt'}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-[11px] font-bold text-slate-400">{c.email || 'Unbekannt'}</td>
                <td className="px-8 py-6">
                  <span className="text-sm font-black">{c.orders}</span>
                </td>
                <td className="px-8 py-6">
                  <span className="text-sm font-black text-slate-900 uppercase">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(c.revenue)}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className={cn("text-[10px] font-bold uppercase tracking-tight", c.isRefunded ? "text-red-500" : "text-slate-300")}>
                    {c.isRefunded ? `Ja (${c.refundedAmount.toFixed(2)} €)` : 'Nein'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className={cn("text-[10px] font-bold uppercase tracking-tight", c.isCancelled ? "text-amber-500" : "text-slate-300")}>
                    {c.isCancelled ? 'Ja' : 'Nein'}
                  </span>
                </td>
                <td className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase">
                  {c.lastOrderDate ? format(new Date(c.lastOrderDate), 'dd.MM.yyyy', { locale: de }) : '-'}
                </td>
                <td className="px-8 py-6 text-right">
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 text-[9px] font-black uppercase text-blue-600 hover:bg-blue-50">
                    Profil 360°
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-8 py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Keine passenden Kunden gefunden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SegmentsTab({ data }: any) {
  const [isCreating, setIsCreating] = useState(false);
  const [segName, setSegName] = useState('');

  const handleCreate = async () => {
    if (!segName) return toast.error('Name erforderlich');
    try {
      const res = await fetch('/api/crm/segments', {
        method: 'POST',
        body: JSON.stringify({ name: segName, rules: [{ field: 'revenue', op: '>', val: 100 }] })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Segment erstellt');
        setIsCreating(false);
        setSegName('');
      }
    } catch (e) {
      toast.error('Fehler beim Speichern');
    }
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {data.segments.map((s: any, i: number) => (
          <Card key={i} className="border-none shadow-sm bg-white rounded-[2.5rem] p-8 hover:shadow-xl transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-slate-100 transition-colors" />
            <div className="relative z-10">
              <Badge className="bg-slate-900 text-white border-none font-black text-[9px] uppercase tracking-widest mb-6 italic">Automated Segment</Badge>
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">{s.label}</h3>
              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-4xl font-black">{s.count}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Kunden</span>
              </div>
              <Button variant="outline" className="mt-10 w-full h-12 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                Segment Details
              </Button>
            </div>
          </Card>
        ))}

        {/* Rule Builder / Modal */}
        <Sheet open={isCreating} onOpenChange={setIsCreating}>
          <SheetTrigger asChild>
            <Card className="border-2 border-dashed border-slate-200 shadow-none bg-transparent rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-slate-400 transition-colors cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase italic">Custom Segment</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Eigene Regeln erstellen</p>
              </div>
            </Card>
          </SheetTrigger>
          <SheetContent className="w-full sm:w-[480px] p-10 space-y-8">
            <SheetHeader>
              <SheetTitle className="text-2xl font-black uppercase italic tracking-tight">Neues Segment erstellen</SheetTitle>
              <SheetDescription className="font-medium text-slate-400">Definieren Sie eine Kundengruppe basierend auf spezifischen Regeln.</SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Segment Name</Label>
                <Input
                  value={segName}
                  onChange={e => setSegName(e.target.value)}
                  placeholder="z.B. Top Käufer 2024"
                  className="h-12 rounded-xl font-bold border-slate-100"
                />
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Regel-Editor</p>
                <div className="flex gap-2 items-center">
                  <Badge className="bg-slate-900 text-white border-none uppercase text-[9px]">Umsatz</Badge>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">&gt;</span>
                  <Badge className="bg-white border-slate-200 text-slate-900 uppercase text-[9px]">100 €</Badge>
                </div>
                <p className="text-[10px] font-bold text-slate-300 uppercase leading-snug">Weitere Regeln für granularere Segmentierung im Enterprise-Paket verfügbar.</p>
              </div>
            </div>

            <div className="pt-10 flex gap-3">
              <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-[11px]">Abbrechen</Button>
              <Button onClick={handleCreate} className="flex-2 flex-[2] bg-slate-900 text-white rounded-2xl h-14 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-slate-200">Segment Speichern</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function ProfilesTab({ data, onOpenProfile }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {data.customers.slice(0, 12).map((c: any) => (
        <Card key={c.id} onClick={() => onOpenProfile(c)} className="border-none shadow-sm bg-white rounded-[2.5rem] p-8 hover:shadow-xl transition-all cursor-pointer group min-h-[340px] flex flex-col justify-between overflow-visible">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center font-black text-2xl text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all mb-6 shadow-sm uppercase italic">
              {(c.name || 'U').charAt(0)}
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 line-clamp-1">{c.name || 'Unbekannt'}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 line-clamp-1 break-all">{c.email || 'Unbekannt'}</p>

            <div className="mt-8 pt-8 border-t border-slate-50 w-full grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Umsatz</p>
                <p className="text-sm font-black uppercase truncate">€{c.revenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Bestell.</p>
                <p className="text-sm font-black truncate">{c.orders}</p>
              </div>
            </div>
          </div>

          <Button variant="ghost" className="mt-8 w-full h-10 text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 text-blue-600 border-none transition-all">
            Profil öffnen
          </Button>
        </Card>
      ))}
    </div>
  );
}

function CRMLoading() {
  return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[600px] space-y-6">
      <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse italic">Synchronisierung mit Kunden-Datenbank läuft...</p>
        <p className="text-sm font-medium text-slate-400 tracking-tight">Kunden-Metriken & KI-Modelle werden aggregiert.</p>
      </div>
    </div>
  );
}
