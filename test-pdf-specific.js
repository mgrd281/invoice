#!/usr/bin/env node

/**
 * Test PDF generation for specific invoice SH-3322
 */

const http = require('http')

async function testSpecificInvoicePDF() {
  console.log('🧪 Testing PDF generation for invoice SH-3322...')
  
  const invoiceId = 'inv-1760128245502-aqq4trk4p'
  
  try {
    // Test 1: Check invoice data
    console.log('📋 Step 1: Checking invoice data...')
    
    const invoiceOptions = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/invoices/${invoiceId}`,
      method: 'GET'
    }
    
    const invoiceReq = http.request(invoiceOptions, (res) => {
      console.log(`📥 Invoice API status: ${res.statusCode}`)
      
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const invoice = JSON.parse(body)
            console.log('✅ Invoice data retrieved:')
            console.log('  - Number:', invoice.number)
            console.log('  - Customer:', invoice.customerName)
            console.log('  - Total:', invoice.total)
            console.log('  - Items:', invoice.items?.length || 0)
            
            // Test 2: Try new download endpoint
            testDownloadEndpoint(invoiceId)
            
          } catch (e) {
            console.log('❌ Failed to parse invoice:', e.message)
          }
        } else {
          console.log('❌ Invoice not found:', body)
        }
      })
    })
    
    invoiceReq.on('error', (e) => {
      console.error('❌ Invoice request error:', e.message)
    })
    
    invoiceReq.end()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

function testDownloadEndpoint(invoiceId) {
  console.log('\n📄 Step 2: Testing new download endpoint...')
  
  const downloadOptions = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/invoices/${invoiceId}/download-pdf`,
    method: 'GET',
    headers: {
      'x-user-info': JSON.stringify({
        id: 'admin-123',
        email: 'mgrdegh@web.de',
        firstName: 'Admin',
        lastName: 'User'
      })
    }
  }
  
  const downloadReq = http.request(downloadOptions, (res) => {
    console.log(`📥 Download endpoint status: ${res.statusCode}`)
    console.log(`📋 Content-Type: ${res.headers['content-type']}`)
    console.log(`📋 Content-Length: ${res.headers['content-length']}`)
    
    let body = ''
    let bodyBuffer = Buffer.alloc(0)
    
    res.on('data', (chunk) => {
      if (res.headers['content-type']?.includes('application/pdf')) {
        bodyBuffer = Buffer.concat([bodyBuffer, chunk])
      } else {
        body += chunk
      }
    })
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        if (res.headers['content-type']?.includes('application/pdf')) {
          console.log('✅ PDF generated successfully!')
          console.log(`📄 PDF size: ${bodyBuffer.length} bytes`)
          
          if (bodyBuffer.length > 1000) {
            console.log('✅ PDF seems valid (size > 1KB)')
          } else {
            console.log('⚠️ PDF might be too small, check content')
          }
        } else {
          console.log('📄 Response (non-PDF):', body.substring(0, 200))
        }
      } else {
        console.log('❌ Download failed:', body)
      }
    })
  })
  
  downloadReq.on('error', (e) => {
    console.error('❌ Download request error:', e.message)
  })
  
  downloadReq.end()
}

// Run the test
testSpecificInvoicePDF()

setTimeout(() => {
  console.log('\n💡 If PDF generation fails:')
  console.log('1. Check browser console for JavaScript errors')
  console.log('2. Try the alternative download button')
  console.log('3. Check if jsPDF library is loaded properly')
  console.log('4. Verify invoice data is complete')
}, 3000)
