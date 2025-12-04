// Invoice Template System
// Allows different templates for different invoice types with customizable texts

export interface InvoiceTemplate {
  id: string
  name: string
  type: 'offen' | 'bezahlt' | 'storniert' | 'promo' | 'erstattet' | 'custom'
  isDefault: boolean

  // Static texts that change per template (same design, different content)
  texts: {
    title: string                    // Invoice title: "Offene Rechnung", "Bezahlte Rechnung", etc.
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

  // New settings and styling fields
  settings?: {
    showBankDetails: boolean
    showPaymentInstructions: boolean
    showDueDate: boolean
    showTaxInfo: boolean
    highlightTotal: boolean
  }

  styling?: {
    primaryColor: string
    secondaryColor: string
    textColor: string
    backgroundColor: string
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
      title: 'Offene Rechnung',
      subtitle: 'Bitte begleichen Sie den Betrag vor dem Fälligkeitsdatum.',
      paymentNote: 'Bitte überweisen Sie den Betrag vor dem Fälligkeitsdatum auf das unten angegebene Bankkonto.',
      footerNote: 'Vielen Dank für Ihr Vertrauen.',
      thankYouNote: 'Vielen Dank für die Zusammenarbeit.',
      legalNote: 'Diese Rechnung wurde elektronisch erstellt und ist ohne Unterschrift gültig.'
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
      title: 'Bezahlte Rechnung',
      subtitle: 'Diese Rechnung ist vollständig bezahlt. Vielen Dank!',
      paymentNote: 'Der Betrag wurde vollständig erhalten.',
      footerNote: 'Vielen Dank für Ihre pünktliche Zahlung.',
      thankYouNote: 'Wir schätzen Ihre pünktliche Zahlung.',
      legalNote: 'Diese Rechnung wurde elektronisch erstellt und ist ohne Unterschrift gültig.'
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
      title: 'Stornierte Rechnung',
      subtitle: 'Diese Rechnung wurde storniert und ist ungültig.',
      paymentNote: 'Achtung: Diese Rechnung ist storniert und nicht zur Zahlung gültig.',
      footerNote: 'Bei Fragen wenden Sie sich bitte an den Kundenservice.',
      thankYouNote: 'Wir entschuldigen uns für etwaige Unannehmlichkeiten.',
      legalNote: 'Dies ist eine elektronisch erstellte Stornorechnung.'
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
      title: 'Aktionsrechnung',
      subtitle: 'Sonderangebot/Rabatt – Preise gemäß Kampagne reduziert.',
      paymentNote: 'Dies ist eine Rechnung mit Sonderpreisen. Bitte zahlen Sie vor Ablauf des Angebots.',
      footerNote: 'Vielen Dank, dass Sie unsere Sonderangebote nutzen.',
      thankYouNote: 'Vielen Dank, dass Sie unsere Aktionsangebote gewählt haben.',
      legalNote: 'Diese Rechnung wurde elektronisch erstellt und ist ohne Unterschrift gültig.'
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
      title: 'Erstattungsrechnung',
      subtitle: 'Betrag erstattet – Dokument nur zur Information.',
      paymentNote: 'Der Betrag wurde auf Ihr Bankkonto zurückerstattet.',
      footerNote: 'Vielen Dank für Ihr Verständnis.',
      thankYouNote: 'Wir entschuldigen uns für etwaige Unannehmlichkeiten und danken für Ihr Verständnis.',
      legalNote: 'Dies ist eine elektronisch erstellte Erstattungsrechnung und ohne Unterschrift gültig.'
    },
    bankDetails: {
      bankName: 'Ihre Bank',
      iban: 'DE89 3704 0044 0532 0130 00',
      bic: 'COBADEFFXXX',
      accountHolder: 'Ihr Unternehmen'
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
