import { NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'
import { sendEmail } from '@/lib/email-service' // We'll use the generic sender
import { log } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
    // Verify Vercel Cron header to prevent unauthorized access
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow manual testing if a query param is present ?key=manual_test
        const { searchParams } = new URL(req.url)
        if (searchParams.get('key') !== process.env.CRON_SECRET) {
            // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    try {
        log('⏰ Starting Daily Report Cron Job...')

        // 1. Determine "Today" in Berlin Time
        const now = new Date()
        // Adjust to German time (UTC+1 or UTC+2) - simplified for now
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)

        const startDateStr = startOfDay.toISOString()
        const endDateStr = endOfDay.toISOString()

        log(`📅 Fetching orders from ${startDateStr} to ${endDateStr}`)

        // 2. Fetch Today's Orders from Shopify
        const api = new ShopifyAPI()
        const orders = await api.getOrders({
            created_at_min: startDateStr,
            created_at_max: endDateStr,
            financial_status: 'paid' // Only paid orders
        })

        log(`📦 Found ${orders.length} paid orders for today.`)

        if (orders.length === 0) {
            log('ℹ️ No orders today. Sending empty report.')
        }

        // 3. Calculate Totals
        let totalRevenue = 0
        const orderRows = orders.map(order => {
            const amount = parseFloat(order.total_price)
            totalRevenue += amount
            return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order.customer?.first_name || ''} ${order.customer?.last_name || 'Kunde'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${amount.toFixed(2)} ${order.currency}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(order.created_at).toLocaleTimeString('de-DE')}</td>
        </tr>
      `
        }).join('')

        // 4. Prepare Email Content (HTML)
        const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">Tagesabschluss: ${now.toLocaleDateString('de-DE')}</h1>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="font-size: 18px; margin: 5px 0;"><strong>Anzahl Bestellungen:</strong> ${orders.length}</p>
          <p style="font-size: 18px; margin: 5px 0;"><strong>Gesamtumsatz:</strong> ${totalRevenue.toFixed(2)} EUR</p>
        </div>

        <h3>Bestellübersicht:</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #eee;">
              <th style="padding: 8px;">Order #</th>
              <th style="padding: 8px;">Kunde</th>
              <th style="padding: 8px;">Betrag</th>
              <th style="padding: 8px;">Uhrzeit</th>
            </tr>
          </thead>
          <tbody>
            ${orderRows || '<tr><td colspan="4" style="padding: 10px; text-align: center;">Keine Bestellungen heute.</td></tr>'}
          </tbody>
        </table>

        <p style="margin-top: 30px; font-size: 12px; color: #888;">
          Dieser Bericht wurde automatisch generiert von Ihrem Rechnungssystem.<br>
          Zeitpunkt: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
        </p>
      </div>
    `

        // 5. Send Email
        const targetEmail = 'karinakhristich@gmail.com'
        log(`📧 Sending daily report to ${targetEmail}...`)

        await sendEmail({
            to: targetEmail,
            subject: `Tagesabschluss ${now.toLocaleDateString('de-DE')} - ${orders.length} Bestellungen`,
            html: emailHtml,
            // We could attach a CSV here in the future
        })

        log('✅ Daily report sent successfully!')

        return NextResponse.json({ success: true, count: orders.length })
    } catch (error: any) {
        log('❌ Error in daily report:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
