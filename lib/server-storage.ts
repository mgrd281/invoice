// Lightweight server-side JSON storage utilities
// Uses a user-storage directory in the project root to persist small pieces of state

// We intentionally use require to avoid ESM import issues in Next.js route handlers
// and to work reliably in the server runtime only.

export type JsonValue = any

function getPaths() {
  const path = require('path')
  // Hardcode absolute path to ensure consistency
  const root = '/Users/m/Desktop/rechnung 6'
  const storageDir = process.env.NODE_ENV === 'production'
    ? '/tmp/user-storage'
    : path.join(process.cwd(), 'user-storage')
  return { path, root, storageDir }
}

function ensureDir(dir: string) {
  try {
    const fs = require('fs')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch (err) {
    console.warn('server-storage: failed to ensure dir', dir, err)
  }
}

export function readJson(fileName: string, fallback: JsonValue = null): JsonValue {
  try {
    // Only run on server
    if (typeof window !== 'undefined') return fallback

    const fs = require('fs')
    const { path, storageDir } = getPaths()
    ensureDir(storageDir)
    const filePath = path.join(storageDir, fileName)
    if (!fs.existsSync(filePath)) return fallback

    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    console.warn('server-storage: readJson failed', fileName, err)
    return fallback
  }
}

export function writeJson(fileName: string, data: JsonValue): boolean {
  try {
    if (typeof window !== 'undefined') return false

    const fs = require('fs')
    const { path, storageDir } = getPaths()
    ensureDir(storageDir)
    const filePath = path.join(storageDir, fileName)

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.warn('server-storage: writeJson failed', fileName, err)
    return false
  }
}

// Convenience helpers for this project
const CUSTOMERS_FILE = 'customers.json'
const INVOICES_FILE = 'invoices.json'

// Load all customers from disk (persistent store)
export function loadCustomersFromDisk(): any[] {
  const data = readJson(CUSTOMERS_FILE, { customers: [] })
  if (data && Array.isArray(data.customers)) return data.customers
  return []
}

// Save all customers to disk
export function saveCustomersToDisk(customers: any[]): boolean {
  return writeJson(CUSTOMERS_FILE, { customers, updatedAt: new Date().toISOString() })
}

// Load all invoices from disk (persistent store)
export function loadInvoicesFromDisk(): any[] {
  const data = readJson(INVOICES_FILE, { invoices: [] })
  if (data && Array.isArray(data.invoices)) return data.invoices
  return []
}

// Save all invoices to disk
export function saveInvoicesToDisk(invoices: any[]): boolean {
  return writeJson(INVOICES_FILE, { invoices, updatedAt: new Date().toISOString() })
}
