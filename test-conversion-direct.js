#!/usr/bin/env node

// Test conversion directly with raw Shopify data
async function testConversionDirect() {
  console.log('🔍 Test: Direct Conversion with Raw Shopify Data\n')

  // Sample order data from the raw API response we saw
  const sampleOrder = {
    "id": 7611177894155,
    "name": "#3307",
    "email": null,
    "created_at": "2025-10-04T15:42:26+02:00",
    "updated_at": "2025-10-04T15:58:47+02:00",
    "total_price": "4.90",
    "subtotal_price": "4.12",
    "total_tax": "0.78",
    "currency": "EUR",
    "financial_status": "paid",
    "fulfillment_status": "fulfilled",
    "billing_address": {
      "province": null,
      "country": "Germany",
      "country_code": "DE",
      "province_code": null
    },
    "customer": {
      "id": 9693637312779,
      "created_at": "2025-10-04T15:42:22+02:00",
      "updated_at": "2025-10-04T15:42:26+02:00",
      "state": "disabled",
      "note": null,
      "verified_email": true,
      "multipass_identifier": null,
      "tax_exempt": false,
      "email_marketing_consent": {
        "state": "not_subscribed",
        "opt_in_level": "confirmed_opt_in",
        "consent_updated_at": null
      },
      "sms_marketing_consent": null,
      "tags": "",
      "currency": "EUR",
      "tax_exemptions": [],
      "admin_graphql_api_id": "gid://shopify/Customer/9693637312779",
      "default_address": {
        "id": 11376820125963,
        "customer_id": 9693637312779,
        "company": null,
        "province": null,
        "country": "Germany",
        "province_code": null,
        "country_code": "DE",
        "country_name": "Germany",
        "default": true
      }
    },
    "line_items": [
      {
        "id": 17671922450699,
        "title": "Microsoft Office 2024 Professional Plus – Download + Produktschlüssel – per E-Mail in 30 Sekunden – Keine Abo",
        "quantity": 1,
        "price": "4.90",
        "sku": null,
        "product_id": 10534352027915,
        "variant_id": 51898556449035,
        "vendor": "Microsoft"
      }
    ],
    "tax_lines": [
      {
        "title": "DE MwSt",
        "price": "0.78",
        "rate": 0.19
      }
    ]
  }

  // Test the conversion function
  console.log('📋 Sample Order Data:')
  console.log('   ID:', sampleOrder.id)
  console.log('   Name:', sampleOrder.name)
  console.log('   Customer ID:', sampleOrder.customer?.id)
  console.log('   Customer Email:', sampleOrder.customer?.email)
  console.log('   Order Email:', sampleOrder.email)
  console.log('   Billing Country:', sampleOrder.billing_address?.country)

  // Import the conversion function
  const { convertShopifyOrderToInvoice } = require('./lib/shopify-api.ts')
  const { getShopifySettings } = require('./lib/shopify-settings.ts')
  
  try {
    const settings = getShopifySettings()
    console.log('\n🔄 Converting order to invoice...')
    
    const invoice = convertShopifyOrderToInvoice(sampleOrder, settings)
    
    console.log('\n📄 Converted Invoice Data:')
    console.log('   Invoice Number:', invoice.number)
    console.log('   Customer Name:', invoice.customer?.name)
    console.log('   Customer Email:', invoice.customer?.email)
    console.log('   Customer Address:', invoice.customer?.address)
    console.log('   Customer City:', invoice.customer?.city)
    console.log('   Customer Country:', invoice.customer?.country)
    console.log('   Customer ZIP:', invoice.customer?.zipCode)
    console.log('   Customer Phone:', invoice.customer?.phone)
    console.log('   Customer Company:', invoice.customer?.company)
    
    console.log('\n✅ Conversion successful!')
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message)
  }
}

// Run test
testConversionDirect().catch(console.error)
