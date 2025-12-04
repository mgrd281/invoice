// Shopify Schnell-Setup
const fs = require('fs');
const path = require('path');

console.log('🛍️ Shopify Schnell-Setup...');
console.log('');

// Echte Shopify-Daten
const shopifyConfig = {
  shopDomain: '45dv93-bk.myshopify.com',
  adminUrl: 'https://admin.shopify.com/store/45dv93-bk',
  apiKey: 'SHOPIFY_API_KEY_PLACEHOLDER',
  secretKey: 'SHOPIFY_SECRET_KEY_PLACEHOLDER',
  accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
  apiVersion: '2024-01'
};

console.log('📋 Shopify-Daten:');
console.log(`   🏪 Shop Domain: ${shopifyConfig.shopDomain}`);
console.log(`   🔗 Admin URL: ${shopifyConfig.adminUrl}`);
console.log(`   🔑 API Key: ${shopifyConfig.apiKey}`);
console.log(`   🔐 Secret Key: ${shopifyConfig.secretKey}`);
console.log(`   🎫 Access Token: ${shopifyConfig.accessToken}`);
console.log(`   📅 API Version: ${shopifyConfig.apiVersion}`);
console.log('');

// Einstellungen in JSON-Datei speichern
const configPath = path.join(__dirname, 'shopify-config.json');
const fullConfig = {
  shopify: {
    enabled: true,
    ...shopifyConfig,
    autoImport: false,
    importInterval: 60,
    defaultTaxRate: 19,
    defaultPaymentTerms: 14
  },
  setup: {
    quickStart: true,
    setupDate: new Date().toISOString().split('T')[0],
    status: 'ready'
  }
};

fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));

console.log('✅ Einstellungen in shopify-config.json gespeichert');
console.log('');

console.log('🚀 Schnell-Setup Schritte:');
console.log('');
console.log('1️⃣ Öffnen Sie den Browser und gehen Sie zu:');
console.log('   http://localhost:3000/shopify');
console.log('');
console.log('2️⃣ Geben Sie folgende Daten ein:');
console.log(`   Shop Domain: ${shopifyConfig.shopDomain}`);
console.log(`   Access Token: ${shopifyConfig.accessToken}`);
console.log(`   API Version: ${shopifyConfig.apiVersion}`);
console.log('');
console.log('3️⃣ Klicken Sie auf "Verbindung testen" um die Verbindung zu prüfen');
console.log('');
console.log('4️⃣ Speichern Sie die Einstellungen und gehen Sie zum "Import" Tab');
console.log('');
console.log('5️⃣ Beginnen Sie mit dem Import von Shopify-Bestellungen als Rechnungen');
console.log('');

console.log('🎯 Verfügbare Features nach dem Setup:');
console.log('   ✅ Automatischer Import bezahlter Bestellungen');
console.log('   ✅ Umwandlung in professionelle Rechnungen');
console.log('   ✅ Rechnungsversand per E-Mail');
console.log('   ✅ Stempel- und Wasserzeichen-System');
console.log('   ✅ Massen-Rechnungsversand');
console.log('');

console.log('🔄 System ist bereit für den sofortigen Einsatz!');
