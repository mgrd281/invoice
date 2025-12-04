// Test der korrigierten Filter - Sollte jetzt 50+ Bestellungen zeigen

console.log('🚀 Test der korrigierten Shopify Filter');
console.log('Erwartung: Jetzt sollten 50+ Bestellungen gefunden werden');
console.log('');

const shopifyConfig = {
  shopDomain: '45dv93-bk.myshopify.com',
  accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
  apiVersion: '2024-01'
};

async function testFixedFilters() {
  try {
    console.log('📊 Teste korrigierte Filter...');
    
    // Test 1: Wie das System jetzt filtert (mit financial_status=paid als default)
    console.log('');
    console.log('1️⃣ Korrigierter Filter: financial_status=paid (statt any)');
    await testFilter({
      limit: '250',
      financial_status: 'paid',
      created_at_min: '2024-07-11T00:00:00Z',
      created_at_max: '2025-12-31T23:59:59Z'
    });
    
    // Test 2: Ohne Datumsfilter
    console.log('');
    console.log('2️⃣ Ohne Datumsfilter, nur financial_status=paid');
    await testFilter({
      limit: '250',
      financial_status: 'paid'
    });
    
    // Test 3: Mit erweiterten Datumsbereich
    console.log('');
    console.log('3️⃣ Erweiterter Datumsbereich (2024-01-01 bis 2025-12-31)');
    await testFilter({
      limit: '250',
      financial_status: 'paid',
      created_at_min: '2024-01-01T00:00:00Z',
      created_at_max: '2025-12-31T23:59:59Z'
    });
    
  } catch (error) {
    console.error('❌ Test fehlgeschlagen:', error.message);
  }
}

async function testFilter(params) {
  try {
    const urlParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key]) {
        urlParams.append(key, params[key]);
      }
    });
    
    const url = `https://${shopifyConfig.shopDomain}/admin/api/${shopifyConfig.apiVersion}/orders.json?${urlParams}`;
    
    console.log(`   📋 Parameter: ${urlParams.toString()}`);
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Fehler: ${response.status} ${response.statusText} - ${errorText}`);
      return;
    }
    
    const data = await response.json();
    const orders = data.orders || [];
    
    console.log(`   ✅ Gefundene Bestellungen: ${orders.length}`);
    
    if (orders.length > 0) {
      console.log(`   📅 Neueste: ${new Date(orders[0].created_at).toLocaleDateString('de-DE')}`);
      console.log(`   📅 Älteste: ${new Date(orders[orders.length - 1].created_at).toLocaleDateString('de-DE')}`);
      
      // Zeige erste 5 Bestellungen
      console.log('   🔍 Erste 5 Bestellungen:');
      orders.slice(0, 5).forEach((order, index) => {
        console.log(`      ${index + 1}. ${order.name} - ${order.financial_status} - ${order.total_price} EUR - ${new Date(order.created_at).toLocaleDateString('de-DE')}`);
      });
    }
    
  } catch (error) {
    console.error(`   ❌ Fehler: ${error.message}`);
  }
}

// Test ausführen
testFixedFilters().then(() => {
  console.log('');
  console.log('🎯 ERGEBNIS:');
  console.log('✅ Wenn jetzt 50+ Bestellungen angezeigt werden, ist das Problem behoben!');
  console.log('✅ Das UNLIMITED System sollte jetzt alle bezahlten Bestellungen finden');
  console.log('');
  console.log('🚀 Nächster Schritt: Testen Sie das System in der Web-Anwendung');
});
