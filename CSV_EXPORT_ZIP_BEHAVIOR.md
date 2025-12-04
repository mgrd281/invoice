# ✅ CSV Export - نفس سلوك "als ZIP"

## 🎯 المطلوب
```
عند اختيار فواتير من الجدول (تظهر شارة 1 Rechnung ausgewählt) أريد أن يتصرف زر CSV Export 
بنفس طريقة als ZIP؛ أي يُظهر عدد العناصر المحددة ويصدّرها تحديدًا.
```

## ✅ التحسينات المطبقة

### **1. نص الزر يعرض العدد مثل "als ZIP"**

#### **قبل التحسين:**
```
[📊 CSV Export]
```

#### **بعد التحسين:**
```jsx
{selectedCount > 0 ? `${selectedCount} als CSV` : 'CSV Export'}

// أمثلة:
[📊 1 als CSV]     // عند اختيار فاتورة واحدة
[📊 3 als CSV]     // عند اختيار 3 فواتير
[📊 CSV Export]    // عند عدم الاختيار
```

#### **Tooltip مطابق لـ "als ZIP":**
```jsx
title={selectedCount > 0 
  ? `${selectedCount} ausgewählte Rechnungen als CSV exportieren` 
  : 'Alle Rechnungen als CSV exportieren'
}
```

### **2. شريط التأكيد في نافذة التصدير**

#### **للفواتير المحددة يدوياً:**
```jsx
// شريط أخضر رئيسي
✅ 1 Datensatz ausgewählt – es werden genau diese exportiert

// شريط تأكيد إضافي أزرق
┌─────────────────────────────────────────────────────────┐
│ ✅ Manuelle Auswahl bestätigt                           │
│ Es werden exakt die 1 ausgewählten Rechnungen          │
│ exportiert, unabhängig von anderen Filtern oder        │
│ der Seitenansicht.                                      │
└─────────────────────────────────────────────────────────┘
```

#### **للفواتير المفلترة:**
```jsx
alle gefilterten 25 Datensätze werden exportiert
```

#### **لجميع الفواتير:**
```jsx
alle 150 Datensätze werden exportiert
```

### **3. منطق النطاق المطبق**

#### **أولوية 1: التحديد اليدوي**
```typescript
if (selectedCount > 0) {
  return {
    count: selectedCount,
    text: `✅ ${selectedCount} Datensatz${selectedCount === 1 ? '' : 'sätze'} ausgewählt – es werden genau diese exportiert`,
    type: 'selected'
  }
}
```

#### **أولوية 2: الفلاتر المطبقة**
```typescript
else if (filters?.displayedInvoices?.length > 0) {
  return {
    count: filters.displayedInvoices.length,
    text: `alle gefilterten ${filters.displayedInvoices.length} Datensätze werden exportiert`,
    type: 'filtered'
  }
}
```

#### **أولوية 3: جميع البيانات**
```typescript
else {
  return {
    count: totalCount,
    text: `alle ${totalCount} Datensätze werden exportiert`,
    type: 'all'
  }
}
```

### **4. تعطيل الزر عند العدد = 0**

#### **الزر معطل:**
```jsx
disabled={loading || !canExport || (showColumnSelector && selectedColumns.length === 0)}

// نص الزر:
<AlertCircle className="h-4 w-4 mr-2" />
Keine Daten verfügbar
```

#### **شريط أحمر:**
```jsx
❌ Keine Daten zum Exportieren verfügbar
```

### **5. أسماء الملفات تعكس النوع**

#### **للمحددة يدوياً:**
```
rechnungen_ausgewählt_1_2024-01-15_14-30.csv
rechnungen_ausgewählt_3_2024-01-15_14-30.csv
```

#### **للمفلترة:**
```
rechnungen_gefiltert_25_2024-01-15_14-30.csv
```

#### **لجميع البيانات:**
```
rechnungen_alle_150_2024-01-15_14-30.csv
```

## 🎨 التجربة البصرية الجديدة

### **حالة 1: فاتورة واحدة محددة**
```
زر: [📊 1 als CSV]

نافذة التصدير:
┌─────────────────────────────────────────────────────────┐
│ ✅ 1 Datensatz ausgewählt – es werden genau diese      │
│ exportiert                                              │
│ ✅ Format: UTF-8 CSV mit Semikolon-Trennung           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ✅ Manuelle Auswahl bestätigt                           │
│ Es werden exakt die 1 ausgewählten Rechnungen          │
│ exportiert, unabhängig von anderen Filtern.            │
└─────────────────────────────────────────────────────────┘

Dateiname: rechnungen_ausgewählt_1_2024-01-15_14-30.csv

[🟢 1 Datensätze herunterladen]
```

### **حالة 2: 3 فواتير محددة**
```
زر: [📊 3 als CSV]

نافذة التصدير:
┌─────────────────────────────────────────────────────────┐
│ ✅ 3 Datensätze ausgewählt – es werden genau diese     │
│ exportiert                                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ✅ Manuelle Auswahl bestätigt                           │
│ Es werden exakt die 3 ausgewählten Rechnungen          │
│ exportiert, unabhängig von anderen Filtern.            │
└─────────────────────────────────────────────────────────┘

[🟢 3 Datensätze herunterladen]
```

### **حالة 3: بدون تحديد (مفلترة)**
```
زر: [📊 CSV Export]

نافذة التصدير:
┌─────────────────────────────────────────────────────────┐
│ 📊 alle gefilterten 25 Datensätze werden exportiert    │
└─────────────────────────────────────────────────────────┘

[🟢 25 Datensätze herunterladen]
```

### **حالة 4: لا توجد بيانات**
```
زر: [📊 CSV Export] (معطل)

نافذة التصدير:
┌─────────────────────────────────────────────────────────┐
│ 📊 0 Datensätze werden exportiert                      │
│ ❌ Keine Daten zum Exportieren verfügbar               │
└─────────────────────────────────────────────────────────┘

[🔴 Keine Daten verfügbar] (معطل)
```

## 🧪 مقارنة مع "als ZIP"

### **"als ZIP" Button:**
```jsx
{selectedInvoices.size > 0 ? `${selectedInvoices.size} als ZIP` : 'Alle als ZIP'}
```

### **"CSV Export" Button (الآن):**
```jsx
{selectedCount > 0 ? `${selectedCount} als CSV` : 'CSV Export'}
```

### **نفس المنطق:**
- ✅ **عرض العدد** عند وجود تحديد
- ✅ **نص عام** عند عدم التحديد
- ✅ **Tooltip واضح** يشرح الوظيفة
- ✅ **احترام التحديد اليدوي** كأولوية قصوى

## 🎯 معايير القبول المحققة

### **✅ نفس تجربة المستخدم:**
- الزر يعرض العدد مثل "als ZIP" تماماً
- نفس منطق الأولوية (محدد → مفلتر → الكل)
- نفس طريقة عرض العدد والـ tooltip

### **✅ الملف يطابق العدد:**
- عند التحديد → يصدر المحدد فقط
- عند الفلترة → يصدر المفلتر فقط
- عند عدم التحديد → يصدر الكل

### **✅ احترام الفلاتر:**
- التحديد اليدوي يتجاهل الفلاتر
- عدم التحديد يطبق الفلاتر
- العدد المعروض يطابق الملف الناتج

## 🚀 النتيجة النهائية

الآن CSV Export يتصرف **بالضبط** مثل "als ZIP":
- ✅ **نفس نص الزر** مع العدد
- ✅ **نفس منطق التحديد** والأولوية
- ✅ **نفس احترام الفلاتر** والتحديد اليدوي
- ✅ **تأكيد واضح** في نافذة التصدير
- ✅ **ملف يطابق** العدد المعروض

**التطابق الكامل مع سلوك "als ZIP" محقق!** 🎉
