#!/usr/bin/env node

// Detailliertes Debugging für Shopify API Probleme
async function debugShopifyDetailed() {
  console.log('🔍 Detailliertes Shopify API Debugging\n')

  try {
    // Test 1: Direkte Shopify API Verbindung
    console.log('1️⃣ Testing direct Shopify API connection...')
    
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Test Shop Info
    const shopUrl = `https://${shopDomain}/admin/api/${apiVersion}/shop.json`
    console.log('🌐 Testing shop endpoint:', shopUrl)
    
    const shopResponse = await fetch(shopUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Shop Response Status:', shopResponse.status)
    if (shopResponse.ok) {
      const shopData = await shopResponse.json()
      console.log('✅ Shop connection successful:', shopData.shop?.name)
    } else {
      const errorText = await shopResponse.text()
      console.log('❌ Shop connection failed:', errorText)
      return
    }
    
    // Test 2: Orders Count
    console.log('\n2️⃣ Testing orders count...')
    const countUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders/count.json`
    console.log('🔢 Testing count endpoint:', countUrl)
    
    const countResponse = await fetch(countUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Count Response Status:', countResponse.status)
    if (countResponse.ok) {
      const countData = await countResponse.json()
      console.log('✅ Total orders in shop:', countData.count)
    } else {
      const errorText = await countResponse.text()
      console.log('❌ Count request failed:', errorText)
    }
    
    // Test 3: First page of orders
    console.log('\n3️⃣ Testing first page of orders...')
    const ordersUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=5&status=any&financial_status=any`
    console.log('📋 Testing orders endpoint:', ordersUrl)
    
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Orders Response Status:', ordersResponse.status)
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json()
      console.log('✅ Orders fetched:', ordersData.orders?.length)
      console.log('📋 First order ID:', ordersData.orders?.[0]?.id)
      
      // Check Link header for pagination
      const linkHeader = ordersResponse.headers.get('Link')
      console.log('🔗 Link header:', linkHeader ? 'Present' : 'Not present')
      
    } else {
      const errorText = await ordersResponse.text()
      console.log('❌ Orders request failed:', errorText)
    }
    
    // Test 4: Our API endpoint
    console.log('\n4️⃣ Testing our API endpoint...')
    const apiResponse = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=5&financial_status=any', {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Our API Response Status:', apiResponse.status)
    if (apiResponse.ok) {
      const apiData = await apiResponse.json()
      console.log('✅ Our API Response:', {
        success: apiData.success,
        totalCount: apiData.totalCount,
        fetchedCount: apiData.fetchedCount,
        ordersLength: apiData.orders?.length
      })
    } else {
      const errorText = await apiResponse.text()
      console.log('❌ Our API failed:', errorText)
    }

  } catch (error) {
    console.error('❌ Debug Error:', error.message)
  }
}

// Run detailed debugging
debugShopifyDetailed().catch(console.error)
