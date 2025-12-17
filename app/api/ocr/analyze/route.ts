import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import OpenAI from 'openai'
import * as XLSX from 'xlsx'

// Polyfill DOMMatrix for pdf-parse in Node environment
if (typeof DOMMatrix === 'undefined') {
    // @ts-ignore
    global.DOMMatrix = class DOMMatrix {
        a: number; b: number; c: number; d: number; e: number; f: number;
        constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
        translate() { return this; }
        scale() { return this; }
        toString() { return 'matrix(1, 0, 0, 1, 0, 0)'; }
    }
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    // Initialize OpenAI inside handler to avoid build-time errors if env is missing
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    // @ts-ignore
    const pdf = require('pdf-parse');

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
            } catch (e) {
                console.error('PDF parse error:', e)
                return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 })
            }
        } else if (file.type.startsWith('image/')) {
            isImage = true
        } else if (
            file.type === 'text/csv' ||
            file.type === 'application/vnd.ms-excel' ||
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.name.endsWith('.csv') ||
            file.name.endsWith('.xls') ||
            file.name.endsWith('.xlsx')
        ) {
            try {
                const workbook = XLSX.read(buffer, { type: 'buffer' })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                text = XLSX.utils.sheet_to_csv(sheet)
            } catch (e) {
                console.error('Excel/CSV parse error:', e)
                return NextResponse.json({ error: 'Failed to parse Excel/CSV file' }, { status: 500 })
            }
        } else {
            return NextResponse.json({ error: 'Unsupported file type. Please upload PDF, Image, CSV or Excel.' }, { status: 400 })
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
                            { type: "text", text: "Analyze this document (invoice/receipt). Extract data into JSON format.\n\nFields required:\n- totalAmount: number (gross amount in EUR, convert '9,90' to 9.90)\n- date: string (YYYY-MM-DD)\n- description: string (short summary of product/service in German)\n- category: 'INCOME' | 'EXPENSE' (Logic: If the invoice is ISSUED BY the user/company, it is INCOME. If it is a receipt FROM a shop/vendor, it is EXPENSE.)\n- invoiceNumber: string (optional)\n- supplier: string (name of the vendor/shop/issuer)\n\nReturn ONLY raw JSON, no markdown." },
                            {
                                type: "image_url",
                                image_url: {
                                    "url": `data:${file.type};base64,${base64Image}`
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 500,
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
                        content: "You are an expert accounting assistant. Analyze the text from a document and extract structured data."
                    },
                    {
                        role: "user",
                        content: `Extract the following fields from the text below into JSON:\n- totalAmount: number (gross amount in EUR)\n- date: string (YYYY-MM-DD)\n- description: string (short summary in German)\n- category: 'INCOME' | 'EXPENSE' (Logic: If it looks like an outgoing invoice from the user, INCOME. If it looks like a purchase receipt, EXPENSE.)\n- invoiceNumber: string (optional)\n- supplier: string (name of the vendor/issuer)\n\nText:\n${text.substring(0, 15000)}`
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
