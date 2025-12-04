#!/usr/bin/env node

// Test Shopify API fix for 400 error
async function testShopifyFix() {
  console.log('🔍 Test: Shopify API 400 Error Fix\n')

  try {
    // Test 1: Test the legacy import endpoint
    console.log('1️⃣ Testing legacy import endpoint...')
    const legacyResponse = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=5&financial_status=any')
    
    console.log('📊 Legacy Response Status:', legacyResponse.status)
    
    if (legacyResponse.ok) {
      const legacyData = await legacyResponse.json()
      console.log('✅ Legacy import successful!')
      console.log('   Orders count:', legacyData.orders?.length || 0)
      console.log('   Total count:', legacyData.totalCount || 0)
      
      if (legacyData.orders && legacyData.orders.length > 0) {
        const firstOrder = legacyData.orders[0]
        console.log('   First order:', {
          id: firstOrder.id,
          name: firstOrder.name,
          customer: firstOrder.customer?.id || 'No customer',
          email: firstOrder.email || firstOrder.customer?.email || 'No email'
        })
      }
    } else {
      const errorText = await legacyResponse.text()
      console.log('❌ Legacy import failed:', errorText)
    }
    
    // Test 2: Test direct Shopify API call
    console.log('\n2️⃣ Testing direct Shopify API call...')
    
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    const directUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=5&status=any&financial_status=any`
    console.log('🌐 Direct URL:', directUrl)
    
    const directResponse = await fetch(directUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Direct Response Status:', directResponse.status)
    
    if (directResponse.ok) {
      const directData = await directResponse.json()
      console.log('✅ Direct API call successful!')
      console.log('   Orders count:', directData.orders?.length || 0)
      
      if (directData.orders && directData.orders.length > 0) {
        const firstOrder = directData.orders[0]
        console.log('   First order:', {
          id: firstOrder.id,
          name: firstOrder.name,
          customer_id: firstOrder.customer?.id,
          customer_email: firstOrder.customer?.email,
          order_email: firstOrder.email
        })
      }
    } else {
      const errorText = await directResponse.text()
      console.log('❌ Direct API call failed:', errorText)
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testShopifyFix().catch(console.error)
