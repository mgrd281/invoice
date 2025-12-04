// Test des Backend APIs direkt um zu sehen was passiert

console.log('🚀 Direkter Test des Backend APIs');
console.log('');

async function testBackendAPI() {
  try {
    console.log('📡 Teste /api/shopify/import direkt...');
    
    const params = new URLSearchParams({
      limit: '10000',
      financial_status: 'paid',
      created_at_min: '2024-10-04T00:00:00Z',
      created_at_max: '2025-10-04T23:59:59Z'
    });
    
    const url = `http://localhost:3001/api/shopify/import?${params}`;
    console.log(`🔗 URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      console.error(`📄 Error details: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log(`✅ Response received:`);
    console.log(`📊 Success: ${data.success}`);
    console.log(`📦 Orders count: ${data.orders?.length || 0}`);
    
    if (data.orders && data.orders.length > 0) {
      console.log(`📅 First order date: ${new Date(data.orders[0].created_at).toLocaleDateString('de-DE')}`);
      console.log(`📅 Last order date: ${new Date(data.orders[data.orders.length - 1].created_at).toLocaleDateString('de-DE')}`);
      
      console.log('🔍 First 3 orders:');
      data.orders.slice(0, 3).forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.name} - ${order.financial_status} - ${order.total_price} EUR`);
      });
    }
    
    if (data.error) {
      console.error(`❌ API Error: ${data.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test ausführen
testBackendAPI().then(() => {
  console.log('');
  console.log('🎯 Wenn mehr als 250 Orders angezeigt werden, funktioniert das Backend korrekt!');
});
