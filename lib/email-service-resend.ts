import { Resend } from 'resend'
import { generateArizonaPDF } from './arizona-pdf-generator'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    // Check if we're in development mode
    if (process.env.EMAIL_DEV_MODE === 'true') {
      console.log('Email service running in DEVELOPMENT MODE - emails will be simulated')
      return true
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY environment variable')
      return false
    }

    console.log('✅ Resend email configuration verified')
    return true
  } catch (error) {
    console.error('Email configuration verification failed:', error)
    return false
  }
}

// Send email with invoice PDF attachment using Resend
export async function sendInvoiceEmail(
  invoiceId: string,
  customerEmail: string,
  customerName: string,
  invoiceNumber: string,
  companyName: string = 'Karina Khrystych',
  customSubject?: string,
  customMessage?: string,
  invoiceAmount?: string,
  dueDate?: string
): Promise<{ success: boolean; messageId?: string; error?: string; logId?: string }> {
  try {
    console.log('📧 Starting email send process for invoice:', invoiceNumber)
    
    // Check if we're in development mode
    if (process.env.EMAIL_DEV_MODE === 'true') {
      console.log('🧪 DEVELOPMENT MODE: Simulating email send')
      console.log('📧 Would send to:', customerEmail)
      console.log('📄 Invoice:', invoiceNumber)
      console.log('👤 Customer:', customerName)
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const devMessageId = `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      return {
        success: true,
        messageId: devMessageId,
        logId: 'dev-log-id'
      }
    }
    
    // Check Resend API key
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    // Fetch invoice data
    console.log('📄 Fetching invoice data for:', invoiceId)
    const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch invoice data')
    }
    const invoiceData = await response.json()

    // Generate PDF
    console.log('📄 Generating PDF for invoice:', invoiceNumber)
    const doc = generateArizonaPDF(invoiceData)
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Failed to generate PDF for invoice')
    }

    console.log(`📄 PDF generated successfully (${pdfBuffer.length} bytes)`)

    // Email content
    const subject = customSubject || `Rechnung ${invoiceNumber} von ${companyName}`
    const htmlContent = generateEmailHTML(customerName, invoiceNumber, companyName, customMessage, invoiceAmount, dueDate)

    // Determine sender
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    // Send email with Resend
    console.log('📧 Sending email via Resend to:', customerEmail)
    console.log('📨 Using From:', fromAddress)
    
    const emailData = {
      // Temporary dev-safe default as requested
      from: fromAddress,
      to: [customerEmail],
      subject: subject,
      html: htmlContent,
      attachments: [
        {
          filename: `Rechnung_${invoiceNumber}.pdf`,
          content: pdfBuffer,
        }
      ]
    }

    let result
    try {
      result = await resend.emails.send(emailData)
      if (result.error) {
        throw new Error(`Resend error: ${result.error.message}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const domainNotVerified = message.toLowerCase().includes('domain is not verified')
      const isDev = process.env.NODE_ENV !== 'production'
      const alreadyUsingOnboarding = fromAddress.endsWith('@resend.dev')

      // Auto-fallback in development: retry once with onboarding@resend.dev
      if (domainNotVerified && isDev && !alreadyUsingOnboarding) {
        console.warn('⚠️ Resend domain not verified. Retrying with onboarding@resend.dev (development only).')
        const fallbackFrom = 'onboarding@resend.dev'
        const fallbackData = { ...emailData, from: fallbackFrom }
        console.log('📨 Using fallback From:', fallbackFrom)
        result = await resend.emails.send(fallbackData)
        if (result.error) {
          throw new Error(`Resend error after fallback: ${result.error.message}`)
        }
      } else {
        throw err
      }
    }

    console.log('✅ Email sent successfully!')
    console.log('📝 Message ID:', result.data?.id)
    
    return {
      success: true,
      messageId: result.data?.id,
      logId: result.data?.id
    }

  } catch (error) {
    console.error('❌ Error sending invoice email:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return {
      success: false,
      error: errorMessage,
      logId: 'error-log-id'
    }
  }
}

// Generate HTML email template
function generateEmailHTML(
  customerName: string, 
  invoiceNumber: string, 
  companyName: string,
  customMessage?: string,
  invoiceAmount?: string,
  dueDate?: string
): string {
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('de-DE') : 'Bei Erhalt'
  
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${invoiceNumber}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f8f9fa;
        }
        .container {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .content { 
          padding: 30px; 
        }
        .invoice-details { 
          background: #f8fafc; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          border-left: 4px solid #2563eb; 
        }
        .custom-message { 
          background: #e0f2fe; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          border-left: 4px solid #0284c7; 
        }
        .footer { 
          background: #f1f5f9; 
          padding: 20px; 
          text-align: center; 
          font-size: 14px; 
          color: #64748b; 
          border-top: 1px solid #e2e8f0;
        }
        .amount { 
          font-size: 20px; 
          font-weight: 700; 
          color: #059669; 
        }
        .highlight {
          background: #fef3c7;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Rechnung ${invoiceNumber}</h1>
          <p>von ${companyName}</p>
        </div>
        
        <div class="content">
          <p>Sehr geehrte/r <strong>${customerName}</strong>,</p>
          
          ${customMessage ? `
            <div class="custom-message">
              <strong>📝 Persönliche Nachricht:</strong><br>
              ${customMessage.replace(/\n/g, '<br>')}
            </div>
          ` : ''}
          
          <div class="invoice-details">
            <h3 style="margin-top: 0; color: #1e293b;">📄 Rechnungsdetails</h3>
            <p><strong>Rechnungsnummer:</strong> <span class="highlight">${invoiceNumber}</span></p>
            ${invoiceAmount ? `<p><strong>Rechnungsbetrag:</strong> <span class="amount">${invoiceAmount}</span></p>` : ''}
            <p><strong>Fälligkeitsdatum:</strong> ${formattedDueDate}</p>
          </div>
          
          <p>📎 Die Rechnung finden Sie als <strong>PDF-Anhang</strong> zu dieser E-Mail.</p>
          
          <p>💳 Bitte überweisen Sie den Rechnungsbetrag bis zum angegebenen Fälligkeitsdatum.</p>
          
          <p>❓ Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          
          <p style="margin-top: 30px;">
            Mit freundlichen Grüßen<br>
            <strong>${companyName}</strong><br>
            <small style="color: #64748b;">Rechnung@karinex.de</small>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>ℹ️ Wichtige Hinweise:</strong></p>
          <p style="margin: 10px 0;">
            Diese E-Mail wurde automatisch generiert • 
            Bei Fragen kontaktieren Sie uns über Rechnung@karinex.de
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}
