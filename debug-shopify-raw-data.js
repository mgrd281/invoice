#!/usr/bin/env node

// Debug Shopify Raw Data - Check for PII masking and missing customer data
async function debugShopifyRawData() {
  console.log('🔍 DEBUG: Shopify Raw Data Analysis\n')

  try {
    const settings = {
      shopDomain: '45dv93-bk.myshopify.com',
      accessToken: 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER',
      apiVersion: '2024-01'
    }

    console.log('🏪 Shop Settings:')
    console.log(`   Domain: ${settings.shopDomain}`)
    console.log(`   Token: ${settings.accessToken.substring(0, 15)}...`)
    console.log(`   API Version: ${settings.apiVersion}`)

    // Test 1: Check shop info and permissions
    console.log('\n🔐 Test 1: Shop Info & Permissions')
    const shopUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/shop.json`
    
    const shopResponse = await fetch(shopUrl, {
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (shopResponse.ok) {
      const shopData = await shopResponse.json()
      console.log('✅ Shop connection successful!')
      console.log(`   Shop Name: ${shopData.shop?.name}`)
      console.log(`   Shop Owner: ${shopData.shop?.shop_owner}`)
      console.log(`   Domain: ${shopData.shop?.domain}`)
      console.log(`   Plan: ${shopData.shop?.plan_name}`)
    } else {
      console.log('❌ Shop connection failed:', shopResponse.status, shopResponse.statusText)
      const errorText = await shopResponse.text()
      console.log('Error details:', errorText)
      return
    }

    // Test 2: Get single order with ALL possible fields
    console.log('\n📦 Test 2: Single Order with ALL Fields')
    const orderUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders.json?limit=1&status=any&financial_status=any`
    
    console.log(`🔗 Request URL: ${orderUrl}`)
    
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (orderResponse.ok) {
      const orderData = await orderResponse.json()
      const orders = orderData.orders || []
      
      if (orders.length > 0) {
        const order = orders[0]
        console.log('✅ Order data received!')
        console.log(`\n📋 Order: ${order.name} (ID: ${order.id})`)
        console.log(`💰 Total: ${order.total_price} ${order.currency}`)
        console.log(`📅 Created: ${order.created_at}`)
        console.log(`💳 Financial Status: ${order.financial_status}`)
        
        console.log('\n👤 RAW Customer Data:')
        console.log('   Customer Object:', JSON.stringify(order.customer, null, 2))
        
        console.log('\n🏠 RAW Billing Address:')
        console.log('   Billing Address Object:', JSON.stringify(order.billing_address, null, 2))
        
        console.log('\n🚚 RAW Shipping Address:')
        console.log('   Shipping Address Object:', JSON.stringify(order.shipping_address, null, 2))
        
        console.log('\n📧 RAW Email Fields:')
        console.log(`   order.email: "${order.email}"`)
        console.log(`   order.contact_email: "${order.contact_email}"`)
        console.log(`   customer.email: "${order.customer?.email}"`)
        
        console.log('\n👥 RAW Name Fields:')
        console.log(`   customer.first_name: "${order.customer?.first_name}"`)
        console.log(`   customer.last_name: "${order.customer?.last_name}"`)
        console.log(`   billing_address.first_name: "${order.billing_address?.first_name}"`)
        console.log(`   billing_address.last_name: "${order.billing_address?.last_name}"`)
        console.log(`   shipping_address.first_name: "${order.shipping_address?.first_name}"`)
        console.log(`   shipping_address.last_name: "${order.shipping_address?.last_name}"`)
        
        console.log('\n📝 RAW Notes & Attributes:')
        console.log(`   note: "${order.note}"`)
        console.log('   note_attributes:', JSON.stringify(order.note_attributes, null, 2))
        
        // Check for PII masking patterns
        console.log('\n🔍 PII Masking Analysis:')
        const customerName = order.customer?.first_name || order.customer?.last_name || 'N/A'
        const customerEmail = order.customer?.email || order.email || 'N/A'
        const billingName = order.billing_address?.first_name || order.billing_address?.last_name || 'N/A'
        
        console.log(`   Customer Name Pattern: "${customerName}"`)
        console.log(`   Customer Email Pattern: "${customerEmail}"`)
        console.log(`   Billing Name Pattern: "${billingName}"`)
        
        // Check for typical masking patterns
        const isMasked = customerName.includes('Shopify Kunde') || 
                        customerEmail === 'N/A' || 
                        customerEmail.includes('noreply') ||
                        billingName.includes('Shopify')
        
        if (isMasked) {
          console.log('⚠️  POSSIBLE PII MASKING DETECTED!')
          console.log('   This suggests that customer data is being anonymized by Shopify')
        } else {
          console.log('✅ No obvious PII masking detected')
        }
        
      } else {
        console.log('❌ No orders found')
      }
    } else {
      console.log('❌ Order request failed:', orderResponse.status, orderResponse.statusText)
      const errorText = await orderResponse.text()
      console.log('Error details:', errorText)
    }

    // Test 3: Try to get customer data directly
    console.log('\n👥 Test 3: Direct Customer API Access')
    const customerUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/customers.json?limit=1`
    
    const customerResponse = await fetch(customerUrl, {
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (customerResponse.ok) {
      const customerData = await customerResponse.json()
      const customers = customerData.customers || []
      
      if (customers.length > 0) {
        const customer = customers[0]
        console.log('✅ Direct customer access successful!')
        console.log(`   Customer ID: ${customer.id}`)
        console.log(`   First Name: "${customer.first_name}"`)
        console.log(`   Last Name: "${customer.last_name}"`)
        console.log(`   Email: "${customer.email}"`)
        console.log(`   Phone: "${customer.phone}"`)
        console.log('   Addresses:', JSON.stringify(customer.addresses, null, 2))
      } else {
        console.log('❌ No customers found')
      }
    } else {
      console.log('❌ Customer API access failed:', customerResponse.status, customerResponse.statusText)
      const errorText = await customerResponse.text()
      console.log('Error details:', errorText)
      
      if (customerResponse.status === 403) {
        console.log('🔐 This suggests missing "read_customers" scope!')
      }
    }

    // Test 4: Check API scopes
    console.log('\n🔐 Test 4: API Scopes Analysis')
    console.log('   Based on the responses above, we can determine:')
    
    if (shopResponse.ok) {
      console.log('   ✅ Basic shop access: GRANTED')
    }
    
    if (orderResponse.ok) {
      console.log('   ✅ Order read access: GRANTED')
    }
    
    if (customerResponse.ok) {
      console.log('   ✅ Customer read access: GRANTED')
    } else if (customerResponse.status === 403) {
      console.log('   ❌ Customer read access: DENIED (missing read_customers scope)')
    }

  } catch (error) {
    console.error('❌ Debug Error:', error.message)
  }
}

// Run debug
debugShopifyRawData().catch(console.error)
