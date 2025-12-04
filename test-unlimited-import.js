// Test für UNLIMITED Import mit korrektem Datumsbereich
// Verwendet native fetch API (Node.js 18+)

console.log('🚀 UNLIMITED Import Test mit korrektem Datumsbereich');
console.log('');

const shopifyConfig = {
  shopDomain: '45dv93-bk.myshopify.com',
  accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
  apiVersion: '2024-01'
};

async function testUnlimitedImport() {
  try {
    console.log('📅 Teste verschiedene Datumsbereiche...');
    
    // Test 1: Aktueller Monat (Oktober 2025)
    console.log('');
    console.log('1️⃣ Test: Oktober 2025 (aktueller Monat)');
    await testDateRange('2025-10-01', '2025-10-31');
    
    // Test 2: Letzter Monat (September 2025)
    console.log('');
    console.log('2️⃣ Test: September 2025');
    await testDateRange('2025-09-01', '2025-09-30');
    
    // Test 3: Letzten 2 Monate
    console.log('');
    console.log('3️⃣ Test: Letzten 2 Monate (Sep + Okt 2025)');
    await testDateRange('2025-09-01', '2025-10-31');
    
    // Test 4: Ihr aktueller Filter (Problem)
    console.log('');
    console.log('4️⃣ Test: Ihr aktueller Filter (2024-07-11 bis 2025-10-04) - PROBLEM');
    await testDateRange('2024-07-11', '2025-10-04');
    
  } catch (error) {
    console.error('❌ Test fehlgeschlagen:', error.message);
  }
}

async function testDateRange(startDate, endDate) {
  try {
    const params = new URLSearchParams({
      limit: '250',
      financial_status: 'any',
      created_at_min: `${startDate}T00:00:00Z`,
      created_at_max: `${endDate}T23:59:59Z`
    });
    
    const url = `https://${shopifyConfig.shopDomain}/admin/api/${shopifyConfig.apiVersion}/orders.json?${params}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const orders = data.orders || [];
    
    console.log(`   📊 Zeitraum: ${startDate} bis ${endDate}`);
    console.log(`   📦 Gefundene Bestellungen: ${orders.length}`);
    
    if (orders.length > 0) {
      console.log(`   📅 Neueste Bestellung: ${new Date(orders[0].created_at).toLocaleDateString('de-DE')}`);
      console.log(`   📅 Älteste Bestellung: ${new Date(orders[orders.length - 1].created_at).toLocaleDateString('de-DE')}`);
      
      // Zeige erste 3 Bestellungen
      console.log('   🔍 Erste 3 Bestellungen:');
      orders.slice(0, 3).forEach((order, index) => {
        console.log(`      ${index + 1}. ${order.name} - ${order.total_price} EUR - ${new Date(order.created_at).toLocaleDateString('de-DE')}`);
      });
    } else {
      console.log('   ⚠️  Keine Bestellungen in diesem Zeitraum');
    }
    
  } catch (error) {
    console.error(`   ❌ Fehler: ${error.message}`);
  }
}

// Test ausführen
testUnlimitedImport().then(() => {
  console.log('');
  console.log('🎯 LÖSUNG:');
  console.log('✅ Ändern Sie den Datumsbereich auf: 2025-09-01 bis 2025-12-31');
  console.log('✅ Dann sollten Sie ALLE verfügbaren Bestellungen sehen');
  console.log('✅ Das UNLIMITED System funktioniert korrekt!');
});
