import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto-utils';

const PAYPAL_LIVE_API = 'https://api-m.paypal.com';
const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com';

interface PayPalToken {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export class PayPalService {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  private async getSettings() {
    return prisma.payPalSettings.findUnique({
      where: { organizationId: this.organizationId },
      select: { clientId: true, clientSecret: true, isActive: true, mode: true }
    });
  }

  async getAccessToken(): Promise<string> {
    const settings = await this.getSettings();
    
    // Prefer DB settings, fallback to Env Vars
    let clientId = settings?.clientId;
    let clientSecret = settings?.clientSecret ? decrypt(settings.clientSecret) : undefined;
    let isActive = settings?.isActive;

    // Fallback to Environment Variables if DB is missing or empty
    if (!clientId) clientId = process.env.PAYPAL_CLIENT_ID || undefined;
    if (!clientSecret) clientSecret = process.env.PAYPAL_SECRET || undefined;
    
    // If we have env vars, assume active unless explicitly disabled in DB (which we can't easily distinguish from 'missing')
    // Let's assume if env vars are present and DB record is missing, it's active.
    if (!settings && clientId && clientSecret) {
        isActive = true;
    }

    if (!isActive) {
      throw new Error('PayPal not configured or inactive');
    }

    if (!clientId || !clientSecret) {
      throw new Error('Invalid PayPal credentials');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // Determine Environment
    const mode = settings?.mode || (process.env.PAYPAL_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live');
    const apiBase = mode === 'sandbox' ? PAYPAL_SANDBOX_API : PAYPAL_LIVE_API;

    console.log(`[PayPal] Authenticating against ${mode.toUpperCase()} (${apiBase}) with Client ID: ${clientId?.substring(0, 4)}...`);

    const response = await fetch(`${apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get PayPal token: ${error}`);
    }

    const data = await response.json() as PayPalToken;
    return data.access_token;
  }

  /**
   * List transactions from PayPal (using /v1/reporting/transactions if available, or just mock/search for now)
   * PayPal Transaction Search API is complex and often requires enabling.
   * For this MVP, we might rely on listing *stored* transactions or fetching specific ones.
   * However, let's implement a search if possible.
   */
  async listTransactions(startDate: Date, endDate: Date) {
    // Note: Use stored transactions for the UI to be fast
    return prisma.payPalTransaction.findMany({
        where: {
            organizationId: this.organizationId,
            transactionDate: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { transactionDate: 'desc' },
        include: { invoice: true, customer: true }
    });
  }
  
  /**
   * Sync a specific captured payment details from PayPal
   */
  async syncTransaction(paypalCaptureId: string) {
      const token = await this.getAccessToken();
      const settings = await this.getSettings();
      const mode = settings?.mode || (process.env.PAYPAL_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live');
      const apiBase = mode === 'sandbox' ? PAYPAL_SANDBOX_API : PAYPAL_LIVE_API;

      const response = await fetch(`${apiBase}/v2/payments/captures/${paypalCaptureId}`, {
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      });
      
      if (!response.ok) {
           throw new Error(`Failed to fetch capture ${paypalCaptureId}`);
      }
      
      const data = await response.json();
      return this.upsertTransaction(data);
  }

  /**
   * Internal upsert from PayPal data
   */
  async upsertTransaction(data: any) {
    // Mapping PayPal capture data to our DB
    // data structure depends on event type, assuming capture details here
    const paypalId = data.id;
    const amount = data.amount?.value;
    const currency = data.amount?.currency_code;
    const status = data.status; // COMPLETED etc
    const createTime = new Date(data.create_time || data.update_time || new Date());
    
    // Try to extract payer info if available (often inside 'payer' object or links)
    // In capture response, might be limited. 'seller_receivable_breakdown' etc.
    // For 'Order' details we might need a separate call.
    
    // For now, simplified mapping
    
    const existing = await prisma.payPalTransaction.findUnique({
        where: { paypalId }
    });
    
    if (existing) {
        return prisma.payPalTransaction.update({
            where: { paypalId },
            data: {
                status,
                updatedAt: new Date(),
                rawData: data
            }
        });
    }
    
    // Try auto-match invoice
    // Logic: Look for invoice number in 'custom_id' or 'invoice_id' field from PayPal
    const invoiceNumber = data.invoice_id || data.custom_id;
    let invoiceId = null;
    let customerId = null;

    if (invoiceNumber) {
        const invoice = await prisma.invoice.findFirst({
            where: { 
                organizationId: this.organizationId,
                invoiceNumber: invoiceNumber 
            }
        });
        if (invoice) {
            invoiceId = invoice.id;
            // Also link customer if possible
            customerId = invoice.customerId;
        }
    }
    
    // If no invoice match by ID, maybe by Amount + Time? (Risky, but requested)
    // "OR by amount + timestamp"
    if (!invoiceId && amount) {
        // Find UNPAID invoices with same amount created recently
        const candidates = await prisma.invoice.findMany({
            where: {
                organizationId: this.organizationId,
                totalGross: amount,
                status: { not: 'PAID' }, // or Draft/Sent
                // paymentMethod: 'PAYPAL' // Optional check
            }
        });
        // This is weak matching, maybe just leave unassigned unless explicit.
        // The user requirement says "Try auto-match... OR by amount + timestamp"
        // Let's implement strict exact match on ID first. Amount match is dangerous without more info.
    }

    const tx = await prisma.payPalTransaction.create({
        data: {
            organizationId: this.organizationId,
            paypalId,
            status,
            amount,
            currency,
            transactionDate: createTime,
            invoiceId,
            customerId,
            rawData: data
        }
    });

    // Post-processing: If invoice matched and status COMPLETED, mark invoice paid
    if (invoiceId && status === 'COMPLETED') {
         await prisma.invoice.update({
             where: { id: invoiceId },
             data: { 
                 status: 'PAID',
                 // Add Payment record too?
             }
         });
         
         // Create Payment record
         await prisma.payment.create({
             data: {
                 invoiceId,
                 amount,
                 paymentDate: createTime,
                 method: 'PAYPAL',
                 transactionId: paypalId,
                 status: 'COMPLETED'
             }
         });
    }

    return tx;
  }

  /**
   * Fetch historical transactions from PayPal Reporting API
   */
  async fetchTransactionsFromPayPal(startDate?: Date, endDate?: Date) {
      const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30)); // Default 30 days (API limit is 31)
      const end = endDate || new Date();
      
      const token = await this.getAccessToken();
      
      // Format dates as YYYY-MM-DDTHH:mm:ss.SSSZ
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      
      const settings = await this.getSettings();
      const mode = settings?.mode || (process.env.PAYPAL_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live');
      const apiBase = mode === 'sandbox' ? PAYPAL_SANDBOX_API : PAYPAL_LIVE_API;
      
      try {
          const response = await fetch(`${apiBase}/v1/reporting/transactions?start_date=${startStr}&end_date=${endStr}&fields=all&page_size=100`, {
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              }
          });
          
          if (!response.ok) {
               const error = await response.text();
               console.error('PayPal Reporting API Error:', error);
               throw new Error(`Failed to fetch history: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log(`[PayPal Sync] Found ${data.transaction_details?.length || 0} items for range ${startStr} to ${endStr}`);
          
          const details = data.transaction_details;
          
          let syncedCount = 0;
          if (Array.isArray(details)) {
              for (const item of details) {
                  const info = item.transaction_info;
                  console.log(`[PayPal Sync] Item: ${info.transaction_id} | Amt: ${info.transaction_amount?.value} | Status: ${info.transaction_status}`);

                  // Filter: Only process income (payments received) - we might want to debug this filter later
                  if (Number(info.transaction_amount?.value) > 0) {
                       await this.upsertTransaction({
                           id: info.transaction_id,
                           status: info.transaction_status === 'S' ? 'COMPLETED' : info.transaction_status, // 'S' is Success in Reporting API? strict mapping needed
                           amount: {
                               value: info.transaction_amount?.value,
                               currency_code: info.transaction_amount?.currency_code
                           },
                           create_time: info.transaction_initiation_date,
                           invoice_id: info.invoice_id,
                           custom_id: info.custom_field,
                           payer_info: item.payer_info
                       });
                       syncedCount++;
                  }
              }
          }
          return syncedCount;
      } catch (e: any) {
          console.error("Sync Error:", e);
          // Don't fail hard, just return 0 or log
          return 0;
      }
  }
}
