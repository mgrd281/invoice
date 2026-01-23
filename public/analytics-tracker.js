/**
 * Storefront Analytics Tracker
 * Captures page views, product views, and cart actions.
 * Version: 2.1.0
 */
(function () {
    // Get script origin to ensure we point to the correct backend even from Shopify domains
    const scriptSrc = document.currentScript?.src;
    const baseOrigin = scriptSrc ? new URL(scriptSrc).origin : '';
    const TRACKER_ENDPOINT = baseOrigin ? `${baseOrigin}/api/analytics/track` : '/api/analytics/track';

    // Organization ID should be injected when this script is served, or fetched.
    let organizationId = window.STORE_ORG_ID || document.currentScript?.getAttribute('data-org-id') || '';
    let isReturning = false;

    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    };

    const getCartToken = () => {
        return getCookie('cart') || window.ShopifyAnalytics?.lib?.user()?.traits()?.cartToken;
    };

    const setCookie = (name, value, days) => {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
    };

    const getOrGenerateToken = (key, length = 32) => {
        try {
            let token = localStorage.getItem(key) || getCookie(key);
            if (!token) {
                token = Array.from(crypto.getRandomValues(new Uint8Array(length)))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                localStorage.setItem(key, token);
                setCookie(key, token, 365);
                isReturning = false;
            } else {
                isReturning = true;
            }
            return token;
        } catch (e) {
            return 'fallback_token_' + Math.random().toString(36).substr(2, 9);
        }
    };

    const getUrlParam = (name) => {
        try {
            return new URLSearchParams(window.location.search).get(name);
        } catch (e) { return null; }
    };

    const visitorToken = getUrlParam('v_token') || getOrGenerateToken('v_token');
    let sessionId = getUrlParam('s_id') || sessionStorage.getItem('s_id');
    if (!sessionId) {
        sessionId = getOrGenerateToken('s_id', 16);
        try { sessionStorage.setItem('s_id', sessionId); } catch (e) { }
    }
    // Ensure tokens are synced to storage if they came from URL
    if (getUrlParam('v_token')) setCookie('v_token', visitorToken, 365);
    if (getUrlParam('s_id')) try { sessionStorage.setItem('s_id', sessionId); } catch (e) { }

    const getUtms = () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return {
                utmSource: urlParams.get('utm_source'),
                utmMedium: urlParams.get('utm_medium'),
                utmCampaign: urlParams.get('utm_campaign'),
                utmTerm: urlParams.get('utm_term'),
                utmContent: urlParams.get('utm_content')
            };
        } catch (e) {
            return {};
        }
    };

    // Proactive Cart Fetch (Shopify API)
    const fetchCart = async () => {
        try {
            const resp = await fetch('/cart.js');
            const cart = await resp.json();
            return {
                itemsCount: cart.item_count,
                totalValue: cart.total_price / 100,
                currency: cart.currency,
                items: cart.items.map(item => ({
                    id: item.variant_id || item.id,
                    title: item.product_title,
                    price: item.price / 100,
                    qty: item.quantity,
                    image: item.image,
                    url: item.url
                }))
            };
        } catch (e) {
            return null;
        }
    };

    const track = async (event, metadata = {}) => {
        if (!organizationId) {
            // Robust check for Org ID
            const scriptTag = document.currentScript || Array.from(document.getElementsByTagName('script')).find(s => s.src.includes('analytics-tracker.js'));
            organizationId = scriptTag?.getAttribute('data-org-id') || document.querySelector('meta[name="organization-id"]')?.content || window.STORE_ORG_ID;
            if (!organizationId) return;
        }

        // Auto-enrich with cart snapshot for relevant events
        if (['add_to_cart', 'remove_from_cart', 'update_cart', 'view_cart', 'start_checkout'].includes(event)) {
            const cartData = await fetchCart();
            if (cartData) {
                metadata.cart = cartData;
            }
        }

        console.log(`[Analytics] Event: ${event}`, metadata);

        const payload = JSON.stringify({
            event,
            url: window.location.href,
            path: window.location.pathname,
            visitorToken,
            sessionId,
            organizationId,
            isReturning,
            cartToken: getCartToken(),
            checkoutToken: window.Shopify?.Checkout?.token || window.Shopify?.checkout?.token || window.ShopifyAnalytics?.lib?.user()?.traits()?.checkoutToken,
            referrer: document.referrer,
            ...getUtms(),
            metadata
        });

        if (metadata?.isUnloading && navigator.sendBeacon) {
            console.log(`[Analytics] Using sendBeacon for ${event}`);
            navigator.sendBeacon(TRACKER_ENDPOINT, payload);
            return;
        }

        try {
            await fetch(TRACKER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
                body: payload,
                keepalive: true
            });
        } catch (e) { }
    };

    // Session Recording Logic (rrweb Integration)
    const RECORD_ENDPOINT = baseOrigin ? `${baseOrigin}/api/analytics/record` : '/api/analytics/record';
    let rrwebEvents = [];

    const loadRRWeb = () => {
        if (window.rrweb) {
            console.log('[Analytics] rrweb already loaded');
            return startRecording();
        }
        console.log('[Analytics] Loading rrweb...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js';
        script.onload = () => {
            console.log('[Analytics] rrweb script loaded successfully');
            startRecording();
        };
        script.onerror = (err) => console.error('[Analytics] Failed to load rrweb script', err);
        document.head.appendChild(script);
    };

    const startRecording = () => {
        if (!window.rrweb) {
            console.error('[Analytics] rrweb global not found even after load');
            return;
        }
        console.log('[Analytics] Starting rrweb recording session:', sessionId);
        try {
            window.rrweb.record({
                emit(event) {
                    rrwebEvents.push(event);
                    // Force flush if it's a FullSnapshot (type 2) to ensure we have the base DOM ASAP
                    if (event.type === 2 || rrwebEvents.length >= 50) {
                        console.log(`[Analytics] Flushing ${rrwebEvents.length} events (Target found: ${event.type === 2 ? 'Snapshot' : 'Threshold'})`);
                        flushEvents();
                    }
                },
            });
        } catch (e) {
            console.error('[Analytics] rrweb record error:', e);
        }
    };

    const flushEvents = async (isUnloading = false) => {
        if (rrwebEvents.length === 0) return;
        const eventsToSend = [...rrwebEvents];
        rrwebEvents = [];
        console.log(`[Analytics] Flushing ${eventsToSend.length} events to ${RECORD_ENDPOINT} (isUnloading: ${isUnloading})`);
        try {
            const fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
                body: JSON.stringify({
                    sessionId,
                    organizationId,
                    events: eventsToSend
                })
            };

            // Only use keepalive for unload events as it has strict 64KB limits
            if (isUnloading) {
                fetchOptions.keepalive = true;
            }

            const resp = await fetch(RECORD_ENDPOINT, fetchOptions);
            if (!resp.ok) console.warn('[Analytics] Flush failed with status:', resp.status);
        } catch (e) {
            console.error('[Analytics] Flush error:', e);
        }
    };

    // Auto-flush every 10 seconds
    setInterval(flushEvents, 10000);

    // Initial Tracking
    track('tracker_loaded', { version: '2.2.0' });
    track('page_view');
    loadRRWeb();

    // Heartbeat every 15 seconds
    setInterval(() => track('heartbeat'), 15000);

    // Visibility / Activity Tracking
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            track('session_idle');
        } else {
            track('session_active');
        }
    });

    // Proactive Exit Tracking
    const handleExit = () => {
        console.log('[Analytics] Exit detected, sending session_ended');
        track('session_ended', { reason: 'exit', isUnloading: true });
        flushEvents(true);
    };

    window.addEventListener('pagehide', handleExit);
    window.addEventListener('beforeunload', (e) => {
        // Fallback for some browsers, but don't double-track if pagehide already fired
        if (!window._exitTracked) {
            window._exitTracked = true;
            handleExit();
        }
    });

    // Track Product View (Enhanced for Shopify)
    const observeProduct = () => {
        if (window.ShopifyAnalytics?.meta?.product) {
            const p = window.ShopifyAnalytics.meta.product;
            track('view_product', {
                productId: p.id,
                title: p.product_title || p.gid || p.id,
                price: p.variants?.[0]?.price ? p.variants[0].price / 100 : 0,
                vendor: p.vendor,
                type: p.type,
                image: document.querySelector('meta[property="og:image"]')?.content
            });
        }
    };
    setTimeout(observeProduct, 1500);

    // Rage Click Detection
    let clicks = [];
    document.addEventListener('click', (e) => {
        const now = Date.now();
        clicks.push({ t: now, x: e.clientX, y: e.clientY });
        clicks = clicks.filter(c => now - c.t < 1000);
        if (clicks.length >= 5) {
            track('rage_click', { count: clicks.length });
            clicks = [];
        }
    });

    // Smart Cart & Checkout Interception
    const interceptCart = () => {
        const originalFetch = window.fetch;
        window.fetch = function () {
            const arg = arguments[0];
            const url = typeof arg === 'string' ? arg : arg?.url || '';

            if (url.includes('/cart/add')) track('add_to_cart');
            if (url.includes('/cart/change') || url.includes('/cart/update') || url.includes('/cart/add')) track('update_cart');
            if (url.includes('/checkout')) track('start_checkout');

            return originalFetch.apply(this, arguments);
        };

        // Track Checkout Buttons
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button');
            if (!target) return;

            const isCheckout =
                target.name === 'checkout' ||
                target.getAttribute('href')?.includes('/checkout') ||
                target.textContent?.toLowerCase().includes('checkout') ||
                target.textContent?.toLowerCase().includes('kasse');

            if (isCheckout) {
                track('start_checkout', { method: 'click', label: target.textContent?.trim() });

                // Cross-domain continuity: Append tokens to checkout URL if it's a link
                if (target.tagName === 'A' && target.href && !target.href.includes('v_token=')) {
                    const url = new URL(target.href, window.location.origin);
                    url.searchParams.set('v_token', visitorToken);
                    url.searchParams.set('s_id', sessionId);
                    target.href = url.toString();
                }
            }
        });
    }
    interceptCart();

    // Scroll tracking
    let reachedThresholds = new Set();
    window.addEventListener('scroll', () => {
        const h = document.documentElement, b = document.body, st = 'scrollTop', sh = 'scrollHeight';
        const scrollPercent = Math.round((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight) * 100);
        [50, 90].forEach(t => {
            if (scrollPercent >= t && !reachedThresholds.has(t)) {
                reachedThresholds.add(t);
                track('scroll_depth', { depth: t });
            }
        });
    });

    window.Analytics = { track };
})();
