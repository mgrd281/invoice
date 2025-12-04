#!/usr/bin/env node

// Check for real addresses in recent Shopify orders
async function checkRealAddresses() {
  console.log('🔍 Checking for Real Addresses in Shopify Orders\n')

  try {
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Get the most recent orders
    console.log('1️⃣ Fetching most recent orders to check for real addresses...')
    
    const ordersUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=10&status=any&created_at_min=2025-10-01`
    
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
    
    console.log(`📊 Analyzing ${orders.length} recent orders for real address data...\n`)
    
    let foundRealAddresses = false
    
    orders.forEach((order, index) => {
      console.log(`📋 Order ${index + 1}: ${order.name} (${order.id})`)
      console.log(`   Created: ${order.created_at}`)
      console.log(`   Total: ${order.total_price} ${order.currency}`)
      console.log(`   Financial Status: ${order.financial_status}`)
      
      // Check all address sources in detail
      let hasRealData = false
      
      // Billing Address
      if (order.billing_address) {
        console.log('\n   📮 Billing Address:')
        const billing = order.billing_address
        
        // Check each field for real data (not null, not empty, not "NULL")
        const realFields = []
        
        if (billing.first_name && billing.first_name !== 'NULL' && billing.first_name.trim() !== '') {
          realFields.push(`First Name: "${billing.first_name}"`)
        }
        if (billing.last_name && billing.last_name !== 'NULL' && billing.last_name.trim() !== '') {
          realFields.push(`Last Name: "${billing.last_name}"`)
        }
        if (billing.name && billing.name !== 'NULL' && billing.name.trim() !== '') {
          realFields.push(`Name: "${billing.name}"`)
        }
        if (billing.company && billing.company !== 'NULL' && billing.company.trim() !== '') {
          realFields.push(`Company: "${billing.company}"`)
        }
        if (billing.address1 && billing.address1 !== 'NULL' && billing.address1.trim() !== '') {
          realFields.push(`Address1: "${billing.address1}"`)
        }
        if (billing.address2 && billing.address2 !== 'NULL' && billing.address2.trim() !== '') {
          realFields.push(`Address2: "${billing.address2}"`)
        }
        if (billing.city && billing.city !== 'NULL' && billing.city.trim() !== '') {
          realFields.push(`City: "${billing.city}"`)
        }
        if (billing.province && billing.province !== 'NULL' && billing.province.trim() !== '') {
          realFields.push(`Province: "${billing.province}"`)
        }
        if (billing.zip && billing.zip !== 'NULL' && billing.zip.trim() !== '') {
          realFields.push(`ZIP: "${billing.zip}"`)
        }
        if (billing.phone && billing.phone !== 'NULL' && billing.phone.trim() !== '') {
          realFields.push(`Phone: "${billing.phone}"`)
        }
        
        if (realFields.length > 1) { // More than just country
          console.log('      🎯 REAL BILLING DATA FOUND:')
          realFields.forEach(field => console.log(`         ${field}`))
          hasRealData = true
          foundRealAddresses = true
        } else {
          console.log('      ❌ No real billing data (only country/country_code)')
        }
      }
      
      // Shipping Address
      if (order.shipping_address) {
        console.log('\n   🚚 Shipping Address:')
        const shipping = order.shipping_address
        
        const realFields = []
        
        if (shipping.first_name && shipping.first_name !== 'NULL' && shipping.first_name.trim() !== '') {
          realFields.push(`First Name: "${shipping.first_name}"`)
        }
        if (shipping.last_name && shipping.last_name !== 'NULL' && shipping.last_name.trim() !== '') {
          realFields.push(`Last Name: "${shipping.last_name}"`)
        }
        if (shipping.name && shipping.name !== 'NULL' && shipping.name.trim() !== '') {
          realFields.push(`Name: "${shipping.name}"`)
        }
        if (shipping.company && shipping.company !== 'NULL' && shipping.company.trim() !== '') {
          realFields.push(`Company: "${shipping.company}"`)
        }
        if (shipping.address1 && shipping.address1 !== 'NULL' && shipping.address1.trim() !== '') {
          realFields.push(`Address1: "${shipping.address1}"`)
        }
        if (shipping.address2 && shipping.address2 !== 'NULL' && shipping.address2.trim() !== '') {
          realFields.push(`Address2: "${shipping.address2}"`)
        }
        if (shipping.city && shipping.city !== 'NULL' && shipping.city.trim() !== '') {
          realFields.push(`City: "${shipping.city}"`)
        }
        if (shipping.province && shipping.province !== 'NULL' && shipping.province.trim() !== '') {
          realFields.push(`Province: "${shipping.province}"`)
        }
        if (shipping.zip && shipping.zip !== 'NULL' && shipping.zip.trim() !== '') {
          realFields.push(`ZIP: "${shipping.zip}"`)
        }
        if (shipping.phone && shipping.phone !== 'NULL' && shipping.phone.trim() !== '') {
          realFields.push(`Phone: "${shipping.phone}"`)
        }
        
        if (realFields.length > 1) { // More than just country
          console.log('      🎯 REAL SHIPPING DATA FOUND:')
          realFields.forEach(field => console.log(`         ${field}`))
          hasRealData = true
          foundRealAddresses = true
        } else {
          console.log('      ❌ No real shipping data (only country/country_code)')
        }
      }
      
      // Customer Default Address
      if (order.customer && order.customer.default_address) {
        console.log('\n   👤 Customer Default Address:')
        const customer = order.customer.default_address
        
        const realFields = []
        
        if (customer.first_name && customer.first_name !== 'NULL' && customer.first_name.trim() !== '') {
          realFields.push(`First Name: "${customer.first_name}"`)
        }
        if (customer.last_name && customer.last_name !== 'NULL' && customer.last_name.trim() !== '') {
          realFields.push(`Last Name: "${customer.last_name}"`)
        }
        if (customer.name && customer.name !== 'NULL' && customer.name.trim() !== '') {
          realFields.push(`Name: "${customer.name}"`)
        }
        if (customer.company && customer.company !== 'NULL' && customer.company.trim() !== '') {
          realFields.push(`Company: "${customer.company}"`)
        }
        if (customer.address1 && customer.address1 !== 'NULL' && customer.address1.trim() !== '') {
          realFields.push(`Address1: "${customer.address1}"`)
        }
        if (customer.address2 && customer.address2 !== 'NULL' && customer.address2.trim() !== '') {
          realFields.push(`Address2: "${customer.address2}"`)
        }
        if (customer.city && customer.city !== 'NULL' && customer.city.trim() !== '') {
          realFields.push(`City: "${customer.city}"`)
        }
        if (customer.province && customer.province !== 'NULL' && customer.province.trim() !== '') {
          realFields.push(`Province: "${customer.province}"`)
        }
        if (customer.zip && customer.zip !== 'NULL' && customer.zip.trim() !== '') {
          realFields.push(`ZIP: "${customer.zip}"`)
        }
        if (customer.phone && customer.phone !== 'NULL' && customer.phone.trim() !== '') {
          realFields.push(`Phone: "${customer.phone}"`)
        }
        
        if (realFields.length > 1) { // More than just country
          console.log('      🎯 REAL CUSTOMER DATA FOUND:')
          realFields.forEach(field => console.log(`         ${field}`))
          hasRealData = true
          foundRealAddresses = true
        } else {
          console.log('      ❌ No real customer data (only country/country_code)')
        }
      }
      
      if (hasRealData) {
        console.log('\n   ✅ THIS ORDER HAS REAL ADDRESS DATA!')
      } else {
        console.log('\n   ❌ This order has no real address data')
      }
      
      console.log('\n' + '='.repeat(80))
    })
    
    console.log('\n🎯 FINAL ANALYSIS:')
    if (foundRealAddresses) {
      console.log('✅ REAL ADDRESSES FOUND IN SHOPIFY!')
      console.log('   The system should be updated to prioritize real address data.')
      console.log('   Current issue: The conversion function may not be extracting real data properly.')
    } else {
      console.log('❌ NO REAL ADDRESSES FOUND')
      console.log('   All orders only contain country data.')
      console.log('   The generated addresses are appropriate for this store.')
    }

  } catch (error) {
    console.error('❌ Check Error:', error.message)
  }
}

// Run check
checkRealAddresses().catch(console.error)
