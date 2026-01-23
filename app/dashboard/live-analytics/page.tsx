'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Users,
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    Clock,
    ArrowRight,
    MousePointer2,
    Eye,
    ShoppingCart,
    AlertTriangle,
    Search,
    History,
    Bug,
    Activity,
    CheckCircle2,
    Copy,
    ExternalLink,
    Terminal as TerminalIcon,
    Link2,
    Instagram,
    Facebook,
    Search as GoogleIcon,
    Share2,
    Zap,
    TrendingUp,
    Briefcase,
    RotateCcw,
    FileText,
    XOctagon,
    MousePointerClick,
    Layout
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth-compat';
import { toast } from 'sonner';

export default function LiveAnalyticsPage() {
    const { user } = useAuth();
    const [liveData, setLiveData] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [showDebug, setShowDebug] = useState(false);

    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const trackingSnippet = `<script 
  src="${appUrl}/analytics-tracker.js" 
  data-org-id="${(user as any)?.organizationId || 'IHRE_ORG_ID'}" 
  async
></script>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(trackingSnippet);
        toast.success('Snippet in die Zwischenablage kopiert');
    };

    const fetchLiveData = async () => {
        try {
            const res = await fetch('/api/analytics/live');
            const data = await res.json();
            setLiveData(data);
        } catch (err) {
            console.error('Failed to fetch live data', err);
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/analytics/sessions?limit=20');
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (err) {
            console.error('Failed to fetch sessions', err);
        }
    };

    useEffect(() => {
        fetchLiveData();
        fetchSessions();
        const interval = setInterval(fetchLiveData, 3000); // Polling every 3s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (liveData) setLoading(false);
    }, [liveData]);

    const getDeviceIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'mobile': return <Smartphone className="h-4 w-4" />;
            case 'tablet': return <Tablet className="h-4 w-4" />;
            default: return <Monitor className="h-4 w-4" />;
        }
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'page_view': return <Eye className="h-3 w-3 text-blue-500" />;
            case 'view_product': return <Search className="h-3 w-3 text-purple-500" />;
            case 'add_to_cart': return <ShoppingCart className="h-3 w-3 text-green-500" />;
            case 'rage_click': return <AlertTriangle className="h-3 w-3 text-red-500" />;
            case 'tracker_loaded': return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
            case 'heartbeat': return <Activity className="h-3 w-3 text-slate-400" />;
            default: return <MousePointer2 className="h-3 w-3 text-gray-500" />;
        }
    };

    const getSourceIcon = (label: string, medium: string) => {
        const l = label?.toLowerCase() || '';
        const m = medium?.toLowerCase() || '';

        if (l.includes('google')) return <GoogleIcon className="h-3 w-3 text-blue-500" />;
        if (l.includes('facebook') || l.includes('instagram') || m === 'social') return <Instagram className="h-3 w-3 text-pink-500" />;
        if (l.includes('idealo')) return <Zap className="h-3 w-3 text-orange-500" />;
        if (m === 'direct') return <MousePointer2 className="h-3 w-3 text-slate-400" />;
        if (m === 'referral') return <Link2 className="h-3 w-3 text-blue-400" />;

        return <Share2 className="h-3 w-3 text-gray-400" />;
    };

    const getIntentBadge = (label: string) => {
        switch (label) {
            case 'High': return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] h-4">High Intent</Badge>;
            case 'Medium': return <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] h-4">Medium</Badge>;
            default: return <Badge variant="secondary" className="text-[10px] h-4 opacity-70">Low</Badge>;
        }
    };

    const getBehaviorIcons = (session: any) => {
        const icons = [];
        if (session.isReturning) icons.push(<RotateCcw key="ret" className="h-3 w-3 text-blue-500" title="Wiederkehrender Besucher" />);

        const eventTypes = session.events?.map((e: any) => e.type) || [];
        if (eventTypes.includes('rage_click')) icons.push(<AlertTriangle key="rage" className="h-3 w-3 text-red-500" title="Frustriertes Klicken" />);

        // Fast Nav: many page views in short time
        const pageViews = session.events?.filter((e: any) => e.type === 'page_view').length || 0;
        if (pageViews > 3) icons.push(<Zap key="fast" className="h-3 w-3 text-amber-500" title="Schnelle Navigation" />);

        // Long Read: scroll 100%
        if (session.events?.some((e: any) => e.type === 'scroll_depth' && e.metadata?.depth === 100)) {
            icons.push(<FileText key="read" className="h-3 w-3 text-indigo-500" title="Tiefes Interesse / Gelesen" />);
        }

        // Bounce risk: 1 page view + quick time
        if (pageViews === 1 && session.events?.length < 3) {
            icons.push(<XOctagon key="bounce" className="h-3 w-3 text-slate-400" title="Bounce Risiko" />);
        }

        return icons;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Live Besucher & Session Analytics</h1>
                    <p className="text-muted-foreground">Echtzeit-Überwachung des Kundenverhaltens im Shop.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showDebug ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent'}`}
                    >
                        <Bug className="h-3.5 w-3.5" /> Debug & Setup
                    </button>
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        {liveData?.count || 0} Aktive Besucher
                    </div>
                </div>
            </div>

            {/* Enterprise Dashboard Top Stats / Funnel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Live Besucher</p>
                                <p className="text-2xl font-bold">{liveData?.count || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg"><Eye className="h-5 w-5 text-purple-600" /></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Produkte (Funnel)</p>
                                <p className="text-2xl font-bold">{liveData?.funnel?.products || 0}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 ml-auto" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg"><ShoppingCart className="h-5 w-5 text-amber-600" /></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Warenkorb (Funnel)</p>
                                <p className="text-2xl font-bold">{liveData?.funnel?.cart || 0}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 ml-auto" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg"><Briefcase className="h-5 w-5 text-emerald-600" /></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Checkout (Funnel)</p>
                                <p className="text-2xl font-bold">{liveData?.funnel?.checkout || 0}</p>
                            </div>
                            <TrendingUp className="h-4 w-4 text-emerald-500 ml-auto" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {
                showDebug && (
                    <div className="space-y-4 animate-in slide-in-from-top duration-300">
                        <Card className="border-blue-200 bg-blue-50/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-blue-600" /> Schritt 1: Integration im Shop
                                </CardTitle>
                                <CardDescription>Kopiere dieses Skript und füge es in deinen Shopify-Store ein (z.B. in der `theme.liquid` vor dem schließenden {"</head>"} Tag).</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative group">
                                    <pre className="bg-slate-950 p-4 rounded-lg text-slate-300 text-xs font-mono overflow-auto border border-slate-800">
                                        {trackingSnippet}
                                    </pre>
                                    <button
                                        onClick={copyToClipboard}
                                        className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Kopieren"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-blue-700 font-medium">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    Tipp: Ohne die `data-org-id` werden keine Daten empfangen.
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-orange-200 bg-orange-50/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Bug className="h-4 w-4 text-orange-600" /> Schritt 2: Tracking Health Check
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-3 rounded-lg border shadow-sm">
                                        <div className="text-xs text-muted-foreground mb-1 font-medium">Auto-Refresh</div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Aktiv (alle 5s)
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border shadow-sm">
                                        <div className="text-xs text-muted-foreground mb-1 font-medium">Tracking Script</div>
                                        <a href="/analytics-tracker.js" target="_blank" className="text-sm font-mono truncate text-blue-600 flex items-center gap-1 hover:underline">
                                            /analytics-tracker.js <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border shadow-sm">
                                        <div className="text-xs text-muted-foreground mb-1 font-medium">Server Endpoint</div>
                                        <div className="text-sm font-mono truncate">/api/analytics/track</div>
                                    </div>
                                </div>

                                <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-hidden">
                                    <div className="text-slate-500 mb-2 border-b border-slate-800 pb-1 flex justify-between">
                                        <span className="flex items-center gap-2"><TerminalIcon className="h-3 w-3" /> Recent Tracking Events (Raw)</span>
                                        <span>Total Sessions: {liveData?.count || 0}</span>
                                    </div>
                                    <ScrollArea className="h-[200px]">
                                        <div className="space-y-1">
                                            {(liveData?.sessions || []).flatMap((s: any) => s.events).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 30).map((e: any, i: number) => (
                                                <div key={i} className="grid grid-cols-12 gap-2 hover:bg-slate-900/50 py-0.5 border-b border-slate-900 last:border-0">
                                                    <span className="col-span-2 text-slate-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
                                                    <span className={`col-span-3 \${e.type === 'page_view' ? 'text-blue-400' : e.type === 'heartbeat' ? 'text-slate-500' : 'text-purple-400'}`}>
                                                        [{e.type.toUpperCase()}]
                                                    </span>
                                                    <span className="col-span-7 text-slate-400 truncate">{e.path || e.url}</span>
                                                </div>
                                            ))}
                                            {(!liveData?.sessions?.length) && (
                                                <div className="text-slate-600 italic py-8 text-center flex flex-col items-center gap-2">
                                                    <Activity className="h-8 w-8 opacity-20 animate-pulse" />
                                                    Warte auf eingehende Events...
                                                    <p className="text-[10px] not-italic text-slate-700 max-w-[200px] mx-auto mt-2">
                                                        Falls keine Events erscheinen, prüfe ob das Skript im Shop korrekt geladen wird.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            <Tabs defaultValue="live" className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="live" className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Live
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="h-4 w-4" /> Verlauf
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="live" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-1 h-[700px] flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg">Aktuelle Besucher</CardTitle>
                                <CardDescription>Zuletzt aktiv vor max. 60 Sekunden</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-0">
                                <ScrollArea className="h-full">
                                    <div className="divide-y">
                                        {liveData?.sessions?.map((session: any) => (
                                            <div
                                                key={session.id}
                                                className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors \${selectedSession?.id === session.id ? 'bg-muted' : ''}`}
                                                onClick={() => setSelectedSession(session)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {getDeviceIcon(session.deviceType)}
                                                        <span className="font-medium text-sm">
                                                            {session.visitor?.country || 'DE'}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 ml-2 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600">
                                                            {getSourceIcon(session.sourceLabel, session.sourceMedium)}
                                                            {session.sourceLabel || 'Direct'}
                                                        </div>
                                                        <div className="flex gap-1 items-center ml-2 border-l pl-2">
                                                            {getBehaviorIcons(session)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {getIntentBadge(session.intentLabel)}
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true, locale: de })}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate mb-1">
                                                    {session.exitUrl || session.entryUrl}
                                                </div>
                                                <div className="flex gap-1">
                                                    {session.events?.filter((e: any) => e.type !== 'heartbeat').slice(0, 5).map((event: any, i: number) => (
                                                        <div key={i} title={event.type}>
                                                            {getEventIcon(event.type)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {(!liveData?.sessions || liveData.sessions.length === 0) && (
                                            <div className="p-8 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                                                <Users className="h-8 w-8 opacity-20" />
                                                Gerade keine Besucher online
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2 h-[700px] flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg">Session Timeline</CardTitle>
                                <CardDescription>
                                    {selectedSession ? `Details für Session \${selectedSession.sessionId.substring(0, 8)}...` : 'Wähle einen Besucher links aus'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden">
                                {selectedSession ? (
                                    <ScrollArea className="h-full pr-4">
                                        <div className="relative border-l-2 border-muted ml-3 pl-8 space-y-8 py-4">
                                            {selectedSession.sourceLabel && (
                                                <div className="bg-slate-50 border p-3 rounded-lg mb-4 space-y-2">
                                                    <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                        <Share2 className="h-3 w-3" /> Traffic Source
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-[10px] text-muted-foreground">Quelle / Medium</div>
                                                            <div className="text-sm font-medium flex items-center gap-2">
                                                                {getSourceIcon(selectedSession.sourceLabel, selectedSession.sourceMedium)}
                                                                {selectedSession.sourceLabel} ({selectedSession.sourceMedium})
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-muted-foreground">Referrer URL</div>
                                                            <div className="text-sm font-medium truncate max-w-[200px]" title={selectedSession.referrer}>
                                                                {selectedSession.referrer || 'Kein Referrer'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {selectedSession.utmCampaign && (
                                                        <div className="pt-2 border-t mt-2 flex gap-4">
                                                            <div>
                                                                <div className="text-[10px] text-muted-foreground">Kampagne</div>
                                                                <div className="text-xs font-mono">{selectedSession.utmCampaign}</div>
                                                            </div>
                                                            {selectedSession.utmContent && (
                                                                <div>
                                                                    <div className="text-[10px] text-muted-foreground">Content</div>
                                                                    <div className="text-xs font-mono">{selectedSession.utmContent}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {selectedSession.events?.map((event: any, i: number) => (
                                                <div key={i} className="relative">
                                                    <div className="absolute -left-[41px] top-1 bg-background p-1 rounded-full border-2 border-muted">
                                                        {getEventIcon(event.type)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm uppercase tracking-wider text-muted-foreground/80">
                                                                {event.type.replace('_', ' ')}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm font-medium mt-1">
                                                            {event.path || event.url}
                                                        </div>
                                                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                                                            <div className="bg-muted/30 p-2 rounded mt-2 text-xs font-mono">
                                                                {JSON.stringify(event.metadata, null, 2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="relative">
                                                <div className="absolute -left-[41px] top-1 bg-background p-1 rounded-full border-2 border-muted">
                                                    <Clock className="h-3 w-3 text-gray-400" />
                                                </div>
                                                <div className="text-xs text-muted-foreground italic">
                                                    Session gestartet um {new Date(selectedSession.startTime).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                                            <History className="h-8 w-8 opacity-40" />
                                        </div>
                                        <p>Wähle einen Besucher aus der Liste aus, um den Verlauf zu sehen.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Letzte Sessions</CardTitle>
                            <CardDescription>Übersicht der Nutzerbewegungen der letzten Stunden/Tage.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <div className="grid grid-cols-5 p-4 border-b font-medium bg-muted/50 text-sm">
                                    <div className="col-span-1">Besucher</div>
                                    <div className="col-span-1">Gerät/OS</div>
                                    <div className="col-span-1">Dauer</div>
                                    <div className="col-span-1">Events</div>
                                    <div className="col-span-1">Letzte Aktivität</div>
                                </div>
                                <div className="divide-y">
                                    {sessions.map((session: any) => (
                                        <div key={session.id} className="grid grid-cols-5 p-4 text-sm items-center hover:bg-muted/30">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{session.visitor?.country || 'DE'}</span>
                                                <span className="text-[10px] text-muted-foreground truncate">{session.sessionId.substring(0, 12)}...</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getDeviceIcon(session.deviceType)}
                                                <span className="text-xs">{session.os}</span>
                                            </div>
                                            <div className="text-xs">
                                                {Math.round((new Date(session.lastActiveAt).getTime() - new Date(session.startTime).getTime()) / 60000)} Min.
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Badge variant="secondary" className="px-1 text-[10px]">
                                                    {session._count?.events || 0}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true, locale: de })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}
