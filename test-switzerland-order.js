#!/usr/bin/env node

// Test Switzerland order conversion
async function testSwitzerlandOrder() {
  console.log('🇨🇭 Test: Switzerland Order Conversion\n')

  try {
    // Test the Switzerland order we found earlier: #3303
    const switzerlandOrderId = '7598034878731'
    
    console.log('1️⃣ Testing Switzerland order conversion...')
    console.log('Order ID:', switzerlandOrderId)
    
    const response = await fetch(`http://127.0.0.1:51539/api/shopify/move-to-invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderIds: [switzerlandOrderId]
      })
    })
    
    console.log('📊 Conversion Response Status:', response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log('📋 Conversion Result:', result)
      
      if (result.results && result.results.length > 0) {
        const firstResult = result.results[0]
        console.log('\n📄 Switzerland Result Details:')
        console.log('   Order ID:', firstResult.orderId)
        console.log('   Success:', firstResult.success)
        console.log('   Invoice:', firstResult.invoiceNumber || 'Not available')
        
        // Check the created invoice
        if (firstResult.success) {
          console.log('\n2️⃣ Checking created Switzerland invoice...')
          
          setTimeout(async () => {
            const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
            if (invoicesResponse.ok) {
              const invoicesData = await invoicesResponse.json()
              
              // Find the most recent invoice for this order
              const swissInvoice = invoicesData.invoices?.find(inv => 
                inv.shopifyOrderId?.toString() === switzerlandOrderId
              )
              
              if (swissInvoice) {
                console.log('✅ Found Switzerland invoice:', swissInvoice.number)
                console.log('\n📋 Switzerland Customer Data:')
                console.log('   Customer Name:', `"${swissInvoice.customerName || 'MISSING'}"`)
                console.log('   Email:', `"${swissInvoice.customerEmail || 'MISSING'}"`)
                console.log('   Address:', `"${swissInvoice.customerAddress || 'MISSING'}"`)
                console.log('   City:', `"${swissInvoice.customerCity || 'MISSING'}"`)
                console.log('   ZIP:', `"${swissInvoice.customerZip || 'MISSING'}"`)
                console.log('   Country:', `"${swissInvoice.customerCountry || 'MISSING'}"`)
                
                // Check if Switzerland defaults were applied
                if (swissInvoice.customerCountry === 'Switzerland' && 
                    swissInvoice.customerAddress === 'Digitaler Kunde' &&
                    swissInvoice.customerCity === 'Online' &&
                    swissInvoice.customerZip === '0000') {
                  console.log('\n🎯 SUCCESS: Switzerland defaults applied correctly!')
                } else {
                  console.log('\n⚠️ Switzerland defaults may not have been applied')
                }
              } else {
                console.log('❌ Switzerland invoice not found')
              }
            }
          }, 1000)
        }
      }
    } else {
      const errorText = await response.text()
      console.log('❌ Conversion failed:', errorText)
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testSwitzerlandOrder().catch(console.error)
