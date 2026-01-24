'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    ArrowLeft,
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
    Layout,
    MapPin,
    ArrowUpRight,
    Star,
    Mail,
    Ticket,
    ChevronRight,
    BrainCircuit,
    Lock,
    Unlock,
    Edit2,
    Play,
    Video,
    RefreshCw,
    Sparkles,
    PlayCircle,
    ShoppingBag,
    Plus,
    Minus,
    Contact,
    Trash2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth-compat';
import { toast } from 'sonner';
import Script from 'next/script';
import { VisitorProfileDialog } from '@/components/visitor-profile-dialog';

function LiveAnalyticsContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const filterType = searchParams.get('filter');

    const [liveData, setLiveData] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [showDebug, setShowDebug] = useState(false);
    const [privacyMode, setPrivacyMode] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isEditingId, setIsEditingId] = useState(false);
    const [customIdValue, setCustomIdValue] = useState('');
    const [isReplayOpen, setIsReplayOpen] = useState(false);
    const [replayEvents, setReplayEvents] = useState<any[]>([]);
    const [loadingReplay, setLoadingReplay] = useState(false);
    const [activeTab, setActiveTab] = useState('live');
    const [visitorHistory, setVisitorHistory] = useState<any[]>([]);
    const [visitors, setVisitors] = useState<any[]>([]);
    const [loadingVisitors, setLoadingVisitors] = useState(false);
    const [isVisitorProfileOpen, setIsVisitorProfileOpen] = useState(false);
    const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [followedSessionId, setFollowedSessionId] = useState<string | null>(null);
    const [historySearch, setHistorySearch] = useState('');

    const fetchVisitors = async () => {
        setLoadingVisitors(true);
        try {
            const res = await fetch('/api/analytics/visitors/list');
            const data = await res.json();
            if (data.visitors) setVisitors(data.visitors);
        } catch (err) {
            console.error('Error fetching visitors:', err);
        } finally {
            setLoadingVisitors(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'visitors') {
            fetchVisitors();
        }
    }, [activeTab]);

    const fetchVisitorHistory = async (visitorId: string) => {
        if (!visitorId) return;
        setLoadingHistory(true);
        try {
            const res = await fetch(`/api/analytics/visitors/${visitorId}/sessions`);
            const data = await res.json();
            setVisitorHistory(data.sessions || []);
        } catch (err) {
            console.error('Failed to fetch visitor history', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (selectedSession?.visitorId) {
            fetchVisitorHistory(selectedSession.visitorId);
        } else {
            setVisitorHistory([]);
        }
    }, [selectedSession?.visitorId]);

    const handleUpdateVisitorId = async () => {
        if (!selectedSession?.visitor?.id) return;
        setActionLoading('update-id');
        try {
            const res = await fetch(`/api/analytics/visitors/${selectedSession.visitor.id}/identifier`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customIdentifier: customIdValue })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(json.message);
                setIsEditingId(false);
                fetchLiveData();
            } else {
                toast.error(json.error);
            }
        } catch (err) {
            toast.error('Fehler beim Aktualisieren');
        } finally {
            setActionLoading(null);
        }
    };

    const startReplay = async (sessionId: string) => {
        if (!sessionId) return;
        console.log('[Replay] Starting chunked replay for session:', sessionId);
        setLoadingReplay(true);
        setIsReplayOpen(true);
        try {
            // Step 1: Fetch chunk 0 immediately for rapid start
            const res = await fetch(`/api/analytics/sessions/${sessionId}/recording?chunk=0`);
            const data = await res.json();

            if (data.success && data.events?.length > 0) {
                setReplayEvents(data.events);

                // Initialize player with first chunk
                setTimeout(() => {
                    const container = document.getElementById('replay-player');
                    if (container && (window as any).rrwebPlayer) {
                        try {
                            container.innerHTML = '';
                            const player = new (window as any).rrwebPlayer({
                                target: container,
                                props: {
                                    events: data.events,
                                    autoPlay: true,
                                },
                            });

                            // Background loading of remaining chunks
                            if (data.hasMore) {
                                loadRemainingChunks(sessionId, player);
                            }
                        } catch (playerErr) {
                            console.error('[Replay] Player init error:', playerErr);
                            toast.error('Fehler beim Initialisieren');
                        }
                    }
                }, 500);
            } else {
                toast.error('Keine Video-Daten gefunden');
                setIsReplayOpen(false);
            }
        } catch (err) {
            console.error('[Replay] Fetch error:', err);
            toast.error('Fehler beim Laden');
            setIsReplayOpen(false);
        } finally {
            setLoadingReplay(false);
        }
    };

    const handleWatchReplay = () => {
        if (selectedSession?.id) startReplay(selectedSession.id);
    };

    const loadRemainingChunks = async (sessionId: string, player: any) => {
        let currentChunk = 1;
        let isLive = true;
        let retryCount = 0;
        const MAX_IDLE_RETRIES = 100; // Stop eventually if nothing happens for a long time

        console.log('[Live Stream] Tracking started for session:', sessionId);

        while (isLive && retryCount < MAX_IDLE_RETRIES) {
            // Check if player is still mounted or if user closed the dialog
            if (!document.getElementById('replay-player')) {
                console.log('[Live Stream] Player unmounted, stopping stream.');
                isLive = false;
                break;
            }

            try {
                const res = await fetch(`/api/analytics/sessions/${sessionId}/recording?chunk=${currentChunk}`);
                const data = await res.json();

                if (data.success && data.events?.length > 0) {
                    console.log(`[Live Stream] Appending chunk ${currentChunk} with ${data.events.length} events`);
                    retryCount = 0; // Reset idle timer

                    if (player.addEvent) {
                        data.events.forEach((event: any) => player.addEvent(event));
                    }

                    currentChunk++;

                    // If server says there's even more right now, get it immediately
                    if (data.hasMore) {
                        continue;
                    }
                } else {
                    // No new events found yet
                    retryCount++;
                }
            } catch (err) {
                console.warn('[Live Stream] Poll failed:', err);
                retryCount++;
            }

            // Wait 3 seconds before checking for new activity
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        console.log('[Live Stream] Stream concluded for session:', sessionId);
    };

    const handleAction = async (type: 'vip' | 'coupon' | 'email', data: any = {}) => {
        if (!selectedSession) return;
        setActionLoading(type);
        try {
            const res = await fetch(`/api/analytics/sessions/${selectedSession.id}/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (json.success) {
                toast.success(json.message || 'Aktion erfolgreich');
                // Refresh data
                fetchLiveData();
            } else {
                toast.error(json.error || 'Fehler bei der Aktion');
            }
        } catch (err) {
            toast.error('Netzwerkfehler');
        } finally {
            setActionLoading(null);
        }
    };

    const handleBlockIp = async () => {
        if (!selectedSession?.ipMasked) return;
        setActionLoading('block-ip');
        try {
            const res = await fetch('/api/security/blocked-ips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ipAddress: selectedSession.ipMasked,
                    reason: `Blocked from Live Analytics (Visitor #${selectedSession.visitor?.customIdentifier || selectedSession.visitorId.substring(0, 6)})`
                })
            });
            const json = await res.json();
            if (res.ok) {
                toast.success('IP-Adresse wurde gesperrt');
                // No need to refresh live data as the visitor will be blocked on next heartbeat/event
            } else {
                toast.error(json.error || 'Fehler beim Sperren');
            }
        } catch (err) {
            toast.error('Netzwerkfehler');
        } finally {
            setActionLoading(null);
        }
    };

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

            let filteredSessions = data.sessions || [];
            if (filterType === 'live') {
                filteredSessions = filteredSessions.filter((s: any) => s.status === 'ACTIVE');
            } else if (filterType === 'purchase') {
                filteredSessions = filteredSessions.filter((s: any) => s.purchaseStatus === 'PAID');
            } else if (filterType === 'bounce') {
                filteredSessions = filteredSessions.filter((s: any) => (s._count?.events || s.events?.length) <= 2);
            }

            setLiveData({ ...data, sessions: filteredSessions });

            // Follow Mode Logic
            if (followedSessionId) {
                const session = filteredSessions.find((s: any) => s.id === followedSessionId);
                if (session) {
                    // Update the selected session details if following
                    setSelectedSession(session);

                    // Specific toast if a major event happened in the followed session (e.g. checkout)
                    const lastEvent = session.events?.[session.events.length - 1];
                    if (lastEvent?.type === 'purchase' || lastEvent?.type === 'paid') {
                        toast.success(`Zahlung erhalten von #${session.visitor?.customIdentifier || 'Besucher'}`);
                    }
                } else {
                    // Session ended or visitor left
                    setFollowedSessionId(null);
                    toast.info('Session beendet – im Verlauf verfügbar', {
                        description: 'Der Besucher ist nicht mehr live.',
                        action: {
                            label: 'Zu Verlauf',
                            onClick: () => setActiveTab('history')
                        }
                    });
                }
            }

            // Auto-select session if nothing selected or refresh selected one
            if (filteredSessions.length > 0 && !selectedSession && !followedSessionId) {
                // Only auto-select if we are in the Live view to provide a starting point
                if (!filterType || filterType === 'live') {
                    setSelectedSession(filteredSessions[0]);
                }
            } else if (selectedSession && !followedSessionId) {
                const isStillInList = filteredSessions.some((s: any) => s.id === selectedSession.id);
                if (isStillInList) {
                    const updated = filteredSessions.find((s: any) => s.id === selectedSession.id);
                    if (updated) setSelectedSession(updated);
                } else if (!filterType || filterType === 'live') {
                    setSelectedSession(null);
                }
            } else if (filteredSessions.length === 0 && (!filterType || filterType === 'live')) {
                setSelectedSession(null);
                if (followedSessionId) setFollowedSessionId(null);
            }
        } catch (err) {
            console.error('Failed to fetch live data', err);
        }
    };

    const fetchSessions = async () => {
        try {
            const query = historySearch ? `&search=${encodeURIComponent(historySearch)}` : '';
            const res = await fetch(`/api/analytics/sessions?limit=50${query}`);
            const data = await res.json();
            let s = data.sessions || [];

            if (filterType === 'purchase') s = s.filter((x: any) => x.purchaseStatus === 'PAID');
            if (filterType === 'bounce') s = s.filter((x: any) => (x._count?.events || x.events?.length) <= 2);

            setSessions(s);
        } catch (err) {
            console.error('Failed to fetch sessions', err);
        }
    };

    useEffect(() => {
        fetchLiveData();
        fetchSessions();
        const interval = setInterval(() => {
            fetchLiveData();
            fetchSessions();
        }, 5000);

        if (filterType) {
            toast.info(`Filter aktiv: ${filterType}`, { duration: 2000 });
        }

        return () => clearInterval(interval);
    }, [filterType, historySearch]);

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
            case 'start_checkout': return <Briefcase className="h-3 w-3 text-emerald-500" />;
            case 'scroll_depth': return <TrendingUp className="h-3 w-3 text-blue-400" />;
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
            case 'High': return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] h-4 text-white">High Intent</Badge>;
            case 'Medium': return <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] h-4 text-white">Medium</Badge>;
            default: return <Badge variant="secondary" className="text-[10px] h-4 opacity-70">Low</Badge>;
        }
    };

    const getStatusBadge = (session: any) => {
        const timeSinceActive = Date.now() - new Date(session.lastActiveAt).getTime();
        const isEnded = session.status === 'ENDED';

        if (session.purchaseStatus === 'PAID') {
            return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] flex items-center gap-1 font-bold"><CheckCircle2 className="h-2.5 w-2.5" /> BEZAHLT</Badge>;
        }

        if (isEnded) {
            return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-bold">VERLASSEN</Badge>;
        }

        if (timeSinceActive > 60000) {
            return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold">ABWESEND</Badge>;
        }

        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] animate-pulse font-bold">LIVE</Badge>;
    };

    const getPurchaseStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID': return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> BEZAHLT</Badge>;
            case 'ABORTED': return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">ABGEBROCHEN</Badge>;
            default: return null;
        }
    };

    const getBehaviorIcons = (session: any) => {
        const icons = [];
        if (session.isReturning) icons.push(<RotateCcw key="ret" className="h-3 w-3 text-blue-500" />);

        const eventTypes = session.events?.map((e: any) => e.type) || [];
        if (eventTypes.includes('rage_click')) icons.push(<AlertTriangle key="rage" className="h-3 w-3 text-red-500" />);

        const pageViews = session.events?.filter((e: any) => e.type === 'page_view').length || 0;
        if (pageViews > 3) icons.push(<Zap key="fast" className="h-3 w-3 text-amber-500" />);

        if (session.events?.some((e: any) => e.type === 'scroll_depth' && e.metadata?.depth === 100)) {
            icons.push(<FileText key="read" className="h-3 w-3 text-indigo-500" />);
        }

        if (pageViews === 1 && session.events?.length < 3) {
            icons.push(<XOctagon key="bounce" className="h-3 w-3 text-slate-400" />);
        }

        return icons;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <NextLink href="/dashboard">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                    </NextLink>
                </div>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Live Besucher & Session Analytics</h1>
                        <p className="text-muted-foreground">Echtzeit-Überwachung des Kundenverhaltens im Shop.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`gap-2 h-9 ${privacyMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500'}`}
                            onClick={() => setPrivacyMode(!privacyMode)}
                        >
                            {privacyMode ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            Privacy: {privacyMode ? 'AN' : 'AUS'}
                        </Button>
                        <button
                            onClick={() => setShowDebug(!showDebug)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showDebug ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent'}`}
                        >
                            <Bug className="h-3.5 w-3.5" /> Debug & Setup
                        </button>
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            {liveData?.uniqueCount || 0} Aktive Besucher {(liveData?.count > liveData?.uniqueCount) && `(${liveData.count} Tabs)`}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Live Besucher</p>
                                <p className="text-2xl font-bold">{liveData?.uniqueCount || 0}</p>
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

            {showDebug && (
                <div className="space-y-4 animate-in slide-in-from-top duration-300">
                    <Card className="border-blue-200 bg-blue-50/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-600" /> Schritt 1: Integration im Shop
                            </CardTitle>
                            <CardDescription>Kopiere dieses Skript und füge es in deinen Shopify-Store ein.</CardDescription>
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
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs defaultValue="live" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-[600px] grid-cols-3">
                    <TabsTrigger value="live" className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Live
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="h-4 w-4" /> Verlauf
                    </TabsTrigger>
                    <TabsTrigger value="visitors" className="flex items-center gap-2">
                        <Contact className="h-4 w-4" /> Besucher
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
                                    <div className="divide-y relative">
                                        {liveData?.sessions?.sort((a: any, b: any) => {
                                            if (a.id === followedSessionId) return -1;
                                            if (b.id === followedSessionId) return 1;
                                            return 0;
                                        }).map((session: any) => (
                                            <div
                                                key={session.id}
                                                className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group/row ${selectedSession?.id === session.id ? 'bg-muted border-l-4 border-blue-500' : ''}`}
                                                onClick={() => setSelectedSession(session)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {getDeviceIcon(session.deviceType)}
                                                        <span className="font-black text-xs flex items-center gap-1 text-slate-900 capitalize">
                                                            {session.city ? `${session.city}, ` : ''}
                                                            {session.visitor?.country || 'DE'}
                                                        </span>
                                                        <Badge variant="outline" className="text-[9px] font-mono bg-slate-50 max-w-[60px] truncate">
                                                            #{session.visitor?.customIdentifier || session.visitor?.id?.substring(0, 4).toUpperCase() || '????'}
                                                        </Badge>

                                                        {session.id === followedSessionId ? (
                                                            <div className="flex items-center gap-1 bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-pulse border border-amber-600">
                                                                ⭐ Following
                                                            </div>
                                                        ) : (
                                                            <div className="hidden group-hover/row:flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 hover:bg-amber-50 gap-1 border border-slate-200"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFollowedSessionId(session.id);
                                                                        setSelectedSession(session);
                                                                        toast.success('Follow Mode Aktiv');
                                                                    }}
                                                                >
                                                                    ⭐ Follow
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50 gap-1 border border-slate-200"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedSession(session);
                                                                    }}
                                                                >
                                                                    👁 Live
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {session.isReturning && !followedSessionId && (
                                                            <div className="flex items-center gap-0.5 text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                                                                <RotateCcw className="h-2.5 w-2.5" />
                                                                RET
                                                            </div>
                                                        )}
                                                        {session.isVip && <Star className="h-3 w-3 text-amber-500 fill-amber-500 ml-1" />}
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
                                                        {getStatusBadge(session)}
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
                                <CardTitle className="text-lg">Session Profile & Timeline</CardTitle>
                                <CardDescription>
                                    {selectedSession ? `Details für Session ${selectedSession.sessionId.substring(0, 8)}...` : 'Wähle einen Besucher links aus'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden">
                                {selectedSession ? (
                                    <ScrollArea className="h-full pr-4">
                                        {/* Session Detail Header (The "Akte") */}
                                        <div className="flex flex-col gap-6 mb-8">
                                            <div className="flex items-start justify-between bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />

                                                <div className="flex items-center gap-5 relative z-10">
                                                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl shadow-lg ring-4 ring-blue-50">
                                                        {selectedSession.city?.substring(0, 2).toUpperCase() || selectedSession.visitor?.country || 'DE'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            {isEditingId ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold w-48 outline-blue-500 shadow-inner"
                                                                        value={customIdValue}
                                                                        onChange={(e) => setCustomIdValue(e.target.value)}
                                                                        autoFocus
                                                                    />
                                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-full" onClick={handleUpdateVisitorId}>
                                                                        <CheckCircle2 className="h-5 w-5" />
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 rounded-full" onClick={() => setIsEditingId(false)}>
                                                                        <XOctagon className="h-5 w-5" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <h3 className="font-black text-2xl tracking-tight text-slate-900">
                                                                        {selectedSession.visitor?.customIdentifier || `Besucher #${selectedSession.visitor?.id?.substring(0, 6).toUpperCase()}`}
                                                                    </h3>
                                                                    <Button
                                                                        variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                                                        onClick={() => {
                                                                            setCustomIdValue(selectedSession.visitor?.customIdentifier || '');
                                                                            setIsEditingId(true);
                                                                        }}
                                                                    >
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {selectedSession.isVip && (
                                                                <Badge className="bg-amber-400 text-amber-950 font-black border-amber-200 flex items-center gap-1 shadow-sm">
                                                                    <Star className="h-3 w-3 fill-amber-950" /> VIP
                                                                </Badge>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2.5 text-[10px] gap-1.5 font-black uppercase tracking-wider text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all ml-auto md:ml-2"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedVisitorId(selectedSession.visitor?.id || selectedSession.visitorId);
                                                                    setIsVisitorProfileOpen(true);
                                                                }}
                                                            >
                                                                <FileText className="h-3 w-3" />
                                                                Kunden-Akte
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                                            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> {selectedSession.city || 'Unbekannt'}, {selectedSession.visitor?.country || 'DE'}</span>
                                                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                            <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> {selectedSession.ipMasked || '***.***.***.0'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-3 relative z-10">
                                                    <div className="flex items-center gap-2">
                                                        {followedSessionId === selectedSession.id && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="h-8 px-3 font-black text-[10px] uppercase tracking-widest bg-red-600 shadow-lg shadow-red-100"
                                                                onClick={() => setFollowedSessionId(null)}
                                                            >
                                                                Stop Follow
                                                            </Button>
                                                        )}
                                                        <Badge variant="outline" className="bg-slate-50 text-[10px] font-mono border-slate-200 px-2 py-1">
                                                            {selectedSession.sessionId.substring(0, 12)}
                                                        </Badge>
                                                        {getStatusBadge(selectedSession)}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {selectedSession.recordingStatus === 'AVAILABLE' ? (
                                                            <Button
                                                                className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] h-8 px-4 gap-2 shadow-lg shadow-red-100 animate-pulse"
                                                                onClick={handleWatchReplay}
                                                            >
                                                                <PlayCircle className="h-4 w-4" /> REPLAY VERFÜGBAR
                                                            </Button>
                                                        ) : selectedSession.recordingStatus === 'PROCESSING' ? (
                                                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 h-8 px-3 gap-2">
                                                                <RefreshCw className="h-3 w-3 animate-spin" /> VIDEO VERARBEITUNG...
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-300 border-slate-100 h-8 px-3 italic">
                                                                Kein Video
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Inline Replay Preview Area (If Available) */}
                                            {selectedSession.recordingStatus === 'AVAILABLE' && selectedSession.thumbnailUrl && (
                                                <div
                                                    className="w-full h-48 rounded-2xl bg-slate-900 relative overflow-hidden cursor-pointer group hover:ring-4 ring-blue-500/20 transition-all border border-slate-800"
                                                    onClick={handleWatchReplay}
                                                >
                                                    <img
                                                        src={selectedSession.thumbnailUrl}
                                                        className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
                                                        alt="Session Replay Thumbnail"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:bg-blue-600 transition-colors">
                                                            <Play className="h-6 w-6 fill-current ml-1" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/10">
                                                        SESSION REPLAY STARTEN
                                                    </div>
                                                </div>
                                            )}

                                            {/* Customer Journey Map */}
                                            <Card className="border-none shadow-sm bg-slate-50/50 rounded-2xl overflow-hidden ring-1 ring-slate-100">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between relative">
                                                        <div className="absolute top-[20px] left-[10%] w-[80%] h-1 bg-slate-200 -z-0" />
                                                        <div
                                                            className="absolute top-[20px] left-[10%] h-1 bg-gradient-to-r from-blue-500 to-emerald-500 -z-0 transition-all duration-1000"
                                                            style={{
                                                                width: `${selectedSession.purchaseStatus === 'PAID' ? '80%' :
                                                                    selectedSession.events?.some((e: any) => e.type === 'start_checkout') ? '60%' :
                                                                        selectedSession.events?.some((e: any) => e.type === 'add_to_cart') ? '40%' : '20%'}`
                                                            }}
                                                        />

                                                        <JourneyStep
                                                            icon={<Globe className="h-4 w-4" />}
                                                            label="Einstieg"
                                                            active={true}
                                                            completed={selectedSession.events?.length > 0}
                                                        />
                                                        <JourneyStep
                                                            icon={<Search className="h-4 w-4" />}
                                                            label="Interesse"
                                                            active={selectedSession.events?.some((e: any) => e.type === 'view_product')}
                                                            completed={selectedSession.events?.some((e: any) => e.type === 'add_to_cart')}
                                                        />
                                                        <JourneyStep
                                                            icon={<ShoppingBag className="h-4 w-4" />}
                                                            label="Warenkorb"
                                                            active={selectedSession.events?.some((e: any) => e.type === 'add_to_cart')}
                                                            completed={selectedSession.events?.some((e: any) => e.type === 'start_checkout')}
                                                        />
                                                        <JourneyStep
                                                            icon={<Briefcase className="h-4 w-4" />}
                                                            label="Checkout"
                                                            active={selectedSession.events?.some((e: any) => e.type === 'start_checkout')}
                                                            completed={selectedSession.purchaseStatus === 'PAID'}
                                                        />
                                                        <JourneyStep
                                                            icon={<CheckCircle2 className="h-4 w-4" />}
                                                            label="Bestellt"
                                                            active={selectedSession.purchaseStatus === 'PAID'}
                                                            completed={selectedSession.purchaseStatus === 'PAID'}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Intelligence & Score Section */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-2 bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                                                        <BrainCircuit className="h-32 w-32" />
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="h-6 w-6 rounded-lg bg-blue-500 flex items-center justify-center">
                                                            <Sparkles className="h-3.5 w-3.5 text-white" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Akte Intelligence Summary</span>
                                                    </div>
                                                    <p className="text-lg font-medium leading-relaxed italic pr-12">
                                                        "{selectedSession.enterprise?.summary || "Analysiere Besucher-Pattern für Verhaltensprognose..."}"
                                                    </p>
                                                    <div className="mt-6 flex items-center gap-4">
                                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1">
                                                            {selectedSession.enterprise?.recommendedAction}
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-400 font-bold">Kaufbereitschaft: <b className="text-white">{selectedSession.enterprise?.score || 0}%</b></span>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-2xl border p-6 flex flex-col items-center justify-center text-center shadow-sm">
                                                    <div className="relative h-24 w-24 mb-4">
                                                        <svg className="w-full h-full transform -rotate-90">
                                                            <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-50" />
                                                            <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent"
                                                                strokeDasharray={2 * Math.PI * 42}
                                                                strokeDashoffset={2 * Math.PI * 42 * (1 - (selectedSession.enterprise?.score || 0) / 100)}
                                                                className={`${(selectedSession.enterprise?.score || 0) > 70 ? 'text-emerald-500' : (selectedSession.enterprise?.score || 0) > 30 ? 'text-blue-500' : 'text-slate-300'} transition-all duration-1000 ease-out`}
                                                                strokeLinecap="round"
                                                            />
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-2xl font-black">{selectedSession.enterprise?.score || 0}%</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abschluss Score</span>
                                                </div>
                                            </div>

                                            {/* Removed Items Section - Realtime */}
                                            {selectedSession.removedItems && selectedSession.removedItems.length > 0 && (
                                                <Card className="rounded-2xl border-none shadow-sm bg-red-50 overflow-hidden ring-1 ring-red-100 mb-6 group hover:ring-red-200 transition-all">
                                                    <CardHeader className="py-3 px-6 bg-red-50/50 border-b border-red-100 flex flex-row items-center justify-between">
                                                        <CardTitle className="text-xs font-black flex items-center gap-2 text-red-900 uppercase tracking-widest">
                                                            <Trash2 className="h-3.5 w-3.5 text-red-600" /> Entfernte Artikel
                                                        </CardTitle>
                                                        <Badge className="bg-red-500 hover:bg-red-600 text-white border-none text-[10px] h-5 shadow-sm shadow-red-200 px-2">{selectedSession.removedItems.length}</Badge>
                                                    </CardHeader>
                                                    <CardContent className="p-0">
                                                        <div className="divide-y divide-red-100/50">
                                                            {selectedSession.removedItems.slice().reverse().map((item: any, idx: number) => (
                                                                <div key={idx} className="p-3 flex items-center gap-3 bg-white/40 hover:bg-white/80 transition-colors animate-in fade-in slide-in-from-right-2 duration-300">
                                                                    <div className="h-10 w-10 rounded-lg bg-white border border-red-100 overflow-hidden shrink-0 shadow-sm relative group-hover:scale-105 transition-transform">
                                                                        {item.image ? <img src={item.image} className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" /> : <div className="h-full w-full flex items-center justify-center text-[8px] text-slate-300 italic">No Img</div>}
                                                                        <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <Minus className="h-4 w-4 text-white drop-shadow-md" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-[10px] font-black text-slate-700 truncate decoration-red-300/50 line-through decoration-2">{item.title}</div>
                                                                        <div className="text-[9px] text-red-400 font-bold mt-0.5 flex items-center gap-1">
                                                                            <span>{item.qty} × {item.price?.toFixed(2)} €</span>
                                                                            <span className="text-red-200">•</span>
                                                                            <span>{item.removedAt ? formatDistanceToNow(new Date(item.removedAt), { addSuffix: true, locale: de }) : 'Gerade eben'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-300 hover:text-red-600 hover:bg-red-100/50 rounded-full" onClick={() => toast.info('Wiederherstellungs-Email wird vorbereitet...')}>
                                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Cart Development Timeline (Session-Akte Exclusive) */}
                                            <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden ring-1 ring-slate-100">
                                                <CardHeader className="py-4 px-6 bg-slate-50/50 border-b flex flex-row items-center justify-between">
                                                    <CardTitle className="text-sm font-black flex items-center gap-2">
                                                        <ShoppingCart className="h-4 w-4 text-emerald-600" /> WARENKORB ENTWICKLUNG
                                                    </CardTitle>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <div className="text-[8px] font-black text-slate-400 uppercase">Current Value</div>
                                                            <div className="text-sm font-black text-emerald-600">{(selectedSession.totalValue || 0).toFixed(2)} €</div>
                                                        </div>
                                                        <div className="h-8 w-px bg-slate-200" />
                                                        <div className="text-right">
                                                            <div className="text-[8px] font-black text-slate-400 uppercase">Peak Value</div>
                                                            <div className="text-sm font-black text-blue-600">{(selectedSession.peakCartValue || 0).toFixed(2)} €</div>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    <div className="divide-y">
                                                        {selectedSession.cartSnapshots && selectedSession.cartSnapshots.length > 0 ? (
                                                            selectedSession.cartSnapshots.slice().reverse().map((snapshot: any, idx: number) => (
                                                                <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                                                                    <div className="flex flex-col items-center gap-1 mt-1">
                                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${snapshot.action === 'ADD' ? 'bg-emerald-500' : snapshot.action === 'REMOVE' ? 'bg-red-500' : 'bg-blue-500'}`}>
                                                                            {snapshot.action === 'ADD' ? <Plus className="h-4 w-4" /> : snapshot.action === 'REMOVE' ? <Minus className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                                                                        </div>
                                                                        <span className="text-[8px] font-bold text-slate-400">{new Date(snapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-[10px] font-black uppercase text-slate-500">{snapshot.action === 'ADD' ? 'Produkt Hinzugefügt' : snapshot.action === 'REMOVE' ? 'Produkt Entfernt' : 'Checkout Update'}</span>
                                                                            <Badge variant="outline" className="text-[10px] bg-white">{snapshot.itemCount} Artikel</Badge>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {snapshot.items && Array.isArray(snapshot.items) && snapshot.items.map((item: any, i: number) => (
                                                                                <div key={i} className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg p-1.5 pr-3 shadow-sm">
                                                                                    <div className="h-8 w-8 rounded bg-slate-50 overflow-hidden border">
                                                                                        {item.image ? <img src={item.image} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[8px] text-slate-300 italic">No Img</div>}
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <div className="text-[10px] font-black truncate max-w-[120px]">{item.title}</div>
                                                                                        <div className="text-[8px] text-slate-400 font-bold">{item.qty} × {item.price?.toFixed(2)} €</div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="mt-3 flex items-center justify-end gap-2 text-xs">
                                                                            <span className="text-slate-400 font-bold">Warenkorb-Wert:</span>
                                                                            <span className="font-black text-slate-900">{snapshot.totalValue.toFixed(2)} €</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-12 text-center text-slate-400 italic">
                                                                <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-10" />
                                                                Keine Warenkorb-Historie verfügbar
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Quick Actions Bar */}
                                            <div className="flex flex-wrap gap-3 p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                                                <Button
                                                    variant="ghost" className="flex-1 bg-white hover:bg-blue-50 text-blue-600 rounded-xl h-12 gap-3 shadow-sm group"
                                                    disabled={!!actionLoading}
                                                    onClick={() => handleAction('email', { templateId: 'default' })}
                                                >
                                                    <Mail className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                    <span className="font-black text-xs uppercase tracking-wider">E-Mail senden</span>
                                                </Button>
                                                <Button
                                                    variant="ghost" className="flex-1 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl h-12 gap-3 shadow-sm group"
                                                    disabled={!!actionLoading}
                                                    onClick={() => handleAction('coupon', { discountValue: 10, discountType: 'percentage' })}
                                                >
                                                    <Ticket className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                    <span className="font-black text-xs uppercase tracking-wider">Gutschein (10%)</span>
                                                </Button>
                                                <Button
                                                    variant="ghost" className={`flex-1 ${selectedSession.isVip ? 'bg-amber-400 hover:bg-amber-500 text-amber-950' : 'bg-white hover:bg-amber-50 text-amber-600'} rounded-xl h-12 gap-3 shadow-sm group`}
                                                    disabled={!!actionLoading}
                                                    onClick={() => handleAction('vip', { isVip: !selectedSession.isVip })}
                                                >
                                                    <Star className={`h-5 w-5 group-hover:scale-110 transition-transform ${selectedSession.isVip ? 'fill-amber-950' : ''}`} />
                                                    <span className="font-black text-xs uppercase tracking-wider">{selectedSession.isVip ? 'VIP ENTFERNEN' : 'ZUM VIP MACHEN'}</span>
                                                </Button>
                                            </div>

                                            {/* Advanced Event Timeline */}
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between border-b pb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                            <Activity className="h-4 w-4" />
                                                        </div>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Ereignis-Chronologie</h4>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 h-6 px-3">{selectedSession.events?.length || 0} Events</Badge>
                                                </div>

                                                <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-8 py-2">
                                                    {selectedSession.events?.slice().reverse().map((event: any, i: number) => (
                                                        <div key={i} className="relative group focus-within:ring-2 ring-blue-500 rounded-xl transition-all">
                                                            <div className="absolute -left-[45px] top-1 bg-white p-1.5 rounded-full border-2 border-slate-100 shadow-sm group-hover:border-blue-500 group-hover:scale-110 transition-all z-10">
                                                                {getEventIcon(event.type)}
                                                            </div>
                                                            <div className="flex flex-col bg-white hover:bg-slate-50/80 p-4 rounded-xl border border-slate-100 group-hover:border-blue-200 transition-all group-hover:shadow-lg group-hover:shadow-blue-500/5">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-black text-xs uppercase tracking-tighter text-slate-800">
                                                                            {event.type.replace(/_/g, ' ')}
                                                                            {event.type === 'scroll_depth' && ` (${event.metadata?.depth}%)`}
                                                                        </span>
                                                                        {event.type === 'rage_click' && <Badge variant="destructive" className="h-4 text-[8px] animate-pulse">KRITISCH</Badge>}
                                                                    </div>
                                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                                        {new Date(event.timestamp).toLocaleTimeString()}
                                                                    </span>
                                                                </div>

                                                                <div className="text-xs font-medium text-slate-500 break-all mb-3 font-mono bg-slate-50/50 p-2 rounded-lg border border-dashed border-slate-200 group-hover:border-blue-100 group-hover:text-blue-900 group-hover:bg-blue-50/30 transition-colors">
                                                                    {event.path || event.url}
                                                                </div>

                                                                {event.type === 'view_product' && event.metadata?.title && (
                                                                    <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm group-hover:ring-2 ring-blue-500/10">
                                                                        <div className="h-14 w-14 flex-shrink-0 bg-slate-50 rounded-lg border overflow-hidden p-1 shadow-inner">
                                                                            {event.metadata.image ? (
                                                                                <img src={event.metadata.image} className="h-full w-full object-cover rounded-md" />
                                                                            ) : (
                                                                                <div className="h-full w-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-300 italic">No Img</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-xs font-black truncate text-slate-900 mb-0.5">{event.metadata.title}</div>
                                                                            <div className="text-[11px] text-blue-600 font-black">{event.metadata.price ? `${event.metadata.price.toFixed(2)} €` : ''}</div>
                                                                        </div>
                                                                        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Referral & Technical Details Summary */}
                                            <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative border border-slate-800">
                                                <div className="absolute top-0 right-0 p-6 opacity-5">
                                                    <Globe className="h-24 w-24" />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/40">
                                                                <Link2 className="h-3 w-3 text-blue-400" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Herkunfts-URL</span>
                                                        </div>
                                                        <p className="text-xs font-bold break-all text-blue-100 pr-4">
                                                            {selectedSession.referrer || 'Direkter Aufruf / Unbekannt'}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
                                                                <Monitor className="h-3 w-3 text-emerald-400" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gerät & Technologie</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-bold text-slate-100">{selectedSession.deviceType} • {selectedSession.browser}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium">{selectedSession.os} • {selectedSession.screenResolution || '1920x1080'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {(selectedSession.utmSource || selectedSession.utmMedium || selectedSession.utmCampaign) && (
                                                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-2">
                                                        {selectedSession.utmSource && <Badge className="bg-white/5 hover:bg-white/10 text-white border-white/10 text-[9px] px-2">source: {selectedSession.utmSource}</Badge>}
                                                        {selectedSession.utmMedium && <Badge className="bg-white/5 hover:bg-white/10 text-white border-white/10 text-[9px] px-2">medium: {selectedSession.utmMedium}</Badge>}
                                                        {selectedSession.utmCampaign && <Badge className="bg-white/5 hover:bg-white/10 text-white border-white/10 text-[9px] px-2">campaign: {selectedSession.utmCampaign}</Badge>}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Visitor Experience History (Organized Records) */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                            <History className="h-3.5 w-3.5" />
                                                        </div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Besucher-Historie ({visitorHistory.length})</h4>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-2">
                                                    {loadingHistory ? (
                                                        <div className="py-4 flex items-center justify-center text-slate-400 text-xs gap-2">
                                                            <RefreshCw className="h-3 w-3 animate-spin" /> Lade Historie...
                                                        </div>
                                                    ) : visitorHistory.filter(s => s.id !== selectedSession.id).length > 0 ? (
                                                        visitorHistory.filter(s => s.id !== selectedSession.id).map((hSession: any) => (
                                                            <div
                                                                key={hSession.id}
                                                                className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                                                                onClick={() => setSelectedSession(hSession)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${hSession.recordingStatus === 'AVAILABLE' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                                                                        {hSession.recordingStatus === 'AVAILABLE' ? <PlayCircle className="h-5 w-5" /> : <Video className="h-4 w-4" />}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-slate-900">{new Date(hSession.startTime).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })} • {hSession.id.substring(0, 4).toUpperCase()}</span>
                                                                        <span className="text-[9px] text-slate-400 font-bold uppercase">{hSession.deviceType} • {hSession._count?.events || 0} Events</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {hSession.purchaseStatus === 'PAID' && <Badge className="bg-emerald-500 text-white border-none text-[8px] h-4">BESTELLT</Badge>}
                                                                    <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="py-6 text-center text-[10px] text-slate-400 font-bold italic bg-slate-50/50 rounded-xl border border-dashed">
                                                            Keine weiteren Sessions gefunden
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                                            <History className="h-8 w-8 opacity-40" />
                                        </div>
                                        <p>Wähle einen Besucher aus der Liste aus.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="visitors" className="space-y-6">
                    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Kunden-Akte (CRM)</CardTitle>
                                    <CardDescription className="text-xs font-medium text-slate-500">Profilübersicht und Lifetime-Tracking aller Besucher.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={fetchVisitors} disabled={loadingVisitors} className="h-8 text-[10px] font-bold uppercase tracking-widest border-slate-200">
                                        <RefreshCw className={`h-3 w-3 mr-2 ${loadingVisitors ? 'animate-spin' : ''}`} /> Aktualisieren
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Besucher</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Zuletzt Aktiv</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Sessions</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aktion</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loadingVisitors ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                                                        <p className="text-sm font-bold text-slate-400">Lade Kunden-Daten...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : visitors.length > 0 ? (
                                            visitors.map((v) => (
                                                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-100">
                                                                {v.country || '??'}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-slate-900">
                                                                    #{v.visitorToken.substring(0, 8).toUpperCase()}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                    {v.browser} • {v.os}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-700">
                                                                {new Date(v.lastActiveAt).toLocaleDateString('de-DE')}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                                                                {new Date(v.lastActiveAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="outline" className="bg-slate-50 border-slate-100 text-slate-600 font-black text-[10px]">
                                                            {v.sessionCount} Visiten
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge className={`text-[9px] font-black tracking-widest ${v.lifecycleStatus === 'LOYAL' ? 'bg-emerald-500 text-white' :
                                                            v.lifecycleStatus === 'ACTIVE' ? 'bg-blue-500 text-white' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {v.lifecycleStatus}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-all"
                                                            onClick={() => {
                                                                setSelectedVisitorId(v.id);
                                                                setIsVisitorProfileOpen(true);
                                                            }}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-2 grayscale">
                                                        <Users className="h-10 w-10 text-slate-200" />
                                                        <p className="text-sm font-bold text-slate-400 italic">Noch keine Besucher in der Datenbank</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Session-Archiv</h2>
                            <p className="text-sm text-muted-foreground">Historische Aufzeichnungen والبحث حسب الموقع أو المعرف (ID).</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Suchen nach Stadt أو ID..."
                                    className="h-9 w-[250px] bg-white border border-slate-200 rounded-lg pl-9 pr-4 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                />
                            </div>
                            <Badge variant="outline" className="h-9 px-3 border-slate-200 bg-white">
                                {sessions.length} Aufzeichnungen
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.map((session: any) => {
                            const durationMs = new Date(session.lastActiveAt).getTime() - new Date(session.startTime).getTime();
                            const durationMin = Math.floor(durationMs / 60000);
                            const durationSec = Math.floor((durationMs % 60000) / 1000);

                            return (
                                <Card
                                    key={session.id}
                                    className={`group overflow-hidden border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer relative ${selectedSession?.id === session.id ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                                    onClick={() => {
                                        setSelectedSession(session);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                >
                                    {/* Thumbnail / Replay Indicator */}
                                    <div className="aspect-video w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                        {session.recordingStatus === 'AVAILABLE' ? (
                                            <>
                                                {session.thumbnailUrl ? (
                                                    <img src={session.thumbnailUrl} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950">
                                                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                                                        <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
                                                            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                                                                <Video className="h-6 w-6 text-white/40" />
                                                            </div>
                                                            <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Session Replay</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center transition-opacity opacity-100">
                                                    <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 group-hover:bg-red-600 group-hover:border-red-500 transition-all shadow-xl">
                                                        <Play className="h-6 w-6 fill-current ml-1" />
                                                    </div>
                                                </div>
                                                <Badge className="absolute top-3 right-3 bg-red-600 text-white border-none font-bold text-[10px] shadow-lg">VIDEO</Badge>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-slate-300">
                                                <Video className="h-10 w-10 opacity-20" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Kein Video</span>
                                            </div>
                                        )}

                                        {/* Overlay Info */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-2 text-white">
                                                    {getDeviceIcon(session.deviceType)}
                                                    <span className="text-[10px] font-bold">{session.browser}</span>
                                                </div>
                                                <span className="text-[10px] text-white/80 font-mono">{formatDistanceToNow(new Date(session.startTime), { addSuffix: true, locale: de })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-slate-900">
                                                        {session.visitor?.country || 'DE'} {session.city ? `(${session.city})` : ''}
                                                    </span>
                                                    {session.isVip && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono">#{session.visitor?.id.substring(0, 8).toUpperCase()}</span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {getIntentBadge(session.intentLabel)}
                                                {session.purchaseStatus === 'PAID' && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] font-bold">BEZAHLT</Badge>}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs border-t pt-3 mt-1">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Aktivität</span>
                                                <span className="font-black">{session._count?.events || session.events?.length || 0} Events</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Dauer</span>
                                                <span className="font-black">{Math.round((new Date(session.lastActiveAt).getTime() - new Date(session.startTime).getTime()) / 60000)} Min.</span>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex gap-1.5 flex-wrap">
                                            {session.sourceLabel && (
                                                <div className="flex items-center gap-1 bg-slate-50 border px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500">
                                                    {getSourceIcon(session.sourceLabel, session.sourceMedium)}
                                                    {session.sourceLabel}
                                                </div>
                                            )}
                                            {session.totalValue > 0 && (
                                                <div className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[9px] font-black">
                                                    {session.totalValue.toFixed(2)} € WK
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                        {sessions.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 italic bg-white rounded-2xl border border-dashed">
                                <History className="h-12 w-12 opacity-10 mb-4" />
                                <p>Keine Sessions im Archiv gefunden</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={isReplayOpen} onOpenChange={setIsReplayOpen}>
                <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden bg-slate-900 border-slate-800">
                    <DialogHeader className="p-4 border-b border-white/10 bg-slate-900 text-white flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                                <Video className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-sm font-bold">Session Replay</DialogTitle>
                                <p className="text-[10px] text-slate-400">ID: {selectedSession?.sessionId}</p>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden h-[calc(85vh-60px)]">
                        {loadingReplay ? (
                            <div className="flex flex-col items-center gap-4 text-white">
                                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                                <p className="text-sm font-medium">Lade Video-Daten...</p>
                            </div>
                        ) : (
                            <div id="replay-player" className="w-full h-full flex items-center justify-center" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <VisitorProfileDialog
                visitorId={selectedVisitorId}
                open={isVisitorProfileOpen}
                onOpenChange={setIsVisitorProfileOpen}
                onReplaySession={(session) => {
                    setSelectedSession(session);
                    setIsVisitorProfileOpen(false);
                    setIsReplayOpen(true);
                    startReplay(session.id);
                }}
            />

            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/style.css" />
            <Script src="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/index.js" strategy="lazyOnload" />
        </div >
    );
}

export default function LiveAnalyticsPage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                    <Activity className="h-10 w-10 text-blue-500" />
                    <p>Live-Daten werden geladen...</p>
                </div>
            </div>
        }>
            <LiveAnalyticsContent />
        </Suspense>
    );
}

function JourneyStep({ icon, label, active, completed }: any) {
    return (
        <div className="relative z-10 flex flex-col items-center gap-2 group">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${completed ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' :
                active ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' :
                    'bg-white border-slate-200 text-slate-400'
                }`}>
                {completed ? <CheckCircle2 className="h-5 w-5" /> : icon}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-tighter ${active || completed ? 'text-slate-900' : 'text-slate-400'
                }`}>
                {label}
            </span>
            {active && !completed && (
                <div className="absolute -top-1 -right-1 h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </div>
            )}
        </div>
    );
}
