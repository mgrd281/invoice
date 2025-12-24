import nodemailer from 'nodemailer'
import { generateArizonaPDFBuffer } from './server-pdf-generator'
import { detectEmailProvider, getSmtpConfig } from './email-providers'
import { createEmailLog, markEmailFailed, markEmailSent, updateEmailLog } from './email-tracking'

// Helper: create nodemailer transporter based on sender email and env
// Helper: create nodemailer transporter based on sender email and env
function createTransporter(senderEmail: string) {
  const host = process.env.SMTP_HOST || getSmtpConfig(senderEmail).host
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || senderEmail
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || ''

  // Special handling for Gmail to avoid port/secure issues
  if (host === 'smtp.gmail.com') {
    console.log('🔌 Using Gmail Service Preset')
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass
      }
    })
  }

  const port = parseInt(process.env.SMTP_PORT || String(getSmtpConfig(senderEmail).port))

  // Logic for secure connection:
  // Port 465 -> secure: true
  // Port 587 -> secure: false (STARTTLS)
  const secure = (process.env.SMTP_SECURE || 'false') === 'true'
    ? true
    : (port === 465)

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      // Do not fail on invalid certs (common issue with some providers)
      rejectUnauthorized: false,
      // Force TLS v1.2 if needed, but usually auto-negotiation works
      ciphers: 'SSLv3'
    },
    // Increase connection timeout
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000
  })

  return transporter
}

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    // Check if we're in development mode
    if (process.env.EMAIL_DEV_MODE === 'true') {
      console.log('🧪 Email service running in DEVELOPMENT MODE - emails will be simulated')
      console.log('⚠️  To send real emails, set EMAIL_DEV_MODE="false" in .env.local')
      return true
    }

    console.log('🔧 Email service running in PRODUCTION MODE - real emails will be sent')

    // Use new SMTP environment variables if available, fallback to legacy
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || ''
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || ''

    // Validate required environment variables
    if (!smtpUser || !smtpPass) {
      console.error('❌ Missing required SMTP environment variables: SMTP_USER/EMAIL_USER, SMTP_PASS/EMAIL_PASS')
      console.error('💡 Please create .env.local file with SMTP configuration')
      return false
    }

    console.log('📧 SMTP User:', smtpUser.replace(/(.{3}).*(@.*)/, '$1***$2'))
    console.log('🔑 SMTP Pass:', smtpPass ? '***configured***' : 'NOT SET')

    // Email configuration validated
    console.log('✅ SMTP configuration loaded successfully')

    // Test connection with SMTP settings
    const transporter = createTransporter(smtpUser)
    console.log('🔌 Testing SMTP connection...')
    await transporter.verify()

    const provider = detectEmailProvider(smtpUser)
    console.log(`✅ Email configuration verified successfully for ${provider?.name || 'SMTP Provider'}`)
    return true
  } catch (error) {
    console.error('❌ Email configuration verification failed:', error)
    console.error('💡 Check your SMTP credentials and network connection')
    return false
  }
}

// Generic send email function
import { Resend } from 'resend'

// Generic send email function
export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if we're in development mode
    if (process.env.EMAIL_DEV_MODE === 'true') {
      console.log('🧪 DEVELOPMENT MODE: Simulating email send')
      console.log('📧 Would send to:', options.to)
      console.log('📄 Subject:', options.subject)
      console.log('⚠️  NO REAL EMAIL SENT - This is simulation only!')
      console.log('💡 To send real emails: set EMAIL_DEV_MODE="false" in .env.local')

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500))

      const devMessageId = `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      return {
        success: true,
        messageId: devMessageId
      }
    }

    // Check for Resend API Key first
    if (process.env.RESEND_API_KEY) {
      console.log('📧 Using Resend for email delivery')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: options.to,
        replyTo: process.env.EMAIL_REPLY_TO,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content
        }))
      })

      if (error) {
        console.error('❌ Resend Error:', error)
        throw new Error(error.message)
      }

      return {
        success: true,
        messageId: data?.id
      }
    }

    // Fallback to SMTP configuration for production
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || ''
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || ''

    if (!smtpUser || !smtpPass) {
      throw new Error('SMTP configuration missing')
    }

    const senderEmail = process.env.EMAIL_FROM || smtpUser
    const transporter = createTransporter(senderEmail)

    const mailOptions = {
      from: senderEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments
    }

    const info = await transporter.sendMail(mailOptions)

    return {
      success: true,
      messageId: info.messageId
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Send email with invoice PDF attachment
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
  // Create email tracking log
  const provider = detectEmailProvider(process.env.EMAIL_FROM || process.env.EMAIL_USER || '')
  const emailLog = createEmailLog({
    invoiceId,
    recipientEmail: customerEmail,
    ccEmail: process.env.EMAIL_CC,
    invoiceNumber,
    customerName,
    provider: provider?.name || 'Unknown'
  })

  try {
    console.log('📧 Starting email send process for invoice:', invoiceNumber)
    console.log('📝 Email log ID:', emailLog.id)

    // Check if we're in development mode
    if (process.env.EMAIL_DEV_MODE === 'true') {
      console.log('🧪 DEVELOPMENT MODE: Simulating email send')
      console.log('📧 Would send to:', customerEmail)
      console.log('📄 Invoice:', invoiceNumber)
      console.log('👤 Customer:', customerName)

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      const devMessageId = `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      markEmailSent(emailLog.id, devMessageId, 'Development mode simulation')

      return {
        success: true,
        messageId: devMessageId,
        logId: emailLog.id
      }
    }

    // Use Resend if available
    if (process.env.RESEND_API_KEY) {
      console.log('📧 Using Resend for invoice email')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

      // Generate PDF buffer for attachment
      console.log('📄 Generating PDF for invoice:', invoiceNumber)
      const pdfBuffer = await generateArizonaPDFBuffer(invoiceId)

      if (!pdfBuffer) {
        const error = 'Failed to generate PDF for invoice'
        markEmailFailed(emailLog.id, error)
        throw new Error(error)
      }

      // Update log with PDF size
      updateEmailLog(emailLog.id, {
        metadata: {
          ...emailLog.metadata!,
          pdfSize: pdfBuffer.length
        }
      })

      // Email content
      const subject = customSubject || `Rechnung ${invoiceNumber} von ${companyName}`
      const htmlContent = customMessage
        ? generateCustomEmailHTML(customerName, invoiceNumber, companyName, customMessage, invoiceAmount, dueDate)
        : generateEmailHTML(customerName, invoiceNumber, companyName)

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: customerEmail,
        replyTo: process.env.EMAIL_REPLY_TO,
        cc: process.env.EMAIL_CC ? [process.env.EMAIL_CC] : undefined,
        subject: subject,
        html: htmlContent,
        attachments: [
          {
            filename: `Rechnung_${invoiceNumber}.pdf`,
            content: pdfBuffer
          }
        ]
      })

      if (error) {
        console.error('❌ Resend Error:', error)
        markEmailFailed(emailLog.id, error.message)
        throw new Error(error.message)
      }

      markEmailSent(emailLog.id, data?.id || 'resend-id', 'Sent via Resend')
      return {
        success: true,
        messageId: data?.id,
        logId: emailLog.id
      }
    }

    // Use new SMTP environment variables if available, fallback to legacy
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || ''
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || ''

    // Validate email configuration for production
    if (!smtpUser || !smtpPass) {
      const error = 'SMTP configuration missing. Please set SMTP_USER/EMAIL_USER and SMTP_PASS/EMAIL_PASS environment variables.'
      markEmailFailed(emailLog.id, error)
      throw new Error(error)
    }

    // Create transporter with SMTP settings
    const senderEmail = process.env.EMAIL_FROM || smtpUser
    const transporter = createTransporter(senderEmail)

    // Generate PDF buffer for attachment
    console.log('📄 Generating PDF for invoice:', invoiceNumber)
    const pdfBuffer = await generateArizonaPDFBuffer(invoiceId)

    if (!pdfBuffer) {
      const error = 'Failed to generate PDF for invoice'
      markEmailFailed(emailLog.id, error)
      throw new Error(error)
    }

    // Update log with PDF size
    updateEmailLog(emailLog.id, {
      metadata: {
        ...emailLog.metadata!,
        pdfSize: pdfBuffer.length
      }
    })

    // Email content with CC support and custom fields
    const subject = customSubject || `Rechnung ${invoiceNumber} von ${companyName}`
    const htmlContent = customMessage
      ? generateCustomEmailHTML(customerName, invoiceNumber, companyName, customMessage, invoiceAmount, dueDate)
      : generateEmailHTML(customerName, invoiceNumber, companyName)
    const textContent = customMessage
      ? generateCustomEmailText(customerName, invoiceNumber, companyName, customMessage, invoiceAmount, dueDate)
      : generateEmailText(customerName, invoiceNumber, companyName)

    const emailOptions = {
      to: customerEmail,
      cc: process.env.EMAIL_CC ? [process.env.EMAIL_CC] : undefined,
      subject: subject,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: `Rechnung_${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }

    // Send email
    console.log('📧 Sending email to:', customerEmail)
    if (process.env.EMAIL_CC) {
      console.log('📧 CC to:', process.env.EMAIL_CC)
    }

    const effectiveFrom = `${process.env.EMAIL_FROM_NAME || companyName} <${process.env.EMAIL_FROM || process.env.EMAIL_USER || senderEmail}>`
    const effectiveReplyTo = process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || process.env.EMAIL_USER || senderEmail

    console.log('📨 Using SMTP From:', effectiveFrom)
    const info = await transporter.sendMail({
      from: effectiveFrom,
      replyTo: effectiveReplyTo,
      ...emailOptions
    })

    console.log('✅ Email sent successfully!')
    console.log('📝 Message ID:', info.messageId)
    console.log('📊 SMTP Response:', info.response)
    console.log('📧 Envelope:', info.envelope)

    // Check for successful SMTP response (250 codes)
    const smtpResponse = info.response || ''
    const isSuccessful = smtpResponse.includes('250') || smtpResponse.includes('OK') || smtpResponse.includes('Queued')

    if (!isSuccessful && smtpResponse) {
      console.warn('⚠️ Unexpected SMTP response:', smtpResponse)
    }

    // Mark as sent in tracking with detailed response
    markEmailSent(emailLog.id, info.messageId, smtpResponse)

    return {
      success: true,
      messageId: info.messageId,
      logId: emailLog.id
    }

  } catch (error) {
    console.error('❌ Error sending invoice email:', error)

    // Mark as failed in tracking
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    markEmailFailed(emailLog.id, errorMessage)

    return {
      success: false,
      error: errorMessage,
      logId: emailLog.id
    }
  }
}

// Generate HTML email template
function generateEmailHTML(customerName: string, invoiceNumber: string, companyName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 4px; font-size: 12px; color: #6c757d; }
        .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Rechnung karinex</h1>
      </div>
      
      <div class="content">
        <p>Sehr geehrte/r ${customerName},</p>
        
        <p>anbei erhalten Sie Ihre Rechnung karinex.</p>
        
        <p>Die Rechnung finden Sie als PDF-Anhang zu dieser E-Mail.</p>
        
        <p>Bitte überweisen Sie den Rechnungsbetrag innerhalb der angegebenen Zahlungsfrist.</p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>Mit freundlichen Grüßen<br>
        <strong>Ihr Team von karinex</strong></p>
      </div>
      
      <div class="footer">
        <p><strong>Wichtige Hinweise:</strong></p>
        <ul>
          <li>Diese E-Mail wurde automatisch generiert</li>
          <li>Bitte antworten Sie nicht auf diese E-Mail</li>
          <li>Bei Fragen kontaktieren Sie uns über unsere regulären Kanäle</li>
        </ul>
      </div>
    </body>
    </html>
  `
}

// Generate plain text email
function generateEmailText(customerName: string, invoiceNumber: string, companyName: string): string {
  return `
Rechnung karinex

Sehr geehrte/r ${customerName},

anbei erhalten Sie Ihre Rechnung karinex.

Die Rechnung finden Sie als PDF-Anhang zu dieser E-Mail.

Bitte überweisen Sie den Rechnungsbetrag innerhalb der angegebenen Zahlungsfrist.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Team von karinex

---
Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
Bei Fragen kontaktieren Sie uns über unsere regulären Kanäle.
  `
}

// Generate custom HTML email with user message
function generateCustomEmailHTML(
  customerName: string,
  invoiceNumber: string,
  companyName: string,
  customMessage: string,
  invoiceAmount?: string,
  dueDate?: string
): string {
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('de-DE') : 'Bei Erhalt'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .invoice-details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .custom-message { background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0284c7; }
        .footer { background: #6b7280; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
        .footer ul { list-style: none; padding: 0; margin: 10px 0 0 0; }
        .footer li { margin: 5px 0; }
        h1 { margin: 0; font-size: 24px; }
        .amount { font-size: 18px; font-weight: bold; color: #2563eb; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Rechnung karinex</h1>
      </div>
      
      <div class="content">
        <p>Sehr geehrte/r ${customerName},</p>
        
        ${customMessage ? `<div class="custom-message"><strong>Persönliche Nachricht:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}
        
        <div class="invoice-details">
          <h3>Rechnungsdetails:</h3>
          <p><strong>Rechnungsnummer:</strong> ${invoiceNumber}</p>
          ${invoiceAmount ? `<p><strong>Rechnungsbetrag:</strong> <span class="amount">${invoiceAmount}</span></p>` : ''}
          <p><strong>Fälligkeitsdatum:</strong> ${formattedDueDate}</p>
        </div>
        
        <p>anbei erhalten Sie Ihre Rechnung karinex.</p>
        
        <p>Die Rechnung finden Sie als PDF-Anhang zu dieser E-Mail.</p>
        
        <p>Bitte überweisen Sie den Rechnungsbetrag bis zum angegebenen Fälligkeitsdatum.</p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>Mit freundlichen Grüßen<br>
        <strong>Ihr Team von karinex</strong></p>
      </div>
      
      <div class="footer">
        <p><strong>Wichtige Hinweise:</strong></p>
        <ul>
          <li>Diese E-Mail wurde automatisch generiert</li>
          <li>Bitte antworten Sie nicht auf diese E-Mail</li>
          <li>Bei Fragen kontaktieren Sie uns über unsere regulären Kanäle</li>
        </ul>
      </div>
    </body>
    </html>
  `
}

// Generate custom plain text email with user message
function generateCustomEmailText(
  customerName: string,
  invoiceNumber: string,
  companyName: string,
  customMessage: string,
  invoiceAmount?: string,
  dueDate?: string
): string {
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('de-DE') : 'Bei Erhalt'

  return `
Rechnung karinex

Sehr geehrte/r ${customerName},

${customMessage ? `${customMessage}\n\n` : ''}Rechnungsdetails:
• Rechnungsnummer: ${invoiceNumber}
${invoiceAmount ? `• Rechnungsbetrag: ${invoiceAmount}\n` : ''}• Fälligkeitsdatum: ${formattedDueDate}

anbei erhalten Sie Ihre Rechnung karinex.

Die Rechnung finden Sie als PDF-Anhang zu dieser E-Mail.

Bitte überweisen Sie den Rechnungsbetrag bis zum angegebenen Fälligkeitsdatum.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Team von karinex

---
Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
Bei Fragen kontaktieren Sie uns über unsere regulären Kanäle.
  `
}
