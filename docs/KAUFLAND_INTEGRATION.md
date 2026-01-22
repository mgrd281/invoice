# Kaufland Integration

هذا الدليل يشرح كيفية استخدام تكامل Kaufland لإرسال المنتجات من تطبيقك إلى متجر Kaufland.

## الإعداد الأولي

1. **افتح صفحة الإعدادات:**
   - اذهب إلى `/settings`
   - انقر على "Integrationen" (التكاملات)
   - اختر "Kaufland Integration"

2. **أدخل مفاتيح API:**
   - Client Key: `117126fd87983cb8f6594ac288fb407e`
   - Secret Key: `6dfe294b97f943a4c5a7f8de954357842aed6303d2318b7f28d0de699f807b68`
   - أو استخدم زر "Standard-Schlüssel verwenden" لملء المفاتيح تلقائياً

3. **اختبر الاتصال:**
   - انقر على "Verbindung testen" للتحقق من أن الاتصال يعمل

4. **احفظ الإعدادات:**
   - انقر على "Speichern"

## إرسال المنتجات

### إرسال منتج واحد

```typescript
const product = {
  ean: "1234567890123", // EAN مطلوب
  title: "اسم المنتج",
  description: "وصف المنتج",
  price: 29.99,
  quantity: 100,
  sku: "SKU-123",
  images: ["https://example.com/image.jpg"],
  shippingTime: 3 // أيام (اختياري)
}

const response = await fetch('/api/kaufland/products/sync-single', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(product)
})
```

### إرسال عدة منتجات

```typescript
const products = [
  {
    ean: "1234567890123",
    title: "منتج 1",
    description: "وصف المنتج 1",
    price: 29.99,
    quantity: 100
  },
  {
    ean: "1234567890124",
    title: "منتج 2",
    description: "وصف المنتج 2",
    price: 39.99,
    quantity: 50
  }
]

const response = await fetch('/api/kaufland/products/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ products })
})
```

## API Endpoints

### GET `/api/kaufland/settings`
الحصول على إعدادات Kaufland الحالية

### POST `/api/kaufland/settings`
حفظ إعدادات Kaufland

### POST `/api/kaufland/test-connection`
اختبار الاتصال بـ Kaufland API

### POST `/api/kaufland/products/sync-single`
إرسال منتج واحد إلى Kaufland

### POST `/api/kaufland/products/sync`
إرسال عدة منتجات إلى Kaufland

### GET `/api/kaufland/products`
الحصول على المنتجات من Kaufland

## متطلبات المنتج

- **EAN**: مطلوب (رقم EAN/Barcode)
- **Title**: مطلوب (اسم المنتج)
- **Description**: مطلوب (وصف المنتج)
- **Price**: مطلوب (السعر)
- **Quantity**: مطلوب (الكمية المتاحة)
- **SKU**: اختياري (رقم SKU)
- **Images**: اختياري (مصفوفة من روابط الصور)
- **ShippingTime**: اختياري (وقت الشحن بالأيام)

## ملاحظات مهمة

1. **EAN مطلوب**: كل منتج يجب أن يحتوي على EAN/Barcode صالح
2. **الصور**: يجب أن تكون روابط مباشرة للصور (URLs)
3. **السعر**: يجب أن يكون باليورو (EUR)
4. **الكمية**: يجب أن تكون رقم صحيح

## استكشاف الأخطاء

### خطأ: "Client Key oder Secret Key fehlt"
- تأكد من إدخال Client Key و Secret Key في الإعدادات

### خطأ: "Verbindungsfehler"
- تحقق من أن المفاتيح صحيحة
- تأكد من أن API Base URL صحيح
- تحقق من اتصال الإنترنت

### خطأ: "Produkt benötigt eine EAN/Barcode"
- تأكد من أن كل منتج يحتوي على EAN صالح

## الملفات ذات الصلة

- `lib/kaufland-settings.ts` - إدارة إعدادات Kaufland
- `lib/kaufland-api.ts` - مكتبة API لـ Kaufland
- `app/api/kaufland/` - API endpoints
- `app/settings/kaufland/` - صفحة إعدادات الواجهة

