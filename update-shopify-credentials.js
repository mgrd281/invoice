#!/usr/bin/env node

// Update Shopify Credentials - Interactive Setup
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function updateShopifyCredentials() {
  console.log('🔧 Shopify Credentials Update Tool\n');
  
  try {
    console.log('📋 Current Settings:');
    console.log('   Domain: 45dv93-bk.myshopify.com');
    console.log('   Token: SHOPIFY_ACCESS_TOKEN_PLACEHOLDER (OLD)\n');
    
    // Get new token
    const newToken = await askQuestion('🔑 Enter your NEW Shopify Access Token (starts with shpat_): ');
    
    if (!newToken || !newToken.startsWith('shpat_')) {
      console.log('❌ Invalid token format. Token must start with "shpat_"');
      rl.close();
      return;
    }
    
    console.log('\n🧪 Testing new token...');
    
    // Test the new token
    const testUrl = `https://45dv93-bk.myshopify.com/admin/api/2024-01/shop.json`;
    
    const testResponse = await fetch(testUrl, {
      headers: {
        'X-Shopify-Access-Token': newToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      const shopData = await testResponse.json();
      console.log('✅ Token test successful!');
      console.log(`   Shop: ${shopData.shop?.name}`);
      console.log(`   Owner: ${shopData.shop?.shop_owner}`);
      console.log(`   Plan: ${shopData.shop?.plan_name}`);
      
      // Test customer access
      console.log('\n🧪 Testing customer data access...');
      const customerUrl = `https://45dv93-bk.myshopify.com/admin/api/2024-01/customers.json?limit=1`;
      
      const customerResponse = await fetch(customerUrl, {
        headers: {
          'X-Shopify-Access-Token': newToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (customerResponse.ok) {
        console.log('✅ Customer data access: GRANTED');
      } else {
        console.log('❌ Customer data access: DENIED');
        console.log('   Make sure you have "read_customers" scope enabled!');
      }
      
      // Test order access with full fields
      console.log('\n🧪 Testing order data access...');
      const orderUrl = `https://45dv93-bk.myshopify.com/admin/api/2024-01/orders.json?limit=1&status=any&financial_status=any`;
      
      const orderResponse = await fetch(orderUrl, {
        headers: {
          'X-Shopify-Access-Token': newToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        const orders = orderData.orders || [];
        
        if (orders.length > 0) {
          const order = orders[0];
          console.log('✅ Order data access: GRANTED');
          console.log(`   Sample Order: ${order.name}`);
          console.log(`   Customer Email: "${order.customer?.email || 'STILL MASKED'}"`);
          console.log(`   Customer Name: "${order.customer?.first_name || 'STILL MASKED'} ${order.customer?.last_name || 'STILL MASKED'}"`);
          
          if (order.customer?.email && order.customer.email !== 'undefined') {
            console.log('🎉 PII Masking appears to be DISABLED!');
          } else {
            console.log('⚠️  PII Masking is still ACTIVE - follow the privacy settings steps');
          }
        }
      } else {
        console.log('❌ Order data access: DENIED');
        console.log('   Make sure you have "read_orders" scope enabled!');
      }
      
      console.log('\n💾 Ready to update system credentials...');
      const confirm = await askQuestion('Update system with new token? (y/n): ');
      
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        console.log('✅ New token validated and ready to use!');
        console.log('\n📋 Next Steps:');
        console.log('1. Update your system configuration with this token');
        console.log('2. Restart your application');
        console.log('3. Test import with: node test-pii-fix.js');
        console.log('4. If data is still masked, wait 24-48h for Shopify propagation');
        
        console.log(`\n🔑 Your new token: ${newToken}`);
      } else {
        console.log('❌ Update cancelled');
      }
      
    } else {
      console.log('❌ Token test failed!');
      console.log(`   Status: ${testResponse.status} ${testResponse.statusText}`);
      const errorText = await testResponse.text();
      console.log(`   Error: ${errorText}`);
      
      if (testResponse.status === 401) {
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure the token is correct and complete');
        console.log('2. Verify the Private App is installed');
        console.log('3. Check that all required scopes are enabled');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the tool
updateShopifyCredentials().catch(console.error);
