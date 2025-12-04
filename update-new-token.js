#!/usr/bin/env node

// Update Shopify Settings with New Token
const fs = require('fs');
const path = require('path');

async function updateShopifyToken() {
  console.log('🔧 Updating Shopify Token with New Credentials\n');

  const newSettings = {
    enabled: true,
    shopDomain: '45dv93-bk.myshopify.com',
    accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER', // NEW TOKEN
    apiKey: 'SHOPIFY_API_KEY_PLACEHOLDER', // API-Schlüssel
    secretKey: 'SHOPIFY_SECRET_KEY_PLACEHOLDER', // Geheimer API-Schlüssel
    apiVersion: '2024-01',
    autoImport: false,
    importInterval: 60,
    defaultTaxRate: 19,
    defaultPaymentTerms: 14,
    lastUpdated: new Date().toISOString()
  };

  try {
    // Create user-storage directory if it doesn't exist
    const userStorageDir = path.join(process.cwd(), 'user-storage');
    if (!fs.existsSync(userStorageDir)) {
      fs.mkdirSync(userStorageDir, { recursive: true });
      console.log('✅ Created user-storage directory');
    }

    // Save settings to file
    const settingsPath = path.join(userStorageDir, 'shopify-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
    console.log('✅ Settings saved to:', settingsPath);

    console.log('\n📋 New Settings:');
    console.log(`   Domain: ${newSettings.shopDomain}`);
    console.log(`   Token: ${newSettings.accessToken.substring(0, 20)}...`);
    console.log(`   API Key: ${newSettings.apiKey}`);
    console.log(`   Secret: ${newSettings.secretKey.substring(0, 10)}...`);

    // Test the new token
    console.log('\n🧪 Testing new token...');
    
    const testUrl = `https://${newSettings.shopDomain}/admin/api/${newSettings.apiVersion}/shop.json`;
    
    const testResponse = await fetch(testUrl, {
      headers: {
        'X-Shopify-Access-Token': newSettings.accessToken,
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
      const customerUrl = `https://${newSettings.shopDomain}/admin/api/${newSettings.apiVersion}/customers.json?limit=1`;
      
      const customerResponse = await fetch(customerUrl, {
        headers: {
          'X-Shopify-Access-Token': newSettings.accessToken,
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
      const orderUrl = `https://${newSettings.shopDomain}/admin/api/${newSettings.apiVersion}/orders.json?limit=1&status=any&financial_status=any`;
      
      const orderResponse = await fetch(orderUrl, {
        headers: {
          'X-Shopify-Access-Token': newSettings.accessToken,
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
            console.log('⚠️  PII Masking is still ACTIVE - this is normal for new tokens');
          }
        }
      } else {
        console.log('❌ Order data access: DENIED');
        console.log('   Make sure you have "read_orders" scope enabled!');
      }
      
      console.log('\n🎉 SUCCESS: New token is working!');
      console.log('\n📋 Next Steps:');
      console.log('1. ✅ Token updated successfully');
      console.log('2. 🔄 Restart your application: npm run dev');
      console.log('3. 🧪 Test import: node test-single-order-import.js');
      console.log('4. 🖥️  Check interface: http://localhost:3000/shopify');
      console.log('5. ⏳ Wait 24-48h for full PII data (if still masked)');
      
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
  }
}

// Run the update
updateShopifyToken().catch(console.error);
