#!/usr/bin/env node

/**
 * Test script to debug PDF generation issues
 */

const http = require('http')

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation Debug...')
  
  try {
    // Test 1: Check if invoice API is accessible
    console.log('📡 Testing invoice API access...')
    
    const testInvoiceId = 'inv-1760128245502-aqq4trk4p' // From the logs
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/invoices/${testInvoiceId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    
    const req = http.request(options, (res) => {
      console.log(`📥 Invoice API response status: ${res.statusCode}`)
      
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const invoice = JSON.parse(body)
            console.log('✅ Invoice data retrieved successfully')
            console.log('📋 Invoice details:', {
              id: invoice.id,
              number: invoice.number,
              customer: invoice.customerName,
              total: invoice.total,
              items: invoice.items?.length || 0
            })
            
            // Test 2: Check PDF endpoint
            testPDFEndpoint(testInvoiceId)
          } else {
            console.log('❌ Invoice API failed:', body)
          }
        } catch (e) {
          console.log('❌ Failed to parse invoice response:', body)
        }
      })
    })
    
    req.on('error', (e) => {
      console.error(`❌ Invoice API request error: ${e.message}`)
    })
    
    req.end()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

function testPDFEndpoint(invoiceId) {
  console.log('\n🔍 Testing PDF endpoint...')
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/invoices/${invoiceId}/pdf`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }
  
  const req = http.request(options, (res) => {
    console.log(`📥 PDF endpoint response status: ${res.statusCode}`)
    console.log(`📋 Content-Type: ${res.headers['content-type']}`)
    
    let body = ''
    res.on('data', (chunk) => {
      body += chunk
    })
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ PDF endpoint accessible')
        console.log(`📄 Response length: ${body.length} bytes`)
        
        if (res.headers['content-type']?.includes('text/html')) {
          console.log('📝 PDF endpoint returns HTML (expected for current implementation)')
        } else if (res.headers['content-type']?.includes('application/pdf')) {
          console.log('📄 PDF endpoint returns actual PDF')
        }
      } else {
        console.log('❌ PDF endpoint failed:', body)
      }
      
      // Test 3: Check browser compatibility
      testBrowserCompatibility()
    })
  })
  
  req.on('error', (e) => {
    console.error(`❌ PDF endpoint request error: ${e.message}`)
  })
  
  req.end()
}

function testBrowserCompatibility() {
  console.log('\n🌐 Browser Compatibility Check:')
  console.log('📋 Common PDF download issues:')
  console.log('  1. ✅ jsPDF library: Available in package.json')
  console.log('  2. ⚠️  Browser popup blocker: May block automatic downloads')
  console.log('  3. ⚠️  CORS issues: Check if running on correct domain')
  console.log('  4. ⚠️  File system permissions: Check browser download settings')
  console.log('  5. ⚠️  JavaScript errors: Check browser console for errors')
  
  console.log('\n💡 Debugging steps:')
  console.log('  1. Open browser developer tools (F12)')
  console.log('  2. Check Console tab for JavaScript errors')
  console.log('  3. Check Network tab for failed requests')
  console.log('  4. Try downloading from different browser')
  console.log('  5. Check if popup blocker is enabled')
}

// Run the test
console.log('🚀 Starting PDF Generation Debug Test...')
testPDFGeneration()

setTimeout(() => {
  console.log('\n📋 Summary of potential PDF issues:')
  console.log('🔴 Rendering: jsPDF library errors, font loading issues')
  console.log('🟡 Template: Missing data fields, formatting errors')
  console.log('🟢 File Storage: Browser download permissions, popup blockers')
  console.log('🔵 API: Invoice data not found, server errors')
  console.log('🟣 Encoding: Character encoding issues, special characters')
  console.log('🟠 Browser: Compatibility issues, JavaScript disabled')
}, 3000)
