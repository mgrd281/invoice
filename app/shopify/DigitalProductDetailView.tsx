'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface LicenseKey {
    id: string;
    key: string;
    isUsed: boolean;
    usedAt?: string;
    shopifyOrderId?: string;
}

interface DigitalProduct {
    id: string;
    title: string;
    shopifyProductId: string;
}

interface DigitalProductDetailViewProps {
    product: DigitalProduct;
    onBack: () => void;
}

export default function DigitalProductDetailView({ product, onBack }: DigitalProductDetailViewProps) {
    const [keys, setKeys] = useState<LicenseKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddKeysDialogOpen, setIsAddKeysDialogOpen] = useState(false);
    const [newKeysInput, setNewKeysInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchKeys();
    }, [product.id]);

    const fetchKeys = async () => {
        try {
            const res = await fetch(`/api/digital-products/${product.id}/keys`);
            const data = await res.json();
            if (data.success) {
                setKeys(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch keys', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddKeys = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Split by newlines and filter empty
            const keysToAdd = newKeysInput.split('\n').map(k => k.trim()).filter(k => k);

            if (keysToAdd.length === 0) {
                alert('Bitte geben Sie mindestens einen Key ein.');
                setIsSubmitting(false);
                return;
            }

            const res = await fetch(`/api/digital-products/${product.id}/keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keys: keysToAdd })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setNewKeysInput('');
                setIsAddKeysDialogOpen(false);
                fetchKeys();
            } else {
                alert(data.error || 'Fehler beim Hinzufügen der Keys');
            }
        } catch (error) {
            console.error('Failed to add keys', error);
            alert('Ein Fehler ist aufgetreten');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        if (!confirm('Möchten Sie diesen Key wirklich löschen?')) return;

        try {
            const res = await fetch(`/api/digital-products/${product.id}/keys?keyId=${keyId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchKeys();
            } else {
                alert('Fehler beim Löschen des Keys');
            }
        } catch (error) {
            console.error('Failed to delete key', error);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    const availableKeysCount = keys.filter(k => !k.isUsed).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{product.title}</h2>
                    <p className="text-sm text-gray-500">ID: {product.shopifyProductId}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Verfügbare Keys</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{availableKeysCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Vergebene Keys</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{keys.length - availableKeysCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Gesamt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{keys.length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Lizenzschlüssel</h3>
                <Dialog open={isAddKeysDialogOpen} onOpenChange={setIsAddKeysDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Keys hinzufügen
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Neue Keys hinzufügen</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddKeys} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="keys">Keys (einer pro Zeile)</Label>
                                <Textarea
                                    id="keys"
                                    value={newKeysInput}
                                    onChange={(e) => setNewKeysInput(e.target.value)}
                                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX&#10;YYYYY-YYYYY-YYYYY-YYYYY"
                                    rows={10}
                                    className="font-mono"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsAddKeysDialogOpen(false)}>Abbrechen</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Speichern...' : 'Speichern'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                                <th className="px-6 py-4 font-medium text-gray-500">Key</th>
                                <th className="px-6 py-4 font-medium text-gray-500">Bestellung</th>
                                <th className="px-6 py-4 font-medium text-gray-500">Genutzt am</th>
                                <th className="px-6 py-4 font-medium text-gray-500 text-right">Aktion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center">Laden...</td></tr>
                            ) : keys.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Keine Keys vorhanden.</td></tr>
                            ) : (
                                keys.map((key) => (
                                    <tr key={key.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            {key.isUsed ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Vergeben
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Verfügbar
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-700">
                                            <div className="flex items-center gap-2">
                                                {key.key}
                                                <button onClick={() => copyToClipboard(key.key)} className="text-gray-400 hover:text-gray-600" title="Kopieren">
                                                    <Copy className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {key.shopifyOrderId ? `#${key.shopifyOrderId}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {key.usedAt ? new Date(key.usedAt).toLocaleDateString('de-DE') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteKey(key.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                title="Löschen"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
