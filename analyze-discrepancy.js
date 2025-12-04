// Analyse der Diskrepanz: Warum unterschiedliche Ergebnisse?

console.log('🔍 ANALYSE: Diskrepanz zwischen verschiedenen Tests');
console.log('Problem: Erste Test zeigte 50 bezahlte Bestellungen, jetzt nur 4');
console.log('');

const shopifyConfig = {
  shopDomain: '45dv93-bk.myshopify.com',
  accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
  apiVersion: '2024-01'
};

async function analyzeDiscrepancy() {
  try {
    console.log('📊 Detaillierte Analyse...');
    
    // Test 1: Exakt wie im ersten erfolgreichen Test
    console.log('');
    console.log('1️⃣ Exakt wie im ersten Test (status=any&financial_status=paid&limit=50)');
    await testFilter({
      status: 'any',
      financial_status: 'paid',
      limit: '50'
    });
    
    // Test 2: Nur financial_status=paid (ohne status=any)
    console.log('');
    console.log('2️⃣ Nur financial_status=paid (ohne status=any)');
    await testFilter({
      financial_status: 'paid',
      limit: '50'
    });
    
    // Test 3: Mit status=any aber ohne financial_status
    console.log('');
    console.log('3️⃣ Mit status=any aber ohne financial_status');
    await testFilter({
      status: 'any',
      limit: '50'
    });
    
    // Test 4: Alle Parameter aus dem ersten Test + Datum
    console.log('');
    console.log('4️⃣ Erster Test Parameter + Datumsfilter');
    await testFilter({
      status: 'any',
      financial_status: 'paid',
      limit: '50',
      created_at_min: '2024-01-01T00:00:00Z',
      created_at_max: '2025-12-31T23:59:59Z'
    });
    
  } catch (error) {
    console.error('❌ Analyse fehlgeschlagen:', error.message);
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
      
      // Analysiere alle financial_status
      const statusCounts = {};
      orders.forEach(order => {
        const status = order.financial_status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('   💰 Financial Status Verteilung:');
      Object.keys(statusCounts).forEach(status => {
        console.log(`      ${status}: ${statusCounts[status]} Bestellungen`);
      });
      
      // Zeige erste 3 und letzte 3 Bestellungen
      console.log('   🔍 Erste 3 Bestellungen:');
      orders.slice(0, 3).forEach((order, index) => {
        console.log(`      ${index + 1}. ${order.name} - ${order.financial_status} - ${order.total_price} EUR - ${new Date(order.created_at).toLocaleDateString('de-DE')}`);
      });
      
      if (orders.length > 6) {
        console.log('   🔍 Letzte 3 Bestellungen:');
        orders.slice(-3).forEach((order, index) => {
          console.log(`      ${orders.length - 2 + index}. ${order.name} - ${order.financial_status} - ${order.total_price} EUR - ${new Date(order.created_at).toLocaleDateString('de-DE')}`);
        });
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Fehler: ${error.message}`);
  }
}

// Analyse ausführen
analyzeDiscrepancy().then(() => {
  console.log('');
  console.log('🎯 SCHLUSSFOLGERUNG:');
  console.log('Der Parameter "status=any" scheint der Schlüssel zu sein!');
  console.log('Ohne "status=any" werden nur die neuesten Bestellungen zurückgegeben.');
});
