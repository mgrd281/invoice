// Shopify-Verbindungstest und Import-Problemdiagnose
const fs = require('fs');

console.log('🔍 Shopify-Verbindungstest...');
console.log('');

// Verbindungsdaten
const shopifyConfig = {
  shopDomain: '45dv93-bk.myshopify.com',
  accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
  apiVersion: '2024-01'
};

console.log('📋 Verbindungsdaten:');
console.log(`   🏪 Shop Domain: ${shopifyConfig.shopDomain}`);
console.log(`   🎫 Access Token: ${shopifyConfig.accessToken.substring(0, 20)}...`);
console.log(`   📅 API Version: ${shopifyConfig.apiVersion}`);
console.log('');

async function testShopifyConnection() {
  try {
    console.log('1️⃣ Grundverbindungstest...');
    
    // Verbindungstest mit Shop API
    const shopResponse = await fetch(`https://${shopifyConfig.shopDomain}/admin/api/${shopifyConfig.apiVersion}/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopResponse.ok) {
      console.error(`❌ Verbindung fehlgeschlagen: ${shopResponse.status} ${shopResponse.statusText}`);
      const errorText = await shopResponse.text();
      console.error(`   Details: ${errorText}`);
      return;
    }

    const shopData = await shopResponse.json();
    console.log(`✅ Verbindung erfolgreich! Shop: ${shopData.shop.name}`);
    console.log(`   📧 Shop E-Mail: ${shopData.shop.email}`);
    console.log(`   🌍 Domain: ${shopData.shop.domain}`);
    console.log('');

    console.log('2️⃣ Bezahlte Bestellungen abrufen...');
    
    // Bezahlte Bestellungen abrufen
    const ordersResponse = await fetch(`https://${shopifyConfig.shopDomain}/admin/api/${shopifyConfig.apiVersion}/orders.json?status=any&financial_status=paid&limit=50`, {
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!ordersResponse.ok) {
      console.error(`❌ Bestellungen abrufen fehlgeschlagen: ${ordersResponse.status} ${ordersResponse.statusText}`);
      const errorText = await ordersResponse.text();
      console.error(`   Details: ${errorText}`);
      return;
    }

    const ordersData = await ordersResponse.json();
    console.log(`📦 Anzahl bezahlter Bestellungen: ${ordersData.orders.length}`);
    
    if (ordersData.orders.length === 0) {
      console.log('⚠️  Keine bezahlten Bestellungen im Shop gefunden');
      console.log('');
      
      // Alle Bestellungen zur Überprüfung abrufen
      console.log('3️⃣ Alle Bestellungen zur Überprüfung abrufen...');
      const allOrdersResponse = await fetch(`https://${shopifyConfig.shopDomain}/admin/api/${shopifyConfig.apiVersion}/orders.json?status=any&limit=50`, {
        headers: {
          'X-Shopify-Access-Token': shopifyConfig.accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (allOrdersResponse.ok) {
        const allOrdersData = await allOrdersResponse.json();
        console.log(`📋 Gesamte Bestellungen: ${allOrdersData.orders.length}`);
        
        if (allOrdersData.orders.length > 0) {
          console.log('');
          console.log('📊 Bestellungsdetails:');
          allOrdersData.orders.forEach((order, index) => {
            console.log(`   ${index + 1}. ${order.name} - ${order.financial_status} - ${order.total_price} ${order.currency}`);
            console.log(`      Kunde: ${order.customer.first_name} ${order.customer.last_name} (${order.customer.email})`);
            console.log(`      Datum: ${new Date(order.created_at).toLocaleDateString('de-DE')}`);
          });
        }
      }
    } else {
      console.log('');
      console.log('📊 Details der bezahlten Bestellungen:');
      ordersData.orders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.name} - ${order.total_price} ${order.currency}`);
        console.log(`      Kunde: ${order.customer.first_name} ${order.customer.last_name} (${order.customer.email})`);
        console.log(`      Datum: ${new Date(order.created_at).toLocaleDateString('de-DE')}`);
      });
    }

    console.log('');
    console.log('4️⃣ Shopify-Einstellungen speichern...');
    
    // Einstellungen im user-storage Ordner speichern
    const userStorageDir = './user-storage';
    if (!fs.existsSync(userStorageDir)) {
      fs.mkdirSync(userStorageDir, { recursive: true });
    }

    const settings = {
      enabled: true,
      shopDomain: shopifyConfig.shopDomain,
      accessToken: shopifyConfig.accessToken,
      apiVersion: shopifyConfig.apiVersion,
      autoImport: false,
      importInterval: 60,
      defaultTaxRate: 19,
      defaultPaymentTerms: 14
    };

    fs.writeFileSync(`${userStorageDir}/shopify-settings.json`, JSON.stringify(settings, null, 2));
    console.log('✅ Einstellungen in user-storage/shopify-settings.json gespeichert');
    
    console.log('');
    console.log('🎯 Ergebnis:');
    if (ordersData.orders.length > 0) {
      console.log('✅ Verbindung funktioniert korrekt und Bestellungen sind verfügbar');
      console.log('✅ Sie können jetzt die Import-Funktion in der Anwendung verwenden');
    } else {
      console.log('⚠️  Verbindung funktioniert, aber keine bezahlten Bestellungen zum Import vorhanden');
      console.log('💡 Stellen Sie sicher, dass bezahlte Bestellungen im Shopify-Shop vorhanden sind');
    }

  } catch (error) {
    console.error('❌ Verbindungsfehler:', error.message);
    console.error('');
    console.error('🔧 Lösungsvorschläge:');
    console.error('   1. Überprüfen Sie die Gültigkeit des Access Tokens');
    console.error('   2. Stellen Sie sicher, dass die Private App die erforderlichen Berechtigungen hat');
    console.error('   3. Überprüfen Sie die Internetverbindung');
  }
}

// Test ausführen
testShopifyConnection();
