#!/usr/bin/env node

// Test für UNLIMITED Bestellungen (10.000+)
async function testUnlimitedOrders() {
  console.log('🚀 Test: UNLIMITED Bestellungen System\n')

  try {
    console.log('1️⃣ Testing UNLIMITED API with high limit...')
    
    // Test mit sehr hohem Limit
    const response = await fetch('http://127.0.0.1:51539/api/shopify/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 10000,  // 10.000 Bestellungen anfordern!
        financial_status: 'any'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      
      console.log('📊 UNLIMITED API Response:')
      console.log(`   ✅ Success: ${data.success}`)
      console.log(`   📈 Total Count: ${data.totalCount} (echte Anzahl von Shopify)`)
      console.log(`   📦 Fetched Count: ${data.fetchedCount} (tatsächlich geladen)`)
      console.log(`   📋 Orders Array Length: ${data.orders?.length}`)
      console.log(`   🎯 Limit erreicht: ${data.fetchedCount >= 500 ? 'NEIN - immer noch 500 Limit' : 'JA - Unlimited funktioniert!'}`)
      
      if (data.fetchedCount > 500) {
        console.log('\n🎉 SUCCESS! UNLIMITED SYSTEM FUNKTIONIERT!')
        console.log(`   - Mehr als 500 Bestellungen geladen: ${data.fetchedCount}`)
        console.log(`   - Cursor-based Pagination funktioniert`)
        console.log(`   - Kein 250/500 Limit mehr!`)
      } else {
        console.log('\n⚠️ PROBLEM: Immer noch auf 500 Bestellungen begrenzt')
        console.log('   Mögliche Ursachen:')
        console.log('   - Shopify Shop hat tatsächlich nur wenige Bestellungen')
        console.log('   - API Parameter sind falsch')
        console.log('   - Cursor Pagination funktioniert nicht richtig')
      }
      
      console.log('\n2️⃣ Testing different parameters...')
      
      // Test mit verschiedenen financial_status
      const statuses = ['any', 'paid', 'pending', 'authorized', 'partially_paid']
      
      for (const status of statuses) {
        try {
          const testResponse = await fetch('http://127.0.0.1:51539/api/shopify/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              limit: 10000,
              financial_status: status
            })
          })
          
          if (testResponse.ok) {
            const testData = await testResponse.json()
            console.log(`   ${status}: ${testData.totalCount} total, ${testData.fetchedCount} fetched`)
          }
        } catch (error) {
          console.log(`   ${status}: FAILED`)
        }
      }
      
    } else {
      console.log('❌ API Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.log('Error details:', errorText)
    }

    console.log('\n3️⃣ Frontend Test...')
    
    // Test Frontend GET Request
    const frontendResponse = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=10000&financial_status=any')
    
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json()
      console.log('📱 Frontend API Response:')
      console.log(`   Total Count: ${frontendData.totalCount}`)
      console.log(`   Fetched Count: ${frontendData.fetchedCount}`)
      console.log(`   Orders Length: ${frontendData.orders?.length}`)
      
      console.log('\n🎯 Frontend sollte jetzt anzeigen:')
      console.log(`   "${frontendData.totalCount} Bestellungen verfügbar"`)
      console.log(`   Und tatsächlich ${frontendData.fetchedCount} Bestellungen laden!`)
    }

    console.log('\n🔧 Nächste Schritte:')
    console.log('   1. Öffnen Sie die Shopify-Seite in Ihrem Browser')
    console.log('   2. Drücken Sie "Bestellungen laden"')
    console.log('   3. Schauen Sie in die Browser Console nach Logs')
    console.log('   4. Die Anzeige sollte jetzt mehr als 500 Bestellungen zeigen')
    console.log('   5. Wenn Ihr Shop mehr als 500 Bestellungen hat, sollten alle geladen werden')

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run the unlimited test
testUnlimitedOrders().catch(console.error)
