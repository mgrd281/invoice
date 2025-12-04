#!/usr/bin/env node

// Test PII Masking Fix - Check if customer data is now visible
async function testPIIFix() {
  console.log('🧪 Test: PII Masking Fix Validation\n')

  try {
    console.log('🔍 Testing PII Masking fix with updated API calls...')
    
    // Test with the updated API that requests complete customer data
    const response = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=3&financial_status=any', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`Response Status: ${response.status}`)
    
    if (response.ok) {
      const result = await response.json()
      console.log('📊 Orders fetched:', result.orders?.length || 0)
      
      if (result.orders && result.orders.length > 0) {
        console.log('\n🔍 PII Masking Analysis for first 3 orders:')
        
        result.orders.slice(0, 3).forEach((order, index) => {
          console.log(`\n📋 Order ${index + 1}: ${order.name} (ID: ${order.id})`)
          console.log(`💰 Total: ${order.total_price} ${order.currency}`)
          
          // Check customer data
          console.log('\n👤 Customer Data Analysis:')
          const customerEmail = order.customer?.email || order.email
          const customerFirstName = order.customer?.first_name
          const customerLastName = order.customer?.last_name
          const customerPhone = order.customer?.phone
          
          console.log(`   Email: "${customerEmail}"`)
          console.log(`   First Name: "${customerFirstName}"`)
          console.log(`   Last Name: "${customerLastName}"`)
          console.log(`   Phone: "${customerPhone}"`)
          
          // Check for masking patterns
          const emailMasked = !customerEmail || customerEmail === 'undefined' || customerEmail.includes('noreply')
          const nameMasked = !customerFirstName || customerFirstName === 'undefined' || 
                           (!customerLastName || customerLastName === 'undefined')
          
          if (emailMasked && nameMasked) {
            console.log('   ❌ STATUS: Still MASKED (PII protection active)')
          } else if (emailMasked || nameMasked) {
            console.log('   ⚠️  STATUS: Partially MASKED (some data visible)')
          } else {
            console.log('   ✅ STATUS: NOT MASKED (full data visible)')
          }
          
          // Check address data
          console.log('\n🏠 Address Data Analysis:')
          
          // Billing address
          const billingAddr = order.billing_address
          if (billingAddr) {
            console.log('   Billing Address:')
            console.log(`     Name: "${billingAddr.first_name || 'N/A'} ${billingAddr.last_name || 'N/A'}"`)
            console.log(`     Address: "${billingAddr.address1 || 'N/A'}"`)
            console.log(`     City: "${billingAddr.city || 'N/A'}"`)
            console.log(`     ZIP: "${billingAddr.zip || 'N/A'}"`)
            console.log(`     Country: "${billingAddr.country || 'N/A'}"`)
            
            const billingMasked = !billingAddr.address1 || billingAddr.address1 === 'undefined'
            console.log(`     Status: ${billingMasked ? '❌ MASKED' : '✅ VISIBLE'}`)
          } else {
            console.log('   Billing Address: ❌ NOT PROVIDED')
          }
          
          // Shipping address
          const shippingAddr = order.shipping_address
          if (shippingAddr) {
            console.log('   Shipping Address:')
            console.log(`     Name: "${shippingAddr.first_name || 'N/A'} ${shippingAddr.last_name || 'N/A'}"`)
            console.log(`     Address: "${shippingAddr.address1 || 'N/A'}"`)
            console.log(`     City: "${shippingAddr.city || 'N/A'}"`)
            console.log(`     ZIP: "${shippingAddr.zip || 'N/A'}"`)
            console.log(`     Country: "${shippingAddr.country || 'N/A'}"`)
            
            const shippingMasked = !shippingAddr.address1 || shippingAddr.address1 === 'undefined'
            console.log(`     Status: ${shippingMasked ? '❌ MASKED' : '✅ VISIBLE'}`)
          } else {
            console.log('   Shipping Address: ❌ NOT PROVIDED')
          }
          
          // Default address
          const defaultAddr = order.customer?.default_address
          if (defaultAddr) {
            console.log('   Default Address:')
            console.log(`     Name: "${defaultAddr.first_name || 'N/A'} ${defaultAddr.last_name || 'N/A'}"`)
            console.log(`     Address: "${defaultAddr.address1 || 'N/A'}"`)
            console.log(`     City: "${defaultAddr.city || 'N/A'}"`)
            console.log(`     ZIP: "${defaultAddr.zip || 'N/A'}"`)
            console.log(`     Country: "${defaultAddr.country || 'N/A'}"`)
            
            const defaultMasked = !defaultAddr.address1 || defaultAddr.address1 === 'undefined'
            console.log(`     Status: ${defaultMasked ? '❌ MASKED' : '✅ VISIBLE'}`)
          } else {
            console.log('   Default Address: ❌ NOT PROVIDED')
          }
          
          // Test our address priority logic
          console.log('\n🎯 Address Priority Test (Billing → Shipping → Default):')
          const finalAddress1 = billingAddr?.address1 || shippingAddr?.address1 || defaultAddr?.address1
          const finalCity = billingAddr?.city || shippingAddr?.city || defaultAddr?.city || 
                           billingAddr?.province || shippingAddr?.province || defaultAddr?.province
          const finalZip = billingAddr?.zip || shippingAddr?.zip || defaultAddr?.zip
          const finalCountry = billingAddr?.country || shippingAddr?.country || defaultAddr?.country
          
          if (finalAddress1 || finalCity || finalZip) {
            const parts = []
            if (finalAddress1) parts.push(finalAddress1)
            if (finalZip && finalCity) parts.push(`${finalZip} ${finalCity}`)
            else if (finalCity) parts.push(finalCity)
            else if (finalZip) parts.push(finalZip)
            if (finalCountry && finalCountry !== 'Germany') parts.push(finalCountry)
            const formattedAddress = parts.join(', ')
            console.log(`   Final Address: "${formattedAddress}"`)
            console.log('   ✅ Address successfully extracted!')
          } else {
            console.log('   Final Address: "Keine Adresse"')
            console.log('   ⚠️  No address data available - will use fallback')
          }
        })
        
        // Overall assessment
        console.log('\n📊 OVERALL ASSESSMENT:')
        const hasAnyRealData = result.orders.some(order => 
          (order.customer?.email && order.customer.email !== 'undefined') ||
          (order.customer?.first_name && order.customer.first_name !== 'undefined') ||
          (order.billing_address?.address1 && order.billing_address.address1 !== 'undefined') ||
          (order.shipping_address?.address1 && order.shipping_address.address1 !== 'undefined')
        )
        
        if (hasAnyRealData) {
          console.log('🎉 SUCCESS: Some real customer data is now visible!')
          console.log('   → PII Masking has been partially or fully bypassed')
          console.log('   → The updated API calls are working')
        } else {
          console.log('❌ STILL MASKED: All customer data is still anonymized')
          console.log('   → PII Masking is still active')
          console.log('   → Follow the solution guide to fix Shopify settings')
        }
        
        console.log('\n📋 NEXT STEPS:')
        if (!hasAnyRealData) {
          console.log('1. ✅ Create new Shopify Private App with ALL scopes')
          console.log('2. ✅ Update access token in system')
          console.log('3. ✅ Disable PII masking in Shopify settings')
          console.log('4. ✅ Wait 24-48h for Shopify propagation')
          console.log('5. ✅ Re-run this test')
        } else {
          console.log('1. ✅ Test invoice generation with real data')
          console.log('2. ✅ Verify PDF downloads work correctly')
          console.log('3. ✅ Check address display in frontend')
        }
        
      } else {
        console.log('❌ No orders found')
      }
    } else {
      console.log('❌ Failed to fetch orders')
      const errorText = await response.text()
      console.log('Error:', errorText)
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testPIIFix().catch(console.error)
