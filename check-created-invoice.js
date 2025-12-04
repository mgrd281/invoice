#!/usr/bin/env node

// Check the created invoice to see customer data
async function checkCreatedInvoice() {
  console.log('🔍 Check: Created Invoice Customer Data\n')

  try {
    // Get all invoices
    console.log('1️⃣ Getting all invoices...')
    const invoicesResponse = await fetch('http://127.0.0.1:51539/api/invoices')
    
    if (!invoicesResponse.ok) {
      console.log('❌ Failed to get invoices:', invoicesResponse.status)
      return
    }
    
    const invoicesData = await invoicesResponse.json()
    console.log(`📦 Got ${invoicesData.invoices?.length} invoices`)
    
    // Find Shopify invoices
    const shopifyInvoices = invoicesData.invoices?.filter(inv => 
      inv.source === 'shopify' || inv.number?.startsWith('SH-')
    ) || []
    
    console.log(`📋 Found ${shopifyInvoices.length} Shopify invoices`)
    
    if (shopifyInvoices.length === 0) {
      console.log('❌ No Shopify invoices found')
      return
    }
    
    // Check the latest Shopify invoices
    const latestInvoices = shopifyInvoices.slice(-3) // Last 3 invoices
    
    console.log('\n2️⃣ Analyzing latest Shopify invoices:')
    latestInvoices.forEach((invoice, index) => {
      console.log(`\n📄 Invoice ${index + 1}: ${invoice.number}`)
      console.log('   Created:', invoice.date)
      console.log('   Total:', invoice.total)
      console.log('   Source:', invoice.source)
      console.log('   Shopify Order:', invoice.shopifyOrderNumber)
      
      console.log('\n   📋 Customer Data:')
      console.log('      Name:', `"${invoice.customer?.name || 'MISSING'}"`)
      console.log('      Email:', `"${invoice.customer?.email || 'MISSING'}"`)
      console.log('      Address:', `"${invoice.customer?.address || 'MISSING'}"`)
      console.log('      City:', `"${invoice.customer?.city || 'MISSING'}"`)
      console.log('      ZIP:', `"${invoice.customer?.zipCode || 'MISSING'}"`)
      console.log('      Country:', `"${invoice.customer?.country || 'MISSING'}"`)
      console.log('      Company:', `"${invoice.customer?.company || 'MISSING'}"`)
      console.log('      Phone:', `"${invoice.customer?.phone || 'MISSING'}"`)
      
      console.log('\n   📦 Items:')
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, itemIndex) => {
          console.log(`      Item ${itemIndex + 1}: ${item.description} (${item.quantity}x ${item.unitPrice})`)
        })
      } else {
        console.log('      No items found')
      }
    })
    
    // Test 3: Get a specific invoice by ID
    if (latestInvoices.length > 0) {
      const testInvoice = latestInvoices[0]
      console.log(`\n3️⃣ Getting specific invoice: ${testInvoice.id}`)
      
      const specificResponse = await fetch(`http://127.0.0.1:51539/api/invoices/${testInvoice.id}`)
      if (specificResponse.ok) {
        const specificData = await specificResponse.json()
        console.log('📋 Specific Invoice Customer Data:')
        console.log('   Name:', `"${specificData.customer?.name || 'MISSING'}"`)
        console.log('   Email:', `"${specificData.customer?.email || 'MISSING'}"`)
        console.log('   Address:', `"${specificData.customer?.address || 'MISSING'}"`)
        console.log('   City:', `"${specificData.customer?.city || 'MISSING'}"`)
      }
    }

  } catch (error) {
    console.error('❌ Check Error:', error.message)
  }
}

// Run check
checkCreatedInvoice().catch(console.error)
