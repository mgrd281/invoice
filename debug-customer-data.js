#!/usr/bin/env node

// Debug Customer Data in Shopify Orders
async function debugCustomerData() {
  console.log('🔍 Debug: Customer Data in Shopify to Invoice Conversion\n')

  try {
    // Test 1: Get a sample order and check customer data
    console.log('1️⃣ Getting sample orders to check customer data...')
    const ordersResponse = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=3&financial_status=any')
    
    if (!ordersResponse.ok) {
      console.log('❌ Failed to get orders:', ordersResponse.status)
      return
    }
    
    const ordersData = await ordersResponse.json()
    console.log(`📦 Got ${ordersData.orders?.length} orders`)
    
    if (!ordersData.orders || ordersData.orders.length === 0) {
      console.log('❌ No orders to test with')
      return
    }
    
    // Analyze customer data in raw Shopify orders
    console.log('\n2️⃣ Analyzing customer data in raw Shopify orders:')
    ordersData.orders.slice(0, 3).forEach((order, index) => {
      console.log(`\n📋 Order ${index + 1}: ${order.name} (ID: ${order.id})`)
      console.log('   Customer object:', {
        id: order.customer?.id,
        email: order.customer?.email,
        first_name: order.customer?.first_name,
        last_name: order.customer?.last_name,
        phone: order.customer?.phone
      })
      console.log('   Billing address:', {
        first_name: order.billing_address?.first_name,
        last_name: order.billing_address?.last_name,
        company: order.billing_address?.company,
        address1: order.billing_address?.address1,
        city: order.billing_address?.city,
        zip: order.billing_address?.zip,
        country: order.billing_address?.country
      })
      console.log('   Order email:', order.email)
    })
    
    // Test 3: Convert one order and see the result
    console.log('\n3️⃣ Testing conversion of one order...')
    const testOrder = ordersData.orders[0]
    
    const conversionResponse = await fetch('http://127.0.0.1:51539/api/shopify/move-to-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderIds: [testOrder.id]
      })
    })
    
    if (conversionResponse.ok) {
      const conversionData = await conversionResponse.json()
      console.log('📄 Conversion successful!')
      
      if (conversionData.results && conversionData.results[0] && conversionData.results[0].success) {
        const invoice = conversionData.results[0].invoice
        console.log('📋 Created invoice customer data:')
        console.log('   Name:', invoice.customer?.name)
        console.log('   Email:', invoice.customer?.email)
        console.log('   Address:', invoice.customer?.address)
        console.log('   City:', invoice.customer?.city)
        console.log('   ZIP:', invoice.customer?.zipCode)
        console.log('   Country:', invoice.customer?.country)
        console.log('   Company:', invoice.customer?.company)
        console.log('   Phone:', invoice.customer?.phone)
      }
    } else {
      console.log('❌ Conversion failed:', await conversionResponse.text())
    }
    
    // Test 4: Check existing invoices to see customer data
    console.log('\n4️⃣ Checking existing invoices for customer data...')
    const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
    
    if (invoicesResponse.ok) {
      const invoicesData = await invoicesResponse.json()
      const shopifyInvoices = invoicesData.invoices?.filter(inv => inv.source === 'shopify').slice(0, 3)
      
      if (shopifyInvoices && shopifyInvoices.length > 0) {
        console.log(`📋 Found ${shopifyInvoices.length} Shopify invoices:`)
        shopifyInvoices.forEach((invoice, index) => {
          console.log(`\n   Invoice ${index + 1}: ${invoice.number}`)
          console.log(`      Customer Name: "${invoice.customer?.name || 'MISSING'}"`)
          console.log(`      Customer Email: "${invoice.customer?.email || 'MISSING'}"`)
          console.log(`      Customer Address: "${invoice.customer?.address || 'MISSING'}"`)
          console.log(`      Customer City: "${invoice.customer?.city || 'MISSING'}"`)
          console.log(`      Shopify Order: ${invoice.shopifyOrderNumber}`)
        })
      } else {
        console.log('   No Shopify invoices found')
      }
    }

  } catch (error) {
    console.error('❌ Debug Error:', error.message)
  }
}

// Run debugging
debugCustomerData().catch(console.error)
