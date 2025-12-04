#!/usr/bin/env node

// Debug customer fields in Shopify orders
async function debugCustomerFields() {
  console.log('🔍 Debug: Customer Fields in Shopify Orders\n')

  try {
    // Test 1: Get raw Shopify order data
    console.log('1️⃣ Getting raw Shopify order data...')
    
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Get specific order with ALL fields
    const orderId = '7611177894155'
    const url = `https://${shopDomain}/admin/api/${apiVersion}/orders/${orderId}.json`
    
    console.log('🌐 Fetching order:', url)
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.log('❌ Failed to fetch order:', response.status, response.statusText)
      return
    }
    
    const data = await response.json()
    const order = data.order
    
    console.log('\n2️⃣ Raw Order Data Analysis:')
    console.log('📋 Order ID:', order.id)
    console.log('📋 Order Name:', order.name)
    console.log('📋 Order Email:', order.email)
    
    console.log('\n👤 Customer Object:')
    if (order.customer) {
      console.log('   Customer ID:', order.customer.id)
      console.log('   First Name:', `"${order.customer.first_name || 'MISSING'}"`)
      console.log('   Last Name:', `"${order.customer.last_name || 'MISSING'}"`)
      console.log('   Email:', `"${order.customer.email || 'MISSING'}"`)
      console.log('   Phone:', `"${order.customer.phone || 'MISSING'}"`)
      console.log('   Accepts Marketing:', order.customer.accepts_marketing)
      console.log('   Created At:', order.customer.created_at)
      console.log('   Updated At:', order.customer.updated_at)
      console.log('   State:', order.customer.state)
      console.log('   Note:', `"${order.customer.note || 'MISSING'}"`)
      console.log('   Verified Email:', order.customer.verified_email)
      console.log('   Tags:', `"${order.customer.tags || 'MISSING'}"`)
      
      console.log('\n   🏠 Default Address:')
      if (order.customer.default_address) {
        const addr = order.customer.default_address
        console.log('      ID:', addr.id)
        console.log('      First Name:', `"${addr.first_name || 'MISSING'}"`)
        console.log('      Last Name:', `"${addr.last_name || 'MISSING'}"`)
        console.log('      Company:', `"${addr.company || 'MISSING'}"`)
        console.log('      Address1:', `"${addr.address1 || 'MISSING'}"`)
        console.log('      Address2:', `"${addr.address2 || 'MISSING'}"`)
        console.log('      City:', `"${addr.city || 'MISSING'}"`)
        console.log('      Province:', `"${addr.province || 'MISSING'}"`)
        console.log('      Country:', `"${addr.country || 'MISSING'}"`)
        console.log('      Zip:', `"${addr.zip || 'MISSING'}"`)
        console.log('      Phone:', `"${addr.phone || 'MISSING'}"`)
        console.log('      Name:', `"${addr.name || 'MISSING'}"`)
        console.log('      Country Code:', `"${addr.country_code || 'MISSING'}"`)
        console.log('      Province Code:', `"${addr.province_code || 'MISSING'}"`)
      } else {
        console.log('      ❌ No default address found')
      }
    } else {
      console.log('   ❌ No customer object found')
    }
    
    console.log('\n📮 Billing Address:')
    if (order.billing_address) {
      const addr = order.billing_address
      console.log('   First Name:', `"${addr.first_name || 'MISSING'}"`)
      console.log('   Last Name:', `"${addr.last_name || 'MISSING'}"`)
      console.log('   Company:', `"${addr.company || 'MISSING'}"`)
      console.log('   Address1:', `"${addr.address1 || 'MISSING'}"`)
      console.log('   Address2:', `"${addr.address2 || 'MISSING'}"`)
      console.log('   City:', `"${addr.city || 'MISSING'}"`)
      console.log('   Province:', `"${addr.province || 'MISSING'}"`)
      console.log('   Country:', `"${addr.country || 'MISSING'}"`)
      console.log('   Zip:', `"${addr.zip || 'MISSING'}"`)
      console.log('   Phone:', `"${addr.phone || 'MISSING'}"`)
      console.log('   Name:', `"${addr.name || 'MISSING'}"`)
      console.log('   Country Code:', `"${addr.country_code || 'MISSING'}"`)
      console.log('   Province Code:', `"${addr.province_code || 'MISSING'}"`)
    } else {
      console.log('   ❌ No billing address found')
    }
    
    console.log('\n🚚 Shipping Address:')
    if (order.shipping_address) {
      const addr = order.shipping_address
      console.log('   First Name:', `"${addr.first_name || 'MISSING'}"`)
      console.log('   Last Name:', `"${addr.last_name || 'MISSING'}"`)
      console.log('   Company:', `"${addr.company || 'MISSING'}"`)
      console.log('   Address1:', `"${addr.address1 || 'MISSING'}"`)
      console.log('   Address2:', `"${addr.address2 || 'MISSING'}"`)
      console.log('   City:', `"${addr.city || 'MISSING'}"`)
      console.log('   Province:', `"${addr.province || 'MISSING'}"`)
      console.log('   Country:', `"${addr.country || 'MISSING'}"`)
      console.log('   Zip:', `"${addr.zip || 'MISSING'}"`)
      console.log('   Phone:', `"${addr.phone || 'MISSING'}"`)
      console.log('   Name:', `"${addr.name || 'MISSING'}"`)
      console.log('   Country Code:', `"${addr.country_code || 'MISSING'}"`)
      console.log('   Province Code:', `"${addr.province_code || 'MISSING'}"`)
    } else {
      console.log('   ❌ No shipping address found')
    }
    
    console.log('\n3️⃣ Suggested Customer Name Construction:')
    
    // Try different combinations
    let suggestedName = ''
    let suggestedAddress = ''
    let suggestedCity = ''
    let suggestedZip = ''
    let suggestedCountry = ''
    let suggestedCompany = ''
    
    // Priority 1: Customer object
    if (order.customer) {
      if (order.customer.first_name || order.customer.last_name) {
        suggestedName = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
        console.log('✅ Name from customer:', `"${suggestedName}"`)
      }
      
      if (order.customer.default_address) {
        const addr = order.customer.default_address
        if (addr.address1) suggestedAddress = addr.address1
        if (addr.city) suggestedCity = addr.city
        if (addr.zip) suggestedZip = addr.zip
        if (addr.country) suggestedCountry = addr.country
        if (addr.company) suggestedCompany = addr.company
        console.log('✅ Address from customer default_address')
      }
    }
    
    // Priority 2: Billing address
    if (!suggestedName && order.billing_address) {
      if (order.billing_address.first_name || order.billing_address.last_name) {
        suggestedName = `${order.billing_address.first_name || ''} ${order.billing_address.last_name || ''}`.trim()
        console.log('✅ Name from billing_address:', `"${suggestedName}"`)
      }
    }
    
    if (!suggestedAddress && order.billing_address) {
      const addr = order.billing_address
      if (addr.address1) suggestedAddress = addr.address1
      if (addr.city) suggestedCity = addr.city
      if (addr.zip) suggestedZip = addr.zip
      if (addr.country) suggestedCountry = addr.country
      if (addr.company) suggestedCompany = addr.company
      console.log('✅ Address from billing_address')
    }
    
    // Priority 3: Shipping address
    if (!suggestedName && order.shipping_address) {
      if (order.shipping_address.first_name || order.shipping_address.last_name) {
        suggestedName = `${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`.trim()
        console.log('✅ Name from shipping_address:', `"${suggestedName}"`)
      }
    }
    
    if (!suggestedAddress && order.shipping_address) {
      const addr = order.shipping_address
      if (addr.address1) suggestedAddress = addr.address1
      if (addr.city) suggestedCity = addr.city
      if (addr.zip) suggestedZip = addr.zip
      if (addr.country) suggestedCountry = addr.country
      if (addr.company) suggestedCompany = addr.company
      console.log('✅ Address from shipping_address')
    }
    
    console.log('\n📋 Final Suggested Data:')
    console.log('   Name:', `"${suggestedName || 'NONE FOUND'}"`)
    console.log('   Company:', `"${suggestedCompany || 'NONE FOUND'}"`)
    console.log('   Address:', `"${suggestedAddress || 'NONE FOUND'}"`)
    console.log('   City:', `"${suggestedCity || 'NONE FOUND'}"`)
    console.log('   ZIP:', `"${suggestedZip || 'NONE FOUND'}"`)
    console.log('   Country:', `"${suggestedCountry || 'NONE FOUND'}"`)
    
    console.log('\n4️⃣ Recommended Customer Object:')
    const recommendedCustomer = {
      name: suggestedName || `Shopify Kunde #${order.name} (ID: ${order.id})`,
      companyName: suggestedCompany || '',
      email: order.customer?.email || order.email || `kunde.${order.name?.replace('#', '') || 'unbekannt'}.${order.customer?.id || 'unbekannt'}@shopify-import.placeholder`,
      address: suggestedAddress || '',
      city: suggestedCity || '',
      zipCode: suggestedZip || '',
      country: suggestedCountry || 'Germany'
    }
    
    console.log(JSON.stringify(recommendedCustomer, null, 2))

  } catch (error) {
    console.error('❌ Debug Error:', error.message)
  }
}

// Run debug
debugCustomerFields().catch(console.error)
