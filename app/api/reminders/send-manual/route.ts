import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth-nextauth'
import { ReminderEngine, ReminderManager } from '@/lib/reminder-engine'
import { ReminderSettings, DEFAULT_REMINDER_SETTINGS } from '@/lib/reminder-types'
import fs from 'fs'
import path from 'path'

// Mock data - same as in process route
const MOCK_INVOICES = [
  {
    id: 'inv_001',
    number: 'RE-2024-001',
    date: '2024-03-01',
    dueDate: '2024-03-15',
    totalAmount: 1190.00,
    paidAmount: 0,
    status: 'overdue' as const,
    customerId: 'cust_001',
    currency: 'EUR'
  },
  {
    id: 'inv_002',
    number: 'RE-2024-002',
    date: '2024-03-05',
    dueDate: '2024-03-19',
    totalAmount: 850.50,
    paidAmount: 0,
    status: 'sent' as const,
    customerId: 'cust_002',
    currency: 'EUR'
  }
]

const MOCK_CUSTOMERS = [
  {
    id: 'cust_001',
    name: 'Max Mustermann',
    company: 'Mustermann GmbH',
    email: 'max@mustermann.de',
    language: 'de' as const
  },
  {
    id: 'cust_002',
    name: 'Anna Schmidt',
    company: 'Schmidt & Partner GmbH',
    email: 'anna@schmidt-partner.de',
    language: 'de' as const
  }
]

const MOCK_COMPANY_SETTINGS = {
  name: 'Ihre Firma GmbH',
  iban: 'DE89 3704 0044 0532 0130 00',
  paymentBaseUrl: 'https://pay.example.com'
}

function loadUserReminderSettings(userId: number): ReminderSettings {
  try {
    const storageDir = path.join(process.cwd(), 'user-storage', 'reminders')
    const filePath = path.join(storageDir, `user-${userId}-settings.json`)
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  } catch (error) {
    console.error('Error loading reminder settings:', error)
  }
  return DEFAULT_REMINDER_SETTINGS
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invoiceId, reminderLevel = 'reminder' } = await request.json()
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    // Find invoice and customer
    const invoice = MOCK_INVOICES.find(inv => inv.id === invoiceId)
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const customer = MOCK_CUSTOMERS.find(cust => cust.id === invoice.customerId)
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if invoice is in a valid state for reminders
    if (['paid', 'cancelled'].includes(invoice.status)) {
      return NextResponse.json({ 
        error: 'Cannot send reminder for paid or cancelled invoice' 
      }, { status: 400 })
    }

    // Load user's reminder settings
    const settings = loadUserReminderSettings(auth.user.id)
    
    // Check 24-hour rule
    const reminderManager = ReminderManager.getInstance()
    const lastReminderDate = reminderManager.getLastReminderDate(invoiceId)
    
    if (lastReminderDate) {
      const hoursSinceLastReminder = (new Date().getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastReminder < 24) {
        return NextResponse.json({ 
          error: 'Cannot send more than one reminder per 24 hours',
          lastReminderDate: lastReminderDate.toISOString(),
          hoursRemaining: Math.ceil(24 - hoursSinceLastReminder)
        }, { status: 429 })
      }
    }

    // Initialize reminder engine and send manual reminder
    const reminderEngine = new ReminderEngine(settings, MOCK_COMPANY_SETTINGS)
    
    try {
      const reminderLog = await reminderEngine.sendManualReminder(invoice, customer, reminderLevel)
      reminderManager.addLog(reminderLog)

      return NextResponse.json({
        success: true,
        reminderLog: {
          id: reminderLog.id,
          invoiceId: reminderLog.invoiceId,
          reminderLevel: reminderLog.reminderLevel,
          recipient: reminderLog.recipient,
          subject: reminderLog.subject,
          status: reminderLog.status,
          sentDate: reminderLog.sentDate
        }
      })

    } catch (error) {
      console.error('Error sending manual reminder:', error)
      return NextResponse.json({ 
        error: 'Failed to send reminder',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in manual reminder endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
