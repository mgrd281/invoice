#!/usr/bin/env node

// Debug real customer data extraction
async function debugRealCustomerData() {
  console.log('🔍 Debug: Real Customer Data Extraction\n')

  try {
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Test with the most recent orders to see what data is actually available
    console.log('1️⃣ Getting recent orders with ALL possible fields...')
    
    const ordersUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=5&status=any`
    
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
    
    console.log(`📊 Analyzing ${orders.length} recent orders for ALL available data...\n`)
    
    orders.forEach((order, index) => {
      console.log(`📋 Order ${index + 1}: ${order.name} (${order.id})`)
      console.log(`   Created: ${order.created_at}`)
      console.log(`   Total: ${order.total_price} ${order.currency}`)
      
      // Show ALL available fields in the order object
      console.log('\n   📊 ALL ORDER FIELDS:')
      Object.keys(order).forEach(key => {
        const value = order[key]
        if (value !== null && value !== undefined && value !== '') {
          if (typeof value === 'object' && !Array.isArray(value)) {
            console.log(`      ${key}: [Object with ${Object.keys(value).length} fields]`)
          } else if (Array.isArray(value)) {
            console.log(`      ${key}: [Array with ${value.length} items]`)
          } else {
            console.log(`      ${key}: "${value}"`)
          }
        }
      })
      
      // Deep dive into customer object
      if (order.customer) {
        console.log('\n   👤 CUSTOMER OBJECT DETAILS:')
        Object.keys(order.customer).forEach(key => {
          const value = order.customer[key]
          if (value !== null && value !== undefined && value !== '') {
            if (typeof value === 'object' && !Array.isArray(value)) {
              console.log(`      customer.${key}: [Object]`)
              // Show object details
              Object.keys(value).forEach(subKey => {
                const subValue = value[subKey]
                if (subValue !== null && subValue !== undefined && subValue !== '') {
                  console.log(`         ${subKey}: "${subValue}"`)
                }
              })
            } else if (Array.isArray(value)) {
              console.log(`      customer.${key}: [Array with ${value.length} items]`)
              if (value.length > 0) {
                value.forEach((item, i) => {
                  console.log(`         Item ${i + 1}:`, typeof item === 'object' ? '[Object]' : `"${item}"`)
                  if (typeof item === 'object') {
                    Object.keys(item).forEach(itemKey => {
                      const itemValue = item[itemKey]
                      if (itemValue !== null && itemValue !== undefined && itemValue !== '') {
                        console.log(`            ${itemKey}: "${itemValue}"`)
                      }
                    })
                  }
                })
              }
            } else {
              console.log(`      customer.${key}: "${value}"`)
            }
          }
        })
      }
      
      // Deep dive into billing address
      if (order.billing_address) {
        console.log('\n   📮 BILLING ADDRESS DETAILS:')
        Object.keys(order.billing_address).forEach(key => {
          const value = order.billing_address[key]
          if (value !== null && value !== undefined && value !== '') {
            console.log(`      billing_address.${key}: "${value}"`)
          }
        })
      }
      
      // Deep dive into shipping address
      if (order.shipping_address) {
        console.log('\n   🚚 SHIPPING ADDRESS DETAILS:')
        Object.keys(order.shipping_address).forEach(key => {
          const value = order.shipping_address[key]
          if (value !== null && value !== undefined && value !== '') {
            console.log(`      shipping_address.${key}: "${value}"`)
          }
        })
      }
      
      // Check line items for any customer info
      if (order.line_items && order.line_items.length > 0) {
        console.log('\n   📦 LINE ITEMS:')
        order.line_items.forEach((item, i) => {
          console.log(`      Item ${i + 1}: ${item.title}`)
          // Check if line items have any custom properties with customer info
          if (item.properties && item.properties.length > 0) {
            console.log('         Properties:')
            item.properties.forEach(prop => {
              console.log(`            ${prop.name}: "${prop.value}"`)
            })
          }
        })
      }
      
      // Check note attributes
      if (order.note_attributes && order.note_attributes.length > 0) {
        console.log('\n   📝 NOTE ATTRIBUTES:')
        order.note_attributes.forEach(attr => {
          console.log(`      ${attr.name}: "${attr.value}"`)
        })
      }
      
      // Check order note
      if (order.note) {
        console.log('\n   📝 ORDER NOTE:')
        console.log(`      "${order.note}"`)
      }
      
      console.log('\n' + '='.repeat(100))
    })
    
    // Also test the conversion function directly
    console.log('\n2️⃣ Testing conversion function with recent order...')
    
    if (orders.length > 0) {
      const testOrder = orders[0]
      console.log(`Testing with order: ${testOrder.name} (${testOrder.id})`)
      
      const conversionResponse = await fetch(`http://127.0.0.1:51539/api/shopify/move-to-invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderIds: [testOrder.id.toString()]
        })
      })
      
      console.log(`Conversion Status: ${conversionResponse.status}`)
      
      if (conversionResponse.ok) {
        const result = await conversionResponse.json()
        console.log('Conversion Result:', result)
        
        // Check the created invoice
        setTimeout(async () => {
          const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
          if (invoicesResponse.ok) {
            const invoicesData = await invoicesResponse.json()
            const createdInvoice = invoicesData.invoices?.find(inv => 
              inv.shopifyOrderId?.toString() === testOrder.id.toString()
            )
            
            if (createdInvoice) {
              console.log('\n3️⃣ Created Invoice Analysis:')
              console.log(`   Invoice: ${createdInvoice.number}`)
              console.log(`   Customer Name: "${createdInvoice.customerName}"`)
              console.log(`   Company: "${createdInvoice.customerCompanyName}"`)
              console.log(`   Email: "${createdInvoice.customerEmail}"`)
              console.log(`   Address: "${createdInvoice.customerAddress}"`)
              console.log(`   City: "${createdInvoice.customerCity}"`)
              console.log(`   ZIP: "${createdInvoice.customerZip}"`)
              console.log(`   Country: "${createdInvoice.customerCountry}"`)
              
              console.log('\n🎯 ANALYSIS:')
              if (createdInvoice.customerName.includes('Shopify Kunde')) {
                console.log('❌ Still using fallback customer name')
              } else {
                console.log('✅ Using real customer name')
              }
              
              if (createdInvoice.customerAddress.includes('straße') || createdInvoice.customerAddress.includes('gasse')) {
                console.log('❌ Still using generated address')
              } else {
                console.log('✅ Using real or smart address')
              }
            }
          }
        }, 1000)
      }
    }

  } catch (error) {
    console.error('❌ Debug Error:', error.message)
  }
}

// Run debug
debugRealCustomerData().catch(console.error)
