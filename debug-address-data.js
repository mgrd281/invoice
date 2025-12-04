#!/usr/bin/env node

// Debug address data in Shopify orders
async function debugAddressData() {
  console.log('🏠 Debug: Address Data in Shopify Orders\n')

  try {
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Test multiple orders to find any with address data
    const orderIds = ['7611177894155', '7610574536971', '7609695699211', '7598175158539', '7598034878731']
    
    console.log('🔍 Checking multiple orders for address data...\n')
    
    for (const orderId of orderIds) {
      console.log(`📋 Order: ${orderId}`)
      
      const url = `https://${shopDomain}/admin/api/${apiVersion}/orders/${orderId}.json`
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.log('❌ Failed to fetch order:', response.status)
        continue
      }
      
      const data = await response.json()
      const order = data.order
      
      console.log(`   Order Name: ${order.name}`)
      console.log(`   Financial Status: ${order.financial_status}`)
      console.log(`   Created: ${order.created_at}`)
      
      // Check all possible address sources
      const addressSources = {
        'billing_address': order.billing_address,
        'shipping_address': order.shipping_address,
        'customer.default_address': order.customer?.default_address,
        'customer.addresses': order.customer?.addresses
      }
      
      let foundAnyAddress = false
      
      Object.entries(addressSources).forEach(([source, address]) => {
        if (source === 'customer.addresses' && Array.isArray(address)) {
          if (address.length > 0) {
            console.log(`\n   📍 ${source} (${address.length} addresses):`)
            address.forEach((addr, index) => {
              const hasData = addr.address1 || addr.city || addr.zip || addr.country
              if (hasData) {
                console.log(`      Address ${index + 1}:`)
                console.log(`         Name: "${addr.name || 'NULL'}"`)
                console.log(`         Company: "${addr.company || 'NULL'}"`)
                console.log(`         Address1: "${addr.address1 || 'NULL'}"`)
                console.log(`         Address2: "${addr.address2 || 'NULL'}"`)
                console.log(`         City: "${addr.city || 'NULL'}"`)
                console.log(`         Province: "${addr.province || 'NULL'}"`)
                console.log(`         ZIP: "${addr.zip || 'NULL'}"`)
                console.log(`         Country: "${addr.country || 'NULL'}"`)
                console.log(`         Phone: "${addr.phone || 'NULL'}"`)
                foundAnyAddress = true
              }
            })
          }
        } else if (address) {
          const hasData = address.address1 || address.city || address.zip || address.country
          if (hasData) {
            console.log(`\n   📍 ${source}:`)
            console.log(`      Name: "${address.name || 'NULL'}"`)
            console.log(`      Company: "${address.company || 'NULL'}"`)
            console.log(`      Address1: "${address.address1 || 'NULL'}"`)
            console.log(`      Address2: "${address.address2 || 'NULL'}"`)
            console.log(`      City: "${address.city || 'NULL'}"`)
            console.log(`      Province: "${address.province || 'NULL'}"`)
            console.log(`      ZIP: "${address.zip || 'NULL'}"`)
            console.log(`      Country: "${address.country || 'NULL'}"`)
            console.log(`      Country Code: "${address.country_code || 'NULL'}"`)
            console.log(`      Phone: "${address.phone || 'NULL'}"`)
            foundAnyAddress = true
          }
        }
      })
      
      if (!foundAnyAddress) {
        console.log('   ❌ No address data found in any source')
      }
      
      console.log('\n' + '-'.repeat(60))
    }
    
    // Test: Check if there are any orders with complete address data
    console.log('\n\n🔍 Searching for orders with complete address data...')
    
    const searchUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=50&status=any`
    console.log('🌐 Fetching recent orders for address analysis...')
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      console.log(`📊 Analyzing ${searchData.orders?.length || 0} orders for address data...`)
      
      let ordersWithAddresses = 0
      let ordersWithCompleteAddresses = 0
      
      searchData.orders?.forEach((order, index) => {
        const hasAnyAddress = order.billing_address?.address1 || 
                             order.shipping_address?.address1 || 
                             order.customer?.default_address?.address1
        
        const hasCompleteAddress = (order.billing_address?.address1 && order.billing_address?.city && order.billing_address?.zip) ||
                                  (order.shipping_address?.address1 && order.shipping_address?.city && order.shipping_address?.zip) ||
                                  (order.customer?.default_address?.address1 && order.customer?.default_address?.city && order.customer?.default_address?.zip)
        
        if (hasAnyAddress) {
          ordersWithAddresses++
          console.log(`   ✅ Order ${order.name}: Has some address data`)
          
          if (hasCompleteAddress) {
            ordersWithCompleteAddresses++
            console.log(`      🎯 Complete address found!`)
            
            // Show the complete address
            const completeAddr = order.billing_address?.address1 ? order.billing_address :
                               order.shipping_address?.address1 ? order.shipping_address :
                               order.customer?.default_address
            
            if (completeAddr) {
              console.log(`         Address: ${completeAddr.address1}`)
              console.log(`         City: ${completeAddr.city}`)
              console.log(`         ZIP: ${completeAddr.zip}`)
              console.log(`         Country: ${completeAddr.country}`)
            }
          }
        }
      })
      
      console.log(`\n📊 Address Analysis Summary:`)
      console.log(`   Total Orders: ${searchData.orders?.length || 0}`)
      console.log(`   Orders with Any Address: ${ordersWithAddresses}`)
      console.log(`   Orders with Complete Address: ${ordersWithCompleteAddresses}`)
      
      if (ordersWithCompleteAddresses === 0) {
        console.log('\n⚠️  WARNING: No orders found with complete address data!')
        console.log('   This suggests that:')
        console.log('   1. Customers are not providing shipping addresses')
        console.log('   2. Digital products don\'t require shipping')
        console.log('   3. Store is configured for pickup/digital delivery only')
        console.log('   4. Address collection is disabled in checkout')
      }
    }

  } catch (error) {
    console.error('❌ Debug Error:', error.message)
  }
}

// Run debug
debugAddressData().catch(console.error)
