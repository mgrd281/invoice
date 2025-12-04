// إصلاح تنسيق App Password
const fs = require('fs');
const path = require('path');

console.log('🔧 إصلاح تنسيق App Password...');

// App Password الحالي مع المسافات
const currentPassword = 'msll rhwi vgyq jkwd';
// تحويل إلى تنسيق بدون مسافات (كما يتوقع Gmail أحياناً)
const formattedPassword = currentPassword.replace(/\s+/g, '');

console.log('🔑 App Password الحالي:', currentPassword);
console.log('🔑 App Password مُنسق:', formattedPassword);

const envPath = path.join(__dirname, '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');

// استبدال كلمة المرور بالتنسيق الجديد
envContent = envContent.replace(/EMAIL_PASS=".*?"/, `EMAIL_PASS="${formattedPassword}"`);
envContent = envContent.replace(/SMTP_PASS=".*?"/, `SMTP_PASS="${formattedPassword}"`);

fs.writeFileSync(envPath, envContent);

console.log('✅ تم تحديث تنسيق App Password');
console.log('');
console.log('🧪 اختبار الإعداد النهائي...');
