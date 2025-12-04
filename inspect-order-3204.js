#!/usr/bin/env node

// Inspect order #3204 with real address data
async function inspectOrder3204() {
  console.log('🔍 Inspecting Order #3204 with Real Address Data\n')

  try {
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // First, find order #3204
    console.log('1️⃣ Finding order #3204...')
    
    const searchUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=250&status=any&name=3204`
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (!searchResponse.ok) {
      console.log('❌ Failed to search for order:', searchResponse.status)
      return
    }
    
    const searchData = await searchResponse.json()
    const order3204 = searchData.orders?.find(order => order.name === '#3204')
    
    if (!order3204) {
      console.log('❌ Order #3204 not found')
      return
    }
    
    console.log('✅ Found order #3204!')
    console.log(`   Order ID: ${order3204.id}`)
    console.log(`   Created: ${order3204.created_at}`)
    console.log(`   Total: ${order3204.total_price} ${order3204.currency}`)
    console.log(`   Financial Status: ${order3204.financial_status}`)
    
    // Get full order details
    console.log('\n2️⃣ Getting full order details...')
    
    const orderUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders/${order3204.id}.json`
    
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (!orderResponse.ok) {
      console.log('❌ Failed to get order details:', orderResponse.status)
      return
    }
    
    const orderData = await orderResponse.json()
    const order = orderData.order
    
    console.log('\n3️⃣ Analyzing real address data...')
    
    // Analyze billing address
    if (order.billing_address) {
      console.log('\n📮 Billing Address:')
      const billing = order.billing_address
      
      console.log(`   First Name: "${billing.first_name || 'NULL'}"`)
      console.log(`   Last Name: "${billing.last_name || 'NULL'}"`)
      console.log(`   Name: "${billing.name || 'NULL'}"`)
      console.log(`   Company: "${billing.company || 'NULL'}"`)
      console.log(`   Address1: "${billing.address1 || 'NULL'}"`)
      console.log(`   Address2: "${billing.address2 || 'NULL'}"`)
      console.log(`   City: "${billing.city || 'NULL'}"`)
      console.log(`   Province: "${billing.province || 'NULL'}"`)
      console.log(`   ZIP: "${billing.zip || 'NULL'}"`)
      console.log(`   Country: "${billing.country || 'NULL'}"`)
      console.log(`   Country Code: "${billing.country_code || 'NULL'}"`)
      console.log(`   Phone: "${billing.phone || 'NULL'}"`)
      
      // Identify real fields
      const realBillingFields = []
      if (billing.first_name && billing.first_name !== 'NULL' && billing.first_name.trim() !== '') realBillingFields.push('first_name')
      if (billing.last_name && billing.last_name !== 'NULL' && billing.last_name.trim() !== '') realBillingFields.push('last_name')
      if (billing.name && billing.name !== 'NULL' && billing.name.trim() !== '') realBillingFields.push('name')
      if (billing.company && billing.company !== 'NULL' && billing.company.trim() !== '') realBillingFields.push('company')
      if (billing.address1 && billing.address1 !== 'NULL' && billing.address1.trim() !== '') realBillingFields.push('address1')
      if (billing.address2 && billing.address2 !== 'NULL' && billing.address2.trim() !== '') realBillingFields.push('address2')
      if (billing.city && billing.city !== 'NULL' && billing.city.trim() !== '') realBillingFields.push('city')
      if (billing.province && billing.province !== 'NULL' && billing.province.trim() !== '') realBillingFields.push('province')
      if (billing.zip && billing.zip !== 'NULL' && billing.zip.trim() !== '') realBillingFields.push('zip')
      if (billing.phone && billing.phone !== 'NULL' && billing.phone.trim() !== '') realBillingFields.push('phone')
      
      console.log(`\n   🎯 Real billing fields: ${realBillingFields.join(', ')}`)
    }
    
    // Analyze shipping address
    if (order.shipping_address) {
      console.log('\n🚚 Shipping Address:')
      const shipping = order.shipping_address
      
      console.log(`   First Name: "${shipping.first_name || 'NULL'}"`)
      console.log(`   Last Name: "${shipping.last_name || 'NULL'}"`)
      console.log(`   Name: "${shipping.name || 'NULL'}"`)
      console.log(`   Company: "${shipping.company || 'NULL'}"`)
      console.log(`   Address1: "${shipping.address1 || 'NULL'}"`)
      console.log(`   Address2: "${shipping.address2 || 'NULL'}"`)
      console.log(`   City: "${shipping.city || 'NULL'}"`)
      console.log(`   Province: "${shipping.province || 'NULL'}"`)
      console.log(`   ZIP: "${shipping.zip || 'NULL'}"`)
      console.log(`   Country: "${shipping.country || 'NULL'}"`)
      console.log(`   Country Code: "${shipping.country_code || 'NULL'}"`)
      console.log(`   Phone: "${shipping.phone || 'NULL'}"`)
      
      // Identify real fields
      const realShippingFields = []
      if (shipping.first_name && shipping.first_name !== 'NULL' && shipping.first_name.trim() !== '') realShippingFields.push('first_name')
      if (shipping.last_name && shipping.last_name !== 'NULL' && shipping.last_name.trim() !== '') realShippingFields.push('last_name')
      if (shipping.name && shipping.name !== 'NULL' && shipping.name.trim() !== '') realShippingFields.push('name')
      if (shipping.company && shipping.company !== 'NULL' && shipping.company.trim() !== '') realShippingFields.push('company')
      if (shipping.address1 && shipping.address1 !== 'NULL' && shipping.address1.trim() !== '') realShippingFields.push('address1')
      if (shipping.address2 && shipping.address2 !== 'NULL' && shipping.address2.trim() !== '') realShippingFields.push('address2')
      if (shipping.city && shipping.city !== 'NULL' && shipping.city.trim() !== '') realShippingFields.push('city')
      if (shipping.province && shipping.province !== 'NULL' && shipping.province.trim() !== '') realShippingFields.push('province')
      if (shipping.zip && shipping.zip !== 'NULL' && shipping.zip.trim() !== '') realShippingFields.push('zip')
      if (shipping.phone && shipping.phone !== 'NULL' && shipping.phone.trim() !== '') realShippingFields.push('phone')
      
      console.log(`\n   🎯 Real shipping fields: ${realShippingFields.join(', ')}`)
    }
    
    // Analyze customer address
    if (order.customer && order.customer.default_address) {
      console.log('\n👤 Customer Default Address:')
      const customer = order.customer.default_address
      
      console.log(`   First Name: "${customer.first_name || 'NULL'}"`)
      console.log(`   Last Name: "${customer.last_name || 'NULL'}"`)
      console.log(`   Name: "${customer.name || 'NULL'}"`)
      console.log(`   Company: "${customer.company || 'NULL'}"`)
      console.log(`   Address1: "${customer.address1 || 'NULL'}"`)
      console.log(`   Address2: "${customer.address2 || 'NULL'}"`)
      console.log(`   City: "${customer.city || 'NULL'}"`)
      console.log(`   Province: "${customer.province || 'NULL'}"`)
      console.log(`   ZIP: "${customer.zip || 'NULL'}"`)
      console.log(`   Country: "${customer.country || 'NULL'}"`)
      console.log(`   Country Code: "${customer.country_code || 'NULL'}"`)
      console.log(`   Phone: "${customer.phone || 'NULL'}"`)
      
      // Identify real fields
      const realCustomerFields = []
      if (customer.first_name && customer.first_name !== 'NULL' && customer.first_name.trim() !== '') realCustomerFields.push('first_name')
      if (customer.last_name && customer.last_name !== 'NULL' && customer.last_name.trim() !== '') realCustomerFields.push('last_name')
      if (customer.name && customer.name !== 'NULL' && customer.name.trim() !== '') realCustomerFields.push('name')
      if (customer.company && customer.company !== 'NULL' && customer.company.trim() !== '') realCustomerFields.push('company')
      if (customer.address1 && customer.address1 !== 'NULL' && customer.address1.trim() !== '') realCustomerFields.push('address1')
      if (customer.address2 && customer.address2 !== 'NULL' && customer.address2.trim() !== '') realCustomerFields.push('address2')
      if (customer.city && customer.city !== 'NULL' && customer.city.trim() !== '') realCustomerFields.push('city')
      if (customer.province && customer.province !== 'NULL' && customer.province.trim() !== '') realCustomerFields.push('province')
      if (customer.zip && customer.zip !== 'NULL' && customer.zip.trim() !== '') realCustomerFields.push('zip')
      if (customer.phone && customer.phone !== 'NULL' && customer.phone.trim() !== '') realCustomerFields.push('phone')
      
      console.log(`\n   🎯 Real customer fields: ${realCustomerFields.join(', ')}`)
    }
    
    // Test conversion with this order
    console.log('\n4️⃣ Testing conversion with this order...')
    
    const conversionResponse = await fetch(`http://127.0.0.1:51539/api/shopify/move-to-invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderIds: [order.id.toString()]
      })
    })
    
    console.log(`   Conversion Status: ${conversionResponse.status}`)
    
    if (conversionResponse.ok) {
      const conversionResult = await conversionResponse.json()
      console.log(`   Success: ${conversionResult.success}`)
      console.log(`   Imported: ${conversionResult.imported}`)
      
      if (conversionResult.results && conversionResult.results.length > 0) {
        const result = conversionResult.results[0]
        console.log(`   Invoice: ${result.invoiceNumber || 'Unknown'}`)
        
        // Check the created invoice
        setTimeout(async () => {
          const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
          if (invoicesResponse.ok) {
            const invoicesData = await invoicesResponse.json()
            const createdInvoice = invoicesData.invoices?.find(inv => 
              inv.shopifyOrderId?.toString() === order.id.toString()
            )
            
            if (createdInvoice) {
              console.log('\n5️⃣ Created invoice analysis:')
              console.log(`   Invoice: ${createdInvoice.number}`)
              console.log(`   Customer Name: "${createdInvoice.customerName}"`)
              console.log(`   Address: "${createdInvoice.customerAddress}"`)
              console.log(`   City: "${createdInvoice.customerCity}"`)
              console.log(`   ZIP: "${createdInvoice.customerZip}"`)
              console.log(`   Country: "${createdInvoice.customerCountry}"`)
              
              // Check if real data was used
              const usedRealData = (
                createdInvoice.customerAddress && 
                !createdInvoice.customerAddress.includes('straße') && 
                !createdInvoice.customerAddress.includes('gasse')
              )
              
              if (usedRealData) {
                console.log('   ✅ Real address data was used!')
              } else {
                console.log('   ❌ Generated address was used instead of real data')
              }
            }
          }
        }, 1000)
      }
    }

  } catch (error) {
    console.error('❌ Inspection Error:', error.message)
  }
}

// Run inspection
inspectOrder3204().catch(console.error)
