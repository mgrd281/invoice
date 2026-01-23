const { ShopifyAPI } = require('./lib/shopify-api');
const { getShopifySettings } = require('./lib/shopify-settings');

async function debug() {
    try {
        const settings = getShopifySettings();
        console.log('Settings:', JSON.stringify({ ...settings, accessToken: 'REDACTED' }, null, 2));

        const api = new ShopifyAPI(settings);

        console.log('Testing connection...');
        const conn = await api.testConnection();
        console.log('Connection Result:', conn);

        if (!conn.success) return;

        console.log('Fetching products with status=any...');
        // We'll manually test different parameters
        const searchParams = new URLSearchParams();
        searchParams.set('limit', '250');
        searchParams.set('status', 'any');

        const response = await api['makeRequest']('/products.json?' + searchParams.toString());
        const data = await response.json();
        const count = data.products?.length || 0;

        console.log(`Found ${count} products in first page with status=any`);

        if (data.products && data.products.length > 0) {
            console.log('First 5 product titles:', data.products.slice(0, 5).map(p => p.title));
            console.log('Vendors:', [...new Set(data.products.map(p => p.vendor))]);
        }

        // Check pagination
        const link = response.headers.get('Link');
        console.log('Link Header:', link);

    } catch (error) {
        console.error('Debug failed:', error);
    }
}

debug();
