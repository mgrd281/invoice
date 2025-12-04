#!/usr/bin/env node

/**
 * Test script with the correct authentication header (x-user-info)
 */

const http = require('http')

async function testCorrectAuth() {
  console.log('🧪 Testing with correct x-user-info header...')
  
  try {
    const testOrderIds = [7625725772043]
    
    const postData = JSON.stringify({
      orderIds: testOrderIds
    })
    
    // Create proper user info header (simulating logged-in admin user)
    const userInfo = {
      id: 'admin-123',
      email: 'mgrdegh@web.de',
      firstName: 'Admin',
      lastName: 'User'
    }
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/shopify/move-to-invoices',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-user-info': JSON.stringify(userInfo)
      }
    }
    
    console.log('📡 Sending request with x-user-info header...')
    console.log('👤 User:', userInfo.email)
    
    const req = http.request(options, (res) => {
      console.log(`📥 Response status: ${res.statusCode}`)
      
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body)
          console.log('📊 Response:', JSON.stringify(response, null, 2))
          
          if (response.success) {
            console.log(`✅ Success! Imported: ${response.imported}, Failed: ${response.failed}`)
            if (response.results && response.results.length > 0) {
              response.results.forEach((result) => {
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
    
    req.write(postData)
    req.end()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testCorrectAuth()
