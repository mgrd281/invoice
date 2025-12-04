import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { Expense, ExpenseCategory } from '@/lib/accounting-types'

// Global storage for expenses (in production, use database)
declare global {
  var expenses: Expense[] | undefined
}

// Initialize global storage with some sample data
if (!global.expenses) {
  global.expenses = [
    {
      id: 'exp-1',
      expenseNumber: 'EXP-2025-001',
      date: '2025-01-15',
      category: 'office' as ExpenseCategory,
      description: 'Büromaterial und Schreibwaren',
      supplier: 'Office Depot GmbH',
      supplierTaxId: 'DE123456789',
      netAmount: 84.03,
      taxRate: 19,
      taxAmount: 15.97,
      totalAmount: 100.00,
      receiptUrl: '/receipts/office-depot-001.pdf',
      receiptFileName: 'office-depot-001.pdf',
      accountingAccount: '6815',
      costCenter: 'ADMIN',
      bookingText: 'Büromaterial Office Depot',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'exp-2',
      expenseNumber: 'EXP-2025-002',
      date: '2025-01-10',
      category: 'utilities' as ExpenseCategory,
      description: 'Büro-Internet und Telefon',
      supplier: 'Telekom Deutschland GmbH',
      supplierTaxId: 'DE987654321',
      netAmount: 42.02,
      taxRate: 19,
      taxAmount: 7.98,
      totalAmount: 50.00,
      receiptUrl: '/receipts/telekom-001.pdf',
      receiptFileName: 'telekom-001.pdf',
      accountingAccount: '6400',
      costCenter: 'ADMIN',
      bookingText: 'Internet/Telefon Telekom',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'exp-3',
      expenseNumber: 'EXP-2025-003',
      date: '2025-01-08',
      category: 'professional_services' as ExpenseCategory,
      description: 'Steuerberatung Q4 2024',
      supplier: 'Steuerberatung Müller & Partner',
      supplierTaxId: 'DE456789123',
      netAmount: 420.17,
      taxRate: 19,
      taxAmount: 79.83,
      totalAmount: 500.00,
      receiptUrl: '/receipts/steuerberater-001.pdf',
      receiptFileName: 'steuerberater-001.pdf',
      accountingAccount: '6420',
      costCenter: 'ADMIN',
      bookingText: 'Steuerberatung Q4/2024',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')

    let expenses = global.expenses || []

    // Apply filters
    let filteredExpenses = expenses

    // Date filter
    if (startDate) {
      filteredExpenses = filteredExpenses.filter(exp => exp.date >= startDate)
    }
    if (endDate) {
      filteredExpenses = filteredExpenses.filter(exp => exp.date <= endDate)
    }

    // Category filter
    if (category && category !== '') {
      filteredExpenses = filteredExpenses.filter(exp => exp.category === category)
    }

    // Sort by date (newest first)
    filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      expenses: filteredExpenses,
      total: filteredExpenses.length
    })

  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const expenseData = await request.json()

    // Validate required fields
    if (!expenseData.description || !expenseData.supplier || !expenseData.totalAmount) {
      return NextResponse.json(
        { error: 'Description, supplier, and amount are required' },
        { status: 400 }
      )
    }

    // Generate unique ID and expense number
    const newId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const expenseNumber = `EXP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    const newExpense: Expense = {
      id: newId,
      expenseNumber,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      category: expenseData.category || 'other',
      description: expenseData.description,
      supplier: expenseData.supplier,
      supplierTaxId: expenseData.supplierTaxId || '',
      netAmount: expenseData.netAmount || 0,
      taxRate: expenseData.taxRate || 19,
      taxAmount: expenseData.taxAmount || 0,
      totalAmount: expenseData.totalAmount,
      receiptUrl: expenseData.receiptUrl,
      receiptFileName: expenseData.receiptFileName,
      accountingAccount: expenseData.accountingAccount || '6815',
      costCenter: expenseData.costCenter || 'ADMIN',
      bookingText: expenseData.bookingText || expenseData.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Add to global storage
    global.expenses = [...(global.expenses || []), newExpense]

    return NextResponse.json({
      success: true,
      expense: newExpense,
      message: 'Expense created successfully'
    })

  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}
