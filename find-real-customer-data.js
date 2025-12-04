#!/usr/bin/env node

// Find orders with real customer data
async function findRealCustomerData() {
  console.log('🔍 Searching for Orders with Real Customer Data\n')

  try {
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2024-01'
    
    // Search through different time periods and order statuses
    const searchParams = [
      { name: 'All Recent Orders', url: `orders.json?limit=250&status=any` },
      { name: 'Fulfilled Orders', url: `orders.json?limit=250&fulfillment_status=fulfilled` },
      { name: 'Shipped Orders', url: `orders.json?limit=250&fulfillment_status=shipped` },
      { name: 'Orders from 2024', url: `orders.json?limit=250&created_at_min=2024-01-01&created_at_max=2024-12-31` },
      { name: 'Orders from 2023', url: `orders.json?limit=250&created_at_min=2023-01-01&created_at_max=2023-12-31` }
    ]
    
    let foundOrdersWithRealData = []
    
    for (const search of searchParams) {
      console.log(`📊 Searching: ${search.name}`)
      
      const response = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/${search.url}`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.log(`   ❌ Failed: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      const orders = data.orders || []
      
      console.log(`   📦 Found ${orders.length} orders`)
      
      // Check each order for real data
      orders.forEach(order => {
        let hasRealData = false
        let realDataFound = []
        
        // Check customer data
        if (order.customer) {
          if (order.customer.email && order.customer.email.trim() !== '' && !order.customer.email.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Email: ${order.customer.email}`)
          }
          
          if (order.customer.first_name && order.customer.first_name.trim() !== '' && !order.customer.first_name.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`First Name: ${order.customer.first_name}`)
          }
          
          if (order.customer.last_name && order.customer.last_name.trim() !== '' && !order.customer.last_name.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Last Name: ${order.customer.last_name}`)
          }
          
          if (order.customer.phone && order.customer.phone.trim() !== '' && !order.customer.phone.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Phone: ${order.customer.phone}`)
          }
        }
        
        // Check order email
        if (order.email && order.email.trim() !== '' && !order.email.includes('NULL')) {
          hasRealData = true
          realDataFound.push(`Order Email: ${order.email}`)
        }
        
        // Check billing address
        if (order.billing_address) {
          const addr = order.billing_address
          if (addr.first_name && addr.first_name.trim() !== '' && !addr.first_name.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Billing First Name: ${addr.first_name}`)
          }
          if (addr.last_name && addr.last_name.trim() !== '' && !addr.last_name.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Billing Last Name: ${addr.last_name}`)
          }
          if (addr.company && addr.company.trim() !== '' && !addr.company.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Company: ${addr.company}`)
          }
          if (addr.address1 && addr.address1.trim() !== '' && !addr.address1.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Address: ${addr.address1}`)
          }
          if (addr.city && addr.city.trim() !== '' && !addr.city.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`City: ${addr.city}`)
          }
          if (addr.zip && addr.zip.trim() !== '' && !addr.zip.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`ZIP: ${addr.zip}`)
          }
          if (addr.phone && addr.phone.trim() !== '' && !addr.phone.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Phone: ${addr.phone}`)
          }
          if (addr.province && addr.province.trim() !== '' && !addr.province.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Province: ${addr.province}`)
          }
        }
        
        // Check shipping address
        if (order.shipping_address) {
          const addr = order.shipping_address
          if (addr.first_name && addr.first_name.trim() !== '' && !addr.first_name.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Shipping First Name: ${addr.first_name}`)
          }
          if (addr.last_name && addr.last_name.trim() !== '' && !addr.last_name.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Shipping Last Name: ${addr.last_name}`)
          }
          if (addr.address1 && addr.address1.trim() !== '' && !addr.address1.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Shipping Address: ${addr.address1}`)
          }
          if (addr.city && addr.city.trim() !== '' && !addr.city.includes('NULL')) {
            hasRealData = true
            realDataFound.push(`Shipping City: ${addr.city}`)
          }
        }
        
        // Check order notes
        if (order.note && order.note.trim() !== '') {
          // Look for email patterns in notes
          const emailMatch = order.note.match(/[\w\.-]+@[\w\.-]+\.\w+/)
          if (emailMatch) {
            hasRealData = true
            realDataFound.push(`Email from Note: ${emailMatch[0]}`)
          }
          
          // Look for name patterns in notes
          const namePatterns = [
            /name[:\s]+([a-zA-ZäöüÄÖÜß\s]+)/i,
            /kunde[:\s]+([a-zA-ZäöüÄÖÜß\s]+)/i,
            /customer[:\s]+([a-zA-ZäöüÄÖÜß\s]+)/i
          ]
          
          namePatterns.forEach(pattern => {
            const nameMatch = order.note.match(pattern)
            if (nameMatch && nameMatch[1] && nameMatch[1].trim().length > 2) {
              hasRealData = true
              realDataFound.push(`Name from Note: ${nameMatch[1].trim()}`)
            }
          })
        }
        
        if (hasRealData) {
          foundOrdersWithRealData.push({
            id: order.id,
            name: order.name,
            created_at: order.created_at,
            total_price: order.total_price,
            currency: order.currency,
            financial_status: order.financial_status,
            realData: realDataFound
          })
        }
      })
      
      console.log('')
    }
    
    // Summary of findings
    console.log('🎯 SEARCH RESULTS:')
    console.log('=' .repeat(60))
    
    if (foundOrdersWithRealData.length === 0) {
      console.log('❌ NO ORDERS WITH REAL CUSTOMER DATA FOUND')
      console.log('\nThis means:')
      console.log('1. All customers are purchasing as guests without providing personal info')
      console.log('2. The store is configured for digital products only')
      console.log('3. Customer data collection is disabled in Shopify settings')
      console.log('4. Privacy settings prevent data storage')
      
      console.log('\n💡 RECOMMENDATIONS:')
      console.log('1. Enable customer account creation in Shopify')
      console.log('2. Make email and address fields required at checkout')
      console.log('3. Add custom form fields to collect customer information')
      console.log('4. Enable customer registration incentives')
      
    } else {
      console.log(`✅ FOUND ${foundOrdersWithRealData.length} ORDERS WITH REAL DATA!`)
      console.log('\nOrders with real customer data:')
      
      foundOrdersWithRealData.slice(0, 10).forEach((order, index) => {
        console.log(`\n${index + 1}. Order ${order.name} (${order.id})`)
        console.log(`   Date: ${order.created_at}`)
        console.log(`   Total: ${order.total_price} ${order.currency}`)
        console.log(`   Status: ${order.financial_status}`)
        console.log(`   Real Data Found:`)
        order.realData.forEach(data => {
          console.log(`      - ${data}`)
        })
      })
      
      if (foundOrdersWithRealData.length > 10) {
        console.log(`\n... and ${foundOrdersWithRealData.length - 10} more orders with real data`)
      }
      
      console.log('\n🚀 NEXT STEPS:')
      console.log('1. Test invoice creation with these orders')
      console.log('2. Verify that real data is extracted correctly')
      console.log('3. Update the system to prioritize these data sources')
    }

  } catch (error) {
    console.error('❌ Search Error:', error.message)
  }
}

// Run search
findRealCustomerData().catch(console.error)
