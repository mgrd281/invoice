import OpenAI from 'openai'

/**
 * Simple wrapper for OpenAI API.
 * Uses OPENAI_API_KEY from environment.
 */
export class OpenAIClient {
    private client: OpenAI

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'mock-key-if-missing'
        })
    }

    async generateSEOText(prompt: string, model = 'gpt-4o-mini'): Promise<string> {
        // If no API key, return a mock response for development
        if (!process.env.OPENAI_API_KEY) {
            console.warn('OPENAI_API_KEY missing - returning mock SEO text.')
            return "Optimierter SEO-Inhalt (Mock)"
        }

        try {
            const response = await this.client.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: 'Du bist ein erfahrener eCommerce SEO Experte. Antworte präzise und professionell.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })

            return response.choices[0]?.message?.content || ''
        } catch (error) {
            console.error('OpenAI Error:', error)
            return ''
        }
    }

    async generateImage(prompt: string): Promise<string | null> {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('OPENAI_API_KEY missing - returning mock image.')
            return "https://placehold.co/1024x1024/png?text=Mock+AI+Image"
        }

        try {
            const response = await this.client.images.generate({
                model: "dall-e-3",
                prompt: `Professional, modern, high-quality editorial blog image about: ${prompt}. Minimalist, elegant, tech-oriented style. No text overlays.`,
                n: 1,
                size: "1024x1024",
                quality: "hd",
                style: "vivid"
            })
            return response.data[0]?.url || null
        } catch (error) {
            console.error('OpenAI DALL-E Error:', error)
            return null
        }
    }
}

export const openaiClient = new OpenAIClient()
