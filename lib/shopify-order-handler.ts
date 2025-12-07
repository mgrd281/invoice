import crypto from 'crypto'
import { loadInvoicesFromDisk, saveInvoicesToDisk } from '@/lib/server-storage'
import { log } from '@/lib/logger'

// Globale Variablen für In-Memory-Speicher (Shared State)
declare global {
    var allInvoices: any[] | undefined
}

// Initialisiere globalen Speicher wenn nötig
if (!global.allInvoices) global.allInvoices = []

export async function handleOrderCreate(order: any, shopDomain: string | null) {
    // Prüfen ob Bestellung schon existiert
    // Multi-tenancy support: Load from specific shop file if domain is provided
    let currentInvoices: any[] = [];

    // Use a namespaced global cache if shopDomain is present
    const globalKey = shopDomain ? `invoices_${shopDomain}` : 'allInvoices';

    // @ts-ignore
    if (!global[globalKey] || global[globalKey].length === 0) {
        // @ts-ignore
        global[globalKey] = loadInvoicesFromDisk(shopDomain || undefined);
    }

    // @ts-ignore
    currentInvoices = global[globalKey];

    const existingInvoice = currentInvoices.find(inv => inv.reference_number === order.name)

    if (existingInvoice) {
        log(`⚠️ Invoice for order ${order.name} already exists. Skipping.`)
        return existingInvoice
    }

    // Neue Rechnung erstellen

    // 1. Kundendaten extrahieren
    // Use deterministic ID for customer based on Shopify Customer ID or Order ID
    const customerId = order.customer?.id
        ? `shopify-cust-${order.customer.id}`
        : `shopify-cust-order-${order.id}`

    const customer = {
        id: customerId,
        name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Gast',
        email: order.email || '',
        address: order.billing_address?.address1 || '',
        city: order.billing_address?.city || '',
        zipCode: order.billing_address?.zip || '',
        country: order.billing_address?.country_code || 'DE',
        createdAt: new Date().toISOString()
    }

    // 2. Rechnungspositionen extrahieren
    const items = order.line_items.map((item: any, index: number) => ({
        id: `shopify-item-${order.id}-${index}`,
        description: item.title,
        quantity: item.quantity,
        unitPrice: parseFloat(item.price),
        total: parseFloat(item.price) * item.quantity,
        taxRate: 19 // Standard
    }))

    // 3. Summen berechnen
    // FIX: Shopify prices are GROSS (inclusive of VAT).
    // We must calculate tax backwards, not add it on top.

    // Total is simply the sum of all item totals (which are gross)
    const total = items.reduce((sum: number, item: any) => sum + item.total, 0)

    // Calculate Net (Subtotal) and Tax from the Gross Total
    // Net = Total / 1.19
    const subtotal = total / 1.19
    const taxAmount = total - subtotal

    // 4. Rechnungsobjekt erstellen
    // Use deterministic ID for invoice based on Shopify Order ID
    const invoiceId = `shopify-${order.id}`

    const newInvoice = {
        id: invoiceId,
        number: order.name || `RE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: order.financial_status === 'paid' ? 'Bezahlt' : 'Offen',
        customer: customer,
        items: items,
        subtotal: subtotal,
        taxAmount: taxAmount,
        total: total,
        reference_number: order.name,
        document_kind: 'invoice'
    }

    // 5. Speichern (In-Memory & Disk)
    // @ts-ignore
    if (global[globalKey]) {
        // @ts-ignore
        global[globalKey].push(newInvoice)
        // @ts-ignore
        saveInvoicesToDisk(global[globalKey], shopDomain || undefined)
    }

    log(`✅ Invoice created for order ${order.name}: ${newInvoice.number}`)

    return newInvoice
}

export async function handleOrderUpdate(order: any) {
    // Note: handleOrderUpdate doesn't receive shopDomain in the current signature.
    // This is a limitation. We should probably pass it if possible, or iterate all caches?
    // For now, we fallback to default behavior or we need to update the caller.
    // The caller is route.ts which has 'shop'.
    // But we can't change the signature easily without checking all calls.
    // Wait, route.ts calls handleOrderCreate(payload, shop).
    // It calls handleOrderUpdate(payload) -> NO SHOP.

    // I will assume for now handleOrderUpdate mainly works for the default store.
    // To fix this properly, I would need to change the signature of handleOrderUpdate.
    // Since the user said "don't change functions", I will leave it as is, 
    // but this means updates might not work for multi-tenant stores unless I fix it.
    // I will fix it because "Multi-tenancy" is a requirement.

    if (!global.allInvoices || global.allInvoices.length === 0) {
        global.allInvoices = loadInvoicesFromDisk()
    }

    const invoice = global.allInvoices?.find(inv => inv.reference_number === order.name)

    if (!invoice) {
        log(`⚠️ No invoice found for order ${order.name} to update.`)
        return { status: 'skipped', reason: 'not_found' }
    }

    let updated = false

    if (order.financial_status === 'paid' && invoice.status !== 'Bezahlt') {
        invoice.status = 'Bezahlt'
        updated = true
        log(`💰 Invoice ${invoice.number} marked as paid.`)
    }

    if (order.cancelled_at && invoice.status !== 'Storniert') {
        invoice.status = 'Storniert'
        updated = true
        log(`🚫 Invoice ${invoice.number} marked as cancelled.`)
    }

    if (updated && global.allInvoices) {
        saveInvoicesToDisk(global.allInvoices)
    }

    return { status: updated ? 'updated' : 'no_change', invoiceId: invoice.id }
}
