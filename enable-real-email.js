// تفعيل الإرسال الفعلي للإيميلات
const fs = require('fs');
const path = require('path');

console.log('🚀 تفعيل الإرسال الفعلي للإيميلات...');

const envPath = path.join(__dirname, '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');

// تغيير وضع التطوير إلى false
envContent = envContent.replace(/EMAIL_DEV_MODE="true"/, 'EMAIL_DEV_MODE="false"');

// إضافة إعدادات SMTP للإرسال الفعلي
const productionSettings = `
# Production Email Settings - تحديث مطلوب
# يجب إضافة كلمة المرور الصحيحة لـ Microsoft 365
EMAIL_USER="kundenservice@karinex.de"
EMAIL_PASS="YOUR_MICROSOFT365_PASSWORD_HERE"
EMAIL_HOST="smtp.office365.com"
EMAIL_PORT="587"
`;

// إضافة الإعدادات إذا لم تكن موجودة
if (!envContent.includes('EMAIL_USER=')) {
    envContent += productionSettings;
}

fs.writeFileSync(envPath, envContent);

console.log('✅ تم تحديث الإعدادات');
console.log('');
console.log('⚠️  خطوات مطلوبة لإكمال الإعداد:');
console.log('');
console.log('1. 🔑 تحديث كلمة المرور في .env.local:');
console.log('   EMAIL_PASS="كلمة_المرور_الصحيحة"');
console.log('');
console.log('2. 🔐 Microsoft 365 - تأكد من:');
console.log('   - تفعيل SMTP Auth في Microsoft 365');
console.log('   - إعدادات "Send As" للنطاق karinex.de');
console.log('   - عدم تفعيل 2FA أو استخدام App Password');
console.log('');
console.log('3. 🔄 إعادة تشغيل الخادم:');
console.log('   npm run dev');
console.log('');
console.log('4. ✅ اختبار الإرسال مرة أخرى');
console.log('');
console.log('💡 نصيحة: ابدأ بإرسال إيميل تجريبي لنفسك أولاً');
