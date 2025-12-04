// Invoice Template System
// Allows different templates for different invoice types with customizable texts

export interface InvoiceTemplate {
  id: string
  name: string
  type: 'offen' | 'bezahlt' | 'storniert' | 'promo' | 'erstattet' | 'custom'
  isDefault: boolean
  
  // Static texts that change per template (same design, different content)
  texts: {
    title: string                    // Invoice title: "فاتورة مفتوحة", "فاتورة مدفوعة", etc.
    subtitle?: string               // Explanatory text under title
    paymentNote?: string            // Payment instructions
    footerNote?: string             // Footer signature/text
    thankYouNote?: string           // Thank you message
    legalNote?: string              // Legal disclaimer
  }
  
  // Bank details (can be different per template)
  bankDetails?: {
    bankName: string
    iban: string
    bic: string
    accountHolder: string
  }
  
  // Default invoice settings when using this template
  defaults: {
    status: 'Offen' | 'Bezahlt' | 'Storniert' | 'Erstattet' | 'Mahnung'  // Default status
    dueDays: number                 // Default due days (optional)
    taxRate: number                 // Default tax rate (optional)
    showBankDetails: boolean        // Show bank info
    showPaymentInstructions: boolean // Show payment notes
  }
  
  createdAt: string
  updatedAt: string
}

// Default templates for different invoice types
export const DEFAULT_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'template-offen',
    name: 'Offene Rechnung - Zahlungsaufforderung',
    type: 'offen',
    isDefault: false,
    texts: {
      title: 'فاتورة مفتوحة',
      subtitle: 'يرجى سداد المبلغ قبل تاريخ الاستحقاق.',
      paymentNote: 'يرجى تحويل المبلغ إلى الحساب المصرفي المذكور أدناه قبل تاريخ الاستحقاق.',
      footerNote: 'شكراً لثقتكم بنا',
      thankYouNote: 'نشكركم على التعامل معنا',
      legalNote: 'هذه الفاتورة صادرة إلكترونياً وصالحة بدون توقيع.'
    },
    defaults: {
      status: 'Offen',
      dueDays: 14,
      taxRate: 19,
      showBankDetails: true,
      showPaymentInstructions: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  {
    id: 'template-bezahlt',
    name: 'Bezahlte Rechnung - Zahlungseingang bestätigt',
    type: 'bezahlt',
    isDefault: true,
    texts: {
      title: 'فاتورة مدفوعة',
      subtitle: 'هذه الفاتورة مدفوعة بالكامل. شكراً لك!',
      paymentNote: 'تم استلام المبلغ بالكامل.',
      footerNote: 'شكراً لكم على الدفع في الوقت المحدد',
      thankYouNote: 'نقدر التزامكم بالدفع في المواعيد المحددة',
      legalNote: 'هذه الفاتورة صادرة إلكترونياً وصالحة بدون توقيع.'
    },
    defaults: {
      status: 'Bezahlt',
      dueDays: 0,
      taxRate: 19,
      showBankDetails: false,
      showPaymentInstructions: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  {
    id: 'template-storniert',
    name: 'Stornierte Rechnung - Rechnung ungültig',
    type: 'storniert',
    isDefault: false,
    texts: {
      title: 'فاتورة ملغاة',
      subtitle: 'هذه الفاتورة ملغاة ولا يُعتد بها.',
      paymentNote: 'تنبيه: هذه الفاتورة ملغاة وغير صالحة للدفع.',
      footerNote: 'للاستفسارات يرجى التواصل مع خدمة العملاء',
      thankYouNote: 'نعتذر عن أي إزعاج',
      legalNote: 'هذه فاتورة إلغاء صادرة إلكترونياً.'
    },
    defaults: {
      status: 'Storniert',
      dueDays: 0,
      taxRate: 19,
      showBankDetails: false,
      showPaymentInstructions: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  {
    id: 'template-promo',
    name: 'Promo Rechnung - Sonderangebot mit Rabatt',
    type: 'promo',
    isDefault: false,
    texts: {
      title: 'فاتورة ترويجية',
      subtitle: 'خصم/عرض خاص – الأسعار مخفضة حسب الحملة.',
      paymentNote: 'هذه فاتورة بأسعار ترويجية خاصة. يرجى الدفع قبل انتهاء العرض.',
      footerNote: 'شكراً لاستفادتكم من عروضنا الخاصة',
      thankYouNote: 'نشكركم لاختياركم عروضنا الترويجية',
      legalNote: 'هذه الفاتورة صادرة إلكترونياً وصالحة بدون توقيع.'
    },
    defaults: {
      status: 'Offen',
      dueDays: 14,
      taxRate: 19,
      showBankDetails: true,
      showPaymentInstructions: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  {
    id: 'template-erstattet',
    name: 'Erstattungs-Rechnung - Rückerstattung',
    type: 'erstattet',
    isDefault: false,
    texts: {
      title: 'فاتورة مستردة',
      subtitle: 'تم رد المبلغ – المستند للاطلاع فقط.',
      paymentNote: 'تم رد المبلغ إلى حسابكم المصرفي.',
      footerNote: 'شكراً لتفهمكم',
      thankYouNote: 'نعتذر عن أي إزعاج ونقدر تفهمكم',
      legalNote: 'هذه فاتورة استرداد صادرة إلكترونياً وصالحة بدون توقيع.'
    },
    bankDetails: {
      bankName: 'البنك الخاص بكم',
      iban: 'DE89 3704 0044 0532 0130 00',
      bic: 'COBADEFFXXX',
      accountHolder: 'شركتكم'
    },
    defaults: {
      status: 'Erstattet',
      dueDays: 0,
      taxRate: 19,
      showBankDetails: true,
      showPaymentInstructions: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Template storage and management
declare global {
  var invoiceTemplates: InvoiceTemplate[] | undefined
}

// Initialize global template storage
if (!global.invoiceTemplates) {
  global.invoiceTemplates = [...DEFAULT_TEMPLATES]
}

// Helper function to upgrade old templates to new structure
function upgradeTemplate(template: any): InvoiceTemplate {
  // If template already has defaults, return as is
  if (template.defaults) {
    return template as InvoiceTemplate
  }
  
  // Upgrade old template structure
  return {
    ...template,
    defaults: {
      status: template.type === 'bezahlt' ? 'Bezahlt' : 
              template.type === 'storniert' ? 'Storniert' :
              template.type === 'erstattet' ? 'Erstattet' : 'Offen',
      dueDays: template.type === 'bezahlt' || template.type === 'storniert' || template.type === 'erstattet' ? 0 : 14,
      taxRate: 19,
      showBankDetails: template.settings?.showBankDetails ?? true,
      showPaymentInstructions: template.settings?.showPaymentInstructions ?? true
    }
  }
}

// Template management functions
export function getAllTemplates(): InvoiceTemplate[] {
  const templates = global.invoiceTemplates || DEFAULT_TEMPLATES
  // Upgrade old templates automatically
  return templates.map(upgradeTemplate)
}

export function getTemplateById(id: string): InvoiceTemplate | null {
  const templates = getAllTemplates()
  return templates.find(t => t.id === id) || null
}

export function getTemplatesByType(type: InvoiceTemplate['type']): InvoiceTemplate[] {
  const templates = getAllTemplates()
  return templates.filter(t => t.type === type)
}

export function getDefaultTemplate(): InvoiceTemplate {
  const templates = getAllTemplates()
  return templates.find(t => t.isDefault) || DEFAULT_TEMPLATES[0]
}

export function saveTemplate(template: InvoiceTemplate): void {
  if (!global.invoiceTemplates) {
    global.invoiceTemplates = [...DEFAULT_TEMPLATES]
  }
  
  const existingIndex = global.invoiceTemplates.findIndex(t => t.id === template.id)
  
  if (existingIndex >= 0) {
    // Update existing template
    global.invoiceTemplates[existingIndex] = {
      ...template,
      updatedAt: new Date().toISOString()
    }
  } else {
    // Add new template
    global.invoiceTemplates.push({
      ...template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
}

export function deleteTemplate(id: string): boolean {
  if (!global.invoiceTemplates) {
    return false
  }
  
  const template = getTemplateById(id)
  if (!template) {
    return false
  }
  
  // Don't allow deleting default template
  if (template.isDefault) {
    throw new Error('Default template cannot be deleted')
  }
  
  global.invoiceTemplates = global.invoiceTemplates.filter(t => t.id !== id)
  return true
}

export function setDefaultTemplate(id: string): void {
  if (!global.invoiceTemplates) {
    global.invoiceTemplates = [...DEFAULT_TEMPLATES]
  }
  
  // Remove default flag from all templates
  global.invoiceTemplates.forEach(t => t.isDefault = false)
  
  // Set new default
  const template = global.invoiceTemplates.find(t => t.id === id)
  if (template) {
    template.isDefault = true
  }
}

// Helper function to create new template ID
export function generateTemplateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
