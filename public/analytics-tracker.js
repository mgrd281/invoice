/**
 * Storefront Analytics Tracker
 * Captures page views, product views, and cart actions.
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

    const visitorToken = getOrGenerateToken('v_token');
    let sessionId = sessionStorage.getItem('s_id');
    if (!sessionId) {
        sessionId = getOrGenerateToken('s_id', 16);
        try { sessionStorage.setItem('s_id', sessionId); } catch (e) { }
    }

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

    const track = async (event, metadata = {}) => {
        if (!organizationId) {
            // Robust check for Org ID (especially for async scripts)
            if (document.currentScript) {
                organizationId = document.currentScript.getAttribute('data-org-id');
            }

            if (!organizationId) {
                const scriptTag = Array.from(document.getElementsByTagName('script')).find(s => s.src.includes('analytics-tracker.js'));
                organizationId = scriptTag?.getAttribute('data-org-id');
            }

            if (!organizationId) {
                organizationId = document.querySelector('meta[name="organization-id"]')?.content || window.STORE_ORG_ID;
            }

            if (!organizationId) {
                console.warn('[Analytics] Organization ID missing. Tracking paused.');
                return;
            }
        }

        console.log(`[Analytics] Event: ${event}`, metadata);

        try {
            const response = await fetch(TRACKER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
                body: JSON.stringify({
                    event,
                    url: window.location.href,
                    path: window.location.pathname,
                    visitorToken,
                    sessionId,
                    organizationId,
                    isReturning,
                    cartToken: getCartToken(),
                    checkoutToken: window.Shopify?.Checkout?.token || window.Shopify?.checkout?.token,
                    referrer: document.referrer,
                    ...getUtms(),
                    metadata
                }),
                keepalive: true
            });

            if (!response.ok) {
                console.error('[Analytics] Send failed with status:', response.status);
            }
        } catch (e) {
            console.error('[Analytics] Network error:', e.message);
        }
    };

    // Health Check / Tracker Loaded
    track('tracker_loaded', { version: '2.0.0' });

    // Scroll Depth Tracking
    let reachedThresholds = new Set();
    window.addEventListener('scroll', () => {
        const winHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight - winHeight;
        if (docHeight <= 0) return;
        const scrollTop = window.scrollY;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);

        [25, 50, 75, 100].forEach(threshold => {
            if (scrollPercent >= threshold && !reachedThresholds.has(threshold)) {
                reachedThresholds.add(threshold);
                track('scroll_depth', { depth: threshold });
            }
        });
    });

    // Track Page View
    track('page_view');

    // Heartbeat every 5 seconds to keep visitor active (Better Real-time)
    setInterval(() => track('heartbeat'), 5000);

    // Track Product View (Enhanced for Shopify)
    const observeProduct = () => {
        // 1. Try Shopify Meta Data (Most reliable)
        if (window.ShopifyAnalytics?.meta?.product) {
            const p = window.ShopifyAnalytics.meta.product;
            track('view_product', {
                productId: p.id,
                title: p.gid || p.id,
                price: p.variants?.[0]?.price || 0,
                vendor: p.vendor,
                type: p.type
            });
            return;
        }

        // 2. Fallback to DOM markers
        const productElement = document.querySelector('[data-product-id]');
        if (productElement) {
            track('view_product', {
                productId: productElement.getAttribute('data-product-id'),
                title: productElement.getAttribute('data-product-title'),
                price: productElement.getAttribute('data-product-price')
            });
        }
    };

    // Wait a bit for Shopify meta to be ready
    setTimeout(observeProduct, 1000);

    // Rage Click Detection
    let clicks = [];
    document.addEventListener('click', (e) => {
        const now = Date.now();
        clicks.push({ t: now, x: e.clientX, y: e.clientY });
        clicks = clicks.filter(c => now - c.t < 1000);

        if (clicks.length >= 5) {
            const dist = Math.sqrt(
                Math.pow(clicks[0].x - clicks[4].x, 2) +
                Math.pow(clicks[0].y - clicks[4].y, 2)
            );
            if (dist < 30) {
                track('rage_click', { count: clicks.length });
                clicks = []; // Reset after trigger
            }
        }
    });

    // Smart Cart Interception (Ajax / Fetch)
    const interceptCart = () => {
        const originalFetch = window.fetch;
        window.fetch = function () {
            const arg = arguments[0];
            const url = typeof arg === 'string' ? arg : arg?.url || '';

            if (url.includes('/cart/add')) {
                track('add_to_cart', { url });
            }
            if (url.includes('/cart/change') || url.includes('/cart/update')) {
                track('update_cart', { url });
            }

            return originalFetch.apply(this, arguments);
        };

        // Also track standard form submits for cart
        document.addEventListener('submit', (e) => {
            const action = e.target.getAttribute('action');
            if (action?.includes('/cart/add')) {
                track('add_to_cart', { method: 'form_submit' });
            }
        });
    }
    interceptCart();

    // Custom Event Listeners (Compat)
    window.addEventListener('cart-add', (e) => track('add_to_cart', e.detail));
    window.addEventListener('cart-remove', (e) => track('remove_from_cart', e.detail));

    // Checkout Listeners
    if (window.location.pathname.includes('checkout')) {
        track('start_checkout');
    }

    // Expose for manual triggers
    window.Analytics = { track };
})();
