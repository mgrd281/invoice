#!/usr/bin/env node

// Test the import fix
async function testImportFix() {
  console.log('🧪 Testing Shopify Import Fix...\n')

  try {
    // Test the legacy import API
    console.log('1️⃣ Testing legacy import API...')
    
    const response = await fetch('http://127.0.0.1:51539/api/shopify/legacy-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 5,
        financial_status: 'paid'
      })
    })

    console.log('📊 Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Legacy import successful!')
      console.log('📋 Response:', {
        success: data.success,
        ordersCount: data.orders?.length || 0,
        message: data.message
      })
    } else {
      const errorText = await response.text()
      console.log('❌ Legacy import failed:', errorText)
      
      try {
        const errorJson = JSON.parse(errorText)
        console.log('📋 Error details:', errorJson)
      } catch (e) {
        console.log('📋 Raw error:', errorText)
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message)
  }

  console.log('\n🎯 Test complete!')
}

// Run the test
testImportFix().catch(console.error)
