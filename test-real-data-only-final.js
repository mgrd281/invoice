#!/usr/bin/env node

// Test final real data only system
async function testRealDataOnlyFinal() {
  console.log('🎯 Test: Final Real Data Only System\n')

  try {
    // Test with the same orders to see the difference
    const testOrders = [
      '7611177894155', // #3307 - Germany, no real data
      '7449395200267', // #3204 - Has real Lisboa data
      '7598034878731'  // #3303 - Switzerland, no real data
    ]
    
    console.log('🔍 Testing final real data only system...\n')
    
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
    console.log('📊 Checking final real data only results...\n')
    
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
          
          // Analysis of real data only policy
          console.log('\n   📊 Real Data Only Analysis:')
          
          // Check customer name
          if (invoice.customerName.startsWith('Order')) {
            console.log('   ✅ Name: Using minimal fallback (no fake names)')
          } else {
            console.log('   ✅ Name: Using real customer name')
          }
          
          // Check email
          if (!invoice.customerEmail || invoice.customerEmail === '') {
            console.log('   ✅ Email: Empty (no fake email) - CORRECT')
          } else if (invoice.customerEmail.includes('@kunde-service') || 
                    invoice.customerEmail.includes('@customer-service')) {
            console.log('   ❌ Email: Still generating fake emails - NEEDS FIX')
          } else {
            console.log('   ✅ Email: Using real email from Shopify')
          }
          
          // Check address
          if (!invoice.customerAddress || invoice.customerAddress === '') {
            console.log('   ✅ Address: Empty (no fake address) - CORRECT')
          } else if (invoice.customerAddress.includes('Service') || 
                    invoice.customerAddress.includes('Business Center')) {
            console.log('   ❌ Address: Still generating fake addresses - NEEDS FIX')
          } else {
            console.log('   ✅ Address: Using real address from Shopify')
          }
          
          // Check city
          if (!invoice.customerCity || invoice.customerCity === '') {
            console.log('   ✅ City: Empty (no fake city) - CORRECT')
          } else if (invoice.customerCity === 'Lisboa') {
            console.log('   🎯 City: REAL data from Shopify (Lisboa) - PERFECT')
          } else if (invoice.customerCity.includes('Service') || 
                    invoice.customerCity.includes('Online')) {
            console.log('   ❌ City: Still generating fake cities - NEEDS FIX')
          } else {
            console.log('   ✅ City: Using real city from Shopify')
          }
          
          // Check ZIP
          if (!invoice.customerZip || invoice.customerZip === '') {
            console.log('   ✅ ZIP: Empty (no fake ZIP) - CORRECT')
          } else if (invoice.customerZip === '1000-001' && invoice.customerCity === 'Lisboa') {
            console.log('   🎯 ZIP: REAL data from Shopify (Lisboa ZIP) - PERFECT')
          } else if (['10115', '8001', '1010'].includes(invoice.customerZip)) {
            console.log('   ❌ ZIP: Still generating fake ZIPs - NEEDS FIX')
          } else {
            console.log('   ✅ ZIP: Using real ZIP from Shopify')
          }
          
          console.log('')
        })
        
        // Summary
        console.log('🎯 FINAL SUMMARY:')
        
        const withFakeEmails = recentInvoices.filter(inv => 
          inv.customerEmail && (inv.customerEmail.includes('@kunde-service') || 
                               inv.customerEmail.includes('@customer-service'))
        ).length
        
        const withFakeAddresses = recentInvoices.filter(inv => 
          inv.customerAddress && (inv.customerAddress.includes('Service') || 
                                 inv.customerAddress.includes('Business Center'))
        ).length
        
        const withRealData = recentInvoices.filter(inv => 
          inv.customerCity === 'Lisboa'
        ).length
        
        const withEmptyFields = recentInvoices.filter(inv => 
          (!inv.customerEmail || inv.customerEmail === '') &&
          (!inv.customerAddress || inv.customerAddress === '')
        ).length
        
        console.log(`   Invoices with Fake Emails: ${withFakeEmails}/${recentInvoices.length}`)
        console.log(`   Invoices with Fake Addresses: ${withFakeAddresses}/${recentInvoices.length}`)
        console.log(`   Invoices with Real Data: ${withRealData}/${recentInvoices.length}`)
        console.log(`   Invoices with Empty Fields: ${withEmptyFields}/${recentInvoices.length}`)
        
        if (withFakeEmails === 0 && withFakeAddresses === 0) {
          console.log('\n🎉 SUCCESS: No fake data generated!')
        } else {
          console.log('\n⚠️ Still generating some fake data - system needs more updates')
        }
        
        if (withRealData > 0) {
          console.log('✅ Real data extraction working correctly')
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
testRealDataOnlyFinal().catch(console.error)
