#!/usr/bin/env node

// Test minimal address generation
async function testMinimalAddress() {
  console.log('🎯 Test: Minimal Address Generation\n')

  try {
    // Test with Order #3307 that has no real data
    const orderId = '7611177894155' // #3307
    
    console.log(`📋 Testing minimal address generation for Order #3307 (${orderId})...`)
    
    const response = await fetch(`http://127.0.0.1:51539/api/shopify/move-to-invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderIds: [orderId]
      })
    })
    
    console.log(`Response Status: ${response.status}`)
    
    if (response.ok) {
      const result = await response.json()
      console.log('Conversion Result:', result)
      
      // Wait for processing
      console.log('\n⏳ Waiting for processing...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check the created invoice
      const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        const createdInvoice = invoicesData.invoices?.find(inv => 
          inv.shopifyOrderId?.toString() === orderId
        )
        
        if (createdInvoice) {
          console.log('\n📄 Created Invoice Analysis:')
          console.log(`   Invoice: ${createdInvoice.number}`)
          console.log(`   Customer Name: "${createdInvoice.customerName}"`)
          console.log(`   Email: "${createdInvoice.customerEmail}"`)
          console.log(`   Address: "${createdInvoice.customerAddress}"`)
          console.log(`   City: "${createdInvoice.customerCity}"`)
          console.log(`   ZIP: "${createdInvoice.customerZip}"`)
          console.log(`   Country: "${createdInvoice.customerCountry}"`)
          
          console.log('\n🎯 ANALYSIS:')
          
          // Check if address is now showing
          if (createdInvoice.customerAddress && createdInvoice.customerAddress.trim() !== '') {
            console.log('✅ Address: Now showing minimal address')
            if (createdInvoice.customerAddress === 'Digital Customer') {
              console.log('✅ Address Type: Correct minimal address for Germany')
            }
          } else {
            console.log('❌ Address: Still empty')
          }
          
          // Check city
          if (createdInvoice.customerCity && createdInvoice.customerCity.trim() !== '') {
            console.log('✅ City: Now showing minimal city')
            if (createdInvoice.customerCity === 'Online') {
              console.log('✅ City Type: Correct minimal city')
            }
          } else {
            console.log('❌ City: Still empty')
          }
          
          // Check ZIP
          if (createdInvoice.customerZip && createdInvoice.customerZip.trim() !== '') {
            console.log('✅ ZIP: Now showing minimal ZIP')
            if (createdInvoice.customerZip === '00000') {
              console.log('✅ ZIP Type: Correct minimal ZIP for Germany')
            }
          } else {
            console.log('❌ ZIP: Still empty')
          }
          
          // Check country
          if (createdInvoice.customerCountry === 'Germany') {
            console.log('✅ Country: Correct (Germany)')
          } else {
            console.log(`❌ Country: Unexpected (${createdInvoice.customerCountry})`)
          }
          
          console.log('\n📊 SUMMARY:')
          const hasCompleteAddress = createdInvoice.customerAddress && 
                                   createdInvoice.customerCity && 
                                   createdInvoice.customerZip && 
                                   createdInvoice.customerCountry
          
          if (hasCompleteAddress) {
            console.log('🎉 SUCCESS: Invoice now has complete address!')
            console.log('📍 Full Address:')
            console.log(`   ${createdInvoice.customerAddress}`)
            console.log(`   ${createdInvoice.customerZip} ${createdInvoice.customerCity}`)
            console.log(`   ${createdInvoice.customerCountry}`)
          } else {
            console.log('⚠️ Address still incomplete')
          }
          
        } else {
          console.log('❌ Created invoice not found')
        }
      }
    } else {
      console.log('❌ Failed to convert order')
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testMinimalAddress().catch(console.error)
