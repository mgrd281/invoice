#!/usr/bin/env node

// Debug Shopify zu Rechnung Konvertierung
async function debugInvoiceConversion() {
  console.log('🔍 Debug: Shopify zu Rechnung Konvertierung\n')

  try {
    // Test 1: Hole ein paar Bestellungen
    console.log('1️⃣ Getting sample orders...')
    const ordersResponse = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=5&financial_status=any')
    
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
    
    // Test 2: Versuche eine Bestellung zu konvertieren
    const testOrder = ordersData.orders[0]
    console.log('\n2️⃣ Testing conversion of order:', testOrder.id, testOrder.name)
    console.log('Order details:', {
      id: testOrder.id,
      name: testOrder.name,
      total_price: testOrder.total_price,
      financial_status: testOrder.financial_status,
      customer: testOrder.customer?.name || 'No customer',
      line_items: testOrder.line_items?.length || 0
    })
    
    // Test 3: Versuche die Konvertierung über API
    console.log('\n3️⃣ Testing API conversion...')
    const conversionResponse = await fetch('http://127.0.0.1:51539/api/shopify/move-to-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderIds: [testOrder.id]
      })
    })
    
    console.log('📊 Conversion API Response Status:', conversionResponse.status)
    
    if (conversionResponse.ok) {
      const conversionData = await conversionResponse.json()
      console.log('📋 Conversion Result:', {
        success: conversionData.success,
        imported: conversionData.imported,
        failed: conversionData.failed,
        results: conversionData.results?.length
      })
      
      if (conversionData.results && conversionData.results.length > 0) {
        conversionData.results.forEach((result, index) => {
          console.log(`\n📄 Result ${index + 1}:`)
          console.log(`   Order ID: ${result.orderId}`)
          console.log(`   Success: ${result.success}`)
          if (result.success) {
            console.log(`   Invoice: ${result.invoice?.number || result.invoice?.id}`)
            console.log(`   PDF URL: ${result.pdfUrl}`)
          } else {
            console.log(`   ❌ Error: ${result.error}`)
          }
        })
      }
    } else {
      const errorText = await conversionResponse.text()
      console.log('❌ Conversion API failed:', errorText)
    }
    
    // Test 4: Teste mehrere Bestellungen
    if (ordersData.orders.length > 1) {
      console.log('\n4️⃣ Testing multiple orders...')
      const testOrderIds = ordersData.orders.slice(0, 3).map(o => o.id)
      console.log('Testing order IDs:', testOrderIds)
      
      const multiResponse = await fetch('http://127.0.0.1:51539/api/shopify/move-to-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: testOrderIds
        })
      })
      
      if (multiResponse.ok) {
        const multiData = await multiResponse.json()
        console.log('📊 Multiple Orders Result:', {
          imported: multiData.imported,
          failed: multiData.failed,
          total: testOrderIds.length
        })
        
        if (multiData.failed > 0) {
          console.log('\n❌ Failed conversions:')
          multiData.results?.forEach(result => {
            if (!result.success) {
              console.log(`   Order ${result.orderId}: ${result.error}`)
            }
          })
        }
      } else {
        const errorText = await multiResponse.text()
        console.log('❌ Multiple orders conversion failed:', errorText)
      }
    }

  } catch (error) {
    console.error('❌ Debug Error:', error.message)
  }
}

// Run debugging
debugInvoiceConversion().catch(console.error)
