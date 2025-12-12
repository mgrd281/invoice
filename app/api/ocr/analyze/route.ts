import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import OpenAI from 'openai'
import pdf from 'pdf-parse'

// Initialize OpenAI
// Note: This requires OPENAI_API_KEY env variable to be set
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request)
        if ('error' in authResult) {
            return authResult.error
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        let text = ''
        let isImage = false
        const buffer = Buffer.from(await file.arrayBuffer())

        if (file.type === 'application/pdf') {
            try {
                const data = await pdf(buffer)
                text = data.text
                // If text is too short, it might be a scanned PDF (image only)
                if (text.trim().length < 50) {
                    // Fallback: We can't easily handle scanned PDFs without OCR library like Tesseract
                    // For now, we return a message or try to use Vision if we could convert it (but we can't easily on server)
                    // We'll proceed with what we have, maybe the LLM can infer something or return empty
                }
            } catch (e) {
                console.error('PDF parse error:', e)
                return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 })
            }
        } else if (file.type.startsWith('image/')) {
            isImage = true
        } else {
            // Try to parse as text for other formats or return error
            // For now, only support PDF and Images
            return NextResponse.json({ error: 'Unsupported file type. Please upload PDF or Image.' }, { status: 400 })
        }

        let result

        if (isImage) {
            // Use GPT-4 Vision
            const base64Image = buffer.toString('base64')
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Analyze this invoice/receipt. Extract the following fields: totalAmount (number), date (YYYY-MM-DD), description (short summary), category (EXPENSE or INCOME). Return ONLY JSON." },
                            {
                                type: "image_url",
                                image_url: {
                                    "url": `data:${file.type};base64,${base64Image}`
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 300,
            })
            const content = response.choices[0].message.content
            result = parseJsonFromLlm(content)
        } else {
            // Use GPT-4 for text
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are an accounting assistant. Extract data from the following invoice text. Return JSON with fields: totalAmount (number), date (YYYY-MM-DD), description (short summary), category (EXPENSE or INCOME)."
                    },
                    {
                        role: "user",
                        content: text.substring(0, 15000) // Limit text length
                    }
                ],
                response_format: { type: "json_object" }
            })
            result = JSON.parse(response.choices[0].message.content || '{}')
        }

        return NextResponse.json({ success: true, data: result })

    } catch (error) {
        console.error('OCR Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

function parseJsonFromLlm(content: string | null) {
    if (!content) return {}
    try {
        // Remove markdown code blocks if present
        const clean = content.replace(/```json/g, '').replace(/```/g, '').trim()
        return JSON.parse(clean)
    } catch (e) {
        console.error('JSON parse error', e)
        return {}
    }
}
