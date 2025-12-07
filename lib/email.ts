import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendVerificationEmail(email: string, token: string) {
    // Fallback URL if NEXTAUTH_URL is not set (e.g. in Vercel preview)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/auth/verify?token=${token}`;

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"RechnungsProfi" <noreply@rechnungsprofi.de>',
            to: email,
            subject: 'Bestätigen Sie Ihre E-Mail-Adresse',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1e40af;">Willkommen bei RechnungsProfi!</h2>
          <p>Vielen Dank für Ihre Registrierung. Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihren Account zu aktivieren und vollen Zugriff zu erhalten.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">E-Mail bestätigen</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Wenn der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
        </div>
      `,
        });
        console.log(`Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Failed to send verification email:', error);
        return false;
    }
}
