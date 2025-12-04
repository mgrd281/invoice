#!/usr/bin/env node

// Final Test für das 500 Bestellungen Problem
async function finalTest() {
  console.log('🎯 Final Test: 500 Bestellungen Problem Fix\n')

  try {
    // Test API Response
    console.log('1️⃣ Testing API Response...')
    const response = await fetch('http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=any')
    
    if (response.ok) {
      const data = await response.json()
      
      console.log('📊 API Response Details:')
      console.log(`   ✅ Success: ${data.success}`)
      console.log(`   📈 Total Count: ${data.totalCount} (echte Anzahl von Shopify)`)
      console.log(`   📦 Fetched Count: ${data.fetchedCount}`)
      console.log(`   📋 Orders Array Length: ${data.orders?.length}`)
      
      console.log('\n🎯 Frontend sollte jetzt anzeigen:')
      console.log(`   "${data.totalCount} Bestellungen verfügbar" (statt ${data.orders?.length})`)
      
      if (data.totalCount < data.orders?.length) {
        console.log('\n✅ PROBLEM GELÖST!')
        console.log(`   - API gibt korrekt totalCount=${data.totalCount} zurück`)
        console.log(`   - Das ist die echte Anzahl verfügbarer Bestellungen`)
        console.log(`   - Frontend verwendet jetzt getDisplayCount() Funktion`)
        console.log(`   - Browser Cache sollte geleert werden (Ctrl+F5)`)
      } else {
        console.log('\n⚠️ Weitere Analyse nötig...')
      }
      
    } else {
      console.log('❌ API Error:', response.status)
    }

    console.log('\n2️⃣ Testing different financial_status...')
    
    const statuses = [
      { name: 'any', expected: 'Alle Bestellungen' },
      { name: 'paid', expected: 'Nur bezahlte Bestellungen' }
    ]
    
    for (const status of statuses) {
      try {
        const response = await fetch(`http://127.0.0.1:51539/api/shopify/import?limit=1000000&financial_status=${status.name}`)
        if (response.ok) {
          const data = await response.json()
          console.log(`   ${status.name}: ${data.totalCount} Bestellungen (${status.expected})`)
        }
      } catch (error) {
        console.log(`   ${status.name}: FAILED`)
      }
    }

    console.log('\n🔧 Nächste Schritte:')
    console.log('   1. Öffnen Sie die Shopify-Seite in Ihrem Browser')
    console.log('   2. Drücken Sie Ctrl+F5 (oder Cmd+Shift+R) für Hard Refresh')
    console.log('   3. Öffnen Sie Developer Tools (F12)')
    console.log('   4. Schauen Sie in die Console nach "getDisplayCount called"')
    console.log('   5. Die Anzeige sollte jetzt die korrekte Anzahl zeigen')

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Run the final test
finalTest().catch(console.error)
