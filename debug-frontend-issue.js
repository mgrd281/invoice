#!/usr/bin/env node

// Debug Frontend 500 Bestellungen Problem
async function debugFrontendIssue() {
  console.log('🔍 Debug: Frontend 500 Bestellungen Problem\n')

  try {
    // Test 1: Exakt der gleiche API Call wie Frontend
    console.log('1️⃣ Testing exact frontend API call...')
    const frontendResponse = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=any')
    
    console.log('📊 Frontend API Response Status:', frontendResponse.status)
    
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json()
      
      console.log('📋 Frontend API Response Data:')
      console.log(`   ✅ Success: ${frontendData.success}`)
      console.log(`   📈 Total Count: ${frontendData.totalCount}`)
      console.log(`   📦 Fetched Count: ${frontendData.fetchedCount}`)
      console.log(`   📋 Orders Array Length: ${frontendData.orders?.length}`)
      
      // Simuliere Frontend Logic
      const totalOrdersCount = frontendData.totalCount || frontendData.orders?.length || 0
      const ordersLength = frontendData.orders?.length || 0
      
      console.log('\n🎯 Frontend Logic Simulation:')
      console.log(`   totalOrdersCount: ${totalOrdersCount}`)
      console.log(`   ordersLength: ${ordersLength}`)
      console.log(`   getDisplayCount() would return: ${totalOrdersCount > 0 ? totalOrdersCount : ordersLength}`)
      
      // Check if there's a mismatch
      if (totalOrdersCount !== ordersLength) {
        console.log('\n⚠️ MISMATCH DETECTED!')
        console.log(`   totalCount (${totalOrdersCount}) != orders.length (${ordersLength})`)
        console.log(`   This could explain why frontend shows wrong number`)
      } else {
        console.log('\n✅ No mismatch - totalCount matches orders.length')
      }
      
      // Check if orders are actually loaded
      if (frontendData.orders && frontendData.orders.length > 0) {
        console.log('\n📦 Sample Orders:')
        console.log(`   First order: ${frontendData.orders[0]?.name} - ${frontendData.orders[0]?.total_price}`)
        console.log(`   Last order: ${frontendData.orders[frontendData.orders.length - 1]?.name} - ${frontendData.orders[frontendData.orders.length - 1]?.total_price}`)
      }
      
    } else {
      const errorText = await frontendResponse.text()
      console.log('❌ Frontend API failed:', errorText)
    }
    
    // Test 2: Check if there's caching
    console.log('\n2️⃣ Testing for caching issues...')
    const timestamp = Date.now()
    const cachedResponse = await fetch(`http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=any&_t=${timestamp}`)
    
    if (cachedResponse.ok) {
      const cachedData = await cachedResponse.json()
      console.log('📋 Cache-busted Response:')
      console.log(`   Total Count: ${cachedData.totalCount}`)
      console.log(`   Orders Length: ${cachedData.orders?.length}`)
    }
    
    // Test 3: Different parameters
    console.log('\n3️⃣ Testing different parameters...')
    const testCases = [
      { limit: 10000, status: 'any' },
      { limit: 5000, status: 'paid' },
      { limit: 250, status: 'any' }
    ]
    
    for (const testCase of testCases) {
      try {
        const testResponse = await fetch(`http://127.0.0.1:51539/api/shopify/import?limit=${testCase.limit}&financial_status=${testCase.status}`)
        if (testResponse.ok) {
          const testData = await testResponse.json()
          console.log(`   limit=${testCase.limit}, status=${testCase.status}: totalCount=${testData.totalCount}, fetched=${testData.orders?.length}`)
        }
      } catch (error) {
        console.log(`   limit=${testCase.limit}, status=${testCase.status}: FAILED`)
      }
    }

  } catch (error) {
    console.error('❌ Debug Error:', error.message)
  }
}

// Run frontend debugging
debugFrontendIssue().catch(console.error)
