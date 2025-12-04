#!/usr/bin/env node

// Test für die tatsächliche Anzahl von Shopify Bestellungen
async function testShopifyCount() {
  console.log('🔍 Testing Shopify Order Count...\n')

  try {
    // Test 1: Direkte Shopify API Anfrage für Count
    console.log('1️⃣ Testing Shopify API directly for count...')
    
    const fs = require('fs')
    const path = require('path')
    
    // Load settings
    const settingsPath = path.join(__dirname, 'user-storage', 'shopify-settings.json')
    const settingsData = fs.readFileSync(settingsPath, 'utf8')
    const settings = JSON.parse(settingsData)
    
    // Test verschiedene Abfragen
    const queries = [
      { name: 'Alle Bestellungen', params: 'limit=1&status=any' },
      { name: 'Bezahlte Bestellungen', params: 'limit=1&financial_status=paid' },
      { name: 'Offene Bestellungen', params: 'limit=1&financial_status=pending' },
      { name: 'Stornierte Bestellungen', params: 'limit=1&financial_status=voided' },
      { name: 'Erstattete Bestellungen', params: 'limit=1&financial_status=refunded' }
    ]
    
    for (const query of queries) {
      try {
        const url = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders/count.json?${query.params}`
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': settings.accessToken,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`   ${query.name}: ${data.count} Bestellungen`)
        } else {
          console.log(`   ${query.name}: ERROR ${response.status}`)
        }
      } catch (error) {
        console.log(`   ${query.name}: FAILED`)
      }
    }

    console.log('\n2️⃣ Testing pagination with different limits...')
    
    // Test verschiedene Limits
    const limits = [250, 500, 1000, 2000]
    
    for (const limit of limits) {
      try {
        const url = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders.json?limit=${limit}&financial_status=any`
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': settings.accessToken,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const linkHeader = response.headers.get('Link')
          const hasNext = linkHeader && linkHeader.includes('rel="next"')
          
          console.log(`   Limit ${limit}: ${data.orders?.length || 0} Bestellungen erhalten (hasNext: ${hasNext})`)
        } else {
          console.log(`   Limit ${limit}: ERROR ${response.status}`)
        }
      } catch (error) {
        console.log(`   Limit ${limit}: FAILED`)
      }
    }

    console.log('\n3️⃣ Testing our API with different approaches...')
    
    // Test unsere API
    const apiTests = [
      { name: 'Standard API', url: 'http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=any' },
      { name: 'Legacy API', url: 'http://127.0.0.1:51539/api/shopify/legacy-import', method: 'POST', body: { limit: 1000000, financial_status: 'any' } }
    ]
    
    for (const test of apiTests) {
      try {
        const options = {
          method: test.method || 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
        
        if (test.body) {
          options.body = JSON.stringify(test.body)
        }
        
        const response = await fetch(test.url, options)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`   ${test.name}: ${data.orders?.length || 0} Bestellungen`)
        } else {
          const errorText = await response.text()
          console.log(`   ${test.name}: ERROR ${response.status}`)
        }
      } catch (error) {
        console.log(`   ${test.name}: FAILED`)
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message)
  }

  console.log('\n🎯 Analysis:')
  console.log('   - Check if Shopify has internal limits')
  console.log('   - Verify pagination is working correctly')
  console.log('   - Identify the true maximum available orders')
}

// Run the test
testShopifyCount().catch(console.error)
