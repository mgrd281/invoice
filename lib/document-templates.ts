// Document Templates System - Extended beyond invoices
// Supports multiple document types with their own templates

export type DocumentType = 'invoice' | 'receipt' | 'payment_notice' | 'reminder' | 'quote' | 'delivery_note'

export interface DocumentTemplate {
  id: string
  name: string
  type: DocumentType
  category: 'financial' | 'commercial' | 'administrative'
  isDefault: boolean
  
  // Document-specific content
  content: {
    title: string                    // Document title
    subtitle?: string               // Explanatory text under title
    headerNote?: string             // Note at the top
    bodyText?: string               // Main content text
    footerNote?: string             // Footer signature/text
    thankYouNote?: string           // Thank you message
    legalNote?: string              // Legal disclaimer
    instructionsText?: string       // Instructions for recipient
  }
  
  // Document behavior settings
  settings: {
    showBankDetails: boolean        // Show bank information
    showPaymentInstructions: boolean // Show payment notes
    showItemsTable: boolean         // Show items/services table
    showTotals: boolean             // Show calculation totals
    showDueDate: boolean            // Show due date
    showTaxInfo: boolean            // Show tax information
    requireSignature: boolean       // Require recipient signature
    allowPartialPayment: boolean    // Allow partial payments
  }
  
  // Visual styling (consistent across all documents)
  styling: {
    primaryColor: string
    secondaryColor: string
    textColor: string
    backgroundColor: string
  }
  
  createdAt: string
  updatedAt: string
}

// Receipt/Payment Received Notice Templates
export const RECEIPT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'receipt-full-payment',
    name: 'إشعار استلام دفعة كاملة / Vollständige Zahlung erhalten',
    type: 'receipt',
    category: 'financial',
    isDefault: true,
    content: {
      title: 'إشعار استلام الدفعة',
      subtitle: 'تم استلام المبلغ بالكامل بنجاح',
      headerNote: 'شكراً لكم على الدفع في الوقت المحدد',
      bodyText: 'نؤكد لكم استلام المبلغ المذكور أدناه بالكامل مقابل الخدمات/المنتجات المقدمة.',
      footerNote: 'نقدر ثقتكم بنا ونتطلع للتعامل معكم مستقبلاً',
      thankYouNote: 'شكراً لاختياركم خدماتنا',
      legalNote: 'هذا الإشعار صادر إلكترونياً وصالح بدون توقيع.',
      instructionsText: 'يرجى الاحتفاظ بهذا الإشعار كإثبات للدفع.'
    },
    settings: {
      showBankDetails: false,         // No need for bank details in receipt
      showPaymentInstructions: false, // Payment already received
      showItemsTable: true,           // Show what was paid for
      showTotals: true,               // Show payment amounts
      showDueDate: false,             // Not applicable for receipts
      showTaxInfo: true,              // Show tax breakdown
      requireSignature: false,        // Optional for receipts
      allowPartialPayment: false      // Full payment received
    },
    styling: {
      primaryColor: '#10b981',        // Green for success/received
      secondaryColor: '#6b7280',
      textColor: '#1f2937',
      backgroundColor: '#ffffff'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  {
    id: 'receipt-partial-payment',
    name: 'إشعار استلام دفعة جزئية / Teilzahlung erhalten',
    type: 'receipt',
    category: 'financial',
    isDefault: false,
    content: {
      title: 'إشعار استلام دفعة جزئية',
      subtitle: 'تم استلام جزء من المبلغ المستحق',
      headerNote: 'شكراً لكم على الدفعة المستلمة',
      bodyText: 'نؤكد لكم استلام الدفعة الجزئية المذكورة أدناه. المبلغ المتبقي مستحق الدفع حسب الاتفاق.',
      footerNote: 'يرجى سداد المبلغ المتبقي في الموعد المحدد',
      thankYouNote: 'نشكركم على التزامكم بالدفع',
      legalNote: 'هذا الإشعار صادر إلكترونياً وصالح بدون توقيع.',
      instructionsText: 'المبلغ المتبقي مستحق الدفع. ستتلقون فاتورة منفصلة للمبلغ المتبقي.'
    },
    settings: {
      showBankDetails: true,          // Show for remaining payment
      showPaymentInstructions: true,  // Instructions for remaining amount
      showItemsTable: true,           // Show what was partially paid
      showTotals: true,               // Show paid vs remaining
      showDueDate: true,              // Due date for remaining amount
      showTaxInfo: true,              // Tax breakdown
      requireSignature: false,        // Optional
      allowPartialPayment: true       // This IS a partial payment
    },
    styling: {
      primaryColor: '#f59e0b',        // Orange for partial/pending
      secondaryColor: '#6b7280',
      textColor: '#1f2937',
      backgroundColor: '#ffffff'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  {
    id: 'receipt-advance-payment',
    name: 'إشعار استلام دفعة مقدمة / Anzahlung erhalten',
    type: 'receipt',
    category: 'financial',
    isDefault: false,
    content: {
      title: 'إشعار استلام دفعة مقدمة',
      subtitle: 'تم استلام الدفعة المقدمة بنجاح',
      headerNote: 'شكراً لكم على الدفعة المقدمة',
      bodyText: 'نؤكد لكم استلام الدفعة المقدمة المذكورة أدناه. سيتم خصم هذا المبلغ من الفاتورة النهائية.',
      footerNote: 'سيتم إرسال الفاتورة النهائية عند اكتمال الخدمة/المنتج',
      thankYouNote: 'نقدر ثقتكم بنا مقدماً',
      legalNote: 'هذا الإشعار صادر إلكترونياً وصالح بدون توقيع.',
      instructionsText: 'هذه دفعة مقدمة. الفاتورة النهائية ستتضمن خصم هذا المبلغ.'
    },
    settings: {
      showBankDetails: false,         // Payment already received
      showPaymentInstructions: false, // No additional payment needed now
      showItemsTable: true,           // Show what advance is for
      showTotals: true,               // Show advance amount
      showDueDate: false,             // Not applicable for advance
      showTaxInfo: false,             // Tax calculated in final invoice
      requireSignature: true,         // Important for advance payments
      allowPartialPayment: false      // This IS the partial payment
    },
    styling: {
      primaryColor: '#3b82f6',        // Blue for advance/future
      secondaryColor: '#6b7280',
      textColor: '#1f2937',
      backgroundColor: '#ffffff'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Document management functions
export function getAllDocumentTemplates(): DocumentTemplate[] {
  return [...RECEIPT_TEMPLATES]
}

export function getTemplatesByType(type: DocumentType): DocumentTemplate[] {
  return getAllDocumentTemplates().filter(template => template.type === type)
}

export function getTemplatesByCategory(category: DocumentTemplate['category']): DocumentTemplate[] {
  return getAllDocumentTemplates().filter(template => template.category === category)
}

export function getTemplateById(id: string): DocumentTemplate | null {
  return getAllDocumentTemplates().find(template => template.id === id) || null
}

export function getDefaultTemplate(type: DocumentType): DocumentTemplate | null {
  return getTemplatesByType(type).find(template => template.isDefault) || null
}

// Helper functions for document generation
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    'invoice': 'فاتورة / Rechnung',
    'receipt': 'إشعار استلام / Empfangsbestätigung',
    'payment_notice': 'إشعار دفع / Zahlungshinweis',
    'reminder': 'تذكير / Mahnung',
    'quote': 'عرض سعر / Angebot',
    'delivery_note': 'إشعار تسليم / Lieferschein'
  }
  return labels[type] || type
}

export function getDocumentCategoryLabel(category: DocumentTemplate['category']): string {
  const labels: Record<DocumentTemplate['category'], string> = {
    'financial': 'مالية / Finanziell',
    'commercial': 'تجارية / Kommerziell', 
    'administrative': 'إدارية / Administrativ'
  }
  return labels[category] || category
}
