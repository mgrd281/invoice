// تحديث إعدادات Gmail بالمعلومات الصحيحة
const fs = require('fs');
const path = require('path');

console.log('🔧 تحديث إعدادات Gmail...');

// المعلومات من الصور
const appPassword = 'msll rhwi vgyq jkwd';
const emailAddress = 'mgrdegh@gmx.de'; // من الصورة الأولى

console.log('📧 الإيميل المُكتشف:', emailAddress);
console.log('🔑 App Password:', appPassword);
console.log('');

// تحديد نوع الإيميل
let smtpHost, smtpPort;
if (emailAddress.includes('@gmail.com')) {
    smtpHost = 'smtp.gmail.com';
    smtpPort = '587';
    console.log('✅ تم اكتشاف Gmail');
} else if (emailAddress.includes('@gmx.de')) {
    smtpHost = 'mail.gmx.net';
    smtpPort = '587';
    console.log('✅ تم اكتشاف GMX.de');
} else {
    console.log('⚠️ نوع إيميل غير مدعوم. سأستخدم إعدادات Gmail افتراضياً.');
    smtpHost = 'smtp.gmail.com';
    smtpPort = '587';
}

const envPath = path.join(__dirname, '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');

// الإعدادات الجديدة
const newSettings = `
# Gmail/GMX SMTP Configuration - Production
EMAIL_DEV_MODE="false"
EMAIL_FROM="${emailAddress}"
EMAIL_FROM_NAME="Karina Khrystych"
EMAIL_CC=""
EMAIL_REPLY_TO="${emailAddress}"

# SMTP Settings
EMAIL_HOST="${smtpHost}"
EMAIL_PORT="${smtpPort}"
EMAIL_USER="${emailAddress}"
EMAIL_PASS="${appPassword}"

# SMTP Configuration (same as above for compatibility)
SMTP_HOST="${smtpHost}"
SMTP_PORT="${smtpPort}"
SMTP_USER="${emailAddress}"
SMTP_PASS="${appPassword}"
SMTP_SECURE="false"
`;

// إزالة الإعدادات القديمة
const lines = envContent.split('\n');
const filteredLines = lines.filter(line => 
    !line.startsWith('EMAIL_') && 
    !line.startsWith('SMTP_') &&
    line.trim() !== ''
);

// إضافة الإعدادات الجديدة
const newContent = filteredLines.join('\n') + '\n' + newSettings;
fs.writeFileSync(envPath, newContent);

console.log('✅ تم تحديث الإعدادات بنجاح!');
console.log('');
console.log('📋 الإعدادات المُطبقة:');
console.log(`   📧 الإيميل: ${emailAddress}`);
console.log(`   🔑 كلمة المرور: ${appPassword}`);
console.log(`   🌐 SMTP Host: ${smtpHost}`);
console.log(`   🔌 SMTP Port: ${smtpPort}`);
console.log('   🚀 الإرسال الفعلي: مُفعّل');
console.log('');
console.log('🔄 يجب إعادة تشغيل الخادم لتطبيق التغييرات...');
