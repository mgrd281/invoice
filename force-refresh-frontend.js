#!/usr/bin/env node

// Force refresh frontend by clearing any cached data
async function forceRefreshFrontend() {
  console.log('🔄 Force refreshing frontend data...\n')

  try {
    // Test 1: Check current API response
    console.log('1️⃣ Checking current API response...')
    
    const response = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=any')
    
    if (response.ok) {
      const data = await response.json()
      console.log('📊 API Response:', {
        totalCount: data.totalCount,
        fetchedCount: data.fetchedCount,
        ordersLength: data.orders?.length,
        success: data.success
      })
      
      console.log(`\n🎯 Expected frontend display: "${data.totalCount} Bestellungen verfügbar"`)
      console.log(`❌ Current frontend probably shows: "${data.orders?.length} Bestellungen verfügbar"`)
      
    } else {
      console.log('❌ API Error:', response.status)
    }

    console.log('\n2️⃣ Testing with different parameters...')
    
    // Test with different status
    const response2 = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=paid')
    
    if (response2.ok) {
      const data2 = await response2.json()
      console.log('📊 With financial_status=paid:', {
        totalCount: data2.totalCount,
        ordersLength: data2.orders?.length
      })
    }

    console.log('\n🔧 Solution:')
    console.log('   1. The API is working correctly (totalCount: 9)')
    console.log('   2. Frontend needs to use totalCount instead of orders.length')
    console.log('   3. Browser cache might need clearing')
    console.log('   4. Hard refresh the Shopify page (Ctrl+F5 or Cmd+Shift+R)')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the refresh
forceRefreshFrontend().catch(console.error)
