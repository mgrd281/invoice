#!/usr/bin/env node

// Test current orders shown in the interface
async function testCurrentOrders() {
  console.log('🔍 Test: Current Orders from Interface\n')

  try {
    // Test the specific orders shown in the interface
    const interfaceOrders = [
      '7611177894155', // #3307 - shown in interface
      '7610574536971', // #3306 - shown in interface  
      '7609695699211'  // #3305 - shown in interface
    ]
    
    console.log('🔍 Testing orders currently shown in interface...\n')
    
    // First, let's check what data is actually in these orders
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    for (let i = 0; i < interfaceOrders.length; i++) {
      const orderId = interfaceOrders[i]
      console.log(`📋 Checking Order ${i + 1}: ${orderId}`)
      
      // Get raw order data
      const orderUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders/${orderId}.json`
      
      const response = await fetch(orderUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const order = data.order
        
        console.log(`   Order Name: ${order.name}`)
        console.log(`   Customer ID: ${order.customer?.id}`)
        console.log(`   Customer Email: ${order.customer?.email || 'NULL'}`)
        console.log(`   Customer First Name: ${order.customer?.first_name || 'NULL'}`)
        console.log(`   Customer Last Name: ${order.customer?.last_name || 'NULL'}`)
        console.log(`   Billing Address:`)
        console.log(`      Name: ${order.billing_address?.name || 'NULL'}`)
        console.log(`      First Name: ${order.billing_address?.first_name || 'NULL'}`)
        console.log(`      Last Name: ${order.billing_address?.last_name || 'NULL'}`)
        console.log(`      Company: ${order.billing_address?.company || 'NULL'}`)
        console.log(`      Address1: ${order.billing_address?.address1 || 'NULL'}`)
        console.log(`      City: ${order.billing_address?.city || 'NULL'}`)
        console.log(`      ZIP: ${order.billing_address?.zip || 'NULL'}`)
        console.log(`      Country: ${order.billing_address?.country || 'NULL'}`)
        
        // Check for any real data
        const hasRealName = (order.customer?.first_name && order.customer.first_name !== 'NULL') ||
                           (order.customer?.last_name && order.customer.last_name !== 'NULL') ||
                           (order.billing_address?.name && order.billing_address.name !== 'NULL')
        
        const hasRealAddress = (order.billing_address?.address1 && order.billing_address.address1 !== 'NULL') ||
                              (order.billing_address?.city && order.billing_address.city !== 'NULL')
        
        const hasRealEmail = order.customer?.email && order.customer.email !== 'NULL'
        
        console.log(`   Has Real Name: ${hasRealName ? '✅ YES' : '❌ NO'}`)
        console.log(`   Has Real Address: ${hasRealAddress ? '✅ YES' : '❌ NO'}`)
        console.log(`   Has Real Email: ${hasRealEmail ? '✅ YES' : '❌ NO'}`)
        
      } else {
        console.log(`   ❌ Failed to fetch order: ${response.status}`)
      }
      
      console.log('')
    }
    
    // Now test the conversion with our updated system
    console.log('2️⃣ Testing conversion with updated system...\n')
    
    const testOrderId = interfaceOrders[0] // Test with #3307
    console.log(`Testing conversion of order: ${testOrderId}`)
    
    const conversionResponse = await fetch(`http://127.0.0.1:51539/api/shopify/move-to-invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderIds: [testOrderId]
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
            inv.shopifyOrderId?.toString() === testOrderId
          )
          
          if (createdInvoice) {
            console.log('\n3️⃣ Created Invoice Analysis:')
            console.log(`   Invoice: ${createdInvoice.number}`)
            console.log(`   Customer Name: "${createdInvoice.customerName}"`)
            console.log(`   Email: "${createdInvoice.customerEmail}"`)
            console.log(`   Address: "${createdInvoice.customerAddress}"`)
            console.log(`   City: "${createdInvoice.customerCity}"`)
            console.log(`   ZIP: "${createdInvoice.customerZip}"`)
            console.log(`   Country: "${createdInvoice.customerCountry}"`)
            
            console.log('\n🎯 ANALYSIS:')
            
            if (createdInvoice.customerName.startsWith('Order')) {
              console.log('✅ Name: Using new minimal fallback system')
            } else if (createdInvoice.customerName.includes('Shopify Kunde')) {
              console.log('❌ Name: Still using old system - update not applied')
            } else {
              console.log('✅ Name: Using real customer name')
            }
            
            if (!createdInvoice.customerEmail || createdInvoice.customerEmail === '') {
              console.log('✅ Email: Empty (no fake email) - new system working')
            } else if (createdInvoice.customerEmail.includes('placeholder')) {
              console.log('❌ Email: Still using placeholder - update not applied')
            } else {
              console.log('✅ Email: Using real email')
            }
            
            if (!createdInvoice.customerAddress || createdInvoice.customerAddress === '') {
              console.log('✅ Address: Empty (no fake address) - new system working')
            } else if (createdInvoice.customerAddress.includes('straße')) {
              console.log('❌ Address: Still using generated address - update not applied')
            } else {
              console.log('✅ Address: Using real address')
            }
            
          } else {
            console.log('❌ Created invoice not found')
          }
        }
      }, 2000)
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testCurrentOrders().catch(console.error)
