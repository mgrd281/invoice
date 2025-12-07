import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const toEmail = searchParams.get('to');

    if (!toEmail) {
        return NextResponse.json({ error: 'Please provide a "to" email address parameter' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        },
        debug: true,
        logger: true
    });

    try {
        // Verify connection first
        await new Promise((resolve, reject) => {
            transporter.verify(function (error, success) {
                if (error) reject(error);
                else resolve(success);
            });
        });

        // Send test email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Test" <noreply@test.com>',
            to: toEmail,
            subject: 'Test Email from RechnungsProfi',
            text: 'If you receive this, your SMTP settings are correct!',
            html: '<h1>Success!</h1><p>Your SMTP settings are working correctly.</p>',
        });

        return NextResponse.json({
            success: true,
            message: 'Email sent successfully',
            messageId: info.messageId,
            config: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER ? '***' : 'missing',
                pass: process.env.SMTP_PASS ? '***' : 'missing',
                secure: Number(process.env.SMTP_PORT) === 465
            }
        });

    } catch (error: any) {
        console.error('Test email failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            config: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER ? '***' : 'missing',
                pass: process.env.SMTP_PASS ? '***' : 'missing'
            }
        }, { status: 500 });
    }
}
