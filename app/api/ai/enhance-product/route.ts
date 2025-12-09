import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 60; // Allow up to 60 seconds for AI processing


export async function POST(request: NextRequest) {
    try {
        const { product } = await request.json()

        if (!product) {
            return NextResponse.json({ error: 'Product data is required' }, { status: 400 })
        }

        // Strip HTML from description to force AI to focus on content, not structure
        const cleanDescription = product.description ? product.description.replace(/<[^>]*>/g, ' ') : ''

        const prompt = `Du bist ein erstklassiger SEO-Copywriter. Deine Aufgabe ist es, eine KOMPLETT NEUE Produktbeschreibung zu schreiben.

WICHTIG:
- Du darfst KEINE Sätze aus dem Originaltext kopieren.
- Schreibe den Text von Grund auf neu.
- Nutze nur die Fakten (Spezifikationen, Features), aber formuliere alles neu.
- Der Stil muss verkaufsfördernd, professionell und für den deutschen Markt optimiert sein.

Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt.

Struktur des JSON-Objekts:
1. "title": Ein neuer, optimierter Titel (max 70 Zeichen).
2. "description": Eine HTML-formatierte Beschreibung (NUR <h3>, <ul>, <li>, <p>, <strong> erlaubt).
   - Aufbau:
     - <h3>Subheadline (Der Hauptnutzen in einem Satz)</h3>
     - <p>Einleitung (Warum dieses Produkt? USP hervorheben)</p>
     - <h3>Vorteile</h3>
     - <ul><li><strong>Vorteil 1</strong>: Erklärung</li>...</ul>
     - <h3>Funktionen</h3>
     - <ul><li>Feature 1</li>...</ul>
     - <h3>Fazit</h3>
     - <p>Zusammenfassung und Kaufempfehlung</p>
3. "tags": Array mit 5-10 Tags.
4. "metaTitle": SEO Titel.
5. "metaDescription": SEO Beschreibung.
6. "handle": URL-Slug.
7. "variantMetafields": Objekt mit Google Shopping Feldern:
   - "google_age_group": "adult", "kids", "toddler", "infant" oder "newborn" (meist "adult" für Software/Büro).
   - "google_condition": "new", "refurbished" oder "used" (meist "new" für Software).
   - "google_gender": "male", "female" oder "unisex" (meist "unisex").
   - "google_mpn": Herstellernummer (falls im Text gefunden, sonst leer lassen).
   - "google_size_type": "regular" (oder leer).
   - "google_size_system": "DE" (oder leer).
   - "google_custom_label_0": Leer oder spezifisches Label.
   - "google_custom_label_1": Leer.
   - "google_custom_label_2": Leer.
   - "google_custom_label_3": Leer.
   - "google_custom_label_4": Leer.

Produktdaten (Quelle):
Name: ${product.title}
Beschreibung (Rohdaten): ${cleanDescription}
Specs: ${product.specifications || 'N/A'}
Features: ${product.features || 'N/A'}
Kategorie: ${product.product_type || 'General'}

Erstelle jetzt das JSON-Objekt mit dem NEUEN Text.`

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
            handle: aiData.handle,
            variantMetafields: aiData.variantMetafields
        })

    } catch (error: any) {
        console.error('Error enhancing product with AI:', error)
        const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to enhance product'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
