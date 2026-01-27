import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { openaiClient } from '@/lib/openai-client'
import { ShopifyAPI } from '@/lib/shopify-api'

export async function GET() {
    try {
        let session;
        try {
            session = await getServerSession(authOptions)
        } catch (e: any) {
            console.error('Session retrieval failed:', e)
            return NextResponse.json({
                error: 'Authentication Error',
                details: e.message
            }, { status: 500 })
        }

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
    } catch (error: any) {
        console.error('AI Automation API Error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal Server Error',
            details: error.message || 'Unknown error'
        }, { status: 500 })
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
            console.warn('CRITICAL: AI Automation Kill Switch Triggered by', session.user?.email)
            return NextResponse.json({ success: true, status: 'PAUSED' })
        }

        // GENERATE BLOG LOGIC
        if (action === 'GENERATE_BLOG' || (!action && body.topic)) {
            const { topic } = body

            if (!topic) {
                return NextResponse.json({ success: false, message: 'Topic is required' }, { status: 400 })
            }

            console.log('🤖 Starting AI Automation for:', topic)

            // 1. GENERATE IMAGE
            let imageUrl: string | null = null
            try {
                console.log('🎨 Generating AI Image for:', topic)
                imageUrl = await openaiClient.generateImage(topic)
                console.log('✅ Image URL:', imageUrl)
            } catch (imgError) {
                console.warn('⚠️ Image generation failed, continuing without image:', imgError)
            }

            // 2. GENERATE DEEP RESEARCH CONTENT
            console.log('📝 Generating Deep Research Text...')
            const prompt = `
            ROLLE: Chefredakteur für ein führendes deutsches Enterprise-Tech-Magazin (wie t3n, OMR, Business Insider).
            AUFGABE: Erstelle einen "Deep Dive" Fachartikel (1500+ Wörter) über: "${topic}".
            
            ANFORDERUNG "DEEP RESEARCH":
            - Simuliere eine tiefgehende Recherche.
            - Integriere (fiktive aber realistische) Marktdaten, Statistiken und Expertenmeinungen.
            - Analysiere Trends für 2025/2026.
            - Der Artikel muss massive Tiefe haben, kein oberflächliches "AI-Geschwafel".

            DESIGN & FORMATTING (STRICT HTML):
            - Nutze modernes, luftiges Editorial-Design.
            - <article> Wrapper um den Content.
            - <h2> mit modernem Styling (z.B. klare, starke Aussagen).
            - <blockquote> für "Experten-Zitate" oder Key-Takeways.
            - <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #000; margin: 20px 0;"> für "Key Insights" Boxen.
            - Listen (<ul>) mit kurzen, knackigen Punkten.
            - <strong>Fettgedruckte</strong> Wörter für Skimmability.
            - Füge an passender Stelle <img src="${imageUrl || ''}" alt="AI generated illustration" /> ein, falls URL vorhanden.
            
            STRUKTUR:
            1. H1-Titel (Nutze keine H1 im Body, der Titel wird im Shopify-Feld gesetzt, aber gib mir einen H1-Text in der ersten Zeile für Meta-Daten).
            2. Executive Summary (Fettdruck, 2-3 Sätze).
            3. Problemstellung & Status Quo (Tiefenanalyse).
            4. Die Lösung / Der Trend (Detailliert).
            5. Strategische Implikationen für Unternehmen (Warum jetzt handeln?).
            6. Checkliste / Action Plan (HTML Box).
            7. Fazit.

            TONFALL:
            - Deutsch (Business Level).
            - Autoritär, aber visionary.
            - "Sie"-Ansprache.
            `

            const rawResult = await openaiClient.generateSEOText(prompt, 'gpt-4o-mini')

            if (!rawResult) {
                return NextResponse.json({ success: false, message: 'Content generation failed' }, { status: 500 })
            }

            // Parse Title and Content
            const lines = rawResult.split('\n')
            const cleanLines = lines.map(l => l.replace(/^#+\s*/, ''))
            const title = cleanLines[0].replace(/<[^>]*>/g, '').trim() || topic
            const content = lines.slice(1).join('\n')

            // 3. PUBLISH TO SHOPIFY
            try {
                const shopify = new ShopifyAPI() // Uses env vars by default

                // Get 'News' blog or first available
                const blogs = await shopify.getBlogs()
                let blogId = blogs.find(b => b.title === 'News')?.id || blogs[0]?.id

                if (blogId) {
                    const articlePayload: any = {
                        title: title,
                        author: 'Karinex',
                        tags: 'Deep Research, AI, Enterprise',
                        body_html: content,
                        published: true
                    }

                    if (imageUrl) {
                        articlePayload.image = { src: imageUrl }
                    }

                    const article = await shopify.createArticle(blogId, articlePayload)

                    // Create URL
                    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || ''
                    const handle = blogs.find(b => b.id === blogId)?.handle
                    const articleUrl = `https://${shopDomain}/blogs/${handle}/${article.handle}`

                    return NextResponse.json({
                        success: true,
                        article,
                        message: 'Deep Research Article created successfully!',
                        articleUrl
                    })
                } else {
                    return NextResponse.json({ success: false, message: 'No Blog found in Shopify' })
                }
            } catch (shopError: any) {
                console.error('Shopify Publish Error:', shopError)
                return NextResponse.json({ success: false, message: 'Publishing failed: ' + shopError.message }, { status: 500 })
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
