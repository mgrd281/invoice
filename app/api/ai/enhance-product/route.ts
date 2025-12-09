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

        const prompt = `Du bist ein Experte für das Verfassen von Produktbeschreibungen für Online-Shops. Du erhältst Produktdaten von einer externen Website und deine Aufgabe ist es, diese Daten in eine professionelle, veröffentlichungsreife Beschreibung für einen Shopify-Store umzuwandeln.

Befolge immer diese Anweisungen:

1. Schreibe eine kurze Einleitung (2-3 Sätze), die den Nutzen des Produkts hervorhebt und erklärt, warum der Kunde es braucht.
2. Erstelle eine Liste der wichtigsten Funktionen als Aufzählungspunkte. Konzentriere dich auf den praktischen Nutzen, nicht nur auf trockene Spezifikationen.
3. Schreibe einen detaillierten Absatz, der die Anwendung des Produkts erklärt und was es von anderen Produkten unterscheidet.
4. Wenn technische Daten vorhanden sind, vereinfache sie so, dass sie leicht verständlich sind.
5. Füge KEINE Informationen zu Versand, Garantie oder Rückgaberichtlinien hinzu; diese werden vom System separat hinzugefügt.
6. Erfinde keine Fakten oder Details, die nicht in den übermittelten Daten enthalten sind.
7. Verwende eine marketingorientierte, ansprechende und leicht lesbare Sprache, die für Online-Shops geeignet ist.
8. Gib am Ende einen kurzen, attraktiven und SEO-optimierten Produkttitel an.

Produktdaten:
Name: ${product.title}
Beschreibung: ${product.description}
Spezifikationen: ${product.specifications || 'N/A'}
Features: ${product.features || 'N/A'}
Kategorie: ${product.product_type || 'General'}
Zielgruppe: ${product.tags || 'General Audience'}

Schreibe jetzt die professionelle Beschreibung auf DEUTSCH gemäß den obigen Anweisungen.`

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o',
        })

        const enhancedText = completion.choices[0].message.content

        // Try to extract the title from the end
        // We assume the title is the last line or close to it
        let newTitle = product.title
        let description = enhancedText

        if (enhancedText) {
            const lines = enhancedText.trim().split('\n')
            const lastLine = lines[lines.length - 1].trim()

            // Heuristic: If the last line is short and doesn't end with punctuation (mostly), it might be the title.
            // Or if it starts with "Titel:" or "Title:"
            if (lastLine.length < 100 && (lastLine.includes('Titel') || lastLine.includes('Title') || !lastLine.endsWith('.'))) {
                newTitle = lastLine.replace(/^(Titel|Title)[:\s-]+/i, '').replace(/["']/g, '').trim()
                // Remove the title from the description if it's just the title
                // description = lines.slice(0, -1).join('\n').trim()
            }
        }

        return NextResponse.json({
            success: true,
            enhancedText: description,
            newTitle: newTitle
        })

    } catch (error) {
        console.error('Error enhancing product with AI:', error)
        return NextResponse.json({ error: 'Failed to enhance product' }, { status: 500 })
    }
}
