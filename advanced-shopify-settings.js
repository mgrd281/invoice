#!/usr/bin/env node

// Advanced Shopify Settings Test - Try to get real customer data
async function testAdvancedShopifySettings() {
  console.log('🔧 Advanced Shopify Settings Test\n');

  const settings = {
    shopDomain: '45dv93-bk.myshopify.com',
    accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
    apiVersion: '2027-01'
  };

  try {
    console.log('🧪 Testing different API approaches to get real customer data...\n');

    // Test 1: Try GraphQL API (sometimes bypasses REST limitations)
    console.log('1️⃣ Testing GraphQL API...');

    const graphqlQuery = `
      query getOrders($first: Int!) {
        orders(first: $first) {
          edges {
            node {
              id
              name
              email
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
                email
                firstName
                lastName
                phone
                defaultAddress {
                  firstName
                  lastName
                  address1
                  address2
                  city
                  zip
                  country
                  countryCodeV2
                  company
                }
              }
              billingAddress {
                firstName
                lastName
                address1
                address2
                city
                zip
                country
                countryCodeV2
                company
              }
              shippingAddress {
                firstName
                lastName
                address1
                address2
                city
                zip
                country
                countryCodeV2
                company
              }
            }
          }
        }
      }
    `;

    const graphqlResponse = await fetch(`https://${settings.shopDomain}/admin/api/${settings.apiVersion}/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { first: 3 }
      })
    });

    if (graphqlResponse.ok) {
      const graphqlData = await graphqlResponse.json();

      if (graphqlData.data && graphqlData.data.orders) {
        console.log('✅ GraphQL API successful');

        const orders = graphqlData.data.orders.edges;
        console.log(`   Found ${orders.length} orders`);

        let realDataFound = false;

        orders.forEach((edge, index) => {
          const order = edge.node;
          console.log(`\n   📋 Order ${index + 1}: ${order.name}`);

          // Check customer data
          if (order.customer) {
            console.log(`      Customer Email: "${order.customer.email || 'MASKED'}"`);
            console.log(`      Customer Name: "${order.customer.firstName || 'MASKED'} ${order.customer.lastName || 'MASKED'}"`);

            if (order.customer.email && order.customer.email !== 'undefined' && order.customer.email.includes('@')) {
              console.log('      🎉 REAL EMAIL FOUND via GraphQL!');
              realDataFound = true;
            }

            if (order.customer.firstName && order.customer.firstName !== 'undefined') {
              console.log('      🎉 REAL NAME FOUND via GraphQL!');
              realDataFound = true;
            }

            // Check addresses
            if (order.customer.defaultAddress) {
              const addr = order.customer.defaultAddress;
              console.log(`      Default Address: "${addr.address1 || 'MASKED'}, ${addr.city || 'MASKED'}"`);

              if (addr.address1 && addr.address1 !== 'undefined') {
                console.log('      🎉 REAL DEFAULT ADDRESS FOUND via GraphQL!');
                realDataFound = true;
              }
            }

            if (order.billingAddress) {
              const addr = order.billingAddress;
              console.log(`      Billing Address: "${addr.address1 || 'MASKED'}, ${addr.city || 'MASKED'}"`);

              if (addr.address1 && addr.address1 !== 'undefined') {
                console.log('      🎉 REAL BILLING ADDRESS FOUND via GraphQL!');
                realDataFound = true;
              }
            }

            if (order.shippingAddress) {
              const addr = order.shippingAddress;
              console.log(`      Shipping Address: "${addr.address1 || 'MASKED'}, ${addr.city || 'MASKED'}"`);

              if (addr.address1 && addr.address1 !== 'undefined') {
                console.log('      🎉 REAL SHIPPING ADDRESS FOUND via GraphQL!');
                realDataFound = true;
              }
            }
          }
        });

        if (realDataFound) {
          console.log('\n🎉 SUCCESS: GraphQL API found some real customer data!');
          console.log('   → We can use GraphQL to bypass REST API limitations');
        } else {
          console.log('\n❌ GraphQL API also returns masked data');
        }

      } else {
        console.log('❌ GraphQL query failed or returned no data');
        if (graphqlData.errors) {
          console.log('   Errors:', graphqlData.errors);
        }
      }
    } else {
      console.log('❌ GraphQL API request failed');
      console.log(`   Status: ${graphqlResponse.status} ${graphqlResponse.statusText}`);
    }

    // Test 2: Try different REST API parameters
    console.log('\n2️⃣ Testing REST API with different parameters...');

    const testParams = [
      // Test with different status filters
      'status=open',
      'status=closed',
      'financial_status=paid',
      'fulfillment_status=fulfilled',

      // Test with different field combinations
      'fields=id,name,customer,billing_address,shipping_address',
      'fields=*', // Request all fields

      // Test without any filters
      ''
    ];

    for (let i = 0; i < testParams.length; i++) {
      const params = testParams[i];
      console.log(`\n   Test ${i + 1}: ${params || 'No parameters'}`);

      const testUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders.json?limit=1&${params}`;

      const testResponse = await fetch(testUrl, {
        headers: {
          'X-Shopify-Access-Token': settings.accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.ok) {
        const testData = await testResponse.json();
        const orders = testData.orders || [];

        if (orders.length > 0) {
          const order = orders[0];
          const email = order.customer?.email || order.email;
          const firstName = order.customer?.first_name;
          const billingAddr = order.billing_address?.address1;

          console.log(`      Email: "${email || 'MISSING'}"`);
          console.log(`      Name: "${firstName || 'MISSING'}"`);
          console.log(`      Billing: "${billingAddr || 'MISSING'}"`);

          if ((email && email !== 'undefined' && email.includes('@')) ||
            (firstName && firstName !== 'undefined') ||
            (billingAddr && billingAddr !== 'undefined')) {
            console.log('      🎉 REAL DATA FOUND with these parameters!');
          }
        }
      } else {
        console.log(`      ❌ Failed: ${testResponse.status}`);
      }
    }

    // Test 3: Check if specific customers have real data
    console.log('\n3️⃣ Testing direct customer API access...');

    const customersUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/customers.json?limit=5`;

    const customersResponse = await fetch(customersUrl, {
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (customersResponse.ok) {
      const customersData = await customersResponse.json();
      const customers = customersData.customers || [];

      console.log(`   Found ${customers.length} customers`);

      customers.forEach((customer, index) => {
        console.log(`\n   👤 Customer ${index + 1}:`);
        console.log(`      ID: ${customer.id}`);
        console.log(`      Email: "${customer.email || 'MASKED'}"`);
        console.log(`      Name: "${customer.first_name || 'MASKED'} ${customer.last_name || 'MASKED'}"`);
        console.log(`      Phone: "${customer.phone || 'MASKED'}"`);
        console.log(`      Created: ${customer.created_at}`);
        console.log(`      Orders Count: ${customer.orders_count || 0}`);

        if (customer.default_address) {
          const addr = customer.default_address;
          console.log(`      Address: "${addr.address1 || 'MASKED'}, ${addr.city || 'MASKED'}"`);
        }
      });
    }

    console.log('\n📋 FINAL RECOMMENDATIONS:');
    console.log('1. If GraphQL found real data → Implement GraphQL integration');
    console.log('2. If REST with specific params worked → Update API calls');
    console.log('3. If all data is still masked → Use professional fallbacks');
    console.log('4. Contact Shopify support to disable PII masking');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Run test
testAdvancedShopifySettings().catch(console.error);
