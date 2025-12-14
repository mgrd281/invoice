import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER
        const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS
        const smtpHost = process.env.SMTP_HOST
        const smtpPort = process.env.SMTP_PORT
        const smtpSecure = process.env.SMTP_SECURE

        if (!smtpUser || !smtpPass) {
            return NextResponse.json({
                error: 'Missing configuration',
                details: { smtpUser: !!smtpUser, smtpPass: !!smtpPass }
            }, { status: 500 })
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost || 'smtp.gmail.com',
            port: parseInt(smtpPort || '587'),
            secure: smtpSecure === 'true', // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
            tls: {
                rejectUnauthorized: false
            }
        })

        // Verify connection
        try {
            await transporter.verify()
        } catch (verifyError: any) {
            return NextResponse.json({
                error: 'SMTP Connection Failed',
                message: verifyError.message,
                config: {
                    host: smtpHost,
                    port: smtpPort,
                    secure: smtpSecure,
                    user: smtpUser
                }
            }, { status: 500 })
        }

        // Send test email
        const info = await transporter.sendMail({
            from: `"Test Debug" <${smtpUser}>`,
            to: smtpUser, // Send to self
            subject: "Test Email from Railway Debugger",
            text: "If you receive this, your email configuration is CORRECT!",
            html: "<b>If you receive this, your email configuration is CORRECT!</b>"
        })

        return NextResponse.json({
            success: true,
            message: 'Email sent successfully',
            messageId: info.messageId,
            response: info.response
        })

    } catch (error: any) {
        return NextResponse.json({
            error: 'Email Sending Failed',
            message: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
