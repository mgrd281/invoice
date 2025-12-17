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

// Force Polyfill atob/btoa for pdf-parse to be lenient
// @ts-ignore
global.atob = (str) => Buffer.from(str.replace(/[\n\t\r\f\s]/g, ''), 'base64').toString('binary');
// @ts-ignore
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');

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
                // Set a timeout for PDF parsing to avoid hanging
                const parsePromise = pdf(buffer);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('PDF parse timeout')), 5000));

                const data: any = await Promise.race([parsePromise, timeoutPromise]);
                text = data.text

                if (!text || text.trim().length < 10) {
                    throw new Error('PDF has no text (scanned?)');
                }
            } catch (e: any) {
                console.error('PDF parse error:', e)

                // Check for specific "atob" or pattern errors which indicate complex/scanned PDFs
                const isComplexError = e.message?.includes('match the expected pattern') || e.message?.includes('atob');

                return NextResponse.json({
                    success: true,
                    data: {
                        ai_status: 'ERROR',
                        error_reason: isComplexError ? 'SCANNED_PDF_COMPLEX' : 'PDF_PARSE_FAILED',
                        debug_text: isComplexError
                            ? 'PDF is likely a scan or encrypted. Text extraction failed. Please enter data manually.'
                            : `PDF Parse Error: ${e.message || e}`
                    }
                })
            }
        } else if (file.type.startsWith('image/')) {
            isImage = true
        }
        // ... (CSV/Excel handling remains)

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
                            { type: "text", text: "Analyze this document (invoice/receipt) for German accounting. Extract data into JSON.\n\nRules:\n1. **totalAmount**: Look for 'Gesamtbetrag', 'Summe', 'Total', 'Zu zahlen', 'Endbetrag'. Prefer the largest final amount. Ignore 'Zwischensumme' or 'Netto'. Convert '1.234,56' to 1234.56. If multiple amounts exist, pick the final payable one.\n2. **date**: YYYY-MM-DD. Look for 'Datum', 'Rechnungsdatum', 'Leistungsdatum'.\n3. **description**: Short German summary (e.g. 'Büromaterial', 'Software Lizenz').\n4. **category**: 'INCOME' (if issued BY user) or 'EXPENSE' (if issued TO user/receipt).\n5. **supplier**: Name of the vendor/shop (e.g. 'Amazon', 'Shell', 'Telekom').\n6. **confidence**: 'high', 'medium', or 'low' based on how clear the total amount is.\n7. **ai_status**: 'OK' if amount/date found, 'WARNING' if unsure, 'ERROR' if nothing found.\n\nReturn ONLY raw JSON." },
                            {
                                type: "image_url",
                                image_url: {
                                    "url": `data:${file.type};base64,${base64Image}`
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 800,
            })
            const content = response.choices[0].message.content
            result = parseJsonFromLlm(content)
        } else {
            // Use GPT-4 for text
            console.log('Extracted text (first 500 chars):', text.substring(0, 500))

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert German accounting assistant. Analyze the text and extract structured data."
                    },
                    {
                        role: "user",
                        content: `Extract fields into JSON:\n- totalAmount: number (gross EUR, handle '1.000,00' as 1000.00). Look for 'Gesamt', 'Summe', 'Zahlbetrag', 'Rechnungsbetrag'. IGNORE 'Zwischensumme'.\n- date: string (YYYY-MM-DD). If multiple dates, prefer 'Rechnungsdatum'.\n- description: string (German summary)\n- category: 'INCOME' | 'EXPENSE'\n- invoiceNumber: string (optional)\n- supplier: string\n- confidence: 'high' | 'medium' | 'low'\n- ai_status: 'OK' | 'WARNING' | 'ERROR'\n\nText:\n${text.substring(0, 15000)}`
                    }
                ],
                response_format: { type: "json_object" }
            })
            result = JSON.parse(response.choices[0].message.content || '{}')
        }

        // Add debug info
        result.debug_text = isImage ? 'Image processed' : text.substring(0, 200)
        console.log('OCR Result:', JSON.stringify(result, null, 2))

        return NextResponse.json({ success: true, data: result })

    } catch (error: any) {
        console.error('OCR Error:', error)
        return NextResponse.json({ error: `OCR Error: ${error.message || error}` }, { status: 500 })
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
