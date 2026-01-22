/**
 * Shopify Cart & Device Fingerprinting Script
 * Tracks Device, OS, and Browser with high confidence.
 */
(function () {
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        let device = 'Desktop';
        let os = 'Unknown';
        let browser = 'Unknown';

        // 1. Tactile/Pointer Detection (Highest Confidence for Mobile)
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
        const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

        if (isTouch || hasCoarsePointer) {
            device = 'Mobile';
        }

        // 2. OS Detection
        if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
        else if (/Android/i.test(ua)) os = 'Android';
        else if (/Win/i.test(ua)) os = 'Windows';
        else if (/Mac/i.test(ua)) os = 'macOS';
        else if (/Linux/i.test(ua)) os = 'Linux';

        // iPad "Request Desktop Site" Fix
        if (os === 'macOS' && isTouch) {
            os = 'iOS';
            device = 'Mobile';
        }

        // 3. Browser Detection
        if (/Edg/i.test(ua)) browser = 'Edge';
        else if (/Chrome/i.test(ua)) browser = 'Chrome';
        else if (/Firefox/i.test(ua)) browser = 'Firefox';
        else if (/Safari/i.test(ua)) browser = 'Safari';

        return {
            device,
            os,
            browser,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            isTouch: isTouch
        };
    }

    function init() {
        // Look for Shopify Checkout Information
        const shopifyCheckout = window.Shopify && window.Shopify.checkout;
        if (!shopifyCheckout || !shopifyCheckout.id) {
            // If not found, retry in 2 seconds (sometimes Shopify objects load late)
            setTimeout(init, 2000);
            return;
        }

        const payload = {
            checkoutId: shopifyCheckout.id,
            shopDomain: window.location.hostname,
            deviceInfo: getDeviceInfo()
        };

        // Send to our API
        fetch('/api/abandoned-carts/device-fingerprint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error('[Fingerprint] Error sending data:', err));
    }

    // Run on load
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
})();
