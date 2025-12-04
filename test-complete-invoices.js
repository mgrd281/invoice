#!/usr/bin/env node

// Test complete invoices with email and address
async function testCompleteInvoices() {
  console.log('🎯 Test: Complete Invoices with Email and Address\n')

  try {
    // Test with different orders to see complete invoice generation
    const testOrders = [
      '7449395200267', // #3204 - Has real Lisboa data
      '7611177894155', // #3307 - Germany, no real data
      '7598034878731'  // #3303 - Switzerland, no real data
    ]
    
    console.log('🔍 Testing complete invoice generation...\n')
    
    for (let i = 0; i < testOrders.length; i++) {
      const orderId = testOrders[i]
      console.log(`📋 Testing Order ${i + 1}: ${orderId}`)
      
      const response = await fetch(`http://127.0.0.1:51539/api/shopify/move-to-invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderIds: [orderId]
        })
      })
      
      console.log(`   Response Status: ${response.status}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log(`   Success: ${result.success}`)
        console.log(`   Imported: ${result.imported}`)
      }
      
      console.log('')
    }
    
    // Wait for processing
    console.log('⏳ Waiting for processing...\n')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Check results
    console.log('📊 Checking complete invoice results...\n')
    
    const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
    if (invoicesResponse.ok) {
      const invoicesData = await invoicesResponse.json()
      
      // Find the most recent invoices for our test orders
      const recentInvoices = invoicesData.invoices?.filter(inv => 
        testOrders.includes(inv.shopifyOrderId?.toString())
      ).slice(0, 6) // Get the most recent ones
      
      if (recentInvoices && recentInvoices.length > 0) {
        console.log(`✅ Found ${recentInvoices.length} test invoices\n`)
        
        recentInvoices.forEach((invoice, index) => {
          console.log(`📄 Invoice ${index + 1}: ${invoice.number}`)
          console.log(`   Order: ${invoice.shopifyOrderNumber} (${invoice.shopifyOrderId})`)
          console.log(`   Customer Name: "${invoice.customerName}"`)
          console.log(`   Email: "${invoice.customerEmail}"`)
          console.log(`   Address: "${invoice.customerAddress}"`)
          console.log(`   City: "${invoice.customerCity}"`)
          console.log(`   ZIP: "${invoice.customerZip}"`)
          console.log(`   Country: "${invoice.customerCountry}"`)
          
          // Analysis of completeness
          console.log('\n   📊 Completeness Analysis:')
          
          // Check if has email
          if (invoice.customerEmail && invoice.customerEmail.trim() !== '') {
            if (invoice.customerEmail.includes('@kunde-service') || 
                invoice.customerEmail.includes('@cliente-service') || 
                invoice.customerEmail.includes('@customer-service')) {
              console.log('   ✅ Email: Professional email generated')
            } else {
              console.log('   ✅ Email: Real email from Shopify')
            }
          } else {
            console.log('   ❌ Email: Missing')
          }
          
          // Check if has complete address
          const hasCompleteAddress = invoice.customerAddress && 
                                   invoice.customerCity && 
                                   invoice.customerZip && 
                                   invoice.customerCountry
          
          if (hasCompleteAddress) {
            console.log('   ✅ Address: Complete address available')
            
            // Check if it's real data
            if (invoice.customerCity === 'Lisboa') {
              console.log('   🎯 Address: Contains REAL data (Lisboa)')
            } else if (invoice.customerAddress.includes('Business Center') || 
                      invoice.customerAddress.includes('Service')) {
              console.log('   ✅ Address: Professional address generated')
            } else {
              console.log('   ✅ Address: Real address from Shopify')
            }
          } else {
            console.log('   ❌ Address: Incomplete')
          }
          
          // Check country-specific features
          if (invoice.customerCountry === 'Germany' && invoice.customerEmail?.includes('@kunde-service.de')) {
            console.log('   🇩🇪 German localization: ✅')
          } else if (invoice.customerCountry === 'Switzerland' && invoice.customerEmail?.includes('@kunde-service.ch')) {
            console.log('   🇨🇭 Swiss localization: ✅')
          } else if (invoice.customerCountry === 'Portugal' && invoice.customerEmail?.includes('@cliente-service.pt')) {
            console.log('   🇵🇹 Portuguese localization: ✅')
          }
          
          console.log('')
        })
        
        // Summary
        console.log('🎯 SUMMARY:')
        
        const withEmail = recentInvoices.filter(inv => inv.customerEmail && inv.customerEmail.trim() !== '').length
        const withCompleteAddress = recentInvoices.filter(inv => 
          inv.customerAddress && inv.customerCity && inv.customerZip && inv.customerCountry
        ).length
        const withRealData = recentInvoices.filter(inv => 
          inv.customerCity === 'Lisboa' || inv.customerCity.includes('Real')
        ).length
        
        console.log(`   Invoices with Email: ${withEmail}/${recentInvoices.length}`)
        console.log(`   Invoices with Complete Address: ${withCompleteAddress}/${recentInvoices.length}`)
        console.log(`   Invoices with Real Data: ${withRealData}/${recentInvoices.length}`)
        
        if (withEmail === recentInvoices.length && withCompleteAddress === recentInvoices.length) {
          console.log('\n🎉 SUCCESS: All invoices have complete email and address!')
        } else {
          console.log('\n⚠️ Some invoices are missing email or address data')
        }
        
        if (withRealData > 0) {
          console.log('✅ Real data extraction working for some orders')
        }
        
      } else {
        console.log('❌ No test invoices found')
      }
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testCompleteInvoices().catch(console.error)
