





# استيعاب وتحليل ملفات CSV (طلبات Shopify)

## مقدمة

تعد القدرة على استيعاب وتحليل ملفات CSV المصدرة من Shopify أمرًا بالغ الأهمية لتطبيقنا، حيث تشكل هذه الملفات نقطة البداية لإنشاء الفواتير. تتطلب هذه العملية خط أنابيب قويًا ومرنًا يمكنه التعامل مع أحجام مختلفة من البيانات، والتحقق من صحة كل صف، والتعامل مع الأخطاء بكفاءة، وضمان عدم تكرار البيانات. في هذا القسم، سنفصل كيفية معالجة ملفات CSV لطلبات Shopify، بدءًا من تحديد الأعمدة المتوقعة وصولاً إلى توفير مثال عملي لخط أنابيب التحليل مع اختبارات الوحدة.

## أعمدة Shopify CSV المتوقعة

تتضمن ملفات CSV لطلبات Shopify عادةً مجموعة واسعة من الأعمدة التي توفر تفاصيل شاملة حول الطلبات والعملاء والمنتجات. سنركز على الأعمدة الأكثر صلة بإنشاء الفواتير وتعيينها إلى مخطط قاعدة البيانات الداخلي الخاص بنا. من المهم ملاحظة أن أسماء الأعمدة قد تختلف قليلاً بناءً على إصدار Shopify أو التخصيصات، ولكننا سنفترض مجموعة قياسية من الحقول.

فيما يلي قائمة بالأعمدة النموذجية التي نتوقعها من ملف CSV لطلبات Shopify وكيفية تعيينها إلى كياناتنا الداخلية:

| اسم عمود Shopify CSV | الكيان الداخلي المستهدف | الحقل الداخلي المستهدف | الوصف                                          |
| :------------------- | :--------------------- | :--------------------- | :--------------------------------------------- |
| `Name`               | `Order`                | `orderNumber`          | رقم الطلب الفريد في Shopify.                   |
| `Email`              | `Customer`             | `email`                | البريد الإلكتروني للعميل.                      |
| `Financial Status`   | `Order`                | `status`               | حالة الدفع للطلب (مثل Paid, Pending).          |
| `Fulfillment Status` | `Order`                | `status`               | حالة تنفيذ الطلب (مثل Fulfilled, Unfulfilled). |
| `Subtotal`           | `Order`                | `totalNet`             | إجمالي قيمة المنتجات قبل الضرائب والشحن.      |
| `Shipping`           | `Order`                | `shippingCost`         | تكلفة الشحن (قد تحتاج إلى معالجة منفصلة).     |
| `Taxes`              | `Order`                | `totalTax`             | إجمالي الضرائب المطبقة على الطلب.             |
| `Total`              | `Order`                | `totalAmount`          | إجمالي قيمة الطلب بما في ذلك الضرائب والشحن.  |
| `Currency`           | `Order`                | `currency`             | عملة الطلب (مثل EUR).                         |
| `Lineitem quantity`  | `InvoiceItem`          | `quantity`             | كمية المنتج في بند الفاتورة.                  |
| `Lineitem name`      | `InvoiceItem`          | `description`          | اسم المنتج/وصفه.                              |
| `Lineitem price`     | `InvoiceItem`          | `unitPrice`            | سعر الوحدة للمنتج.                            |
| `Billing Name`       | `Customer`             | `name`                 | اسم العميل للفواتير.                          |
| `Billing Address1`   | `Customer`             | `address`              | سطر العنوان الأول للعميل.                     |
| `Billing Address2`   | `Customer`             | `address`              | سطر العنوان الثاني للعميل (يُدمج مع الأول).   |
| `Billing Company`    | `Customer`             | `companyName`          | اسم شركة العميل (إن وجد).                     |
| `Billing Zip`        | `Customer`             | `zipCode`              | الرمز البريدي للعميل.                         |
| `Billing City`       | `Customer`             | `city`                 | مدينة العميل.                                 |
| `Billing Province`   | `Customer`             | `province`             | مقاطعة العميل.                                |
| `Billing Country`    | `Customer`             | `country`              | بلد العميل.                                   |
| `Shipping Name`      | `Customer`             | `shippingName`         | اسم المستلم للشحن.                            |
| `Shipping Address1`  | `Customer`             | `shippingAddress`      | سطر العنوان الأول للشحن.                      |
| `Shipping Address2`  | `Customer`             | `shippingAddress`      | سطر العنوان الثاني للشحن (يُدمج مع الأول).    |
| `Shipping Company`   | `Customer`             | `shippingCompanyName`  | اسم شركة الشحن (إن وجد).                      |
| `Shipping Zip`       | `Customer`             | `shippingZipCode`      | الرمز البريدي للشحن.                          |
| `Shipping City`      | `Customer`             | `shippingCity`         | مدينة الشحن.                                  |
| `Shipping Province`  | `Customer`             | `shippingProvince`     | مقاطعة الشحن.                                 |
| `Shipping Country`   | `Customer`             | `shippingCountry`      | بلد الشحن.                                    |
| `Shopify ID`         | `Order`                | `shopifyOrderId`       | المعرف الفريد للطلب في Shopify.               |
| `Customer ID`        | `Customer`             | `shopifyCustomerId`    | المعرف الفريد للعميل في Shopify.              |

**ملاحظات هامة:**

*   **تعدد البنود (Line Items):** غالبًا ما يحتوي ملف CSV على صفوف متعددة لنفس الطلب إذا كان الطلب يحتوي على عدة بنود (منتجات). يجب معالجة هذه الصفوف لتجميعها تحت طلب واحد.
*   **البيانات المالية:** يجب تحويل الحقول المالية (مثل `Subtotal`, `Shipping`, `Taxes`, `Total`, `Lineitem price`) إلى أرقام عشرية دقيقة.
*   **العناوين:** قد تحتاج حقول العنوان إلى دمج (مثل `Address1` و `Address2`) أو تحليلها بشكل أكبر لتناسب نموذجنا الداخلي.
*   **الحالة:** يمكن استخدام `Financial Status` و `Fulfillment Status` لتحديد حالة الطلب النهائية.

## خط أنابيب التحليل القوي (Robust Parser Pipeline)

لضمان معالجة فعالة وموثوقة لملفات CSV، سنقوم بتصميم خط أنابيب للتحليل يتميز بالتدفق (streaming)، كفاءة الذاكرة (memory-safe)، معالجة الأخطاء، والتحقق من صحة الصفوف، وإلغاء التكرار.

### المكونات الرئيسية لخط الأنابيب:

1.  **التحميل المسبق والتحقق الأولي (Pre-upload & Initial Validation):**
    *   **التحقق من نوع الملف:** التأكد من أن الملف الذي تم تحميله هو بالفعل ملف CSV.
    *   **حدود الحجم:** فرض قيود على حجم الملف لمنع هجمات رفض الخدمة (DoS) أو استهلاك الموارد بشكل مفرط.
    *   **مسح الفيروسات (اختياري):** في بيئات الإنتاج الحساسة، قد يكون من الضروري إجراء مسح للفيروسات.

2.  **التخزين المؤقت (Temporary Storage):**
    *   يتم تخزين ملف CSV الذي تم تحميله مؤقتًا في تخزين متوافق مع S3. هذا يسمح بالمعالجة غير المتزامنة ويقلل من استهلاك الذاكرة على الخادم الرئيسي.

3.  **معالجة الخلفية (Background Processing):**
    *   يتم إرسال مهمة تحليل CSV إلى قائمة انتظار (Queue) للمعالجة في الخلفية. هذا يمنع حظر طلب المستخدم ويحسن استجابة الواجهة الأمامية. يتم تحديث حالة مهمة التحميل (`UploadJob`) في قاعدة البيانات.

4.  **قراءة التدفق (Streaming Read):**
    *   بدلاً من تحميل الملف بأكمله في الذاكرة، سيتم قراءة ملف CSV كتدفق (stream). هذا ضروري للملفات الكبيرة ويضمن كفاءة الذاكرة.
    *   يمكن استخدام مكتبات مثل `csv-parser` في Node.js لمعالجة التدفق.

5.  **تحليل الصفوف (Row Parsing):**
    *   يتم تحليل كل سطر في ملف CSV إلى كائن JavaScript. يجب أن يتعامل المحلل مع الفواصل، علامات الاقتباس، والأحرف الخاصة بشكل صحيح.

6.  **التحقق من صحة الصفوف (Row-level Validation):**
    *   يتم تطبيق مخطط `shopifyOrderCsvRowSchema` (المعرف في قسم نمذجة البيانات) على كل صف. أي صف لا يفي بالمخطط يتم تسجيله كخطأ ويتم تخطيه.
    *   يتم تجميع الأخطاء وربطها بمهمة التحميل (`UploadJob`) لإبلاغ المستخدم.

7.  **التعيين والتحويل (Mapping & Transformation):**
    *   يتم تعيين البيانات الصالحة من صف CSV إلى نموذج البيانات الداخلي (`Customer`, `Order`, `InvoiceItem`).
    *   تتضمن التحويلات تحويل السلاسل النصية إلى أرقام (للمبالغ والكميات)، ودمج حقول العنوان، وتحديد حالة الطلب بناءً على حقول Shopify.

8.  **إلغاء التكرار (Deduplication):**
    *   **على مستوى الطلب:** يجب تحديد الطلبات الفريدة باستخدام `shopifyOrderId` أو `orderNumber`. إذا تم العثور على طلب موجود، يتم تحديثه بدلاً من إنشاء طلب جديد.
    *   **على مستوى العميل:** يجب تحديد العملاء الفريدين باستخدام `shopifyCustomerId` أو `email` (إذا كان فريدًا). يتم إنشاء عميل جديد فقط إذا لم يتم العثور على عميل موجود.
    *   **على مستوى بنود الفاتورة:** يتم تجميع بنود الفاتورة لنفس الطلب.

9.  **المعالجة المعاملاتية (Transactional Processing):**
    *   يجب أن تتم عملية حفظ البيانات في قاعدة البيانات كمعاملة واحدة لكل طلب (أو مجموعة من الطلبات) لضمان الاتساق. إذا فشل جزء من الحفظ، يتم التراجع عن العملية بأكملها.

10. **تسجيل الأخطاء والإبلاغ (Error Logging & Reporting):**
    *   يتم تسجيل جميع الأخطاء (مثل صفوف CSV غير الصالحة، أخطاء قاعدة البيانات) في `AuditLog` وربطها بـ `UploadJob`. يتم إبلاغ المستخدم بملخص الأخطاء بعد اكتمال المعالجة.

### مثال على خط أنابيب التحليل (Node.js)

```typescript
// src/services/shopify-csv-parser.service.ts
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { shopifyOrderCsvRowSchema } from '../schemas/shopify-order-csv.schema';
import { CreateCustomerDto, CreateOrderDto, CreateInvoiceItemDto } from '../dtos/shopify-data.dto';

const prisma = new PrismaClient();

interface ParsedShopifyOrder {
  customer: CreateCustomerDto;
  order: CreateOrderDto;
  items: CreateInvoiceItemDto[];
}

export class ShopifyCsvParserService {
  async parseAndProcessCsv(fileStream: Readable, organizationId: string, userId: string, uploadJobId: string): Promise<void> {
    let processedRows = 0;
    let failedRows = 0;
    const errors: string[] = [];
    const ordersMap = new Map<string, ParsedShopifyOrder>(); // Map to group line items by order

    return new Promise((resolve, reject) => {
      fileStream
        .pipe(csvParser())
        .on('data', async (row: any) => {
          try {
            // Pause the stream to process data asynchronously
            fileStream.pause();

            const validatedRow = shopifyOrderCsvRowSchema.parse(row);
            const shopifyOrderId = validatedRow['Shopify ID'];

            if (!ordersMap.has(shopifyOrderId)) {
              // Initialize new order entry
              ordersMap.set(shopifyOrderId, {
                customer: this.mapCsvRowToCustomer(validatedRow, organizationId),
                order: this.mapCsvRowToOrder(validatedRow, organizationId),
                items: [],
              });
            }

            const orderEntry = ordersMap.get(shopifyOrderId);
            if (orderEntry) {
              orderEntry.items.push(this.mapCsvRowToInvoiceItem(validatedRow));
            }
            processedRows++;
          } catch (error: any) {
            failedRows++;
            errors.push(`Row ${processedRows + failedRows}: ${error.message || JSON.stringify(error)}`);
          } finally {
            // Resume the stream after processing
            fileStream.resume();
          }
        })
        .on('end', async () => {
          console.log(`CSV parsing finished. Processed: ${processedRows}, Failed: ${failedRows}`);
          await this.processGroupedOrders(Array.from(ordersMap.values()), organizationId, userId, uploadJobId, errors);
          resolve();
        })
        .on('error', (error: any) => {
          console.error('CSV Stream Error:', error);
          errors.push(`CSV Stream Error: ${error.message}`);
          prisma.uploadJob.update({
            where: { id: uploadJobId },
            data: { status: 'FAILED', errorMessage: errors.join('\n'), processedRows, failedRows },
          }).then(() => reject(error));
        });
    });
  }

  private mapCsvRowToCustomer(row: ShopifyOrderCsvRow, organizationId: string): CreateCustomerDto {
    return {
      organizationId,
      name: row['Billing Name'],
      email: row['Email'] || undefined,
      address: `${row['Billing Address1']} ${row['Billing Address2'] || ''}`.trim(),
      zipCode: row['Billing Zip'],
      city: row['Billing City'],
      country: row['Billing Country'],
      shopifyCustomerId: row['Customer ID'] || undefined,
      // companyName: row['Billing Company'] || undefined, // Add if CSV contains this field
    };
  }

  private mapCsvRowToOrder(row: ShopifyOrderCsvRow, organizationId: string): CreateOrderDto {
    const totalAmount = row['Total'];
    const totalTax = row['Taxes'];
    const subtotal = row['Subtotal'];

    return {
      organizationId,
      orderNumber: row['Name'],
      orderDate: new Date(), // Shopify CSV might have an order date field, use that if available
      totalAmount: new Prisma.Decimal(totalAmount),
      totalTax: new Prisma.Decimal(totalTax),
      totalNet: new Prisma.Decimal(subtotal),
      currency: row['Currency'],
      status: this.mapShopifyFinancialStatusToOrderStatus(row['Financial Status'], row['Fulfillment Status']),
      shopifyOrderId: row['Shopify ID'],
    };
  }

  private mapCsvRowToInvoiceItem(row: ShopifyOrderCsvRow): CreateInvoiceItemDto {
    const quantity = row['Lineitem quantity'];
    const unitPrice = row['Lineitem price'];
    const netAmount = quantity * unitPrice;
    // Assuming a default tax rate for now, this should be dynamically determined
    const taxRate = 0.19; // Example: 19% German VAT
    const taxAmount = netAmount * taxRate;
    const grossAmount = netAmount + taxAmount;

    return {
      description: row['Lineitem name'],
      quantity: new Prisma.Decimal(quantity),
      unitPrice: new Prisma.Decimal(unitPrice),
      // taxRateId: 'default-tax-rate-id', // This needs to be fetched dynamically
      netAmount: new Prisma.Decimal(netAmount),
      grossAmount: new Prisma.Decimal(grossAmount),
      taxAmount: new Prisma.Decimal(taxAmount),
    };
  }

  private mapShopifyFinancialStatusToOrderStatus(financialStatus: string, fulfillmentStatus: string): OrderStatus {
    if (financialStatus === 'paid' && fulfillmentStatus === 'fulfilled') {
      return 'COMPLETED';
    } else if (financialStatus === 'pending') {
      return 'PENDING';
    } else if (financialStatus === 'refunded' || financialStatus === 'voided') {
      return 'CANCELLED';
    }
    return 'PENDING'; // Default or other statuses
  }

  private async processGroupedOrders(groupedOrders: ParsedShopifyOrder[], organizationId: string, userId: string, uploadJobId: string, errors: string[]): Promise<void> {
    for (const groupedOrder of groupedOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Deduplicate and create/update customer
          let customer = await tx.customer.findUnique({
            where: { shopifyCustomerId: groupedOrder.customer.shopifyCustomerId || '' },
          });

          if (!customer) {
            customer = await tx.customer.create({ data: groupedOrder.customer });
          } else {
            // Update existing customer if necessary
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: groupedOrder.customer,
            });
          }

          // Deduplicate and create/update order
          let order = await tx.order.findUnique({
            where: { shopifyOrderId: groupedOrder.order.shopifyOrderId || '' },
          });

          if (!order) {
            order = await tx.order.create({
              data: { ...groupedOrder.order, customerId: customer.id },
            });
          } else {
            // Update existing order if necessary
            order = await tx.order.update({
              where: { id: order.id },
              data: { ...groupedOrder.order, customerId: customer.id },
            });
          }

          // Create invoice items (assuming they are always new for a given order import)
          for (const item of groupedOrder.items) {
            // Here, you would fetch the actual taxRateId based on the organization's configured tax rates
            // For simplicity, we'll use a placeholder or a default one.
            const defaultTaxRate = await tx.taxRate.findFirst({ where: { organizationId, isDefault: true } });
            if (!defaultTaxRate) {
              throw new Error('Default tax rate not found for organization.');
            }
            await tx.invoiceItem.create({
              data: { ...item, invoiceId: order.id, taxRateId: defaultTaxRate.id },
            });
          }

          // Optionally, trigger invoice generation here or as a separate background job
          // For now, we just process orders and items.
        });
      } catch (transactionError: any) {
        console.error(`Transaction failed for Shopify Order ID ${groupedOrder.order.shopifyOrderId}:`, transactionError);
        errors.push(`Failed to process order ${groupedOrder.order.orderNumber}: ${transactionError.message}`);
        await prisma.auditLog.create({
          data: {
            organizationId,
            userId,
            action: 'Shopify CSV Order Processing Failed',
            entityType: 'Order',
            entityId: groupedOrder.order.shopifyOrderId,
            details: { error: transactionError.message, orderData: groupedOrder.order },
          },
        });
        failedRows++;
      }
    }

    // Update the upload job status
    await prisma.uploadJob.update({
      where: { id: uploadJobId },
      data: {
        status: errors.length > 0 ? 'FAILED' : 'COMPLETED',
        errorMessage: errors.length > 0 ? errors.join('\n') : null,
        processedRows: processedRows - failedRows,
        failedRows,
      },
    });
  }
}

// src/dtos/shopify-data.dto.ts
import { Prisma } from '@prisma/client';

export interface CreateCustomerDto {
  organizationId: string;
  name: string;
  email?: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  shopifyCustomerId?: string;
}

export interface CreateOrderDto {
  organizationId: string;
  orderNumber: string;
  orderDate: Date;
  totalAmount: Prisma.Decimal;
  totalTax: Prisma.Decimal;
  totalNet: Prisma.Decimal;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  shopifyOrderId?: string;
}

export interface CreateInvoiceItemDto {
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  // taxRateId: string; // Will be added dynamically during processing
  netAmount: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
}
```

**كيفية تشغيل هذا الكود:**

1.  **تثبيت التبعيات:** تأكد من تثبيت `csv-parser`, `zod`, و `prisma`.
    ```bash
    npm install csv-parser zod @prisma/client
    npm install -D prisma ts-node typescript
    npx prisma init
    ```
2.  **إعداد Prisma:** قم بتكوين `schema.prisma` (كما هو موضح في القسم السابق) وقم بتشغيل ترحيلات قاعدة البيانات.
    ```bash
    npx prisma migrate dev --name init
    npx prisma generate
    ```
3.  **إنشاء ملفات DTOs:** قم بإنشاء الملف `src/dtos/shopify-data.dto.ts` وانسخ المحتوى أعلاه.
4.  **إنشاء مخطط Zod:** قم بإنشاء الملف `src/schemas/shopify-order-csv.schema.ts` وانسخ المحتوى من قسم 


نمذجة البيانات والتحقق من صحتها.
5.  **إنشاء خدمة التحليل:** قم بإنشاء الملف `src/services/shopify-csv-parser.service.ts` وانسخ المحتوى أعلاه.
6.  **مثال على الاستخدام:** يمكنك استخدام الخدمة كما يلي:
    ```typescript
    // src/app.ts (مثال على نقطة الدخول)
    import { createReadStream } from 'fs';
    import { ShopifyCsvParserService } from './services/shopify-csv-parser.service';

    async function runParser() {
      const filePath = './sample-shopify-orders.csv'; // مسار ملف CSV الخاص بك
      const organizationId = 'your-organization-id'; // معرف المنظمة الخاص بك
      const userId = 'your-user-id'; // معرف المستخدم الخاص بك
      const uploadJobId = 'your-upload-job-id'; // معرف مهمة التحميل

      const fileStream = createReadStream(filePath);
      const parserService = new ShopifyCsvParserService();

      try {
        console.log('بدء تحليل ملف CSV...');
        await parserService.parseAndProcessCsv(fileStream, organizationId, userId, uploadJobId);
        console.log('اكتمل تحليل ملف CSV بنجاح.');
      } catch (error) {
        console.error('فشل تحليل ملف CSV:', error);
      }
    }

    runParser();
    ```

## مثال على مقتطف CSV

لنفترض أن لدينا ملف CSV بالاسم `sample-shopify-orders.csv` بالمحتوى التالي:

```csv
Name,Email,Financial Status,Fulfillment Status,Subtotal,Shipping,Taxes,Total,Currency,Lineitem quantity,Lineitem name,Lineitem price,Billing Name,Billing Address1,Billing Zip,Billing City,Billing Country,Shipping Name,Shipping Address1,Shipping Zip,Shipping City,Shipping Country,Shopify ID,Customer ID
#1001,kunde1@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,1,Produkt A,99.99,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,123456789,CUST1
#1002,kunde2@example.com,pending,unfulfilled,49.99,3.00,9.50,62.49,EUR,2,Produkt B,24.99,Erika Mustermann,Beispielweg 2,54321,Beispielstadt,Germany,Erika Mustermann,Beispielweg 2,54321,Beispielstadt,Germany,987654321,CUST2
#1001,kunde1@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,2,Produkt C,10.00,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,123456789,CUST1
```

**ملاحظات على المثال:**

*   يحتوي الطلب `#1001` على بندين (`Produkt A` و `Produkt C`)، مما يوضح كيفية تجميع بنود الفاتورة لنفس الطلب.
*   الطلب `#1002` هو طلب منفصل.
*   يتم تضمين جميع الحقول الضرورية للتحقق من الصحة والتعيين.

## مثال كامل على التحليل مع اختبارات الوحدة

لضمان موثوقية خط أنابيب التحليل، من الضروري كتابة اختبارات وحدة شاملة. سنستخدم `jest` (أو `vitest` كبديل) لاختبار خدمة التحليل لدينا.

```typescript
// __tests__/shopify-csv-parser.service.test.ts
import { Readable } from 'stream';
import { ShopifyCsvParserService } from '../src/services/shopify-csv-parser.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const prisma = new PrismaClient();
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $transaction: jest.fn((callback) => callback({
      customer: {
        findUnique: jest.fn(() => null),
        create: jest.fn((data) => ({ id: 'new-customer-id', ...data.data })),
        update: jest.fn((data) => ({ id: 'existing-customer-id', ...data.data })),
      },
      order: {
        findUnique: jest.fn(() => null),
        create: jest.fn((data) => ({ id: 'new-order-id', ...data.data })),
        update: jest.fn((data) => ({ id: 'existing-order-id', ...data.data })),
      },
      invoiceItem: {
        create: jest.fn((data) => ({ id: 'new-item-id', ...data.data })),
      },
      taxRate: {
        findFirst: jest.fn(() => ({ id: 'default-tax-rate-id', rate: 0.19 })), // Mock default tax rate
      },
    })),
    uploadJob: {
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  })),
}));

describe('ShopifyCsvParserService', () => {
  let service: ShopifyCsvParserService;
  const organizationId = 'test-org-id';
  const userId = 'test-user-id';
  const uploadJobId = 'test-upload-job-id';

  beforeEach(() => {
    service = new ShopifyCsvParserService();
    // Reset mocks before each test
    (prisma.$transaction as jest.Mock).mockClear();
    (prisma.uploadJob.update as jest.Mock).mockClear();
    (prisma.auditLog.create as jest.Mock).mockClear();
  });

  it('should parse a valid CSV and process orders', async () => {
    const csvContent = `Name,Email,Financial Status,Fulfillment Status,Subtotal,Shipping,Taxes,Total,Currency,Lineitem quantity,Lineitem name,Lineitem price,Billing Name,Billing Address1,Billing Zip,Billing City,Billing Country,Shipping Name,Shipping Address1,Shipping Zip,Shipping City,Shipping Country,Shopify ID,Customer ID
#1001,kunde1@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,1,Produkt A,99.99,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,123456789,CUST1
#1001,kunde1@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,2,Produkt C,10.00,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,Max Mustermann,Musterstr. 1,12345,Musterstadt,Germany,123456789,CUST1
#1002,kunde2@example.com,pending,unfulfilled,49.99,3.00,9.50,62.49,EUR,2,Produkt B,24.99,Erika Mustermann,Beispielweg 2,54321,Beispielstadt,Germany,Erika Mustermann,Beispielweg 2,54321,Beispielstadt,Germany,987654321,CUST2
`;
    const stream = Readable.from([csvContent]);

    await service.parseAndProcessCsv(stream, organizationId, userId, uploadJobId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2); // Two distinct orders (#1001, #1002)
    expect(prisma.uploadJob.update).toHaveBeenCalledWith({
      where: { id: uploadJobId },
      data: {
        status: 'COMPLETED',
        errorMessage: null,
        processedRows: 3,
        failedRows: 0,
      },
    });

    // Verify customer creation/update for order #1001
    expect((prisma.$transaction as jest.Mock).mock.calls[0][0]).toHaveBeenCalledWith(expect.any(Function));
    const transactionCallback1 = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    const tx1 = (await transactionCallback1(prisma));
    expect(tx1.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Max Mustermann',
        email: 'kunde1@example.com',
        shopifyCustomerId: 'CUST1',
      }),
    }));
    expect(tx1.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderNumber: '#1001',
        shopifyOrderId: '123456789',
        totalAmount: expect.any(Object), // Prisma.Decimal
      }),
    }));
    expect(tx1.invoiceItem.create).toHaveBeenCalledTimes(2); // Two items for order #1001

    // Verify customer creation/update for order #1002
    const transactionCallback2 = (prisma.$transaction as jest.Mock).mock.calls[1][0];
    const tx2 = (await transactionCallback2(prisma));
    expect(tx2.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Erika Mustermann',
        email: 'kunde2@example.com',
        shopifyCustomerId: 'CUST2',
      }),
    }));
    expect(tx2.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderNumber: '#1002',
        shopifyOrderId: '987654321',
      }),
    }));
    expect(tx2.invoiceItem.create).toHaveBeenCalledTimes(1); // One item for order #1002
  });

  it('should handle invalid rows and report errors', async () => {
    const csvContent = `Name,Email,Financial Status,Fulfillment Status,Subtotal,Shipping,Taxes,Total,Currency,Lineitem quantity,Lineitem name,Lineitem price,Billing Name,Billing Address1,Billing Zip,Billing City,Billing Country,Shipping Name,Shipping Address1,Shipping Zip,Shipping City,Shipping Country,Shopify ID,Customer ID
#1003,invalid-email,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,1,Produkt D,99.99,Invalid Customer,Invalid Address,12345,Invalid City,Germany,Invalid Customer,Invalid Address,12345,Invalid City,Germany,111222333,CUST3
#1004,kunde4@example.com,paid,fulfilled,invalid-subtotal,5.00,19.00,123.99,EUR,1,Produkt E,99.99,Valid Customer,Valid Address,12345,Valid City,Germany,Valid Customer,Valid Address,12345,Valid City,Germany,444555666,CUST4
`;
    const stream = Readable.from([csvContent]);

    await service.parseAndProcessCsv(stream, organizationId, userId, uploadJobId);

    expect(prisma.$transaction).not.toHaveBeenCalled(); // No valid orders to process
    expect(prisma.uploadJob.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: uploadJobId },
      data: expect.objectContaining({
        status: 'FAILED',
        processedRows: 0,
        failedRows: 2,
        errorMessage: expect.stringContaining('Ungültiges E-Mail-Format')
      }),
    }));
    expect(prisma.auditLog.create).not.toHaveBeenCalled(); // Audit log for transaction failures, not row validation
  });

  it('should handle database transaction failures', async () => {
    const csvContent = `Name,Email,Financial Status,Fulfillment Status,Subtotal,Shipping,Taxes,Total,Currency,Lineitem quantity,Lineitem name,Lineitem price,Billing Name,Billing Address1,Billing Zip,Billing City,Billing Country,Shipping Name,Shipping Address1,Shipping Zip,Shipping City,Shipping Country,Shopify ID,Customer ID
#1005,kunde5@example.com,paid,fulfilled,99.99,5.00,19.00,123.99,EUR,1,Produkt F,99.99,Test Customer,Test Address,12345,Test City,Germany,Test Customer,Test Address,12345,Test City,Germany,777888999,CUST5
`;
    const stream = Readable.from([csvContent]);

    // Simulate a database error during transaction
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (callback) => {
      throw new Error('Database connection failed');
    });

    await service.parseAndProcessCsv(stream, organizationId, userId, uploadJobId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.uploadJob.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: uploadJobId },
      data: expect.objectContaining({
        status: 'FAILED',
        processedRows: 0,
        failedRows: 1,
        errorMessage: expect.stringContaining('Database connection failed'),
      }),
    }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'Shopify CSV Order Processing Failed',
        entityId: '777888999',
        details: expect.objectContaining({ error: 'Database connection failed' }),
      }),
    }));
  });
});
```

**كيفية تشغيل اختبارات الوحدة:**

1.  **تثبيت Jest:**
    ```bash
    npm install --save-dev jest ts-jest @types/jest
    ```
2.  **تكوين `jest.config.js`:**
    ```javascript
    // jest.config.js
    module.exports = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'js', 'json', 'node'],
      rootDir: './',
      testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
    };
    ```
3.  **تحديث `package.json`:** أضف سكريبت الاختبار:
    ```json
    {
      "scripts": {
        "test": "jest"
      }
    }
    ```
4.  **تشغيل الاختبارات:**
    ```bash
    npm test
    ```

## قائمة التحقق ومعايير القبول

*   [ ] **التحقق من نوع الملف:** يتم قبول ملفات CSV فقط.
*   [ ] **حدود حجم الملف:** يتم فرض قيود على حجم الملف (على سبيل المثال، 10 ميجابايت).
*   [ ] **معالجة غير متزامنة:** يتم معالجة ملفات CSV في الخلفية باستخدام قائمة انتظار.
*   [ ] **قراءة التدفق:** يتم قراءة ملفات CSV باستخدام التدفق لتجنب استهلاك الذاكرة المفرط.
*   [ ] **التحقق من صحة الصفوف:** يتم التحقق من صحة كل صف باستخدام مخطط Zod، ويتم تسجيل الأخطاء.
*   [ ] **التعيين والتحويل:** يتم تعيين بيانات CSV الصالحة إلى كيانات `Customer` و `Order` و `InvoiceItem` الداخلية بشكل صحيح.
*   [ ] **إلغاء التكرار:** يتم تحديد الطلبات والعملاء الموجودين وتحديثهم بدلاً من إنشاء سجلات مكررة.
*   [ ] **المعالجة المعاملاتية:** يتم حفظ البيانات في قاعدة البيانات ضمن معاملات لضمان الاتساق.
*   [ ] **تسجيل الأخطاء:** يتم تسجيل جميع الأخطاء في `AuditLog` وتحديث حالة `UploadJob`.
*   [ ] **اختبارات الوحدة:** توجد اختبارات وحدة شاملة تغطي سيناريوهات النجاح والفشل.
*   [ ] **رسائل خطأ باللغة الألمانية:** يتم توفير رسائل خطأ واضحة ومفيدة باللغة الألمانية.

بهذا نكون قد غطينا الجوانب الأساسية لاستيعاب وتحليل ملفات CSV من Shopify، مع التركيز على المتانة، كفاءة الذاكرة، والتعامل مع الأخطاء، بالإضافة إلى توفير أمثلة عملية للكود والاختبارات.

