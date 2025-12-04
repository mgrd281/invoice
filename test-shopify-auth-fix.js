#!/usr/bin/env node

/**
 * Test script to verify that the Shopify authentication fix works
 * This simulates a real Shopify order conversion with authentication
 */

const http = require('http')

async function testShopifyAuthFix() {
  console.log('🧪 Testing Shopify Authentication Fix...')
  
  try {
    // Test data - simulating a Shopify order conversion request
    const testOrderIds = [7625725772043] // Using the order ID from the logs
    
    const postData = JSON.stringify({
      orderIds: testOrderIds
    })
    
    // Simulate authentication headers (you would get these from a real logged-in session)
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/shopify/move-to-invoices',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        // Add authentication headers that would normally come from the browser
        'Cookie': 'next-auth.session-token=test-session; next-auth.csrf-token=test-csrf',
        'Authorization': 'Bearer test-token'
      }
    }
    
    console.log('📡 Sending test request to move-to-invoices endpoint...')
    console.log('🔑 With authentication headers included')
    
    const req = http.request(options, (res) => {
      console.log(`📥 Response status: ${res.statusCode}`)
      console.log(`📋 Response headers:`, res.headers)
      
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body)
          console.log('📊 Response body:', JSON.stringify(response, null, 2))
          
          if (response.success) {
            console.log(`✅ Success! Imported: ${response.imported}, Failed: ${response.failed}`)
            if (response.results && response.results.length > 0) {
              response.results.forEach((result, index) => {
                if (result.success) {
                  console.log(`  ✅ Order ${result.orderId}: Invoice created successfully`)
                } else {
                  console.log(`  ❌ Order ${result.orderId}: ${result.error}`)
                }
              })
            }
          } else {
            console.log(`❌ Request failed: ${response.error}`)
          }
        } catch (e) {
          console.log('📄 Raw response:', body)
        }
      })
    })
    
    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`)
    })
    
    // Send the request
    req.write(postData)
    req.end()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
console.log('🚀 Starting Shopify Authentication Fix Test...')
testShopifyAuthFix()

setTimeout(() => {
  console.log('\n💡 Note: This test simulates the authentication fix.')
  console.log('   For real usage, make sure you are logged in to the web interface first.')
  console.log('   Then try the Shopify integration from the browser.')
}, 2000)
