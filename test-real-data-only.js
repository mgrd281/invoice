#!/usr/bin/env node

// Test real data extraction only
async function testRealDataOnly() {
  console.log('🎯 Test: Real Data Extraction Only\n')

  try {
    // Test with orders that have some real data vs orders with no real data
    const testOrders = [
      '7449395200267', // #3204 - Has real province data (Lisboa)
      '7611177894155', // #3307 - No real data
      '7598034878731'  // #3303 - No real data
    ]

    console.log('🔍 Testing real data extraction with different orders...\n')

    for (let i = 0; i < testOrders.length; i++) {
      const orderId = testOrders[i]
      console.log(`📋 Testing Order ${i + 1}: ${orderId}`)

      const response = await fetch(`http://localhost:3000/api/shopify/move-to-invoices`, {
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
    console.log('📊 Checking real data extraction results...\n')

    const invoicesResponse = await fetch('http://localhost:3000/api/invoices')
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

          // Analysis of data quality
          console.log('\n   📊 Data Analysis:')

          // Check customer name
          if (invoice.customerName.startsWith('Order')) {
            console.log('   ✅ Name: Using minimal fallback (no fake names)')
          } else if (invoice.customerName.includes('Kunde') || invoice.customerName.includes('Customer')) {
            console.log('   ⚠️ Name: Still using generated names')
          } else {
            console.log('   ✅ Name: Using real customer name')
          }

          // Check email
          if (!invoice.customerEmail || invoice.customerEmail === '') {
            console.log('   ✅ Email: Empty (no fake email generated)')
          } else if (invoice.customerEmail.includes('placeholder')) {
            console.log('   ⚠️ Email: Still using placeholder email')
          } else {
            console.log('   ✅ Email: Using real email')
          }

          // Check address
          if (!invoice.customerAddress || invoice.customerAddress === '') {
            console.log('   ✅ Address: Empty (no fake address generated)')
          } else if (invoice.customerAddress.includes('straße') || invoice.customerAddress.includes('gasse')) {
            console.log('   ⚠️ Address: Still using generated address')
          } else {
            console.log('   ✅ Address: Using real address data')
          }

          // Check city
          if (!invoice.customerCity || invoice.customerCity === '') {
            console.log('   ✅ City: Empty (no fake city generated)')
          } else if (['Berlin', 'München', 'Hamburg', 'Stuttgart'].includes(invoice.customerCity)) {
            console.log('   ⚠️ City: Still using generated city')
          } else {
            console.log('   ✅ City: Using real city data')
          }

          // Special check for order #3204 (should have Lisboa)
          if (invoice.shopifyOrderId?.toString() === '7449395200267') {
            if (invoice.customerCity === 'Lisboa') {
              console.log('   🎯 PERFECT: Order #3204 shows real Lisboa data!')
            } else {
              console.log('   ❌ ISSUE: Order #3204 should show Lisboa but shows:', invoice.customerCity)
            }
          }

          console.log('')
        })

        // Summary
        console.log('🎯 SUMMARY:')

        const hasRealDataInvoices = recentInvoices.filter(inv =>
          inv.customerCity === 'Lisboa' ||
          (!inv.customerName.includes('Kunde') && !inv.customerName.startsWith('Order'))
        ).length

        const hasEmptyFields = recentInvoices.filter(inv =>
          !inv.customerEmail || inv.customerEmail === '' ||
          !inv.customerAddress || inv.customerAddress === ''
        ).length

        const hasGeneratedData = recentInvoices.filter(inv =>
          inv.customerAddress.includes('straße') ||
          inv.customerEmail.includes('placeholder')
        ).length

        console.log(`   Real data invoices: ${hasRealDataInvoices}/${recentInvoices.length}`)
        console.log(`   Empty fields (good): ${hasEmptyFields}/${recentInvoices.length}`)
        console.log(`   Generated data (bad): ${hasGeneratedData}/${recentInvoices.length}`)

        if (hasGeneratedData === 0) {
          console.log('\n🎉 SUCCESS: No fake data generated!')
        } else {
          console.log('\n⚠️ Still generating some fake data')
        }

        if (hasRealDataInvoices > 0) {
          console.log('✅ Real data extraction working for some orders')
        } else {
          console.log('❌ No real data extracted from any order')
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
testRealDataOnly().catch(console.error)
