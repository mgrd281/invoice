#!/usr/bin/env node

// Test enhanced Shopify display with full customer data
async function testEnhancedShopifyDisplay() {
  console.log('🎯 Test: Enhanced Shopify Display with Full Customer Data\n')

  try {
    console.log('📋 Testing enhanced Shopify order display...')
    
    // Test fetching orders with full customer data
    const response = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=5&financial_status=any', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`Response Status: ${response.status}`)
    
    if (response.ok) {
      const result = await response.json()
      console.log('📊 Orders fetched:', result.orders?.length || 0)
      
      if (result.orders && result.orders.length > 0) {
        console.log('\n🔍 Analyzing first order for customer data:')
        const order = result.orders[0]
        
        console.log(`\n📋 Order: ${order.name}`)
        console.log(`💰 Total: ${order.total_price} ${order.currency}`)
        console.log(`📅 Created: ${new Date(order.created_at).toLocaleString('de-DE')}`)
        
        console.log('\n👤 Customer Data:')
        console.log(`   Name: ${order.customer?.name || 'N/A'}`)
        console.log(`   Email: ${order.customer?.email || 'N/A'}`)
        console.log(`   First Name: ${order.customer?.first_name || 'N/A'}`)
        console.log(`   Last Name: ${order.customer?.last_name || 'N/A'}`)
        
        console.log('\n🏠 Billing Address:')
        if (order.billing_address) {
          console.log(`   Name: ${order.billing_address.first_name || ''} ${order.billing_address.last_name || ''}`)
          console.log(`   Company: ${order.billing_address.company || 'N/A'}`)
          console.log(`   Address1: ${order.billing_address.address1 || 'N/A'}`)
          console.log(`   Address2: ${order.billing_address.address2 || 'N/A'}`)
          console.log(`   City: ${order.billing_address.city || 'N/A'}`)
          console.log(`   ZIP: ${order.billing_address.zip || 'N/A'}`)
          console.log(`   Province: ${order.billing_address.province || 'N/A'}`)
          console.log(`   Country: ${order.billing_address.country || 'N/A'}`)
        } else {
          console.log('   No billing address data')
        }
        
        console.log('\n🚚 Shipping Address:')
        if (order.shipping_address) {
          console.log(`   Name: ${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`)
          console.log(`   Company: ${order.shipping_address.company || 'N/A'}`)
          console.log(`   Address1: ${order.shipping_address.address1 || 'N/A'}`)
          console.log(`   Address2: ${order.shipping_address.address2 || 'N/A'}`)
          console.log(`   City: ${order.shipping_address.city || 'N/A'}`)
          console.log(`   ZIP: ${order.shipping_address.zip || 'N/A'}`)
          console.log(`   Province: ${order.shipping_address.province || 'N/A'}`)
          console.log(`   Country: ${order.shipping_address.country || 'N/A'}`)
        } else {
          console.log('   No shipping address data')
        }
        
        console.log('\n🏠 Default Address:')
        if (order.customer?.default_address) {
          const addr = order.customer.default_address
          console.log(`   Name: ${addr.first_name || ''} ${addr.last_name || ''}`)
          console.log(`   Company: ${addr.company || 'N/A'}`)
          console.log(`   Address1: ${addr.address1 || 'N/A'}`)
          console.log(`   Address2: ${addr.address2 || 'N/A'}`)
          console.log(`   City: ${addr.city || 'N/A'}`)
          console.log(`   ZIP: ${addr.zip || 'N/A'}`)
          console.log(`   Province: ${addr.province || 'N/A'}`)
          console.log(`   Country: ${addr.country || 'N/A'}`)
        } else {
          console.log('   No default address data')
        }
        
        console.log('\n📦 Line Items:')
        if (order.line_items && order.line_items.length > 0) {
          order.line_items.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.title}`)
            console.log(`      Quantity: ${item.quantity}`)
            console.log(`      Price: ${item.price} ${order.currency}`)
            console.log(`      SKU: ${item.sku || 'N/A'}`)
          })
        }
        
        console.log('\n📝 Order Notes:')
        console.log(`   Note: ${order.note || 'N/A'}`)
        if (order.note_attributes && order.note_attributes.length > 0) {
          console.log('   Note Attributes:')
          order.note_attributes.forEach(attr => {
            console.log(`      ${attr.name}: ${attr.value}`)
          })
        }
        
        // Test address formatting logic
        console.log('\n🎨 Address Formatting Test:')
        const billing = order.billing_address
        const shipping = order.shipping_address
        const defaultAddr = order.customer?.default_address
        
        const address1 = billing?.address1 || shipping?.address1 || defaultAddr?.address1
        const city = billing?.city || shipping?.city || defaultAddr?.city || billing?.province || shipping?.province
        const zip = billing?.zip || shipping?.zip || defaultAddr?.zip
        const country = billing?.country || shipping?.country || defaultAddr?.country
        
        if (address1 || city || zip) {
          const parts = []
          if (address1) parts.push(address1)
          if (zip && city) parts.push(`${zip} ${city}`)
          else if (city) parts.push(city)
          else if (zip) parts.push(zip)
          if (country && country !== 'Germany') parts.push(country)
          const formattedAddress = parts.join(', ')
          console.log(`   Formatted Address: "${formattedAddress}"`)
        } else {
          console.log('   Formatted Address: "Keine Adresse"')
        }
        
      } else {
        console.log('❌ No orders found')
      }
    } else {
      console.log('❌ Failed to fetch orders')
      const errorText = await response.text()
      console.log('Error:', errorText)
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testEnhancedShopifyDisplay().catch(console.error)
