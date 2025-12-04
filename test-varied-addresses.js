#!/usr/bin/env node

// Test varied address generation
async function testVariedAddresses() {
  console.log('🏠 Test: Varied Address Generation\n')

  try {
    // Test multiple different orders to see address variation
    const testOrders = [
      '7611177894155', // #3307 - Germany
      '7610574536971', // #3306 - Germany  
      '7609695699211', // #3305 - Germany
      '7598034878731', // #3303 - Switzerland
      '7598175158539'  // #3304 - Germany
    ]
    
    console.log('🔍 Testing address variation across different orders...\n')
    
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
        
        if (result.results && result.results.length > 0) {
          const invoiceNumber = result.results[0].invoiceNumber || 'Unknown'
          console.log(`   Invoice: ${invoiceNumber}`)
        }
      } else {
        console.log(`   ❌ Failed: ${response.status}`)
      }
      
      console.log('')
    }
    
    // Wait a moment for all invoices to be created
    console.log('⏳ Waiting for invoices to be processed...\n')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Now check the created invoices for address variation
    console.log('📊 Checking address variation in created invoices...\n')
    
    const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
    if (invoicesResponse.ok) {
      const invoicesData = await invoicesResponse.json()
      
      // Find the most recent invoices for our test orders
      const recentInvoices = invoicesData.invoices?.filter(inv => 
        testOrders.includes(inv.shopifyOrderId?.toString())
      ).slice(0, 10) // Get the most recent ones
      
      if (recentInvoices && recentInvoices.length > 0) {
        console.log(`✅ Found ${recentInvoices.length} test invoices`)
        
        const addressVariations = new Set()
        const cityVariations = new Set()
        const zipVariations = new Set()
        
        recentInvoices.forEach((invoice, index) => {
          console.log(`\n📄 Invoice ${index + 1}: ${invoice.number}`)
          console.log(`   Order: ${invoice.shopifyOrderNumber} (${invoice.shopifyOrderId})`)
          console.log(`   Customer: ${invoice.customerName}`)
          console.log(`   Address: "${invoice.customerAddress}"`)
          console.log(`   City: "${invoice.customerCity}"`)
          console.log(`   ZIP: "${invoice.customerZip}"`)
          console.log(`   Country: "${invoice.customerCountry}"`)
          
          // Collect variations
          if (invoice.customerAddress) addressVariations.add(invoice.customerAddress)
          if (invoice.customerCity) cityVariations.add(invoice.customerCity)
          if (invoice.customerZip) zipVariations.add(invoice.customerZip)
        })
        
        console.log('\n📊 Address Variation Analysis:')
        console.log(`   Unique Addresses: ${addressVariations.size}`)
        console.log(`   Unique Cities: ${cityVariations.size}`)
        console.log(`   Unique ZIP Codes: ${zipVariations.size}`)
        
        if (addressVariations.size > 1) {
          console.log('\n✅ SUCCESS: Address variation is working!')
          console.log('   Different addresses found:')
          Array.from(addressVariations).forEach((addr, i) => {
            console.log(`      ${i + 1}. "${addr}"`)
          })
        } else {
          console.log('\n❌ ISSUE: All addresses are the same')
          console.log(`   Address: "${Array.from(addressVariations)[0] || 'None'}"`)
        }
        
        if (cityVariations.size > 1) {
          console.log('\n✅ SUCCESS: City variation is working!')
          console.log('   Different cities found:')
          Array.from(cityVariations).forEach((city, i) => {
            console.log(`      ${i + 1}. "${city}"`)
          })
        } else {
          console.log('\n⚠️ All cities are the same')
          console.log(`   City: "${Array.from(cityVariations)[0] || 'None'}"`)
        }
        
        if (zipVariations.size > 1) {
          console.log('\n✅ SUCCESS: ZIP code variation is working!')
          console.log('   Different ZIP codes found:')
          Array.from(zipVariations).forEach((zip, i) => {
            console.log(`      ${i + 1}. "${zip}"`)
          })
        } else {
          console.log('\n⚠️ All ZIP codes are the same')
          console.log(`   ZIP: "${Array.from(zipVariations)[0] || 'None'}"`)
        }
        
      } else {
        console.log('❌ No test invoices found')
      }
    } else {
      console.log('❌ Failed to fetch invoices')
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testVariedAddresses().catch(console.error)
