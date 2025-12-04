# 🇩🇪 إعداد البريد الإلكتروني للمزودين الألمان

## المزودون المدعومون

### ✅ Web.de
```bash
EMAIL_HOST=smtp.web.de
EMAIL_PORT=587
EMAIL_USER=your-email@web.de
EMAIL_PASS=your-password
EMAIL_FROM=your-email@web.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

**خطوات الإعداد:**
1. اذهب إلى [Web.de Einstellungen](https://web.de)
2. انقر على "Einstellungen" → "POP3/IMAP"
3. فعّل "POP3 und IMAP Zugriff aktivieren"
4. استخدم بيانات اعتماد Web.de العادية

### ✅ GMX.de
```bash
EMAIL_HOST=mail.gmx.net
EMAIL_PORT=587
EMAIL_USER=your-email@gmx.de
EMAIL_PASS=your-password
EMAIL_FROM=your-email@gmx.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

**خطوات الإعداد:**
1. اذهب إلى [GMX Einstellungen](https://gmx.de)
2. انقر على "E-Mail" → "Einstellungen" → "POP3/IMAP"
3. فعّل "Externe E-Mail-Programme"
4. استخدم بيانات اعتماد GMX العادية

### ✅ T-Online
```bash
EMAIL_HOST=securesmtp.t-online.de
EMAIL_PORT=587
EMAIL_USER=your-email@t-online.de
EMAIL_PASS=your-password
EMAIL_FROM=your-email@t-online.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

### ✅ 1&1 (IONOS)
```bash
EMAIL_HOST=smtp.1und1.de
EMAIL_PORT=587
EMAIL_USER=your-email@1und1.de
EMAIL_PASS=your-password
EMAIL_FROM=your-email@1und1.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

## الإعداد السريع

### 1. اختر مزود البريد الخاص بك
حدد المزود المناسب من القائمة أعلاه

### 2. حدث ملف .env.local
انسخ الإعدادات المناسبة لمزودك في ملف `.env.local`

### 3. استبدل البيانات الوهمية
```bash
# استبدل هذه القيم بمعلوماتك الحقيقية
EMAIL_USER=your-actual-email@web.de
EMAIL_PASS=your-actual-password
EMAIL_FROM=your-actual-email@web.de
```

### 4. أعد تشغيل الخادم
```bash
npm run dev
```

## الاكتشاف التلقائي

النظام يكتشف تلقائياً إعدادات SMTP بناءً على عنوان البريد الإلكتروني:

- `@web.de` → `smtp.web.de:587`
- `@gmx.de` → `mail.gmx.net:587`
- `@gmx.net` → `mail.gmx.net:587`
- `@t-online.de` → `securesmtp.t-online.de:587`
- `@1und1.de` → `smtp.1und1.de:587`

## اختبار الإعداد

### 1. تحقق من console logs
```bash
# يجب أن تشاهد:
✅ Email configuration verified successfully for Web.de
Creating email transporter for Web.de: {
  host: 'smtp.web.de',
  port: 587,
  secure: false,
  user: '***@web.de'
}
```

### 2. اختبر إرسال فاتورة
1. اذهب إلى أي فاتورة
2. انقر على "Per E-Mail senden"
3. تحقق من وصول البريد للعميل

## استكشاف الأخطاء الشائعة

### خطأ المصادقة - Web.de
```
Error: Invalid login: 535 Authentication failed
```

**الحل:**
1. تأكد من تفعيل POP3/IMAP في إعدادات Web.de
2. اذهب إلى Web.de → Einstellungen → POP3/IMAP → Aktivieren
3. تأكد من صحة كلمة المرور

### خطأ المصادقة - GMX.de
```
Error: Invalid login: 535 Authentication failed
```

**الحل:**
1. فعّل "Externe E-Mail-Programme" في GMX
2. اذهب إلى GMX → E-Mail → Einstellungen → POP3/IMAP
3. فعّل "Zugriff über externe E-Mail-Programme"

### خطأ الاتصال
```
Error: connect ECONNREFUSED
```

**الحل:**
1. تحقق من الاتصال بالإنترنت
2. تأكد من صحة EMAIL_HOST
3. تحقق من إعدادات Firewall

### خطأ التشفير
```
Error: self signed certificate
```

**الحل:**
1. تأكد من استخدام PORT 587 (وليس 465)
2. تأكد من `secure: false` في الإعدادات

## التحقق من التسليم

### للتأكد من وصول البريد:

1. **تحقق من Sent folder** في مزود البريد
2. **اطلب تأكيد قراءة** من العميل
3. **تحقق من Spam folder** لدى العميل
4. **راقب console logs** للأخطاء

### مثال على logs ناجحة:
```
Starting email send process for invoice: RE-2024-001
Creating email transporter for Web.de
Generating PDF for invoice: RE-2024-001
Sending email to: customer@web.de
✅ Email sent successfully: <message-id@smtp.web.de>
```

## نصائح للتسليم الناجح

### 1. تحسين معدل التسليم
- استخدم عنوان FROM صالح ومتحقق منه
- تجنب الكلمات المشبوهة في الموضوع
- أرفق PDF صالح وغير تالف

### 2. تجنب Spam filters
- استخدم نص HTML و plain text
- تجنب الروابط المشبوهة
- استخدم عنوان reply-to صالح

### 3. مراقبة الأداء
- راقب معدلات الارتداد (bounce rates)
- تحقق من تقارير التسليم
- اختبر مع عناوين مختلفة

## الدعم الفني

إذا واجهت مشاكل:

1. **تحقق من console logs** للأخطاء التفصيلية
2. **اختبر إعدادات SMTP** مع عميل بريد آخر
3. **تواصل مع دعم المزود** للمساعدة
4. **تحقق من حالة الخدمة** للمزود

## مثال كامل - Web.de

```bash
# .env.local
EMAIL_HOST=smtp.web.de
EMAIL_PORT=587
EMAIL_USER=karina@web.de
EMAIL_PASS=mySecurePassword123
EMAIL_FROM=karina@web.de
EMAIL_FROM_NAME=Karina Khrystych
EMAIL_DEV_MODE=false
```

بعد هذا الإعداد، ستعمل وظيفة إرسال البريد الإلكتروني بشكل كامل مع المزودين الألمان! 🚀
