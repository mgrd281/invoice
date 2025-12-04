// إعداد Gmail للإرسال السريع
const fs = require('fs');
const path = require('path');

console.log('📧 إعداد Gmail للإرسال الفعلي...');

const envPath = path.join(__dirname, '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');

// إعدادات Gmail
const gmailSettings = `
# Gmail SMTP Configuration
EMAIL_DEV_MODE="false"
EMAIL_FROM="YOUR_GMAIL@gmail.com"
EMAIL_FROM_NAME="Karina Khrystych"
EMAIL_USER="YOUR_GMAIL@gmail.com"
EMAIL_PASS="YOUR_APP_PASSWORD"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="YOUR_GMAIL@gmail.com"
SMTP_PASS="YOUR_APP_PASSWORD"
SMTP_SECURE="false"
`;

// استبدال الإعدادات الحالية
const lines = envContent.split('\n');
const filteredLines = lines.filter(line => 
    !line.startsWith('EMAIL_') && 
    !line.startsWith('SMTP_')
);

const newContent = filteredLines.join('\n') + gmailSettings;
fs.writeFileSync(envPath, newContent);

console.log('✅ تم إعداد Gmail');
console.log('');
console.log('📋 خطوات إعداد Gmail:');
console.log('');
console.log('1. 🔐 تفعيل 2-Factor Authentication في Gmail');
console.log('2. 🔑 إنشاء App Password:');
console.log('   - اذهب إلى: https://myaccount.google.com/security');
console.log('   - App passwords → Select app: Mail');
console.log('   - انسخ كلمة المرور المُنشأة (16 حرف)');
console.log('');
console.log('3. ✏️  تحديث الملف .env.local:');
console.log('   EMAIL_FROM="your-email@gmail.com"');
console.log('   EMAIL_USER="your-email@gmail.com"');
console.log('   EMAIL_PASS="your-16-digit-app-password"');
console.log('   SMTP_USER="your-email@gmail.com"');
console.log('   SMTP_PASS="your-16-digit-app-password"');
console.log('');
console.log('4. 🔄 إعادة تشغيل الخادم');
console.log('');
console.log('💡 Gmail أسهل وأكثر موثوقية من Microsoft 365');
