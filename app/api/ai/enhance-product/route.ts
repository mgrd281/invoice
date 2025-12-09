import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
    try {
        const { product } = await request.json()

        if (!product) {
            return NextResponse.json({ error: 'Product data is required' }, { status: 400 })
        }

        const prompt = `Du bist ein erstklassiger SEO-Experte und E-Commerce-Manager. Deine Aufgabe ist es, Produktdaten zu analysieren und eine vollständige, optimierte Datensatz-Struktur für Shopify zu erstellen.

Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt. Kein Markdown, kein erklärender Text davor oder danach.

Das JSON-Objekt muss folgende Felder enthalten:
1. "title": Ein SEO-optimierter, klickstarker Produkttitel (max 70 Zeichen).
2. "description": Eine professionelle HTML-Produktbeschreibung (mit <h3>, <ul>, <li>, <strong>), die folgende Struktur hat:
   - Subheadline (H3)
   - Einleitung (Überzeugend, USP)
   - Vorteile (<ul> mit <li><strong>Vorteil</strong>: Erklärung</li>)
   - Features/Funktionen (<ul>)
   - Systemanforderungen (falls relevant, sonst weglassen)
   - Fazit (Motivierend)
3. "tags": Ein Array von Strings mit 5-10 relevanten Tags für Filterung und Suche (z.B. "Software", "Office", "Windows 11").
4. "metaTitle": Ein Titel für Google (max 60 Zeichen).
5. "metaDescription": Eine Beschreibung für Google (max 160 Zeichen), die zum Klicken anregt.
6. "handle": Ein sauberer URL-Slug (kebab-case, z.B. "microsoft-office-2024-professional-plus").

Produktdaten:
Name: ${product.title}
Beschreibung: ${product.description}
Spezifikationen: ${product.specifications || 'N/A'}
Features: ${product.features || 'N/A'}
Kategorie: ${product.product_type || 'General'}

Erstelle jetzt das JSON-Objekt.`

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o',
            response_format: { type: "json_object" } // Force JSON mode
        })

        const content = completion.choices[0].message.content
        if (!content) throw new Error('No content received from AI')

        const aiData = JSON.parse(content)

        return NextResponse.json({
            success: true,
            enhancedText: aiData.description,
            newTitle: aiData.title,
            tags: aiData.tags,
            metaTitle: aiData.metaTitle,
            metaDescription: aiData.metaDescription,
            handle: aiData.handle
        })

    } catch (error: any) {
        console.error('Error enhancing product with AI:', error)
        const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to enhance product'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
