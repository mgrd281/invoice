#!/usr/bin/env node

// Test für das 1 Million Bestellungen Limit
async function testMillionLimit() {
  console.log('🧪 Testing 1 Million Orders Limit...\n')

  try {
    // Test 1: Legacy Import API mit 1 Million Limit
    console.log('1️⃣ Testing Legacy Import API...')
    
    const response = await fetch('http://127.0.0.1:51539/api/shopify/legacy-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 1000000,
        financial_status: 'paid'
      })
    })

    console.log('📊 Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Legacy API successful!')
      console.log('📋 Response:', {
        success: data.success,
        ordersCount: data.orders?.length || 0,
        message: data.message
      })
    } else {
      const errorText = await response.text()
      console.log('❌ Legacy API failed:', errorText)
    }

    console.log('\n2️⃣ Testing Main Import API...')
    
    // Test 2: Main Import API mit 1 Million Limit
    const response2 = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=paid')
    
    console.log('📊 Response status:', response2.status)
    
    if (response2.ok) {
      const data2 = await response2.json()
      console.log('✅ Main API successful!')
      console.log('📋 Response:', {
        success: data2.success,
        ordersCount: data2.orders?.length || 0
      })
    } else {
      const errorText2 = await response2.text()
      console.log('❌ Main API failed:', errorText2)
    }

    console.log('\n3️⃣ Testing Frontend Load Function...')
    
    // Test 3: Simuliere Frontend loadOrdersWithDateRange
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const params = new URLSearchParams({
      limit: '1000000',
      financial_status: 'paid',
      created_at_min: thirtyDaysAgo.toISOString().split('T')[0] + 'T00:00:00Z',
      created_at_max: today.toISOString().split('T')[0] + 'T23:59:59Z'
    })
    
    const response3 = await fetch(`http://127.0.0.1:51539/api/shopify/import?${params}`)
    
    console.log('📊 Response status:', response3.status)
    
    if (response3.ok) {
      const data3 = await response3.json()
      console.log('✅ Frontend simulation successful!')
      console.log('📋 Response:', {
        success: data3.success,
        ordersCount: data3.orders?.length || 0
      })
      
      // Zeige die Anzahl, die das Frontend anzeigen würde
      console.log(`\n🎯 Frontend würde anzeigen: "${data3.orders?.length || 0} Bestellungen verfügbar"`)
      
    } else {
      const errorText3 = await response3.text()
      console.log('❌ Frontend simulation failed:', errorText3)
    }

  } catch (error) {
    console.error('❌ Test error:', error.message)
  }

  console.log('\n🎯 Test complete!')
  console.log('\n📝 Erwartetes Ergebnis:')
  console.log('   - Alle APIs sollten 1.000.000 als Limit akzeptieren')
  console.log('   - Frontend sollte mehr als 500 Bestellungen anzeigen')
  console.log('   - Keine 250/500/10k Limits mehr')
}

// Run the test
testMillionLimit().catch(console.error)
