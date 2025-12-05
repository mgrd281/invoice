import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
        }

        console.log('🧪 Testing email sending to:', email)

        const result = await sendEmail({
            to: email,
            subject: 'Test Email from Invoice System',
            html: '<h1>It Works!</h1><p>This is a test email to verify your SMTP configuration.</p>'
        })

        if (result.success) {
            return NextResponse.json({ success: true, message: 'Email sent successfully!' })
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 })
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
