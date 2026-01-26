import { NextRequest, NextResponse } from 'next/server'
import { SEOEngine } from '@/lib/seo-engine'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).organizationId
        if (!organizationId) {
            return NextResponse.json({ success: false, error: 'No organization linked' }, { status: 400 })
        }

        const engine = new SEOEngine(organizationId)
        const report = await engine.performFullScan()

        return NextResponse.json({
            success: true,
            report
        })

    } catch (error: any) {
        console.error('API Error: SEO Scan:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}
