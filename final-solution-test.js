#!/usr/bin/env node

// Final comprehensive solution test
async function finalSolutionTest() {
  console.log('🎯 Final Comprehensive Solution Test\n')

  try {
    // Test with multiple orders to see the complete solution
    const testOrders = [
      '7611177894155', // #3307 - Germany, customer_locale: de
      '7598034878731', // #3303 - Switzerland, customer_locale: de-DE
      '7598175158539'  // #3304 - Germany, customer_locale: de
    ]
    
    console.log('🔍 Testing comprehensive solution with multiple orders...\n')
    
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
    console.log('📊 Checking final results...\n')
    
    const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
    if (invoicesResponse.ok) {
      const invoicesData = await invoicesResponse.json()
      
      // Find the most recent invoices for our test orders
      const recentInvoices = invoicesData.invoices?.filter(inv => 
        testOrders.includes(inv.shopifyOrderId?.toString())
      ).slice(0, 6) // Get the most recent ones
      
      if (recentInvoices && recentInvoices.length > 0) {
        console.log(`✅ Found ${recentInvoices.length} test invoices\n`)
        
        const customerNames = new Set()
        const addresses = new Set()
        const cities = new Set()
        const countries = new Set()
        
        recentInvoices.forEach((invoice, index) => {
          console.log(`📄 Invoice ${index + 1}: ${invoice.number}`)
          console.log(`   Order: ${invoice.shopifyOrderNumber} (${invoice.shopifyOrderId})`)
          console.log(`   Customer Name: "${invoice.customerName}"`)
          console.log(`   Email: "${invoice.customerEmail}"`)
          console.log(`   Address: "${invoice.customerAddress}"`)
          console.log(`   City: "${invoice.customerCity}"`)
          console.log(`   ZIP: "${invoice.customerZip}"`)
          console.log(`   Country: "${invoice.customerCountry}"`)
          
          // Collect variations
          customerNames.add(invoice.customerName)
          addresses.add(invoice.customerAddress)
          cities.add(invoice.customerCity)
          countries.add(invoice.customerCountry)
          
          // Analysis
          const improvements = []
          
          if (invoice.customerName.includes('(DE)') || invoice.customerName.includes('(CH)')) {
            improvements.push('✅ Locale-based naming')
          }
          
          if (invoice.customerName.startsWith('Kunde') || invoice.customerName.startsWith('Customer')) {
            improvements.push('✅ Localized customer prefix')
          }
          
          if (!invoice.customerName.includes('Shopify')) {
            improvements.push('✅ Clean naming (no "Shopify")')
          }
          
          if (invoice.customerAddress && !invoice.customerAddress.includes('Digitaler')) {
            improvements.push('✅ Realistic address')
          }
          
          if (improvements.length > 0) {
            console.log(`   Improvements: ${improvements.join(', ')}`)
          }
          
          console.log('')
        })
        
        console.log('📊 Final Analysis:')
        console.log(`   Unique Customer Names: ${customerNames.size}`)
        console.log(`   Unique Addresses: ${addresses.size}`)
        console.log(`   Unique Cities: ${cities.size}`)
        console.log(`   Unique Countries: ${countries.size}`)
        
        console.log('\n🎯 Customer Names Found:')
        Array.from(customerNames).forEach((name, i) => {
          console.log(`   ${i + 1}. "${name}"`)
        })
        
        console.log('\n🏠 Addresses Found:')
        Array.from(addresses).forEach((addr, i) => {
          console.log(`   ${i + 1}. "${addr}"`)
        })
        
        console.log('\n🌍 Countries Found:')
        Array.from(countries).forEach((country, i) => {
          console.log(`   ${i + 1}. "${country}"`)
        })
        
        // Final assessment
        console.log('\n🎉 FINAL ASSESSMENT:')
        
        const hasLocalizedNames = Array.from(customerNames).some(name => 
          name.includes('(DE)') || name.includes('(CH)') || name.startsWith('Kunde') || name.startsWith('Customer')
        )
        
        const hasVariedAddresses = addresses.size > 1
        const hasVariedCities = cities.size > 1
        const hasCorrectCountries = Array.from(countries).includes('Germany') && Array.from(countries).includes('Switzerland')
        
        if (hasLocalizedNames) {
          console.log('✅ Localized customer names working')
        } else {
          console.log('❌ Customer names need improvement')
        }
        
        if (hasVariedAddresses) {
          console.log('✅ Address variation working')
        } else {
          console.log('❌ Address variation needs improvement')
        }
        
        if (hasVariedCities) {
          console.log('✅ City variation working')
        } else {
          console.log('❌ City variation needs improvement')
        }
        
        if (hasCorrectCountries) {
          console.log('✅ Country detection working')
        } else {
          console.log('❌ Country detection needs improvement')
        }
        
        const overallScore = [hasLocalizedNames, hasVariedAddresses, hasVariedCities, hasCorrectCountries].filter(Boolean).length
        console.log(`\n🏆 Overall Score: ${overallScore}/4`)
        
        if (overallScore >= 3) {
          console.log('🎉 SOLUTION IS WORKING WELL!')
        } else {
          console.log('⚠️ Solution needs more improvements')
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
finalSolutionTest().catch(console.error)
