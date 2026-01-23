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

    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
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

    const track = async (event, metadata = {}) => {
        if (!organizationId) {
            organizationId = document.querySelector('meta[name="organization-id"]')?.content || window.STORE_ORG_ID || document.currentScript?.getAttribute('data-org-id');
            if (!organizationId) return;
        }

        try {
            await fetch(TRACKER_ENDPOINT, {
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
                    referrer: document.referrer,
                    metadata
                }),
                keepalive: true
            });
        } catch (e) {
            // Fallback for older browsers or fetch failures
        }
    };

    // Health Check / Tracker Loaded
    track('tracker_loaded', { version: '1.1.0' });

    // Track Page View
    track('page_view');

    // Heartbeat every 15 seconds to keep visitor active
    setInterval(() => track('heartbeat'), 15000);

    // Track Product View (requires specific DOM markers)
    const observeProduct = () => {
        const productElement = document.querySelector('[data-product-id]');
        if (productElement) {
            track('view_product', {
                productId: productElement.getAttribute('data-product-id'),
                title: productElement.getAttribute('data-product-title'),
                price: productElement.getAttribute('data-product-price')
            });
        }
    };
    observeProduct();

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

    // Cart Listeners
    window.addEventListener('cart-add', (e) => track('add_to_cart', e.detail));
    window.addEventListener('cart-remove', (e) => track('remove_from_cart', e.detail));

    // Checkout Listeners
    if (window.location.pathname.includes('checkout')) {
        track('start_checkout');
    }

    // Expose for manual triggers
    window.Analytics = { track };
})();
