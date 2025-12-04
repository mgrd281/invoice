// إعداد Gmail للإرسال الفعلي - خطوة بخطوة
const fs = require('fs');
const path = require('path');

console.log('📧 إعداد Gmail للإرسال الفعلي...');
console.log('');

const envPath = path.join(__dirname, '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');

// إعدادات Gmail الجديدة
const gmailConfig = `
# Gmail SMTP Configuration - Production
EMAIL_DEV_MODE="false"
EMAIL_FROM="YOUR_GMAIL@gmail.com"
EMAIL_FROM_NAME="Karina Khrystych"
EMAIL_CC=""
EMAIL_REPLY_TO="YOUR_GMAIL@gmail.com"

# Gmail SMTP Settings
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="YOUR_GMAIL@gmail.com"
EMAIL_PASS="YOUR_16_DIGIT_APP_PASSWORD"

# SMTP Configuration (same as above for compatibility)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="YOUR_GMAIL@gmail.com"
SMTP_PASS="YOUR_16_DIGIT_APP_PASSWORD"
SMTP_SECURE="false"
`;

// إزالة الإعدادات القديمة
const lines = envContent.split('\n');
const filteredLines = lines.filter(line => 
    !line.startsWith('EMAIL_') && 
    !line.startsWith('SMTP_') &&
    line.trim() !== ''
);

// إضافة إعدادات Gmail
const newContent = filteredLines.join('\n') + '\n' + gmailConfig;
fs.writeFileSync(envPath, newContent);

console.log('✅ تم إنشاء قالب إعدادات Gmail');
console.log('');
console.log('🔧 الخطوات المطلوبة:');
console.log('');
console.log('1️⃣  تفعيل 2-Factor Authentication في Gmail:');
console.log('   🔗 https://myaccount.google.com/security');
console.log('   ↳ اختاري "2-Step Verification" وفعليها');
console.log('');
console.log('2️⃣  إنشاء App Password:');
console.log('   🔗 https://myaccount.google.com/apppasswords');
console.log('   ↳ اختاري "Mail" كنوع التطبيق');
console.log('   ↳ انسخي كلمة المرور (16 رقم)');
console.log('');
console.log('3️⃣  تحديث ملف .env.local:');
console.log('   ↳ استبدلي YOUR_GMAIL@gmail.com بإيميلك');
console.log('   ↳ استبدلي YOUR_16_DIGIT_APP_PASSWORD بكلمة المرور');
console.log('');
console.log('4️⃣  إعادة تشغيل الخادم:');
console.log('   ↳ npm run dev');
console.log('');
console.log('💡 نصيحة: استخدمي إيميل Gmail شخصي أو أنشئي واحد جديد للشركة');
