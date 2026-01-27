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
    let controller: ReadableStreamDefaultController | null = null

    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { action, topic, title: userTitle } = body

        // Handle utility actions normally
        if (action === 'TOGGLE_AUTONOMOUS') {
            return NextResponse.json({ success: true, isAutonomous: body.value })
        }
        if (action === 'KILL_SWITCH') {
            console.warn('CRITICAL: AI Automation Kill Switch Triggered by', session.user?.email)
            return NextResponse.json({ success: true, status: 'PAUSED' })
        }

        // Handle Blog Generation with Streaming
        if (action === 'GENERATE_BLOG' || (!action && topic)) {
            if (!topic) {
                return NextResponse.json({ success: false, message: 'Topic is required' }, { status: 400 })
            }

            const encoder = new TextEncoder()
            const stream = new ReadableStream({
                async start(ctrl) {
                    controller = ctrl
                    const send = (data: any) => {
                        try {
                            ctrl.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
                        } catch (e) { /* client disconnected */ }
                    }

                    try {
                        console.log('🤖 Starting AI Automation Stream for:', topic)

                        // STEP 1: RESEARCH
                        send({ step: 'searching', message: `Durchsuche globale Quellen nach "${topic}"...` })

                        // Fake "Deep Search" delay/logic (or actually perform a light GPT research query first)
                        // Use GPT to get "Facts" first to simulate research
                        const researchPrompt = `
                            Recherchiere 5-10 aktuelle, harte Fakten, Statistiken oder Trends für 2024/2025 zum Thema: "${topic}".
                            Formatiere sie als kurze Liste. Fokus: Enterprise/B2B Relevanz.
                        `
                        const researchData = await openaiClient.generateSEOText(researchPrompt, 'gpt-4o')

                        send({ step: 'analyzing', message: 'Analysiere Datenpunkte & Trends...' })
                        await new Promise(r => setTimeout(r, 1500)) // Visual pacing

                        // STEP 2: IMAGE
                        send({ step: 'image', message: 'Generiere thematisch passendes Cover-Bild...' })
                        let imageUrl: string | null = null
                        try {
                            // Use userTitle if available for better image prompting, else topic
                            imageUrl = await openaiClient.generateImage(userTitle || topic)
                            send({ step: 'image', message: 'Bild erfolgreich generiert!' })
                        } catch (imgError) {
                            send({ step: 'image', message: 'Kein Bild generiert, fahre fort...' })
                        }

                        // STEP 3: WRITING
                        send({ step: 'writing', message: 'Verfasse Deep-Dive Fachartikel...' })

                        const articlePrompt = `
                            ROLLE: Chefredakteur für ein führendes deutsches Enterprise-Tech-Magazin.
                            AUFGABE: Erstelle einen "Deep Dive" Fachartikel (1500+ Wörter) über: "${topic}".
                            
                            KONTEXT & FAKTEN (Aus Recherche):
                            ${researchData}

                            TITEL VORGABE: ${userTitle ? `Nutze EXAKT diesen Titel: "${userTitle}"` : 'Erstelle einen viralen, professionellen Titel'}

                            DESIGN & FORMATTING (STRICT HTML):
                            - <article> Wrapper.
                            - <h2> modern & stark.
                            - <blockquote> für Experten-Zitate.
                            - <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #000; margin: 20px 0;"> für Insights.
                            - <strong>Fettgedruckte</strong> Keywords.
                            - Füge <img src="${imageUrl || ''}" alt="${topic}" /> ein, falls URL vorhanden.

                            STRUKTUR:
                            1. (Falls kein fester Titel): H1-Titel in erster Zeile.
                            2. Executive Summary (fett).
                            3. Problemstellung (Status Quo).
                            4. Lösung / Trend 2025.
                            5. Fazit.

                            TONFALL: Deutsch, Business Level, Visionär.
                        `

                        const rawResult = await openaiClient.generateSEOText(articlePrompt, 'gpt-4o')
                        if (!rawResult) throw new Error('Generation failed')

                        // Parse
                        const lines = rawResult.split('\n')
                        const cleanLines = lines.map(l => l.replace(/^#+\s*/, ''))
                        // If userTitle is forced, use it. Otherwise try scrape from line 1.
                        let title = userTitle
                        let contentStartIdx = 0

                        if (!title) {
                            title = cleanLines[0].replace(/<[^>]*>/g, '').trim() || topic
                            contentStartIdx = 1
                        } else {
                            // If user provided title, check if first line looks like a title duplicate and skip it if so
                            if (cleanLines[0].includes(title)) contentStartIdx = 1
                        }

                        const content = lines.slice(contentStartIdx).join('\n')

                        // STEP 4: PUBLISH
                        send({ step: 'publishing', message: 'Finalisiere & Publiere zu Shopify...' })

                        const shopify = new ShopifyAPI()
                        const blogs = await shopify.getBlogs()
                        let blogId = blogs.find(b => b.title === 'News')?.id || blogs[0]?.id

                        if (!blogId) throw new Error('Kein Shopify Blog gefunden')

                        const articlePayload: any = {
                            title: title,
                            author: 'Karinex',
                            tags: 'Deep Research, AI, Enterprise',
                            body_html: content,
                            published: true
                        }
                        if (imageUrl) articlePayload.image = { src: imageUrl }

                        const article = await shopify.createArticle(blogId, articlePayload)

                        // Create URL
                        const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || ''
                        const handle = blogs.find(b => b.id === blogId)?.handle
                        const articleUrl = `https://${shopDomain}/blogs/${handle}/${article.handle}`

                        send({ step: 'done', articleUrl, message: 'Fertig!' })
                        ctrl.close()

                    } catch (error: any) {
                        console.error('Stream Error:', error)
                        send({ error: error.message || 'Unknown error' })
                        ctrl.close()
                    }
                }
            })

            return new NextResponse(stream, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
