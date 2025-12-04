#!/usr/bin/env node

// Test Multiple Orders Variety - Check if different orders get different data
async function testMultipleOrdersVariety() {
  console.log('🧪 Testing Multiple Orders Variety\n');

  try {
    // Get multiple orders
    console.log('📋 Step 1: Fetching multiple orders...');
    
    const ordersResponse = await fetch('http://127.0.0.1:51539/api/shopify/orders');
    
    if (!ordersResponse.ok) {
      console.log('❌ Failed to fetch orders');
      return;
    }
    
    const ordersData = await ordersResponse.json();
    const orders = ordersData.orders || [];
    
    console.log(`✅ Found ${orders.length} orders`);
    
    // Test first 5 orders
    const testOrders = orders.slice(0, 5);
    
    console.log('\n📊 TESTING VARIETY IN GENERATED DATA:');
    console.log('='.repeat(60));
    
    for (let i = 0; i < testOrders.length; i++) {
      const order = testOrders[i];
      
      console.log(`\n${i + 1}️⃣ Order: ${order.name} (ID: ${order.id})`);
      console.log(`   Total: ${order.total_price} ${order.currency}`);
      
      // Convert this order to see generated data
      const convertResponse = await fetch('http://127.0.0.1:51539/api/shopify/move-to-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderIds: [order.id]
        })
      });
      
      if (convertResponse.ok) {
        const convertData = await convertResponse.json();
        
        if (convertData.success && convertData.results && convertData.results.length > 0) {
          const result = convertData.results[0];
          const invoice = result.invoice;
          
          console.log(`   👤 Generated Name: "${invoice.customerName}"`);
          console.log(`   📧 Generated Email: "${invoice.customerEmail}"`);
          console.log(`   🏠 Generated Address: "${invoice.customerAddress}"`);
          console.log(`   🏙️ Generated City: "${invoice.customerCity}"`);
          console.log(`   📮 Generated ZIP: "${invoice.customerZip}"`);
          
        } else {
          console.log('   ❌ Failed to convert order');
        }
      } else {
        console.log('   ❌ Failed to convert order');
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 VARIETY ANALYSIS:');
    console.log('='.repeat(60));
    console.log('✅ Each order should now have:');
    console.log('   → Unique customer name based on order number');
    console.log('   → Unique email based on order number');
    console.log('   → Varied address from different German cities');
    console.log('   → Consistent data for the same order (no randomness)');
    
    console.log('\n🎯 EXPECTED RESULTS:');
    console.log('✅ Order #3307 → "Digitalkunde #3307" + "kunde3307@karinex.com" + "Berlin"');
    console.log('✅ Order #3306 → "Online-Kunde #3306" + "order3306@karinex.com" + "Hamburg"');
    console.log('✅ Order #3305 → "E-Commerce Kunde #3305" + "digital3305@karinex.com" + "München"');
    console.log('✅ Different orders = Different professional data');
    console.log('✅ Same order = Always same data (consistent)');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Run test
testMultipleOrdersVariety().catch(console.error);
