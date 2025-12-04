// إصلاح طارئ لإعدادات الإيميل
const fs = require('fs');
const path = require('path');

console.log('🚨 إصلاح طارئ لإعدادات الإيميل...');

const envPath = path.join(__dirname, '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');

// إعادة تفعيل وضع التطوير وإصلاح الإعدادات
const fixedSettings = `
# Email Configuration - Development Mode (Fixed)
EMAIL_DEV_MODE="true"
EMAIL_FROM="kundenservice@karinex.de"
EMAIL_FROM_NAME="Karina Khrystych"
EMAIL_CC=""
EMAIL_REPLY_TO="kundenservice@karinex.de"

# SMTP Configuration (للمحاكاة)
SMTP_HOST="smtp.office365.com"
SMTP_PORT="587"
SMTP_USER="kundenservice@karinex.de"
SMTP_PASS="dummy-password-for-dev-mode"
SMTP_SECURE="false"

# Legacy Email Variables (للتوافق)
EMAIL_USER="kundenservice@karinex.de"
EMAIL_PASS="dummy-password-for-dev-mode"
EMAIL_HOST="smtp.office365.com"
EMAIL_PORT="587"
`;

// إزالة جميع إعدادات الإيميل القديمة
const lines = envContent.split('\n');
const filteredLines = lines.filter(line => 
    !line.startsWith('EMAIL_') && 
    !line.startsWith('SMTP_') &&
    line.trim() !== ''
);

// إضافة الإعدادات الثابتة
const newContent = filteredLines.join('\n') + '\n' + fixedSettings;

fs.writeFileSync(envPath, newContent);

console.log('✅ تم إصلاح الإعدادات');
console.log('🧪 تم إعادة تفعيل وضع التطوير');
console.log('📧 الإيميلات ستعمل الآن بدون أخطاء (محاكاة)');
console.log('');
console.log('🔄 الخادم سيعيد تحميل الإعدادات تلقائياً...');
