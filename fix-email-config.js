// إصلاح مؤقت لإعدادات الإيميل
// تشغيل هذا الملف لتفعيل وضع التطوير

const fs = require('fs');
const path = require('path');

console.log('🔧 إصلاح إعدادات الإيميل...');

// قراءة ملف .env.local الحالي إن وجد
let envContent = '';
const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📖 قراءة ملف .env.local الموجود');
} else {
    console.log('📝 إنشاء ملف .env.local جديد');
}

// إعدادات الإيميل المحدثة
const emailSettings = `
# Email Configuration - Development Mode
EMAIL_DEV_MODE="true"
EMAIL_FROM="kundenservice@karinex.de"
EMAIL_FROM_NAME="Karina Khrystych"
EMAIL_CC=""
EMAIL_REPLY_TO="kundenservice@karinex.de"

# SMTP Configuration (سيتم تجاهلها في وضع التطوير)
SMTP_HOST="smtp.office365.com"
SMTP_PORT="587"
SMTP_USER="kundenservice@karinex.de"
SMTP_PASS="your-password-here"
SMTP_SECURE="false"
`;

// إزالة إعدادات الإيميل القديمة وإضافة الجديدة
let newContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('EMAIL_') && !line.startsWith('SMTP_'))
    .join('\n');

newContent += emailSettings;

// إضافة إعدادات أساسية إذا لم تكن موجودة
if (!newContent.includes('DATABASE_URL')) {
    newContent += '\nDATABASE_URL="file:./dev.db"\n';
}

if (!newContent.includes('NEXTAUTH_SECRET')) {
    newContent += 'NEXTAUTH_SECRET="your-very-long-random-secret-key-here-minimum-32-characters-12345"\n';
}

if (!newContent.includes('NEXTAUTH_URL')) {
    newContent += 'NEXTAUTH_URL="http://localhost:3000"\n';
}

if (!newContent.includes('NODE_ENV')) {
    newContent += 'NODE_ENV="development"\n';
}

// كتابة الملف
fs.writeFileSync(envPath, newContent.trim());

console.log('✅ تم تحديث ملف .env.local');
console.log('🧪 تم تفعيل وضع التطوير (EMAIL_DEV_MODE=true)');
console.log('📧 الآن سيتم محاكاة إرسال الإيميلات بدلاً من الإرسال الفعلي');
console.log('');
console.log('🔄 أعد تشغيل الخادم لتطبيق التغييرات:');
console.log('   npm run dev');
