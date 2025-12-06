
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestWebhookPage() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [orderId, setOrderId] = useState('123456789')
    const [productId, setProductId] = useState('')
    const [email, setEmail] = useState('test@example.com')

    const handleTest = async () => {
        setLoading(true)
        setResult(null)
        try {
            const payload = {
                id: parseInt(orderId),
                email: email,
                financial_status: 'paid',
                line_items: [
                    {
                        id: 999,
                        product_id: parseInt(productId),
                        title: 'Test Product',
                        quantity: 1,
                        price: '10.00'
                    }
                ],
                customer: {
                    first_name: 'Test',
                    last_name: 'User',
                    email: email
                }
            }

            // We need to simulate the webhook signature verification or bypass it for testing
            // Since we can't easily generate a valid HMAC signature from the client without the secret,
            // we might need a dedicated test endpoint that skips verification or uses a test secret.
            // However, for now, let's try hitting the webhook endpoint directly and see if we can get a response.
            // Note: The real webhook endpoint verifies HMAC, so this might fail with 401/403.

            // Better approach: Create a dedicated server-side test route that calls the logic directly.
            const res = await fetch('/api/test-digital-delivery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            setResult(data)
        } catch (error) {
            setResult({ error: String(error) })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Test Digital Delivery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Shopify Product ID (must match a configured digital product)</Label>
                        <Input value={productId} onChange={e => setProductId(e.target.value)} placeholder="e.g. 10650102169867" />
                    </div>
                    <div>
                        <Label>Test Email</Label>
                        <Input value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <Button onClick={handleTest} disabled={loading}>
                        {loading ? 'Testing...' : 'Simulate Paid Order'}
                    </Button>

                    {result && (
                        <div className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
                            <pre>{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
