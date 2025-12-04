#!/usr/bin/env node

// Debug Raw Shopify API Response
async function debugRawShopify() {
  console.log('🔍 Debug: Raw Shopify API Response\n')

  try {
    // Test direct Shopify API call
    console.log('1️⃣ Testing direct Shopify API call...')
    
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Test with fields parameter
    const ordersUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=1&status=any&fields=id,name,email,created_at,customer,billing_address,shipping_address,line_items`
    console.log('🌐 Testing orders endpoint with fields:', ordersUrl)
    
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Orders Response Status:', ordersResponse.status)
    
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json()
      console.log('📋 Raw Orders Response:')
      console.log(JSON.stringify(ordersData, null, 2))
      
      if (ordersData.orders && ordersData.orders[0]) {
        const order = ordersData.orders[0]
        console.log('\n📄 First Order Analysis:')
        console.log('   ID:', order.id)
        console.log('   Name:', order.name)
        console.log('   Email:', order.email)
        console.log('   Customer:', order.customer)
        console.log('   Billing Address:', order.billing_address)
        console.log('   Shipping Address:', order.shipping_address)
      }
    } else {
      const errorText = await ordersResponse.text()
      console.log('❌ Orders request failed:', errorText)
    }
    
    // Test 2: Get specific order by ID
    console.log('\n2️⃣ Testing specific order by ID...')
    
    // Get first order ID from previous call
    const firstCallResponse = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=1&status=any`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (firstCallResponse.ok) {
      const firstCallData = await firstCallResponse.json()
      if (firstCallData.orders && firstCallData.orders[0]) {
        const orderId = firstCallData.orders[0].id
        console.log('🎯 Testing specific order ID:', orderId)
        
        const specificOrderUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders/${orderId}.json`
        console.log('🌐 Specific order URL:', specificOrderUrl)
        
        const specificResponse = await fetch(specificOrderUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        })
        
        if (specificResponse.ok) {
          const specificData = await specificResponse.json()
          console.log('📋 Specific Order Response:')
          console.log(JSON.stringify(specificData, null, 2))
        } else {
          console.log('❌ Specific order request failed:', await specificResponse.text())
        }
      }
    }

  } catch (error) {
    console.error('❌ Debug Error:', error.message)
  }
}

// Run debugging
debugRawShopify().catch(console.error)
