// Debug Shopify Filter Problem - Warum nur 11 statt 50+ Bestellungen?

console.log('🔍 DEBUG: Shopify Filter Problem');
console.log('Problem: System zeigt nur 11 Bestellungen, aber Shop hat 50+');
console.log('');

const shopifyConfig = {
  shopDomain: '45dv93-bk.myshopify.com',
  accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
  apiVersion: '2024-01'
};

async function debugFilters() {
  try {
    console.log('📊 Teste verschiedene Filter-Kombinationen...');
    
    // Test 1: Alle Bestellungen ohne Filter (wie im ersten Test)
    console.log('');
    console.log('1️⃣ Alle bezahlten Bestellungen (wie im ersten Test - sollte 50+ zeigen)');
    await testFilter({
      status: 'any',
      financial_status: 'paid',
      limit: '50'
    });
    
    // Test 2: Alle Bestellungen mit "any" financial_status
    console.log('');
    console.log('2️⃣ Alle Bestellungen mit financial_status=any');
    await testFilter({
      status: 'any',
      financial_status: 'any',
      limit: '50'
    });
    
    // Test 3: Wie Ihr System filtert (mit Datum)
    console.log('');
    console.log('3️⃣ Wie Ihr System filtert (mit Datumsbereich 2024-07-11 bis 2025-10-04)');
    await testFilter({
      limit: '50000',
      financial_status: 'any',
      created_at_min: '2024-07-11T00:00:00Z',
      created_at_max: '2025-10-04T23:59:59Z'
    });
    
    // Test 4: Erweiterte Datumsbereich
    console.log('');
    console.log('4️⃣ Erweiterter Datumsbereich (2024-01-01 bis 2025-12-31)');
    await testFilter({
      limit: '50000',
      financial_status: 'any',
      created_at_min: '2024-01-01T00:00:00Z',
      created_at_max: '2025-12-31T23:59:59Z'
    });
    
    // Test 5: Ohne Datumsfilter, nur financial_status
    console.log('');
    console.log('5️⃣ Ohne Datumsfilter, nur financial_status=any');
    await testFilter({
      limit: '250',
      financial_status: 'any'
    });
    
    // Test 6: Komplett ohne Filter
    console.log('');
    console.log('6️⃣ Komplett ohne Filter (nur limit)');
    await testFilter({
      limit: '250'
    });
    
  } catch (error) {
    console.error('❌ Debug fehlgeschlagen:', error.message);
  }
}

async function testFilter(params) {
  try {
    const urlParams = new URLSearchParams();
    
    // Füge alle Parameter hinzu
    Object.keys(params).forEach(key => {
      if (params[key]) {
        urlParams.append(key, params[key]);
      }
    });
    
    const url = `https://${shopifyConfig.shopDomain}/admin/api/${shopifyConfig.apiVersion}/orders.json?${urlParams}`;
    
    console.log(`   🔗 URL: ${url}`);
    console.log(`   📋 Parameter: ${urlParams.toString()}`);
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Fehler: ${response.status} ${response.statusText}`);
      console.log(`   📄 Details: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    const orders = data.orders || [];
    
    console.log(`   ✅ Gefundene Bestellungen: ${orders.length}`);
    
    if (orders.length > 0) {
      console.log(`   📅 Neueste: ${new Date(orders[0].created_at).toLocaleDateString('de-DE')}`);
      console.log(`   📅 Älteste: ${new Date(orders[orders.length - 1].created_at).toLocaleDateString('de-DE')}`);
      
      // Analysiere financial_status
      const statusCounts = {};
      orders.forEach(order => {
        const status = order.financial_status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('   💰 Financial Status Verteilung:');
      Object.keys(statusCounts).forEach(status => {
        console.log(`      ${status}: ${statusCounts[status]} Bestellungen`);
      });
      
      // Zeige erste 3 Bestellungen mit Details
      console.log('   🔍 Erste 3 Bestellungen:');
      orders.slice(0, 3).forEach((order, index) => {
        console.log(`      ${index + 1}. ${order.name} - ${order.financial_status} - ${order.total_price} EUR - ${new Date(order.created_at).toLocaleDateString('de-DE')}`);
      });
    }
    
  } catch (error) {
    console.error(`   ❌ Fehler: ${error.message}`);
  }
}

// Debug ausführen
debugFilters().then(() => {
  console.log('');
  console.log('🎯 ANALYSE:');
  console.log('Vergleichen Sie die Ergebnisse um herauszufinden:');
  console.log('1. Welcher Filter gibt die meisten Bestellungen zurück?');
  console.log('2. Liegt das Problem am Datumsfilter oder financial_status?');
  console.log('3. Welche financial_status haben die Bestellungen wirklich?');
});
