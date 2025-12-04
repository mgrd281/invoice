# 📄 نظام إدارة الفواتير الألماني

نظام شامل لإدارة وإنشاء الفواتير باللغة الألمانية مع دعم CSV وإرسال البريد الإلكتروني.

## ✨ المميزات

- 🧾 **إنشاء فواتير احترافية** بتصميم ألماني معتمد
- 📊 **استيراد CSV** من Shopify وأنظمة أخرى
- 📧 **إرسال إيميل تلقائي** مع PDF مرفق
- 🏢 **إدارة الشركات** والعملاء
- 🎨 **واجهة عصرية** مع Tailwind CSS
- 🔐 **نظام مصادقة آمن**
- 📱 **تصميم متجاوب** لجميع الأجهزة

## 🚀 التقنيات المستخدمة

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL
- **Authentication:** NextAuth.js
- **PDF Generation:** jsPDF
- **Email:** Resend API
- **UI Components:** Radix UI

## 📦 التثبيت

1. **استنساخ المشروع:**
   ```bash
   git clone <repository-url>
   cd rechnung
   ```

2. **تثبيت التبعيات:**
   ```bash
   npm install
   ```

3. **إعداد قاعدة البيانات:**
   ```bash
   cp .env.example .env.local
   # أضف DATABASE_URL في .env.local
   npx prisma db push
   ```

4. **تشغيل التطبيق:**
   ```bash
   npm run dev
   ```

## 🔧 متغيرات البيئة

```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication
NEXTAUTH_SECRET="your-secret-key-32-characters-minimum"
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="rechnung@yourdomain.com"
EMAIL_DEV_MODE="true"
```

## 📧 إعداد البريد الإلكتروني

1. **إنشاء حساب Resend:**
   - اذهب إلى [resend.com](https://resend.com)
   - أنشئ حساب مجاني

2. **الحصول على API Key:**
   - في لوحة التحكم ← API Keys
   - أنشئ مفتاح جديد

3. **إضافة المفتاح:**
   ```env
   RESEND_API_KEY="re_your_api_key"
   EMAIL_DEV_MODE="false"  # للإرسال الفعلي
   ```

## 📊 استيراد CSV

يدعم النظام استيراد ملفات CSV من:
- Shopify
- WooCommerce
- أنظمة أخرى

**تنسيق CSV المطلوب:**
```csv
Name,Email,Lineitem name,Lineitem price,Lineitem quantity,Lineitem sku
John Doe,john@example.com,Product Name,19.99,2,SKU123
```

## 🏗️ البناء والنشر

```bash
# بناء للإنتاج
npm run build

# تشغيل الإنتاج
npm start

# فحص الكود
npm run lint
```

## 🌐 النشر

### Vercel (موصى به):
1. رفع الكود إلى GitHub
2. ربط المشروع بـ Vercel
3. إضافة متغيرات البيئة
4. النشر التلقائي!

### Railway:
1. إنشاء مشروع جديد
2. ربط GitHub repository
3. إضافة قاعدة بيانات PostgreSQL
4. تكوين متغيرات البيئة

## 📁 هيكل المشروع

```
├── app/                 # Next.js App Router
├── components/          # React Components
├── lib/                # Utilities & Services
├── prisma/             # Database Schema
├── public/             # Static Assets
└── user-storage/       # User Uploads
```

## 🔐 الأمان

- مصادقة آمنة مع NextAuth.js
- تشفير كلمات المرور
- حماية API routes
- تحقق من صحة البيانات

## 🐛 حل المشاكل

### مشاكل شائعة:

1. **خطأ قاعدة البيانات:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

2. **مشاكل البناء:**
   ```bash
   rm -rf .next
   npm install
   npm run build
   ```

3. **مشاكل الإيميل:**
   - تحقق من RESEND_API_KEY
   - تأكد من EMAIL_DEV_MODE

## 📞 الدعم

- 📧 البريد الإلكتروني: support@example.com
- 📖 الوثائق: راجع ملفات المساعدة في المجلد
- 🐛 الأخطاء: أنشئ issue في GitHub

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT.

---

**تم تطويره بـ ❤️ لإدارة الفواتير الألمانية**
