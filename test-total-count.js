#!/usr/bin/env node

// Test für die neue totalCount Funktionalität
async function testTotalCount() {
  console.log('🧪 Testing Total Count Functionality...\n')

  try {
    // Test 1: API mit totalCount
    console.log('1️⃣ Testing API with totalCount...')
    
    const response = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=any')
    
    console.log('📊 Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API successful!')
      console.log('📋 Response structure:', {
        success: data.success,
        totalCount: data.totalCount,
        fetchedCount: data.fetchedCount,
        ordersCount: data.orders?.length || 0,
        hasOrders: !!data.orders
      })
      
      if (data.totalCount) {
        console.log(`🎯 Frontend sollte anzeigen: "${data.totalCount} Bestellungen verfügbar"`)
        console.log(`📦 Tatsächlich geladen: ${data.orders?.length || 0} Bestellungen`)
        console.log(`📊 Verhältnis: ${data.orders?.length || 0}/${data.totalCount}`)
      } else {
        console.log('⚠️ totalCount nicht verfügbar, fallback zu orders.length')
      }
    } else {
      const errorText = await response.text()
      console.log('❌ API failed:', errorText)
    }

    console.log('\n2️⃣ Testing with different financial_status...')
    
    const statuses = ['any', 'paid', 'pending']
    
    for (const status of statuses) {
      try {
        const response = await fetch(`http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=${status}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`   ${status}: totalCount=${data.totalCount}, fetched=${data.orders?.length || 0}`)
        } else {
          console.log(`   ${status}: ERROR`)
        }
      } catch (error) {
        console.log(`   ${status}: FAILED`)
      }
    }

    console.log('\n3️⃣ Testing with date range...')
    
    const today = new Date()
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const params = new URLSearchParams({
      limit: '1000000',
      financial_status: 'any',
      created_at_min: lastMonth.toISOString().split('T')[0] + 'T00:00:00Z',
      created_at_max: today.toISOString().split('T')[0] + 'T23:59:59Z'
    })
    
    const response3 = await fetch(`http://127.0.0.1:51539/api/shopify/import?${params}`)
    
    if (response3.ok) {
      const data3 = await response3.json()
      console.log('📅 Date range test:', {
        totalCount: data3.totalCount,
        fetchedCount: data3.orders?.length || 0,
        dateRange: 'Last 30 days'
      })
      
      if (data3.totalCount && data3.totalCount > data3.orders?.length) {
        console.log('✅ totalCount zeigt mehr Bestellungen als geladen - Perfect!')
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message)
  }

  console.log('\n🎯 Summary:')
  console.log('   - totalCount should show the real number from Shopify API')
  console.log('   - fetchedCount shows how many were actually loaded')
  console.log('   - Frontend should display totalCount instead of fetchedCount')
}

// Run the test
testTotalCount().catch(console.error)
