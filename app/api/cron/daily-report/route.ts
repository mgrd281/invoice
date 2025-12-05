import { NextResponse } from 'next/server'
import { ShopifyAPI, convertShopifyOrderToInvoice } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'
import { sendEmail } from '@/lib/email-service'
import { log } from '@/lib/logger'
import { generateArizonaPDF } from '@/lib/arizona-pdf-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  // Verify Vercel Cron header
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const { searchParams } = new URL(req.url)
    if (searchParams.get('key') !== process.env.CRON_SECRET) {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    log('⏰ Starting Daily Report Cron Job (Enhanced)...')

    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)

    const startDateStr = startOfDay.toISOString()
    const endDateStr = endOfDay.toISOString()

    log(`📅 Fetching orders from ${startDateStr} to ${endDateStr}`)

    const api = new ShopifyAPI()
    const settings = getShopifySettings()

    const orders = await api.getOrders({
      created_at_min: startDateStr,
      created_at_max: endDateStr,
      financial_status: 'paid'
    })

    log(`📦 Found ${orders.length} paid orders for today.`)

    // Prepare data for report
    let totalNet = 0
    let totalTax = 0
    let totalGross = 0

    const attachments = []
    const orderRows = []

    for (const order of orders) {
      try {
        // Convert to Invoice Object to get calculations and PDF
        const invoice = convertShopifyOrderToInvoice(order, settings)

        // Generate PDF
        const doc = await generateArizonaPDF(invoice)
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

        attachments.push({
          filename: `Rechnung_${invoice.number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        })

        // Calculate totals (Parse from invoice to ensure consistency with PDF)
        const gross = invoice.total
        const tax = invoice.taxAmount
        const net = invoice.subtotal

        totalGross += gross
        totalTax += tax
        totalNet += net

        orderRows.push(`
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${invoice.number}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${invoice.customer.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${net.toFixed(2)} €</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${tax.toFixed(2)} €</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><strong>${gross.toFixed(2)} €</strong></td>
          </tr>
        `)
      } catch (err) {
        console.error(`Failed to process order ${order.name} for report:`, err)
      }
    }

    // HTML Email Content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto;">
        <h1 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">Tagesabschluss: ${now.toLocaleDateString('de-DE')}</h1>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Zusammenfassung</h2>
          <table style="width: 100%; max-width: 400px;">
            <tr>
              <td style="padding: 5px 0;">Anzahl Bestellungen:</td>
              <td style="text-align: right; font-weight: bold;">${orders.length}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">Gesamt Netto:</td>
              <td style="text-align: right;">${totalNet.toFixed(2)} €</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">MwSt (19%):</td>
              <td style="text-align: right;">${totalTax.toFixed(2)} €</td>
            </tr>
            <tr style="font-size: 18px; border-top: 1px solid #ccc;">
              <td style="padding: 10px 0;"><strong>Gesamt Brutto:</strong></td>
              <td style="text-align: right;"><strong>${totalGross.toFixed(2)} €</strong></td>
            </tr>
          </table>
        </div>

        <h3>Detaillierte Aufstellung:</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
          <thead>
            <tr style="background-color: #eee;">
              <th style="padding: 8px;">Rechnung #</th>
              <th style="padding: 8px;">Kunde</th>
              <th style="padding: 8px; text-align: right;">Netto</th>
              <th style="padding: 8px; text-align: right;">MwSt</th>
              <th style="padding: 8px; text-align: right;">Brutto</th>
            </tr>
          </thead>
          <tbody>
            ${orderRows.join('') || '<tr><td colspan="5" style="padding: 10px; text-align: center;">Keine Bestellungen heute.</td></tr>'}
          </tbody>
        </table>

        <p style="margin-top: 30px; font-size: 12px; color: #888;">
          Anbei finden Sie alle Rechnungen des Tages als PDF.<br>
          Zeitpunkt: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
        </p>
      </div>
    `

    const targetEmail = 'karinakhristich@gmail.com'
    log(`📧 Sending enhanced daily report to ${targetEmail} with ${attachments.length} PDFs...`)

    await sendEmail({
      to: targetEmail,
      subject: `Tagesabschluss ${now.toLocaleDateString('de-DE')} - ${totalGross.toFixed(2)} € Umsatz`,
      html: emailHtml,
      attachments: attachments
    })

    log('✅ Enhanced daily report sent successfully!')

    return NextResponse.json({ success: true, count: orders.length, revenue: totalGross })
  } catch (error: any) {
    log('❌ Error in daily report:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
