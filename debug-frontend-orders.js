#!/usr/bin/env node

// Debug Frontend Order Loading
async function debugFrontendOrders() {
  console.log('🔍 Debugging Frontend Order Loading...\n')

  try {
    // Test 1: Simuliere den exakten Frontend-Call
    console.log('1️⃣ Testing exact frontend loadOrders() call...')
    
    const response1 = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=any')
    
    console.log('📊 Response status:', response1.status)
    
    if (response1.ok) {
      const data1 = await response1.json()
      console.log('✅ loadOrders() successful!')
      console.log('📋 Result:', {
        success: data1.success,
        ordersCount: data1.orders?.length || 0,
        firstOrder: data1.orders?.[0]?.name || 'N/A',
        lastOrder: data1.orders?.[data1.orders?.length - 1]?.name || 'N/A'
      })
      
      if (data1.orders?.length > 0) {
        console.log('📊 Order statuses breakdown:')
        const statusCounts = {}
        data1.orders.forEach(order => {
          const status = order.financial_status || 'unknown'
          statusCounts[status] = (statusCounts[status] || 0) + 1
        })
        console.log(statusCounts)
      }
    } else {
      const errorText1 = await response1.text()
      console.log('❌ loadOrders() failed:', errorText1)
    }

    console.log('\n2️⃣ Testing loadOrdersWithDateRange() call...')
    
    // Test 2: Simuliere loadOrdersWithDateRange mit aktuellen Daten
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1) // Erster Tag des Monats
    const endDate = today
    
    const params = new URLSearchParams({
      limit: '1000000',
      financial_status: 'paid', // Frontend verwendet 'paid' statt 'any'
      created_at_min: startDate.toISOString().split('T')[0] + 'T00:00:00Z',
      created_at_max: endDate.toISOString().split('T')[0] + 'T23:59:59Z'
    })
    
    console.log('📋 Parameters:', params.toString())
    
    const response2 = await fetch(`http://127.0.0.1:51539/api/shopify/import?${params}`)
    
    console.log('📊 Response status:', response2.status)
    
    if (response2.ok) {
      const data2 = await response2.json()
      console.log('✅ loadOrdersWithDateRange() successful!')
      console.log('📋 Result:', {
        success: data2.success,
        ordersCount: data2.orders?.length || 0,
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
      })
    } else {
      const errorText2 = await response2.text()
      console.log('❌ loadOrdersWithDateRange() failed:', errorText2)
    }

    console.log('\n3️⃣ Testing with different financial_status values...')
    
    const statuses = ['any', 'paid', 'pending', 'authorized', 'partially_paid', 'refunded', 'voided']
    
    for (const status of statuses) {
      try {
        const response = await fetch(`http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=${status}`)
        if (response.ok) {
          const data = await response.json()
          console.log(`   ${status}: ${data.orders?.length || 0} orders`)
        } else {
          console.log(`   ${status}: ERROR`)
        }
      } catch (error) {
        console.log(`   ${status}: FAILED`)
      }
    }

    console.log('\n4️⃣ Testing unlimited fetch capability...')
    
    // Test mit sehr großem Limit um zu sehen ob pagination funktioniert
    const response4 = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=10000&financial_status=any')
    
    if (response4.ok) {
      const data4 = await response4.json()
      console.log('📋 Large limit test:', {
        success: data4.success,
        ordersCount: data4.orders?.length || 0,
        message: data4.orders?.length === 10000 ? 'Hit limit - more orders available' : 'All orders fetched'
      })
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message)
  }

  console.log('\n🎯 Debug complete!')
  console.log('\n📝 Analysis:')
  console.log('   - Check which financial_status returns the most orders')
  console.log('   - Verify if pagination is working correctly')
  console.log('   - Identify the source of the "500 orders" limit')
}

// Run the debug
debugFrontendOrders().catch(console.error)
