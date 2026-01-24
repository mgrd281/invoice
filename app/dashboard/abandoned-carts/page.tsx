'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Mail, Clock, CheckCircle, XCircle, ArrowLeft, RefreshCw, ExternalLink, Bell, Volume2, VolumeX, ChevronDown, ChevronUp, Smartphone, Monitor } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { de } from 'date-fns/locale'
import { EmailComposer } from '@/components/abandoned-carts/EmailComposer'
import { RecoverySettings } from '@/components/abandoned-carts/RecoverySettings'
import { Zap, Settings } from 'lucide-react'

interface AbandonedCart {
    id: string
    email: string
    cartUrl: string
    lineItems: any
    removedItems?: any
    totalPrice: string
    currency: string
    deviceInfo?: any
    totalPricePeak?: number | string
    isRecovered: boolean
    recoverySent: boolean
    recoverySentAt: string | null
    createdAt: string
    updatedAt: string
}

export default function AbandonedCartsPage() {
    // State
    const [carts, setCarts] = useState<AbandonedCart[]>([])
    const [loading, setLoading] = useState(true)
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
    const [soundEnabled, setSoundEnabled] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Recovery Modals State
    const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null)
    const [expandedCarts, setExpandedCarts] = useState<Set<string>>(new Set())

    // Refs
    const knownCartIds = useRef<Set<string>>(new Set())
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [newCartAlert, setNewCartAlert] = useState<AbandonedCart | null>(null)

    // Hooks
    const authenticatedFetch = useAuthenticatedFetch()

    // 1. Handle Mounting & LocalStorage safely
    useEffect(() => {
        setMounted(true)
        try {
            const savedSound = localStorage.getItem('abandonedCartSoundEnabled')
            if (savedSound === 'true') {
                setSoundEnabled(true)
            }
        } catch (e) {
            console.error("LocalStorage access failed:", e)
        }
    }, [])

    // 2. Sound Toggle Logic
    const toggleSound = async () => {
        const newState = !soundEnabled
        setSoundEnabled(newState)
        try {
            localStorage.setItem('abandonedCartSoundEnabled', String(newState))
        } catch (e) {
            console.error("Failed to save sound preference:", e)
        }

        if (newState) {
            if (audioRef.current) {
                audioRef.current.load()
                const playPromise = audioRef.current.play()
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            audioRef.current?.pause()
                            audioRef.current!.currentTime = 0
                        })
                        .catch(error => console.error(`Audio unlock failed: ${error.message}`))
                }
            }

            if ('Notification' in window && Notification.permission !== 'granted') {
                try {
                    const permission = await Notification.requestPermission()
                } catch (e) { }
            }
        }
    }

    // 3. Trigger Alert Logic
    const triggerNewCartAlert = useCallback((cart: AbandonedCart, isTest: boolean = false) => {
        setNewCartAlert(cart)

        if ((soundEnabled || isTest) && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification("Neuer abgebrochener Warenkorb!", {
                    body: `Wert: ${Number(cart.totalPrice).toLocaleString('de-DE', { style: 'currency', currency: cart.currency || 'EUR' })}`,
                    icon: '/favicon.ico'
                })
            } catch (e) { }
        }

        if ((soundEnabled || isTest) && audioRef.current) {
            try {
                audioRef.current.currentTime = 0
                const playPromise = audioRef.current.play()
                if (playPromise !== undefined) {
                    playPromise.catch(e => { })
                }
            } catch (e) { }
        }

        setTimeout(() => setNewCartAlert(null), 8000)
    }, [soundEnabled])

    // 4. Fetch Carts Logic
    const fetchCarts = useCallback(async () => {
        setLoading(true)
        try {
            const response = await authenticatedFetch('/api/abandoned-carts')
            if (response.ok) {
                const data = await response.json()
                const currentCarts: AbandonedCart[] = data.carts || []

                if (knownCartIds.current.size > 0) {
                    const newCarts = currentCarts.filter((c: AbandonedCart) => !knownCartIds.current.has(c.id))
                    if (newCarts.length > 0) {
                        const sortedNewCarts = [...newCarts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        triggerNewCartAlert(sortedNewCarts[0])
                    }
                }

                knownCartIds.current = new Set(currentCarts.map((c: AbandonedCart) => c.id))
                setCarts(currentCarts)
                setLastRefreshed(new Date())
            }
        } catch (error) {
            console.error('Failed to fetch carts:', error)
        } finally {
            setLoading(false)
        }
    }, [authenticatedFetch, triggerNewCartAlert])

    // 5. Initial Load & Interval
    useEffect(() => {
        if (mounted) {
            fetchCarts()
            const interval = setInterval(() => {
                if (!document.hidden) fetchCarts()
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [mounted, fetchCarts])

    const openComposer = (cart: AbandonedCart) => {
        setSelectedCart(cart)
        setIsEmailComposerOpen(true)
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-gray-50 p-8 relative">
            <audio ref={audioRef} preload="auto" src="https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3" />

            {/* Recovery Modals */}
            <EmailComposer
                isOpen={isEmailComposerOpen}
                onClose={() => setIsEmailComposerOpen(false)}
                cart={selectedCart}
                onSent={fetchCarts}
            />
            <RecoverySettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {newCartAlert && (
                <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-right-full duration-500">
                    <Card className="w-96 shadow-2xl border-l-4 border-l-emerald-500 bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-emerald-100 p-3 rounded-full animate-bounce">
                                    <ShoppingBag className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 flex items-center justify-between">
                                        Neuer Warenkorb!
                                        <span className="text-xs font-normal text-gray-500">Gerade eben</span>
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Ein Kunde hat Waren im Wert von <span className="font-bold text-emerald-600">{Number(newCartAlert.totalPrice).toLocaleString('de-DE', { style: 'currency', currency: newCartAlert.currency || 'EUR' })}</span> zurückgelassen.
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setNewCartAlert(null)}>Ausblenden</Button>
                                        <Button size="sm" className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.open(newCartAlert.cartUrl, '_blank')}>Ansehen</Button>
                                    </div>
                                </div>
                                <button onClick={() => setNewCartAlert(null)}><XCircle className="w-5 h-5 text-gray-400" /></button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-2">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück zum Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-lg">
                                <ShoppingBag className="w-8 h-8 text-emerald-600" />
                            </div>
                            Warenkorb Wiederherstellung
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setIsSettingsOpen(true)}
                            variant="outline"
                            className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                            <Zap className="w-4 h-4" /> Automatisierung
                        </Button>
                        <Button onClick={toggleSound} variant={soundEnabled ? "default" : "outline"} className={soundEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}>
                            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </Button>
                        <Button onClick={fetchCarts} variant="outline"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-white">
                    <Card className="bg-emerald-600 border-none shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Erfasste Warenkörbe</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{carts.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-600 border-none shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-blue-100 uppercase tracking-wider">Gesendete E-Mails</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{carts.filter(c => c.recoverySent).length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-600 border-none shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-purple-100 uppercase tracking-wider">Erfolgsrate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {carts.length > 0 ? Math.round((carts.filter(c => c.isRecovered).length / carts.length) * 100) : 0}%
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Carts List */}
                <Card className="shadow-xl border-none">
                    <CardHeader className="border-b bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Aktuelle Warenkörbe</CardTitle>
                                <CardDescription>Verfolgen Sie verlorene Verkäufe und kontaktieren Sie Kunden.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => fetchCarts()} className="text-emerald-600 hover:text-emerald-700">
                                <RefreshCw className="w-4 h-4 mr-2" /> Liste aktualisieren
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Kunde / E-Mail</th>
                                        <th className="px-6 py-4 font-semibold">Inhalt / Wert</th>
                                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                                        <th className="px-6 py-4 font-semibold">Zeitpunkt</th>
                                        <th className="px-6 py-4 font-semibold text-right">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {carts.map((cart) => (
                                        <tr key={cart.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-6 font-medium">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-gray-900">{cart.email}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono">{cart.id.substring(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 vertical-top align-top">
                                                <div className="flex flex-col mb-4">
                                                    <div className="text-xl font-black text-gray-900 leading-none">
                                                        {Number(cart.totalPrice).toLocaleString('de-DE', { style: 'currency', currency: cart.currency || 'EUR' })}
                                                    </div>
                                                    {(cart as any).totalPricePeak && Number((cart as any).totalPricePeak) > Number(cart.totalPrice) && (
                                                        <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">
                                                            HÖCHSTWERT: {Number((cart as any).totalPricePeak).toLocaleString('de-DE', { style: 'currency', currency: cart.currency || 'EUR' })}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex flex-col gap-2">
                                                        {Array.isArray(cart.lineItems) && cart.lineItems.length > 0 ? (
                                                            <>
                                                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">Aktuelle Artikel</div>
                                                                {(expandedCarts.has(cart.id) ? cart.lineItems : cart.lineItems.slice(0, 3)).map((item: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-2 group">
                                                                        <div className="w-8 h-8 bg-gray-50 rounded-md border border-gray-100 flex-shrink-0 overflow-hidden shadow-sm group-hover:scale-110 transition-transform duration-200">
                                                                            <img
                                                                                src={item.image?.src || (typeof item.image === 'string' ? item.image : 'https://via.placeholder.com/32?text=')}
                                                                                alt=""
                                                                                className="w-full h-full object-cover"
                                                                                loading="lazy"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <div className="text-[11px] font-semibold text-gray-700 truncate max-w-[180px]" title={item.title}>
                                                                                {item.title}
                                                                            </div>
                                                                            {(item.variant_title && item.variant_title !== 'Default Title') && (
                                                                                <span className="text-[9px] text-gray-400 -mt-0.5">
                                                                                    x{item.quantity} · {item.variant_title}
                                                                                </span>
                                                                            )}
                                                                            {(!item.variant_title || item.variant_title === 'Default Title') && (
                                                                                <span className="text-[9px] text-gray-400 -mt-0.5">
                                                                                    Menge: {item.quantity}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                {cart.lineItems.length > 3 && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const next = new Set(expandedCarts)
                                                                            if (next.has(cart.id)) next.delete(cart.id)
                                                                            else next.add(cart.id)
                                                                            setExpandedCarts(next)
                                                                        }}
                                                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 transition-colors"
                                                                    >
                                                                        {expandedCarts.has(cart.id) ? (
                                                                            <><ChevronUp className="w-3 h-3" /> verbergen</>
                                                                        ) : (
                                                                            <><ChevronDown className="w-3 h-3" /> {cart.lineItems.length - 3} weitere anzeigen</>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col gap-2">
                                                                {/* "Warenkorb geleert" badge removed as per user request */}

                                                                {Array.isArray((cart as any).removedItems) && ((cart as any).removedItems as any[]).length > 0 && (
                                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50/50 border border-red-100/50 rounded-full w-fit">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                                                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">
                                                                            {((cart as any).removedItems as any[]).length} Artikel entfernt
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Section: Entfernte Artikel */}
                                                    {Array.isArray((cart as any).removedItems) && ((cart as any).removedItems as any[]).length > 0 && (
                                                        <div className="flex flex-col gap-2 pt-2 border-t border-gray-50">
                                                            <div className="text-[9px] font-bold text-red-400/70 uppercase tracking-widest pl-0.5">Entfernte Artikel</div>
                                                            <div className="space-y-2 opacity-60">
                                                                {((cart as any).removedItems as any[]).map((item: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-2 group grayscale hover:grayscale-0 transition-all duration-300">
                                                                        <div className="w-6 h-6 bg-gray-50 rounded border border-gray-100 flex-shrink-0 overflow-hidden">
                                                                            <img
                                                                                src={item.image?.src || (typeof item.image === 'string' ? item.image : 'https://via.placeholder.com/24?text=')}
                                                                                alt=""
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <div className="text-[10px] font-medium text-gray-500 line-through truncate max-w-[160px]" title={item.title}>
                                                                                {item.title}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-[8px] font-bold text-red-500 bg-red-50 px-1 rounded truncate uppercase">
                                                                                    {item.isPartialRemoval ? `QTY REDUZIERT (-${item.quantity})` : 'ENTFERNT'}
                                                                                </span>
                                                                                {item.removedAt && (
                                                                                    <span className="text-[9px] text-gray-400">
                                                                                        {format(new Date(item.removedAt), 'HH:mm:ss')}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col items-center gap-2">
                                                    {cart.isRecovered ? (
                                                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center gap-1 uppercase">
                                                            <CheckCircle className="w-3 h-3" /> Recovered
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold flex items-center gap-1 uppercase">
                                                            <Clock className="w-3 h-3" /> Pending
                                                        </span>
                                                    )}
                                                    {cart.recoverySent && (
                                                        <span className="text-[10px] text-blue-600 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> E-Mail gesendet
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-gray-500 align-top" title={`Erstellt am ${format(new Date(cart.createdAt), 'dd.MM.yyyy')} um ${format(new Date(cart.createdAt), 'HH:mm')} Uhr`}>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900 font-medium">
                                                        {formatDistanceToNow(new Date(cart.updatedAt), { addSuffix: true, locale: de })}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 mt-0.5">
                                                        {format(new Date(cart.updatedAt), 'dd.MM.yyyy – HH:mm')}
                                                    </span>

                                                    {/* Device info */}
                                                    {(cart as any).deviceInfo && (
                                                        <div
                                                            className={`flex items-center gap-1.5 mt-2 text-[10px] font-bold w-fit px-2 py-0.5 rounded-md border transition-all ${((cart as any).deviceInfo as any).detection_confidence === 'high'
                                                                ? 'text-indigo-600 bg-indigo-50 border-indigo-200 shadow-sm'
                                                                : 'text-gray-500 bg-gray-50 border-gray-200'
                                                                }`}
                                                            title={`Gerät: ${((cart as any).deviceInfo as any).device} | System: ${((cart as any).deviceInfo as any).os} | Browser: ${((cart as any).deviceInfo as any).browser} | Auflösung: ${((cart as any).deviceInfo as any).viewportWidth || ((cart as any).deviceInfo as any).screenWidth || '?'}px | Erkennung: ${((cart as any).deviceInfo as any).detection_confidence === 'high' ? 'Verifiziert' : 'Schätzung'} | UA: ${((cart as any).deviceInfo as any).ua}`}
                                                        >
                                                            {((cart as any).deviceInfo as any).device === 'Mobile' ? (
                                                                <Smartphone className="w-3 h-3" />
                                                            ) : (
                                                                <Monitor className="w-3 h-3" />
                                                            )}
                                                            <span className="uppercase tracking-tight">{((cart as any).deviceInfo as any).device} · {((cart as any).deviceInfo as any).os}</span>
                                                            {((cart as any).deviceInfo as any).detection_confidence === 'high' && (
                                                                <Zap className="w-2.5 h-2.5 fill-indigo-600 animate-pulse" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openComposer(cart)}
                                                        className="h-8 text-blue-600 border-blue-100 hover:bg-blue-50"
                                                    >
                                                        <Mail className="w-4 h-4 mr-2" /> E-Mail senden
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => window.open(cart.cartUrl, '_blank')}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
