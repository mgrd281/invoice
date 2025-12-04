// الإعداد النهائي لـ Gmail
const fs = require('fs');
const path = require('path');

console.log('🎉 الإعداد النهائي لـ Gmail...');
console.log('');

// المعلومات النهائية
const gmailAddress = 'mgrdegh90@gmail.com';
const appPassword = 'msll rhwi vgyq jkwd';

console.log('📧 Gmail Address:', gmailAddress);
console.log('🔑 App Password:', appPassword);
console.log('');

const envPath = path.join(__dirname, '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');

// الإعدادات النهائية لـ Gmail
const finalGmailSettings = `
# Gmail SMTP Configuration - Final Setup
EMAIL_DEV_MODE="false"
EMAIL_FROM="${gmailAddress}"
EMAIL_FROM_NAME="Karina Khrystych"
EMAIL_CC=""
EMAIL_REPLY_TO="${gmailAddress}"

# Gmail SMTP Settings
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="${gmailAddress}"
EMAIL_PASS="${appPassword}"

# SMTP Configuration (same as above for compatibility)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="${gmailAddress}"
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
const newContent = filteredLines.join('\n') + '\n' + finalGmailSettings;
fs.writeFileSync(envPath, newContent);

console.log('✅ تم تحديث الإعدادات بنجاح!');
console.log('');
console.log('📋 الإعدادات النهائية:');
console.log(`   📧 المرسل: ${gmailAddress}`);
console.log(`   🔑 كلمة المرور: ${appPassword}`);
console.log('   🌐 SMTP: smtp.gmail.com:587');
console.log('   🚀 الإرسال الفعلي: مُفعّل');
console.log('');
console.log('🎯 الآن يمكنك إرسال الفواتير إلى:');
console.log('   ✅ أي إيميل @web.de');
console.log('   ✅ أي إيميل @gmx.de');
console.log('   ✅ أي إيميل @gmail.com');
console.log('   ✅ أي إيميل آخر في العالم!');
console.log('');
console.log('🔄 إعادة تشغيل الخادم مطلوبة...');
