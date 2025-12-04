#!/usr/bin/env node

// Test enhanced customer data retrieval
async function testEnhancedCustomerData() {
  console.log('🔍 Test: Enhanced Customer Data Retrieval\n')

  try {
    // Test 1: Test the enhanced conversion with customer lookup
    console.log('1️⃣ Testing enhanced conversion with customer lookup...')
    
    const testOrderId = '7611177894155'
    const response = await fetch(`http://127.0.0.1:51539/api/shopify/move-to-invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderIds: [testOrderId]
      })
    })
    
    console.log('📊 Enhanced Conversion Response Status:', response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log('📋 Enhanced Conversion Result:', result)
      
      if (result.results && result.results.length > 0) {
        const firstResult = result.results[0]
        console.log('\n📄 Enhanced Result Details:')
        console.log('   Order ID:', firstResult.orderId)
        console.log('   Success:', firstResult.success)
        console.log('   Invoice:', firstResult.invoiceNumber)
        
        // Check the created invoice
        if (firstResult.success && firstResult.invoiceNumber) {
          console.log('\n2️⃣ Checking created invoice for enhanced customer data...')
          
          const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
          if (invoicesResponse.ok) {
            const invoicesData = await invoicesResponse.json()
            const createdInvoice = invoicesData.invoices?.find(inv => 
              inv.number === firstResult.invoiceNumber
            )
            
            if (createdInvoice) {
              console.log('✅ Found created invoice:', createdInvoice.number)
              console.log('\n📋 Enhanced Customer Data in Invoice:')
              console.log('   Customer Name:', `"${createdInvoice.customerName || 'MISSING'}"`)
              console.log('   Company Name:', `"${createdInvoice.customerCompanyName || 'MISSING'}"`)
              console.log('   Email:', `"${createdInvoice.customerEmail || 'MISSING'}"`)
              console.log('   Address:', `"${createdInvoice.customerAddress || 'MISSING'}"`)
              console.log('   City:', `"${createdInvoice.customerCity || 'MISSING'}"`)
              console.log('   ZIP:', `"${createdInvoice.customerZip || 'MISSING'}"`)
              console.log('   Country:', `"${createdInvoice.customerCountry || 'MISSING'}"`)
              
              // Check if we have any real customer data now
              const hasRealData = (
                (createdInvoice.customerName && !createdInvoice.customerName.includes('Shopify Kunde')) ||
                (createdInvoice.customerEmail && !createdInvoice.customerEmail.includes('placeholder')) ||
                (createdInvoice.customerAddress && createdInvoice.customerAddress.trim() !== '') ||
                (createdInvoice.customerCity && createdInvoice.customerCity.trim() !== '')
              )
              
              if (hasRealData) {
                console.log('\n🎉 SUCCESS: Real customer data found!')
              } else {
                console.log('\n⚠️ Still using fallback data - no real customer info available')
              }
            }
          }
        }
      }
    } else {
      const errorText = await response.text()
      console.log('❌ Enhanced conversion failed:', errorText)
    }
    
    // Test 2: Direct customer API test
    console.log('\n3️⃣ Testing direct customer API access...')
    
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Try to get all customers to see if any have data
    const customersUrl = `https://${shopDomain}/admin/api/${apiVersion}/customers.json?limit=10`
    console.log('🌐 Fetching customers:', customersUrl)
    
    const customersResponse = await fetch(customersUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (customersResponse.ok) {
      const customersData = await customersResponse.json()
      console.log(`📊 Found ${customersData.customers?.length || 0} customers`)
      
      if (customersData.customers && customersData.customers.length > 0) {
        console.log('\n👥 Customer Analysis:')
        customersData.customers.slice(0, 5).forEach((customer, index) => {
          console.log(`\n   Customer ${index + 1}: ID ${customer.id}`)
          console.log(`      Name: "${customer.first_name || 'NULL'} ${customer.last_name || 'NULL'}"`)
          console.log(`      Email: "${customer.email || 'NULL'}"`)
          console.log(`      Phone: "${customer.phone || 'NULL'}"`)
          console.log(`      State: ${customer.state}`)
          console.log(`      Orders Count: ${customer.orders_count || 0}`)
          console.log(`      Addresses: ${customer.addresses?.length || 0}`)
          
          const hasPersonalData = customer.first_name || customer.last_name || customer.email || customer.phone
          console.log(`      Has Personal Data: ${hasPersonalData ? '✅ YES' : '❌ NO'}`)
          
          if (customer.addresses && customer.addresses.length > 0) {
            console.log(`      Address 1: "${customer.addresses[0].address1 || 'NULL'}, ${customer.addresses[0].city || 'NULL'}"`)
          }
        })
      } else {
        console.log('❌ No customers found in store')
      }
    } else {
      console.log('❌ Failed to fetch customers:', customersResponse.status)
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testEnhancedCustomerData().catch(console.error)
