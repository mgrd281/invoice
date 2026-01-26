import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Mock data for automation state
        const automationState = {
            id: 'main_bot_01',
            name: 'Shopify Growth Bot',
            status: 'ACTIVE',
            isAutonomous: true,
            lastRun: new Date().toISOString(),
            nextRun: new Date(Date.now() + 3600000 * 21).toISOString(), // 21h from now
            config: {
                frequency: 'DAILY',
                publishHour: 9,
                seoTarget: 80,
                brandVoice: 'Professional',
                tone: 'Enterprise SaaS'
            },
            stats: {
                totalGenerated: 142,
                totalPublished: 89,
                failedAttempts: 3,
                avgSeoScore: 92
            },
            logs: [
                { time: new Date().toISOString(), event: 'ARTICLE_PUBLISHED', detail: 'Future of AI Blog', status: 'SUCCESS' },
                { time: new Date(Date.now() - 3600000).toISOString(), event: 'SEO_CHECK', detail: 'Score: 94', status: 'SUCCESS' },
                { time: new Date(Date.now() - 7200000).toISOString(), event: 'GENERATION_COMPLETE', detail: 'Draft ready', status: 'SUCCESS' }
            ]
        }

        return NextResponse.json({
            success: true,
            automation: automationState
        })
    } catch (error) {
        console.error('AI Automation API Error:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { action } = body

        if (action === 'TOGGLE_AUTONOMOUS') {
            return NextResponse.json({ success: true, isAutonomous: body.value })
        }

        if (action === 'KILL_SWITCH') {
            console.warn('CRITICAL: AI Automation Kill Switch Triggered by', session.user.email)
            return NextResponse.json({ success: true, status: 'PAUSED' })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to update automation' }, { status: 500 })
    }
}
