#!/usr/bin/env node

// Test After Shopify Settings Change
async function testAfterSettingsChange() {
  console.log('🧪 Testing After Shopify Settings Change\n');
  console.log('⏰ Current Time:', new Date().toLocaleString('de-DE'));

  const settings = {
    shopDomain: '45dv93-bk.myshopify.com',
    accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
    apiVersion: '2024-01'
  };

  try {
    console.log('🔍 Testing if PII Masking is disabled...\n');

    // Test 1: Get a few orders to check customer data
    const orderUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders.json?limit=3&status=any`;
    
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (orderResponse.ok) {
      const orderData = await orderResponse.json();
      const orders = orderData.orders || [];
      
      console.log(`✅ Found ${orders.length} orders to test\n`);
      
      let realDataFound = false;
      
      orders.forEach((order, index) => {
        console.log(`📋 Order ${index + 1}: ${order.name}`);
        
        // Check customer email
        const email = order.customer?.email || order.email;
        console.log(`   Email: "${email || 'N/A'}"`);
        
        if (email && email !== 'undefined' && email.trim() !== '' && !email.includes('noreply')) {
          console.log('   🎉 REAL EMAIL FOUND!');
          realDataFound = true;
        } else {
          console.log('   ❌ Email still masked');
        }
        
        // Check customer name
        const firstName = order.customer?.first_name;
        const lastName = order.customer?.last_name;
        console.log(`   Name: "${firstName || 'N/A'} ${lastName || 'N/A'}"`);
        
        if (firstName && firstName !== 'undefined' && lastName && lastName !== 'undefined') {
          console.log('   🎉 REAL NAME FOUND!');
          realDataFound = true;
        } else {
          console.log('   ❌ Name still masked');
        }
        
        // Check addresses
        const billing = order.billing_address;
        const shipping = order.shipping_address;
        const defaultAddr = order.customer?.default_address;
        
        if (billing?.address1 && billing.address1 !== 'undefined') {
          console.log(`   Billing: "${billing.address1}, ${billing.city || 'N/A'}"`);
          console.log('   🎉 REAL BILLING ADDRESS FOUND!');
          realDataFound = true;
        } else if (shipping?.address1 && shipping.address1 !== 'undefined') {
          console.log(`   Shipping: "${shipping.address1}, ${shipping.city || 'N/A'}"`);
          console.log('   🎉 REAL SHIPPING ADDRESS FOUND!');
          realDataFound = true;
        } else if (defaultAddr?.address1 && defaultAddr.address1 !== 'undefined') {
          console.log(`   Default: "${defaultAddr.address1}, ${defaultAddr.city || 'N/A'}"`);
          console.log('   🎉 REAL DEFAULT ADDRESS FOUND!');
          realDataFound = true;
        } else {
          console.log('   ❌ No real addresses found');
        }
        
        console.log(''); // Empty line
      });
      
      console.log('📊 OVERALL RESULT:');
      if (realDataFound) {
        console.log('🎉 SUCCESS: Some real customer data is now visible!');
        console.log('   → PII Masking has been partially or fully disabled');
        console.log('   → The Shopify settings changes are working');
        console.log('\n📋 Next Steps:');
        console.log('1. ✅ Test the interface: http://localhost:3000/shopify');
        console.log('2. ✅ Try importing an order');
        console.log('3. ✅ Check if more data appears over time');
      } else {
        console.log('⚠️  STILL MASKED: Customer data is still anonymized');
        console.log('   → Changes may take 2-4 hours to take effect');
        console.log('   → Or customers may not have provided real data');
        console.log('\n📋 Next Steps:');
        console.log('1. ⏳ Wait 2-4 hours and run this test again');
        console.log('2. 🔄 Double-check Shopify settings');
        console.log('3. 📞 Contact Shopify support if needed');
        console.log('\n💡 Alternative:');
        console.log('The system now shows professional fallback data:');
        console.log('- Kunde: "Kunde #3307"');
        console.log('- E-Mail: "kunde@karinex.com"');
        console.log('- Adresse: "Karinex Digital Store, Online-Kunde, 10115 Berlin"');
        console.log('This is perfectly suitable for business use!');
      }
      
    } else {
      console.log('❌ Failed to fetch orders');
      console.log(`Status: ${orderResponse.status} ${orderResponse.statusText}`);
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Run test
testAfterSettingsChange().catch(console.error);
