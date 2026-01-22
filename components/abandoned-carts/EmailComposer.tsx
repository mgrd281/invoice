'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ABANDONED_CART_TEMPLATES, getPersonalizedTemplate } from '@/lib/abandoned-cart-templates'
import { Mail, Percent, Clock, Send, Eye, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface EmailComposerProps {
    isOpen: boolean
    onClose: () => void
    cart: any
    onSent: () => void
}

export function EmailComposer({ isOpen, onClose, cart, onSent }: EmailComposerProps) {
    const { showToast } = useToast()
    const [templateId, setTemplateId] = useState(ABANDONED_CART_TEMPLATES[0].id)
    const [discountValue, setDiscountValue] = useState(10)
    const [expiryHours, setExpiryHours] = useState(24)
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState<any>(null)

    // Update preview when template or variables change
    useEffect(() => {
        if (!cart) return

        const itemsList = Array.isArray(cart.lineItems)
            ? cart.lineItems.map((item: any) => `- ${item.quantity}x ${item.title}`).join('\n')
            : 'Ihre Artikel'

        const personalized = getPersonalizedTemplate(templateId, {
            customerName: cart.email.split('@')[0],
            shopName: 'Mein Shop', // Fallback
            itemsList,
            discountCode: 'RECOVERY-CODE',
            expiryTime: `${expiryHours} Stunden`,
            expiryHours: expiryHours.toString(),
            cartUrl: cart.cartUrl
        })
        setPreview(personalized)
    }, [templateId, discountValue, expiryHours, cart])

    const handleSend = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/abandoned-carts/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartId: cart.id,
                    templateId,
                    discountValue,
                    expiryHours
                })
            })

            if (response.ok) {
                showToast(`Die Recovery-E-Mail wurde erfolgreich an ${cart.email} verschickt.`, 'success')
                onSent()
                onClose()
            } else {
                throw new Error('Fehler beim Senden')
            }
        } catch (error) {
            showToast('Die E-Mail konnte nicht gesendet werden.', 'error')
        } finally {
            setLoading(false)
        }
    }

    if (!cart) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-emerald-600" />
                        Recovery E-Mail senden
                    </DialogTitle>
                    <DialogDescription>
                        Senden Sie eine personalisierte E-Mail an {cart.email}, um den Warenkorb zu retten.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                    {/* Settings Column */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>E-Mail Template wählen</Label>
                            <Select value={templateId} onValueChange={setTemplateId}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ABANDONED_CART_TEMPLATES.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 italic">
                                {ABANDONED_CART_TEMPLATES.find(t => t.id === templateId)?.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    <Percent className="w-3 h-3" /> Rabatt (%)
                                </Label>
                                <Input
                                    type="number"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Gültigkeit (Std.)
                                </Label>
                                <Input
                                    type="number"
                                    value={expiryHours}
                                    onChange={(e) => setExpiryHours(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="text-sm font-semibold text-blue-900 mb-1">Hinweis</h4>
                            <p className="text-xs text-blue-700">
                                Wenn Sie einen Rabatt angeben, wird automatisch ein einmaliger Shopify-Coupon erstellt und in die E-Mail eingefügt.
                            </p>
                        </div>
                    </div>

                    {/* Preview Column */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col h-[500px]">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Vorschau
                            </h4>
                            <span className="text-[10px] uppercase font-bold text-gray-400">Marketing-Ansicht</span>
                        </div>

                        {preview && (
                            <div className="flex-1 bg-white p-4 rounded border shadow-sm overflow-y-auto text-sm">
                                <div className="mb-4 pb-2 border-b">
                                    <span className="text-gray-400">Betreff:</span> <span className="font-medium text-gray-800">{preview.subject}</span>
                                </div>
                                <div className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                                    {preview.body}
                                </div>
                                <div className="mt-6 flex justify-center">
                                    <Button variant="secondary" className="bg-emerald-600 text-white hover:bg-emerald-700 w-full max-w-xs">
                                        {preview.cta}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-8 border-t pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Abbrechen
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-32"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Senden
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
