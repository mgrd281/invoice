#!/usr/bin/env node

// Debug script for Shopify import issues
const fs = require('fs')
const path = require('path')

async function debugShopifyImport() {
  console.log('🔍 Debugging Shopify Import Issues...\n')

  // Load settings
  const settingsPath = path.join(__dirname, 'user-storage', 'shopify-settings.json')
  let settings
  
  try {
    const settingsData = fs.readFileSync(settingsPath, 'utf8')
    settings = JSON.parse(settingsData)
    console.log('📋 Loaded settings:', {
      shopDomain: settings.shopDomain,
      apiVersion: settings.apiVersion,
      hasAccessToken: !!settings.accessToken
    })
  } catch (error) {
    console.error('❌ Failed to load settings:', error.message)
    return
  }

  // Test different API calls to identify the issue
  console.log('\n1️⃣ Testing basic orders API call...')
  
  try {
    // Basic call without any filters
    const basicUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders.json?limit=1`
    console.log('🔗 URL:', basicUrl)
    
    const basicResponse = await fetch(basicUrl, {
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Response status:', basicResponse.status)
    console.log('📊 Response headers:', Object.fromEntries(basicResponse.headers.entries()))
    
    if (basicResponse.ok) {
      const basicData = await basicResponse.json()
      console.log('✅ Basic call successful, orders count:', basicData.orders?.length || 0)
    } else {
      const errorText = await basicResponse.text()
      console.log('❌ Basic call failed:', errorText)
    }
  } catch (error) {
    console.error('❌ Basic call error:', error.message)
  }

  console.log('\n2️⃣ Testing with financial_status filter...')
  
  try {
    // Call with financial_status=paid
    const paidUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders.json?limit=1&financial_status=paid`
    console.log('🔗 URL:', paidUrl)
    
    const paidResponse = await fetch(paidUrl, {
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Response status:', paidResponse.status)
    
    if (paidResponse.ok) {
      const paidData = await paidResponse.json()
      console.log('✅ Paid filter successful, orders count:', paidData.orders?.length || 0)
    } else {
      const errorText = await paidResponse.text()
      console.log('❌ Paid filter failed:', errorText)
    }
  } catch (error) {
    console.error('❌ Paid filter error:', error.message)
  }

  console.log('\n3️⃣ Testing with date filters...')
  
  try {
    // Call with date filters (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const dateFrom = thirtyDaysAgo.toISOString()
    
    const dateUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders.json?limit=1&created_at_min=${encodeURIComponent(dateFrom)}`
    console.log('🔗 URL:', dateUrl)
    
    const dateResponse = await fetch(dateUrl, {
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Response status:', dateResponse.status)
    
    if (dateResponse.ok) {
      const dateData = await dateResponse.json()
      console.log('✅ Date filter successful, orders count:', dateData.orders?.length || 0)
    } else {
      const errorText = await dateResponse.text()
      console.log('❌ Date filter failed:', errorText)
    }
  } catch (error) {
    console.error('❌ Date filter error:', error.message)
  }

  console.log('\n4️⃣ Testing problematic parameters...')
  
  try {
    // Test the exact parameters that might be causing issues
    const problematicParams = new URLSearchParams({
      limit: '250',
      status: 'any',
      financial_status: 'paid'
    })
    
    const problematicUrl = `https://${settings.shopDomain}/admin/api/${settings.apiVersion}/orders.json?${problematicParams}`
    console.log('🔗 URL:', problematicUrl)
    console.log('📋 Params:', Object.fromEntries(problematicParams.entries()))
    
    const problematicResponse = await fetch(problematicUrl, {
      headers: {
        'X-Shopify-Access-Token': settings.accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Response status:', problematicResponse.status)
    
    if (problematicResponse.ok) {
      const problematicData = await problematicResponse.json()
      console.log('✅ Problematic params successful, orders count:', problematicData.orders?.length || 0)
    } else {
      const errorText = await problematicResponse.text()
      console.log('❌ Problematic params failed:', errorText)
      
      // Try to parse error details
      try {
        const errorJson = JSON.parse(errorText)
        console.log('📋 Error details:', errorJson)
      } catch (e) {
        console.log('📋 Raw error text:', errorText)
      }
    }
  } catch (error) {
    console.error('❌ Problematic params error:', error.message)
  }

  console.log('\n🎯 Diagnosis complete!')
}

// Run the debug
debugShopifyImport().catch(console.error)
