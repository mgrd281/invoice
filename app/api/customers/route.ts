import { NextRequest, NextResponse } from 'next/server'
import { loadCustomersFromDisk, saveCustomersToDisk, saveInvoicesToDisk } from '../../../lib/server-storage'
import { requireAuth, getUserFromRequest, shouldShowAllData } from '../../../lib/auth-middleware'

// Access global storage for data
declare global {
  var allCustomers: any[] | undefined
}

// Initialize global storage (load from disk once on cold start)
if (!global.allCustomers) {
  const persisted = loadCustomersFromDisk()
  global.allCustomers = Array.isArray(persisted) ? persisted : []
  console.log(`[init /api/customers] Loaded ${global.allCustomers.length} customers from disk`)
}

// No mock customers - all data comes from disk or user creation

// GET: Get all customers for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    // Get customers from different sources
    const globalCustomers = global.allCustomers || []
    
    // Admin users can see all customers, regular users see only their own
    let filteredCustomers
    if (shouldShowAllData(user)) {
      filteredCustomers = globalCustomers
      console.log(`[GET /api/customers] ADMIN ${user.email} - showing all ${globalCustomers.length} customers`)
    } else {
      filteredCustomers = globalCustomers.filter((customer: any) => 
        customer.userId === user.id
      )
      console.log(`[GET /api/customers] USER ${user.email} - showing ${filteredCustomers.length} own customers (${globalCustomers.length} total in system)`)
    }
    
    return NextResponse.json({
      success: true,
      customers: filteredCustomers,
      total: filteredCustomers.length
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Fehler beim Laden der Kunden',
        customers: [],
        total: 0
      },
      { status: 500 }
    )
  }
}

// POST: Create new customer
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    const customerData = await request.json()
    
    // Validate required fields
    if (!customerData.name || !customerData.email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Name und E-Mail-Adresse sind erforderlich'
        },
        { status: 400 }
      )
    }
    
    // Check if customer with this email already exists FOR THIS USER
    const existingCustomer = global.allCustomers?.find(
      customer => customer.email.toLowerCase() === customerData.email.toLowerCase() && 
                  customer.userId === user.id
    )
    
    if (existingCustomer) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Ein Kunde mit dieser E-Mail-Adresse existiert bereits'
        },
        { status: 409 }
      )
    }
    
    // Create new customer with unique ID and link to user
    const newCustomer = {
      id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id, // Link customer to authenticated user
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone || '',
      address: customerData.address || '',
      zipCode: customerData.zipCode || '',
      city: customerData.city || '',
      country: customerData.country || 'Deutschland',
      taxId: customerData.taxId || '',
      notes: customerData.notes || '',
      invoiceCount: 0,
      totalAmount: '€0.00',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Add to global storage
    if (!global.allCustomers) {
      global.allCustomers = []
    }
    global.allCustomers.push(newCustomer)
    // Persist to disk
    saveCustomersToDisk(global.allCustomers)
    
    console.log(`[POST /api/customers] Created new customer: ${newCustomer.name} (${newCustomer.email}) for user ${user.email}`)
    console.log(`[POST /api/customers] Total customers now: ${global.allCustomers.length}`)
    
    return NextResponse.json({
      success: true,
      message: 'Kunde erfolgreich erstellt',
      customer: newCustomer
    })
    
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Fehler beim Erstellen des Kunden'
      },
      { status: 500 }
    )
  }
}

// PUT: Update existing customer
export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('id')
    
    if (!customerId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Kunden-ID ist erforderlich'
        },
        { status: 400 }
      )
    }
    
    const customerData = await request.json()
    
    // Find customer by ID - admin can edit any customer, regular users only their own
    let customerIndex
    if (shouldShowAllData(user)) {
      customerIndex = global.allCustomers?.findIndex(
        customer => customer.id === customerId
      )
      console.log(`[PUT /api/customers] ADMIN ${user.email} - editing customer ${customerId}`)
    } else {
      customerIndex = global.allCustomers?.findIndex(
        customer => customer.id === customerId && customer.userId === user.id
      )
      console.log(`[PUT /api/customers] USER ${user.email} - editing own customer ${customerId}`)
    }
    
    if (customerIndex === -1 || customerIndex === undefined) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Kunde nicht gefunden oder Sie haben keine Berechtigung'
        },
        { status: 404 }
      )
    }
    
    // Update customer (preserve userId for non-admin users)
    const originalCustomer = global.allCustomers![customerIndex]
    const updatedCustomer = {
      ...originalCustomer,
      ...customerData,
      userId: shouldShowAllData(user) ? originalCustomer.userId : user.id, // Admin preserves original userId
      updatedAt: new Date().toISOString()
    }
    
    global.allCustomers![customerIndex] = updatedCustomer
    // Persist to disk
    saveCustomersToDisk(global.allCustomers!)
    
    console.log(`[PUT /api/customers] Updated customer: ${updatedCustomer.name} (${updatedCustomer.email}) for user ${user.email}`)
    
    return NextResponse.json({
      success: true,
      message: 'Kunde erfolgreich aktualisiert',
      customer: updatedCustomer
    })
    
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Fehler beim Aktualisieren des Kunden'
      },
      { status: 500 }
    )
  }
}

// DELETE: Delete customer
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('id')
    
    console.log(`[DELETE /api/customers] Attempting to delete customer ID: ${customerId} for user ${user.email}`)
    
    if (!customerId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Kunden-ID ist erforderlich'
        },
        { status: 400 }
      )
    }
    
    // Find and remove customer from global storage - admin can delete any customer, regular users only their own
    let customerIndex
    if (shouldShowAllData(user)) {
      customerIndex = global.allCustomers?.findIndex(
        customer => customer.id === customerId
      )
      console.log(`[DELETE /api/customers] ADMIN ${user.email} - deleting customer ${customerId}`)
    } else {
      customerIndex = global.allCustomers?.findIndex(
        customer => customer.id === customerId && customer.userId === user.id
      )
      console.log(`[DELETE /api/customers] USER ${user.email} - deleting own customer ${customerId}`)
    }
    
    console.log(`[DELETE /api/customers] Customer index in global storage: ${customerIndex}`)
    console.log(`[DELETE /api/customers] Global customers count: ${global.allCustomers?.length || 0}`)
    
    if (customerIndex === -1 || customerIndex === undefined) {
      console.log(`[DELETE /api/customers] Customer not found or no permission for user ${user.email}`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Kunde nicht gefunden oder Sie haben keine Berechtigung'
        },
        { status: 404 }
      )
    }
    
    const deletedCustomer = global.allCustomers![customerIndex]
    global.allCustomers!.splice(customerIndex, 1)
    // Persist to disk
    saveCustomersToDisk(global.allCustomers!)

    // Cascade delete invoices linked to this customer (only for this user)
    let removedInvoices = 0
    try {
      const beforeCount = (global.allInvoices?.length || 0)
      if (global.allInvoices) {
        global.allInvoices = global.allInvoices.filter((inv: any) => 
          !(inv.customerId === deletedCustomer.id || 
            (inv.customerEmail?.toLowerCase?.() === deletedCustomer.email?.toLowerCase?.() && inv.userId === user.id) ||
            (inv.customerName === deletedCustomer.name && inv.userId === user.id))
        )
      }
      const afterCount = (global.allInvoices?.length || 0)
      removedInvoices = beforeCount - afterCount

      // Also remove from csvInvoices in-memory if present (only for this user)
      if (global.csvInvoices) {
        const beforeCsv = global.csvInvoices.length
        global.csvInvoices = global.csvInvoices.filter((inv: any) => 
          !(inv.customerId === deletedCustomer.id || 
            (inv.customerEmail?.toLowerCase?.() === deletedCustomer.email?.toLowerCase?.() && inv.userId === user.id) ||
            (inv.customerName === deletedCustomer.name && inv.userId === user.id))
        )
        const afterCsv = global.csvInvoices.length
        removedInvoices += (beforeCsv - afterCsv)
      }

      // Persist invoices to disk
      saveInvoicesToDisk(global.allInvoices || [])
      console.log(`[DELETE /api/customers] Cascade-deleted ${removedInvoices} invoice(s) for customer ${deletedCustomer.id} and user ${user.email}`)
    } catch (e) {
      console.warn(`[DELETE /api/customers] Failed during cascade delete for customer ${deletedCustomer.id}`, e)
    }
    
    console.log(`[DELETE /api/customers] Deleted customer: ${deletedCustomer.name} (${deletedCustomer.email}) for user ${user.email}`)
    console.log(`[DELETE /api/customers] Total customers now: ${global.allCustomers!.length}`)
    
    return NextResponse.json({
      success: true,
      message: 'Kunde erfolgreich gelöscht',
      customer: deletedCustomer,
      deletedInvoices: removedInvoices
    })
    
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Fehler beim Löschen des Kunden'
      },
      { status: 500 }
    )
  }
}
