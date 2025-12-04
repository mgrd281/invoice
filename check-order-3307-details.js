#!/usr/bin/env node

// Check Order #3307 details thoroughly
async function checkOrder3307Details() {
  console.log('🔍 Checking Order #3307 Details Thoroughly\n')

  try {
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    const orderId = '7611177894155' // Order #3307
    
    console.log(`📋 Fetching complete data for Order #3307 (${orderId})...`)
    
    // Get complete order data
    const orderUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders/${orderId}.json`
    
    const response = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.log('❌ Failed to fetch order:', response.status)
      return
    }
    
    const data = await response.json()
    const order = data.order
    
    console.log('📊 COMPLETE ORDER DATA ANALYSIS:')
    console.log('=' .repeat(60))
    
    // Basic order info
    console.log(`Order Name: ${order.name}`)
    console.log(`Order ID: ${order.id}`)
    console.log(`Created: ${order.created_at}`)
    console.log(`Total: ${order.total_price} ${order.currency}`)
    console.log(`Financial Status: ${order.financial_status}`)
    console.log(`Customer Locale: ${order.customer_locale || 'NULL'}`)
    console.log(`Browser IP: ${order.browser_ip || 'NULL'}`)
    
    // Customer data
    console.log('\n👤 CUSTOMER DATA:')
    if (order.customer) {
      console.log(`   ID: ${order.customer.id}`)
      console.log(`   Email: ${order.customer.email || 'NULL'}`)
      console.log(`   First Name: ${order.customer.first_name || 'NULL'}`)
      console.log(`   Last Name: ${order.customer.last_name || 'NULL'}`)
      console.log(`   Phone: ${order.customer.phone || 'NULL'}`)
      console.log(`   State: ${order.customer.state || 'NULL'}`)
      console.log(`   Currency: ${order.customer.currency || 'NULL'}`)
      
      if (order.customer.default_address) {
        console.log('\n   Default Address:')
        const addr = order.customer.default_address
        console.log(`      ID: ${addr.id}`)
        console.log(`      First Name: ${addr.first_name || 'NULL'}`)
        console.log(`      Last Name: ${addr.last_name || 'NULL'}`)
        console.log(`      Company: ${addr.company || 'NULL'}`)
        console.log(`      Address1: ${addr.address1 || 'NULL'}`)
        console.log(`      Address2: ${addr.address2 || 'NULL'}`)
        console.log(`      City: ${addr.city || 'NULL'}`)
        console.log(`      Province: ${addr.province || 'NULL'}`)
        console.log(`      ZIP: ${addr.zip || 'NULL'}`)
        console.log(`      Country: ${addr.country || 'NULL'}`)
        console.log(`      Country Code: ${addr.country_code || 'NULL'}`)
        console.log(`      Phone: ${addr.phone || 'NULL'}`)
      }
    }
    
    // Billing address
    console.log('\n📮 BILLING ADDRESS:')
    if (order.billing_address) {
      const billing = order.billing_address
      console.log(`   First Name: ${billing.first_name || 'NULL'}`)
      console.log(`   Last Name: ${billing.last_name || 'NULL'}`)
      console.log(`   Name: ${billing.name || 'NULL'}`)
      console.log(`   Company: ${billing.company || 'NULL'}`)
      console.log(`   Address1: ${billing.address1 || 'NULL'}`)
      console.log(`   Address2: ${billing.address2 || 'NULL'}`)
      console.log(`   City: ${billing.city || 'NULL'}`)
      console.log(`   Province: ${billing.province || 'NULL'}`)
      console.log(`   ZIP: ${billing.zip || 'NULL'}`)
      console.log(`   Country: ${billing.country || 'NULL'}`)
      console.log(`   Country Code: ${billing.country_code || 'NULL'}`)
      console.log(`   Phone: ${billing.phone || 'NULL'}`)
    } else {
      console.log('   No billing address')
    }
    
    // Shipping address
    console.log('\n🚚 SHIPPING ADDRESS:')
    if (order.shipping_address) {
      const shipping = order.shipping_address
      console.log(`   First Name: ${shipping.first_name || 'NULL'}`)
      console.log(`   Last Name: ${shipping.last_name || 'NULL'}`)
      console.log(`   Name: ${shipping.name || 'NULL'}`)
      console.log(`   Company: ${shipping.company || 'NULL'}`)
      console.log(`   Address1: ${shipping.address1 || 'NULL'}`)
      console.log(`   Address2: ${shipping.address2 || 'NULL'}`)
      console.log(`   City: ${shipping.city || 'NULL'}`)
      console.log(`   Province: ${shipping.province || 'NULL'}`)
      console.log(`   ZIP: ${shipping.zip || 'NULL'}`)
      console.log(`   Country: ${shipping.country || 'NULL'}`)
      console.log(`   Country Code: ${shipping.country_code || 'NULL'}`)
      console.log(`   Phone: ${shipping.phone || 'NULL'}`)
    } else {
      console.log('   No shipping address')
    }
    
    // Order email
    console.log('\n📧 ORDER EMAIL:')
    console.log(`   Order Email: ${order.email || 'NULL'}`)
    console.log(`   Contact Email: ${order.contact_email || 'NULL'}`)
    
    // Order notes
    console.log('\n📝 ORDER NOTES:')
    console.log(`   Note: ${order.note || 'NULL'}`)
    if (order.note_attributes && order.note_attributes.length > 0) {
      console.log('   Note Attributes:')
      order.note_attributes.forEach((attr, index) => {
        console.log(`      ${index + 1}. ${attr.name}: ${attr.value}`)
      })
    } else {
      console.log('   No note attributes')
    }
    
    // Line items
    console.log('\n📦 LINE ITEMS:')
    if (order.line_items && order.line_items.length > 0) {
      order.line_items.forEach((item, index) => {
        console.log(`   Item ${index + 1}: ${item.title}`)
        console.log(`      Quantity: ${item.quantity}`)
        console.log(`      Price: ${item.price}`)
        if (item.properties && item.properties.length > 0) {
          console.log('      Properties:')
          item.properties.forEach((prop, propIndex) => {
            console.log(`         ${propIndex + 1}. ${prop.name}: ${prop.value}`)
          })
        }
      })
    }
    
    // Summary
    console.log('\n🎯 SUMMARY FOR ORDER #3307:')
    console.log('=' .repeat(40))
    
    const hasRealName = (order.customer?.first_name && order.customer.first_name !== 'NULL') ||
                       (order.customer?.last_name && order.customer.last_name !== 'NULL') ||
                       (order.billing_address?.name && order.billing_address.name !== 'NULL')
    
    const hasRealEmail = (order.customer?.email && order.customer.email !== 'NULL') ||
                        (order.email && order.email !== 'NULL')
    
    const hasRealAddress = (order.billing_address?.address1 && order.billing_address.address1 !== 'NULL') ||
                          (order.billing_address?.city && order.billing_address.city !== 'NULL') ||
                          (order.shipping_address?.address1 && order.shipping_address.address1 !== 'NULL') ||
                          (order.shipping_address?.city && order.shipping_address.city !== 'NULL')
    
    const hasCountry = order.billing_address?.country || order.customer?.default_address?.country
    
    console.log(`Has Real Name: ${hasRealName ? '✅ YES' : '❌ NO'}`)
    console.log(`Has Real Email: ${hasRealEmail ? '✅ YES' : '❌ NO'}`)
    console.log(`Has Real Address: ${hasRealAddress ? '✅ YES' : '❌ NO'}`)
    console.log(`Has Country: ${hasCountry ? '✅ YES (' + hasCountry + ')' : '❌ NO'}`)
    
    if (!hasRealName && !hasRealEmail && !hasRealAddress) {
      console.log('\n💡 RECOMMENDATION:')
      console.log('This order has NO real customer data except country.')
      console.log('Options:')
      console.log('1. Keep fields empty (current approach)')
      console.log('2. Generate minimal professional data based on country')
      console.log('3. Use order number as identifier only')
    }

  } catch (error) {
    console.error('❌ Check Error:', error.message)
  }
}

// Run check
checkOrder3307Details().catch(console.error)
