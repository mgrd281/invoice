// أداة فحص إعدادات Gmail
const fs = require('fs');
const path = require('path');

console.log('🔍 فحص إعدادات Gmail...');
console.log('');

const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
    console.log('❌ ملف .env.local غير موجود');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

// استخراج الإعدادات
const settings = {};
lines.forEach(line => {
    if (line.includes('=')) {
        const [key, value] = line.split('=');
        settings[key.trim()] = value.replace(/"/g, '').trim();
    }
});

console.log('📋 الإعدادات الحالية:');
console.log('');

// فحص الإعدادات المطلوبة
const requiredSettings = [
    'EMAIL_DEV_MODE',
    'EMAIL_FROM',
    'EMAIL_USER',
    'EMAIL_PASS',
    'SMTP_USER',
    'SMTP_PASS'
];

let allGood = true;

requiredSettings.forEach(key => {
    const value = settings[key];
    let status = '❌';
    let message = 'غير مُعرّف';
    
    if (value) {
        if (key === 'EMAIL_DEV_MODE') {
            status = value === 'false' ? '✅' : '⚠️';
            message = value === 'false' ? 'الإرسال الفعلي مُفعّل' : 'وضع التطوير نشط';
        } else if (key.includes('PASS')) {
            status = value.includes('YOUR_') ? '⚠️' : '✅';
            message = value.includes('YOUR_') ? 'يحتاج تحديث' : 'مُعرّف';
        } else if (key.includes('USER') || key.includes('FROM')) {
            status = value.includes('YOUR_') || value.includes('@gmail.com') === false ? '⚠️' : '✅';
            message = value.includes('YOUR_') ? 'يحتاج تحديث' : value;
        } else {
            status = '✅';
            message = value;
        }
    }
    
    if (status !== '✅') allGood = false;
    
    console.log(`${status} ${key}: ${message}`);
});

console.log('');

if (allGood) {
    console.log('🎉 جميع الإعدادات صحيحة!');
    console.log('');
    console.log('🚀 الخطوات التالية:');
    console.log('1. أعيدي تشغيل الخادم: npm run dev');
    console.log('2. اختبري الإرسال في التطبيق');
} else {
    console.log('⚠️  يجب تحديث الإعدادات:');
    console.log('');
    console.log('📝 خطوات الإصلاح:');
    console.log('1. اتبعي دليل GMAIL_SETUP_GUIDE.md');
    console.log('2. احصلي على App Password من Gmail');
    console.log('3. حدثي ملف .env.local');
    console.log('4. شغلي هذا الفحص مرة أخرى');
}

console.log('');
console.log('💡 للمساعدة: اقرئي ملف GMAIL_SETUP_GUIDE.md');
