#!/usr/bin/env node

// Debug script to check what data is actually stored in the system
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Data Sources for Dashboard Stats...\n');

// Check for sample data files
const sampleInvoicesPath = path.join(process.cwd(), 'data', 'sample-invoices.json');
const sampleCustomersPath = path.join(process.cwd(), 'data', 'sample-customers.json');

console.log('📁 Sample Data Files:');
console.log(`- sample-invoices.json: ${fs.existsSync(sampleInvoicesPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
console.log(`- sample-customers.json: ${fs.existsSync(sampleCustomersPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);

if (fs.existsSync(sampleInvoicesPath)) {
  try {
    const sampleInvoices = JSON.parse(fs.readFileSync(sampleInvoicesPath, 'utf8'));
    console.log(`  📊 Sample invoices count: ${sampleInvoices.length}`);
    if (sampleInvoices.length > 0) {
      console.log(`  💰 Sample invoice example:`, {
        id: sampleInvoices[0].id,
        number: sampleInvoices[0].number,
        total: sampleInvoices[0].total,
        amount: sampleInvoices[0].amount,
        status: sampleInvoices[0].status,
        userId: sampleInvoices[0].userId
      });
    }
  } catch (e) {
    console.log(`  ❌ Error reading sample invoices: ${e.message}`);
  }
}

// Check for persistent storage files
const userStorageDir = path.join(process.cwd(), 'user-storage');
console.log(`\n💾 User Storage Directory: ${userStorageDir}`);
console.log(`- Directory exists: ${fs.existsSync(userStorageDir) ? '✅ YES' : '❌ NO'}`);

if (fs.existsSync(userStorageDir)) {
  const files = fs.readdirSync(userStorageDir);
  console.log(`- Files in storage: ${files.join(', ')}`);
  
  files.forEach(file => {
    const filePath = path.join(userStorageDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  - ${file}: ${stats.size} bytes, modified: ${stats.mtime.toISOString()}`);
  });
}

// Check for CSV data directory
const csvDataDir = path.join(process.cwd(), 'csv-data');
console.log(`\n📄 CSV Data Directory: ${csvDataDir}`);
console.log(`- Directory exists: ${fs.existsSync(csvDataDir) ? '✅ YES' : '❌ NO'}`);

if (fs.existsSync(csvDataDir)) {
  const files = fs.readdirSync(csvDataDir);
  console.log(`- Files in CSV data: ${files.join(', ')}`);
}

console.log('\n🎯 Recommendations:');
console.log('1. If sample data files exist and contain data, they might be interfering');
console.log('2. Check if real invoices have proper userId/ownerId fields for filtering');
console.log('3. Verify that the authentication is working correctly');
console.log('4. Consider clearing sample data if not needed for testing');

console.log('\n🚀 Next steps:');
console.log('- Run this script: node debug-data-sources.js');
console.log('- Check browser console when loading dashboard');
console.log('- Verify user authentication headers are being sent');
