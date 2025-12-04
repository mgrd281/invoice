# إعداد البريد الإلكتروني - Email Setup Guide

## المتطلبات الأساسية

لتفعيل إرسال البريد الإلكتروني الفعلي، تحتاج إلى إعداد مزود خدمة البريد الإلكتروني.

## الخيار 1: Gmail SMTP (الأسهل للاختبار)

### 1. إعداد Gmail App Password

1. اذهب إلى [Google Account Settings](https://myaccount.google.com/)
2. انقر على "Security" في الشريط الجانبي
3. فعّل "2-Step Verification" إذا لم يكن مفعلاً
4. ابحث عن "App passwords" وانقر عليه
5. اختر "Mail" و "Other (custom name)"
6. أدخل اسماً مثل "Invoice Generator"
7. انسخ كلمة المرور المُولدة (16 رقم)

### 2. تحديث ملف .env.local

```bash
# Gmail SMTP Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

## الخيار 2: SendGrid (للإنتاج)

### 1. إنشاء# 📧 دليل إعداد الإيميل - Email Setup Guide

هذا الدليل يوضح كيفية إعداد وظيفة الإيميل لإرسال الفواتير.

## 🚀 الخيار الأول: Resend (الأسهل والأفضل)

Resend هو أسهل وأكثر الخيارات موثوقية لإرسال الإيميلات.

### الخطوات:

#### 1. إنشاء حساب Resend
- اذهب إلى [resend.com](https://resend.com)
- أنشئ حساب مجاني (3000 إيميل شهرياً مجاناً)

#### 2. الحصول على API Key
- اذهب إلى **API Keys** في لوحة التحكم
- اضغط **Create API Key**
- اختر اسم (مثل: "Invoice System")
- انسخ المفتاح (يبدأ بـ `re_`)

#### 3. إعداد البيئة
```bash
# أضف إلى ملف .env.local
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="rechnung@karinex.de"
EMAIL_DEV_MODE="true"  # للاختبار، غيرها لـ false للإنتاج
```

#### 4. إعداد النطاق (اختياري)
- أضف نطاقك في لوحة تحكم Resend
- أو استخدم sandbox domain للاختبار

## 📮 الخيار الثاني: SMTP (Gmail, Outlook, إلخ)

### إعداد Gmail:

#### 1. تفعيل المصادقة الثنائية
#### 2. إنشاء كلمة مرور التطبيق
- اذهب إلى إعدادات حساب Google
- الأمان ← التحقق بخطوتين ← كلمات مرور التطبيق
- أنشئ كلمة مرور لـ "البريد"

#### 3. إعداد البيئة
```bash
# أضف إلى ملف .env.local
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
```

### إعداد Outlook/Hotmail:
```bash
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_USER="your-email@outlook.com"
SMTP_PASS="your-password"
```

## 🧪 الاختبار

### 1. وضع التطوير
```bash
EMAIL_DEV_MODE="true"
```
يحاكي إرسال الإيميل بدون إرسال فعلي.

### 2. وضع الإنتاج
```bash
EMAIL_DEV_MODE="false"
```
يرسل إيميلات حقيقية.

## 🎯 الاستخدام

بعد الإعداد، يمكنك:
- الضغط على زر الإيميل بجانب أي فاتورة
- تخصيص العنوان والرسالة
- يتم إرفاق PDF تلقائياً
- يتم تتبع حالة الإيميل

## 🔧 حل المشاكل

### المشاكل الشائعة:

#### 1. "Authentication failed"
- تحقق من اسم المستخدم/كلمة المرور
- لـ Gmail: استخدم كلمة مرور التطبيق، ليس كلمة المرور العادية

#### 2. "Connection refused"
- تحقق من SMTP host و port
- تأكد أن الجدار الناري يسمح بالاتصالات الخارجة

#### 3. "API key invalid"
- تحقق أن Resend API key صحيح
- تأكد أنه يبدأ بـ `re_`

### الدعم:
- Resend: [resend.com/docs](https://resend.com/docs)
- Gmail: [support.google.com](https://support.google.com/accounts/answer/185833)
- Outlook: [support.microsoft.com](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040)

## ✅ الخلاصة

**للبدء السريع:**
1. سجل في Resend.com
2. احصل على API Key
3. أضف `RESEND_API_KEY` و `EMAIL_DEV_MODE="true"` لملف `.env.local`
4. جرب إرسال فاتورة!

**الميزات:**
- ✅ إرسال سريع وموثوق
- ✅ قوالب إيميل احترافية
- ✅ إرفاق PDF تلقائي
- ✅ تتبع حالة الإرسال
- ✅ وضع اختبار آمن تحقق من EMAIL_HOST و EMAIL_PORT
- تأكد من الاتصال بالإنترنت
- تحقق من إعدادات الـ firewall

### خطأ التحقق من البريد (Email Verification Error)

{{ ... }}
Error: Mail command failed: 550 5.1.1 User unknown
```

**الحل:**
- تأكد من صحة عنوان EMAIL_FROM
- للـ SendGrid/SES: تحقق من العنوان في لوحة التحكم
- تأكد من تحقق العنوان (verified)

## إعدادات الأمان المتقدمة

### SPF Record
أضف إلى DNS records:

```
v=spf1 include:_spf.google.com ~all  # للـ Gmail
v=spf1 include:sendgrid.net ~all     # للـ SendGrid
```

### DKIM
- Gmail: يُعد تلقائياً
- SendGrid: يُعد في Domain Authentication
- SES: يُعد في Domain Verification

### DMARC Record
```
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

## مراقبة الإرسال

### Logs
تحقق من console logs للأخطاء:

```bash
# في terminal حيث يعمل الخادم
npm run dev
```

### معدل الإرسال
- Gmail: 500 بريد/يوم
- SendGrid Free: 100 بريد/يوم
- SES: يبدأ من 200 بريد/يوم

## الدعم

إذا واجهت مشاكل:

1. تحقق من الـ console logs
2. تأكد من صحة متغيرات البيئة
3. اختبر الاتصال بـ SMTP server
4. تحقق من حالة الخدمة (Gmail/SendGrid/SES status)

## أمثلة كاملة

### Gmail Setup الكامل

```bash
# .env.local
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=karina@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM=karina@gmail.com
EMAIL_FROM_NAME=Karina Khrystych
```

### SendGrid Setup الكامل

```bash
# .env.local
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=SG.abc123def456ghi789jkl
EMAIL_FROM=karina@yourdomain.com
EMAIL_FROM_NAME=Karina Khrystych
```

بعد الإعداد الصحيح، ستعمل وظيفة إرسال البريد الإلكتروني بشكل كامل مع إرفاق PDF الفاتورة!
