#!/usr/bin/env node

// Check older orders for real addresses
async function checkOlderOrders() {
  console.log('🔍 Checking Older Orders for Real Addresses\n')

  try {
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Check different date ranges
    const dateRanges = [
      { name: 'Last 30 days', min: '2025-09-04', max: '2025-10-04' },
      { name: 'August 2025', min: '2025-08-01', max: '2025-08-31' },
      { name: 'July 2025', min: '2025-07-01', max: '2025-07-31' },
      { name: 'All time (sample)', min: '2024-01-01', max: '2025-12-31' }
    ]
    
    let foundRealAddresses = false
    
    for (const range of dateRanges) {
      console.log(`📅 Checking ${range.name}...`)
      
      const ordersUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=50&status=any&created_at_min=${range.min}&created_at_max=${range.max}`
      
      const response = await fetch(ordersUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.log(`   ❌ Failed to fetch orders: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      const orders = data.orders || []
      
      console.log(`   📊 Found ${orders.length} orders`)
      
      if (orders.length === 0) {
        console.log('   ⚠️ No orders in this period')
        continue
      }
      
      // Check each order for real address data
      let realAddressCount = 0
      
      orders.forEach((order, index) => {
        let hasRealData = false
        
        // Quick check for real data in any address field
        const checkAddress = (addr, type) => {
          if (!addr) return false
          
          const realFields = [
            addr.first_name, addr.last_name, addr.name, addr.company,
            addr.address1, addr.address2, addr.city, addr.province, addr.zip, addr.phone
          ].filter(field => field && field !== 'NULL' && field.toString().trim() !== '')
          
          if (realFields.length > 0) {
            console.log(`      🎯 REAL ${type} DATA in ${order.name}:`)
            if (addr.first_name && addr.first_name !== 'NULL') console.log(`         Name: ${addr.first_name} ${addr.last_name || ''}`)
            if (addr.company && addr.company !== 'NULL') console.log(`         Company: ${addr.company}`)
            if (addr.address1 && addr.address1 !== 'NULL') console.log(`         Address: ${addr.address1}`)
            if (addr.city && addr.city !== 'NULL') console.log(`         City: ${addr.city}`)
            if (addr.zip && addr.zip !== 'NULL') console.log(`         ZIP: ${addr.zip}`)
            if (addr.phone && addr.phone !== 'NULL') console.log(`         Phone: ${addr.phone}`)
            return true
          }
          return false
        }
        
        // Check all address sources
        if (checkAddress(order.billing_address, 'BILLING')) hasRealData = true
        if (checkAddress(order.shipping_address, 'SHIPPING')) hasRealData = true
        if (checkAddress(order.customer?.default_address, 'CUSTOMER')) hasRealData = true
        
        if (hasRealData) {
          realAddressCount++
          foundRealAddresses = true
        }
      })
      
      if (realAddressCount > 0) {
        console.log(`   ✅ Found ${realAddressCount} orders with real address data!`)
      } else {
        console.log(`   ❌ No real address data found`)
      }
      
      console.log('')
    }
    
    // Also check specific order IDs that might have real data
    console.log('🔍 Checking specific order types...')
    
    // Check orders with shipping addresses (might have real data)
    const shippingOrdersUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=20&status=any&fulfillment_status=shipped`
    
    const shippingResponse = await fetch(shippingOrdersUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (shippingResponse.ok) {
      const shippingData = await shippingResponse.json()
      console.log(`📦 Found ${shippingData.orders?.length || 0} shipped orders`)
      
      if (shippingData.orders && shippingData.orders.length > 0) {
        shippingData.orders.forEach(order => {
          if (order.shipping_address) {
            const addr = order.shipping_address
            const realFields = [addr.address1, addr.city, addr.zip].filter(f => f && f !== 'NULL' && f.trim() !== '')
            if (realFields.length > 0) {
              console.log(`   🎯 Shipped order ${order.name} has real shipping address!`)
              foundRealAddresses = true
            }
          }
        })
      }
    }
    
    console.log('\n🎯 COMPREHENSIVE ANALYSIS:')
    if (foundRealAddresses) {
      console.log('✅ REAL ADDRESSES FOUND IN SHOPIFY!')
      console.log('   The system needs to be updated to extract this real data.')
    } else {
      console.log('❌ NO REAL ADDRESSES FOUND IN ANY TIME PERIOD')
      console.log('   This store appears to only collect country data.')
      console.log('   The generated varied addresses are the best solution.')
    }

  } catch (error) {
    console.error('❌ Check Error:', error.message)
  }
}

// Run check
checkOlderOrders().catch(console.error)
