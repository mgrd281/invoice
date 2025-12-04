#!/usr/bin/env node

// Deep analysis of address data in Shopify orders
async function deepAddressAnalysis() {
  console.log('🔍 Deep Address Analysis in Shopify Orders\n')

  try {
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Get a broader range of orders to analyze
    console.log('1️⃣ Fetching recent orders for comprehensive address analysis...')
    
    const ordersUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=50&status=any`
    
    const response = await fetch(ordersUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.log('❌ Failed to fetch orders:', response.status)
      return
    }
    
    const data = await response.json()
    const orders = data.orders || []
    
    console.log(`📊 Analyzing ${orders.length} orders for address patterns...\n`)
    
    let addressStats = {
      totalOrders: orders.length,
      ordersWithBillingAddress: 0,
      ordersWithShippingAddress: 0,
      ordersWithCustomerAddress: 0,
      ordersWithAnyRealAddress: 0,
      ordersWithCompleteAddress: 0,
      uniqueCountries: new Set(),
      uniqueCities: new Set(),
      uniqueAddresses: new Set(),
      addressPatterns: {}
    }
    
    console.log('🔍 Detailed Order Analysis:')
    console.log('=' .repeat(80))
    
    orders.forEach((order, index) => {
      console.log(`\n📋 Order ${index + 1}: ${order.name} (${order.id})`)
      console.log(`   Created: ${order.created_at}`)
      console.log(`   Financial Status: ${order.financial_status}`)
      console.log(`   Total: ${order.total_price} ${order.currency}`)
      
      // Analyze billing address
      if (order.billing_address) {
        addressStats.ordersWithBillingAddress++
        console.log('\n   📮 Billing Address:')
        
        const billing = order.billing_address
        const billingFields = {
          'First Name': billing.first_name,
          'Last Name': billing.last_name,
          'Name': billing.name,
          'Company': billing.company,
          'Address1': billing.address1,
          'Address2': billing.address2,
          'City': billing.city,
          'Province': billing.province,
          'ZIP': billing.zip,
          'Country': billing.country,
          'Country Code': billing.country_code,
          'Phone': billing.phone
        }
        
        let hasRealBillingData = false
        Object.entries(billingFields).forEach(([field, value]) => {
          const displayValue = value || 'NULL'
          console.log(`      ${field}: "${displayValue}"`)
          
          if (value && value !== 'NULL' && value.toString().trim() !== '') {
            hasRealBillingData = true
            
            // Collect statistics
            if (field === 'Country' && value) addressStats.uniqueCountries.add(value)
            if (field === 'City' && value) addressStats.uniqueCities.add(value)
            if (field === 'Address1' && value) addressStats.uniqueAddresses.add(value)
          }
        })
        
        if (hasRealBillingData) {
          console.log('      ✅ Has some real billing data')
        } else {
          console.log('      ❌ No real billing data')
        }
      }
      
      // Analyze shipping address
      if (order.shipping_address) {
        addressStats.ordersWithShippingAddress++
        console.log('\n   🚚 Shipping Address:')
        
        const shipping = order.shipping_address
        const shippingFields = {
          'First Name': shipping.first_name,
          'Last Name': shipping.last_name,
          'Name': shipping.name,
          'Company': shipping.company,
          'Address1': shipping.address1,
          'Address2': shipping.address2,
          'City': shipping.city,
          'Province': shipping.province,
          'ZIP': shipping.zip,
          'Country': shipping.country,
          'Country Code': shipping.country_code,
          'Phone': shipping.phone
        }
        
        let hasRealShippingData = false
        Object.entries(shippingFields).forEach(([field, value]) => {
          const displayValue = value || 'NULL'
          console.log(`      ${field}: "${displayValue}"`)
          
          if (value && value !== 'NULL' && value.toString().trim() !== '') {
            hasRealShippingData = true
            
            // Collect statistics
            if (field === 'Country' && value) addressStats.uniqueCountries.add(value)
            if (field === 'City' && value) addressStats.uniqueCities.add(value)
            if (field === 'Address1' && value) addressStats.uniqueAddresses.add(value)
          }
        })
        
        if (hasRealShippingData) {
          console.log('      ✅ Has some real shipping data')
        } else {
          console.log('      ❌ No real shipping data')
        }
      }
      
      // Analyze customer address
      if (order.customer && order.customer.default_address) {
        addressStats.ordersWithCustomerAddress++
        console.log('\n   👤 Customer Default Address:')
        
        const customer = order.customer.default_address
        const customerFields = {
          'First Name': customer.first_name,
          'Last Name': customer.last_name,
          'Name': customer.name,
          'Company': customer.company,
          'Address1': customer.address1,
          'Address2': customer.address2,
          'City': customer.city,
          'Province': customer.province,
          'ZIP': customer.zip,
          'Country': customer.country,
          'Country Code': customer.country_code,
          'Phone': customer.phone
        }
        
        let hasRealCustomerData = false
        Object.entries(customerFields).forEach(([field, value]) => {
          const displayValue = value || 'NULL'
          console.log(`      ${field}: "${displayValue}"`)
          
          if (value && value !== 'NULL' && value.toString().trim() !== '') {
            hasRealCustomerData = true
            
            // Collect statistics
            if (field === 'Country' && value) addressStats.uniqueCountries.add(value)
            if (field === 'City' && value) addressStats.uniqueCities.add(value)
            if (field === 'Address1' && value) addressStats.uniqueAddresses.add(value)
          }
        })
        
        if (hasRealCustomerData) {
          console.log('      ✅ Has some real customer data')
        } else {
          console.log('      ❌ No real customer data')
        }
      }
      
      // Check for any real address data in this order
      const hasAnyRealAddress = (
        (order.billing_address?.address1 && order.billing_address.address1.trim() !== '') ||
        (order.billing_address?.city && order.billing_address.city.trim() !== '') ||
        (order.shipping_address?.address1 && order.shipping_address.address1.trim() !== '') ||
        (order.shipping_address?.city && order.shipping_address.city.trim() !== '') ||
        (order.customer?.default_address?.address1 && order.customer.default_address.address1.trim() !== '') ||
        (order.customer?.default_address?.city && order.customer.default_address.city.trim() !== '')
      )
      
      if (hasAnyRealAddress) {
        addressStats.ordersWithAnyRealAddress++
        console.log('   🎯 ORDER HAS REAL ADDRESS DATA!')
      }
      
      // Check for complete address
      const hasCompleteAddress = (
        (order.billing_address?.address1 && order.billing_address?.city && order.billing_address?.zip) ||
        (order.shipping_address?.address1 && order.shipping_address?.city && order.shipping_address?.zip) ||
        (order.customer?.default_address?.address1 && order.customer?.default_address?.city && order.customer?.default_address?.zip)
      )
      
      if (hasCompleteAddress) {
        addressStats.ordersWithCompleteAddress++
        console.log('   🏆 ORDER HAS COMPLETE ADDRESS!')
      }
      
      console.log('\n' + '-'.repeat(80))
    })
    
    // Print comprehensive statistics
    console.log('\n\n📊 COMPREHENSIVE ADDRESS STATISTICS:')
    console.log('=' .repeat(50))
    console.log(`Total Orders Analyzed: ${addressStats.totalOrders}`)
    console.log(`Orders with Billing Address: ${addressStats.ordersWithBillingAddress}`)
    console.log(`Orders with Shipping Address: ${addressStats.ordersWithShippingAddress}`)
    console.log(`Orders with Customer Address: ${addressStats.ordersWithCustomerAddress}`)
    console.log(`Orders with ANY Real Address: ${addressStats.ordersWithAnyRealAddress}`)
    console.log(`Orders with Complete Address: ${addressStats.ordersWithCompleteAddress}`)
    
    console.log(`\nUnique Countries Found: ${addressStats.uniqueCountries.size}`)
    if (addressStats.uniqueCountries.size > 0) {
      console.log(`Countries: ${Array.from(addressStats.uniqueCountries).join(', ')}`)
    }
    
    console.log(`\nUnique Cities Found: ${addressStats.uniqueCities.size}`)
    if (addressStats.uniqueCities.size > 0) {
      console.log(`Cities: ${Array.from(addressStats.uniqueCities).join(', ')}`)
    }
    
    console.log(`\nUnique Addresses Found: ${addressStats.uniqueAddresses.size}`)
    if (addressStats.uniqueAddresses.size > 0) {
      console.log(`Addresses: ${Array.from(addressStats.uniqueAddresses).join(', ')}`)
    }
    
    // Conclusion
    console.log('\n🎯 ANALYSIS CONCLUSION:')
    if (addressStats.ordersWithAnyRealAddress === 0) {
      console.log('❌ NO REAL ADDRESS DATA FOUND IN ANY ORDER')
      console.log('   This confirms that the store only has country data from Shopify.')
      console.log('   All customers are purchasing digital products without providing addresses.')
    } else {
      console.log(`✅ FOUND ${addressStats.ordersWithAnyRealAddress} ORDERS WITH REAL ADDRESS DATA`)
      console.log('   The system should prioritize extracting this real data.')
    }

  } catch (error) {
    console.error('❌ Analysis Error:', error.message)
  }
}

// Run analysis
deepAddressAnalysis().catch(console.error)
