#!/usr/bin/env node

// Test full Shopify data retrieval with all possible fields
async function testFullShopifyData() {
  console.log('🔍 Test: Full Shopify Data Retrieval\n')

  try {
    const shopDomain = '45dv93-bk.myshopify.com'
    const accessToken = 'SHOPIFY_ACCESS_TOKEN_PLACEHOLDER'
    const apiVersion = '2027-01'

    // Test different orders to see if any have customer data
    const orderIds = ['7611177894155', '7610574536971', '7609695699211']

    for (const orderId of orderIds) {
      console.log(`\n📋 Testing Order: ${orderId}`)

      // Get order with NO field restrictions to get ALL data
      const url = `https://${shopDomain}/admin/api/${apiVersion}/orders/${orderId}.json`

      console.log('🌐 Fetching ALL fields from:', url)

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.log('❌ Failed to fetch order:', response.status, response.statusText)
        continue
      }

      const data = await response.json()
      const order = data.order

      console.log('📊 Order Analysis:')
      console.log('   Order Name:', order.name)
      console.log('   Order Email:', order.email || 'NULL')
      console.log('   Contact Email:', order.contact_email || 'NULL')
      console.log('   Buyer Accepts Marketing:', order.buyer_accepts_marketing)

      // Customer analysis
      if (order.customer) {
        console.log('\n👤 Customer Data:')
        console.log('   ID:', order.customer.id)
        console.log('   Email:', order.customer.email || 'NULL')
        console.log('   First Name:', order.customer.first_name || 'NULL')
        console.log('   Last Name:', order.customer.last_name || 'NULL')
        console.log('   Phone:', order.customer.phone || 'NULL')
        console.log('   State:', order.customer.state)
        console.log('   Total Spent:', order.customer.total_spent)
        console.log('   Orders Count:', order.customer.orders_count)
        console.log('   Verified Email:', order.customer.verified_email)
        console.log('   Accepts Marketing:', order.customer.accepts_marketing)
        console.log('   Created At:', order.customer.created_at)
        console.log('   Updated At:', order.customer.updated_at)
        console.log('   Note:', order.customer.note || 'NULL')
        console.log('   Tags:', order.customer.tags || 'NULL')

        // Check if customer has addresses
        if (order.customer.addresses && order.customer.addresses.length > 0) {
          console.log('\n   📍 Customer Addresses:')
          order.customer.addresses.forEach((addr, index) => {
            console.log(`      Address ${index + 1}:`)
            console.log(`         Name: "${addr.name || 'NULL'}"`)
            console.log(`         First Name: "${addr.first_name || 'NULL'}"`)
            console.log(`         Last Name: "${addr.last_name || 'NULL'}"`)
            console.log(`         Company: "${addr.company || 'NULL'}"`)
            console.log(`         Address1: "${addr.address1 || 'NULL'}"`)
            console.log(`         City: "${addr.city || 'NULL'}"`)
            console.log(`         ZIP: "${addr.zip || 'NULL'}"`)
            console.log(`         Country: "${addr.country || 'NULL'}"`)
            console.log(`         Phone: "${addr.phone || 'NULL'}"`)
            console.log(`         Default: ${addr.default}`)
          })
        }

        // Check default address
        if (order.customer.default_address) {
          console.log('\n   🏠 Default Address:')
          const addr = order.customer.default_address
          console.log(`      Name: "${addr.name || 'NULL'}"`)
          console.log(`      First Name: "${addr.first_name || 'NULL'}"`)
          console.log(`      Last Name: "${addr.last_name || 'NULL'}"`)
          console.log(`      Company: "${addr.company || 'NULL'}"`)
          console.log(`      Address1: "${addr.address1 || 'NULL'}"`)
          console.log(`      City: "${addr.city || 'NULL'}"`)
          console.log(`      ZIP: "${addr.zip || 'NULL'}"`)
          console.log(`      Country: "${addr.country || 'NULL'}"`)
          console.log(`      Phone: "${addr.phone || 'NULL'}"`)
        }
      }

      // Billing address analysis
      if (order.billing_address) {
        console.log('\n📮 Billing Address:')
        const addr = order.billing_address
        console.log(`   Name: "${addr.name || 'NULL'}"`)
        console.log(`   First Name: "${addr.first_name || 'NULL'}"`)
        console.log(`   Last Name: "${addr.last_name || 'NULL'}"`)
        console.log(`   Company: "${addr.company || 'NULL'}"`)
        console.log(`   Address1: "${addr.address1 || 'NULL'}"`)
        console.log(`   City: "${addr.city || 'NULL'}"`)
        console.log(`   ZIP: "${addr.zip || 'NULL'}"`)
        console.log(`   Country: "${addr.country || 'NULL'}"`)
        console.log(`   Phone: "${addr.phone || 'NULL'}"`)
      }

      // Shipping address analysis
      if (order.shipping_address) {
        console.log('\n🚚 Shipping Address:')
        const addr = order.shipping_address
        console.log(`   Name: "${addr.name || 'NULL'}"`)
        console.log(`   First Name: "${addr.first_name || 'NULL'}"`)
        console.log(`   Last Name: "${addr.last_name || 'NULL'}"`)
        console.log(`   Company: "${addr.company || 'NULL'}"`)
        console.log(`   Address1: "${addr.address1 || 'NULL'}"`)
        console.log(`   City: "${addr.city || 'NULL'}"`)
        console.log(`   ZIP: "${addr.zip || 'NULL'}"`)
        console.log(`   Country: "${addr.country || 'NULL'}"`)
        console.log(`   Phone: "${addr.phone || 'NULL'}"`)
      }

      // Check for any name in any field
      console.log('\n🔍 Name Search Results:')
      const possibleNames = [
        order.customer?.first_name,
        order.customer?.last_name,
        order.customer?.email,
        order.billing_address?.first_name,
        order.billing_address?.last_name,
        order.billing_address?.name,
        order.billing_address?.company,
        order.shipping_address?.first_name,
        order.shipping_address?.last_name,
        order.shipping_address?.name,
        order.shipping_address?.company,
        order.email,
        order.contact_email
      ].filter(name => name && name !== 'NULL' && name.trim() !== '')

      if (possibleNames.length > 0) {
        console.log('   ✅ Found names:', possibleNames)
      } else {
        console.log('   ❌ No names found in any field')
      }

      console.log('\n' + '='.repeat(80))
    }

    // Test: Get recent orders to see if any have customer data
    console.log('\n\n🔍 Testing Recent Orders for Customer Data...')

    const recentUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?limit=10&status=any&financial_status=any`
    console.log('🌐 Fetching recent orders:', recentUrl)

    const recentResponse = await fetch(recentUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (recentResponse.ok) {
      const recentData = await recentResponse.json()
      console.log(`📊 Found ${recentData.orders?.length || 0} recent orders`)

      let foundCustomerData = false

      recentData.orders?.slice(0, 5).forEach((order, index) => {
        console.log(`\n📋 Order ${index + 1}: ${order.name} (${order.id})`)

        const hasCustomerName = order.customer?.first_name || order.customer?.last_name ||
          order.billing_address?.first_name || order.billing_address?.last_name ||
          order.billing_address?.name || order.billing_address?.company

        if (hasCustomerName) {
          console.log('   ✅ HAS CUSTOMER DATA!')
          console.log('      Customer Name:', order.customer?.first_name, order.customer?.last_name)
          console.log('      Billing Name:', order.billing_address?.first_name, order.billing_address?.last_name)
          console.log('      Company:', order.billing_address?.company)
          foundCustomerData = true
        } else {
          console.log('   ❌ No customer data')
        }
      })

      if (!foundCustomerData) {
        console.log('\n⚠️  WARNING: No customer data found in any recent orders!')
        console.log('   This suggests that customers are not providing personal information during checkout.')
        console.log('   Possible reasons:')
        console.log('   1. Guest checkout is enabled and customers skip personal details')
        console.log('   2. Shopify store settings don\'t require customer information')
        console.log('   3. Digital products don\'t require shipping addresses')
        console.log('   4. Privacy settings prevent data sharing via API')
      }
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run test
testFullShopifyData().catch(console.error)
