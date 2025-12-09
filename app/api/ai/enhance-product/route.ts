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

        const prompt = `أنت مساعد متخصص في كتابة أوصاف منتجات المتاجر الإلكترونية. سيتم تزويدك ببيانات منتج مستورد من موقع خارجي، ومهمتك هي تحويل هذه البيانات إلى وصف احترافي جاهز للنشر على متجر شوبيفاي.

اعتمد دائمًا التعليمات التالية:

1. اكتب مقدمة قصيرة من 2–3 جمل توضح فائدة المنتج ولماذا قد يحتاجه العميل.
2. اكتب قائمة مميزات رئيسية على شكل نقاط، تركّز على الفوائد العملية وليس المواصفات الجافة.
3. اكتب فقرة وصف تفصيلية تشرح كيفية استخدام المنتج وما الذي يميّزه عن المنتجات الأخرى.
4. إذا كانت هناك مواصفات تقنية، قم بتبسيطها بطريقة مفهومة وواضحة.
5. لا تضف أي معلومات عن الشحن أو الضمان أو السياسات؛ هذه تتم إضافتها لاحقًا من النظام.
6. لا تختلق حقائق أو تفاصيل غير موجودة في البيانات التي سيتم إرسالها.
7. استخدم لغة تسويقية، جذابة، سهلة القراءة، مناسبة للمتاجر الإلكترونية.
8. في النهاية، أعطني عنوانًا قصيرًا وجذّابًا ومحسّنًا للمنتج.

بيانات المنتج التي ستعتمد عليها (ستصل بهذا الشكل من التطبيق):

اسم المنتج:
${product.title}

الوصف الخام:
${product.description}

المواصفات:
${product.specifications || 'N/A'}

الميزات المتوفرة:
${product.features || 'N/A'}

الفئة / الاستخدام:
${product.product_type || 'General'}

الجمهور المستهدف:
${product.tags || 'General Audience'}

اكتب الآن الوصف الاحترافي وفق التعليمات أعلاه.`

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
            // Or if it starts with "العنوان:" or "Title:"
            if (lastLine.length < 100 && (lastLine.includes('العنوان') || !lastLine.endsWith('.'))) {
                newTitle = lastLine.replace(/^(العنوان|Title)[:\s-]+/i, '').replace(/["']/g, '').trim()
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
