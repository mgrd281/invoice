import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { fixId } = body

        if (!fixId) {
            return NextResponse.json({ success: false, error: 'Fix ID is required' }, { status: 400 })
        }

        // Mocking rollback
        console.log(`[SEO-FIX] Rolling back fix: ${fixId}`)

        await new Promise(resolve => setTimeout(resolve, 1000))

        return NextResponse.json({
            success: true,
            message: 'Fix rolled back successfully'
        })

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
