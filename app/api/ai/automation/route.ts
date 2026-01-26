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

        if (action === 'GENERATE_BLOG') {
            const { topic } = body

            // 1. Generate Content via OpenAI
            let content = ''
            let title = ''

            try {
                // EXPLICIT GERMAN LOCK & ENTERPRISE TONE
                const prompt = `
                Rolle: Professioneller SEO-Experte.
                Aufgabe: Schreiben Sie einen SEO-optimierten Blog-Artikel über: "${topic}".
                SPRACHE: NUR DEUTSCH (DE). KEIN ENGLISCH.
                TONFALL: Professionell, sachlich, Enterprise-Level. Keine Emojis.
                
                Format: HTML (nur Body-Inhalt, keine html/body/head Tags).
                Struktur:
                - Erste Zeile: Ein aussagekräftiger H1-Titel (Kein HTML, nur Text).
                - Einleitung (Professional)
                - 3-4 Abschnitte mit H2-Überschriften
                - Fazit
                
                WICHTIG: Der gesamte Text MUSS in deutscher Sprache verfasst sein.
                `

                const rawResult = await openaiClient.generateSEOText(prompt)

                if (!rawResult) throw new Error('Kein Inhalt generiert')

                // Verification: Basic check if common German words exist (e.g. "der", "die", "das", "und", "ist")
                // In a production app, we'd use a proper language detection library.
                const germanWords = ['der', 'die', 'das', 'und', 'ist', 'für', 'mit', 'von']
                const isGerman = germanWords.some(word => rawResult.toLowerCase().includes(` ${word} `))

                if (!isGerman) {
                    throw new Error('Generierter Inhalt entspricht nicht der Spracheinstellung (Deutsch). Bitte erneut versuchen.')
                }

                const lines = rawResult.split('\n')
                title = lines[0].replace(/<[^>]*>/g, '').trim()
                content = lines.slice(1).join('\n').trim()

                if (!content) content = `<p>Hier folgt der Inhalt zu ${topic}...</p>`

            } catch (err: any) {
                console.error('Generation failed', err)
                return NextResponse.json({ success: false, error: err.message || 'KI-Generierung fehlgeschlagen' })
            }

            // 2. Publish to Shopify
            let articleUrl = '#'
            try {
                const shopify = new ShopifyAPI()
                const blogs = await shopify.getBlogs()

                if (blogs.length > 0) {
                    // Use the first available blog, usually "News"
                    const blogId = blogs[0].id

                    const article = await shopify.createArticle(blogId, {
                        title: title,
                        author: 'AI Editor',
                        tags: 'AI-Generated, Trends, 2026',
                        body_html: content,
                        published: true
                    })

                    // Construct public URL (this is a best guess, usually /blogs/handle/article-handle)
                    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || '45dv93-bk.myshopify.com'
                    articleUrl = `https://${shopDomain}/blogs/${blogs[0].handle}/${article.handle}`
                } else {
                    throw new Error('No blogs found in Shopify')
                }
            } catch (err: any) {
                console.error('Publishing failed', err)
                return NextResponse.json({ success: false, error: 'Fehler beim Veröffentlichen: ' + err.message })
            }

            return NextResponse.json({
                success: true,
                message: `Blog-Artikel "${title}" wurde erfolgreich veröffentlicht!`,
                articleUrl,
                logEntry: {
                    time: new Date().toISOString(),
                    event: 'MANUAL_PUBLISH',
                    detail: `Published: ${title}`,
                    status: 'SUCCESS'
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to update automation' }, { status: 500 })
    }
}
