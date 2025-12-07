'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Key, Trash2, BarChart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DigitalProduct {
    id: string;
    title: string;
    shopifyProductId: string;
    _count: {
        keys: number;
    };
}

interface DigitalProductsViewProps {
    shop: string;
}

export default function DigitalProductsView({ shop }: DigitalProductsViewProps) {
    const [products, setProducts] = useState<DigitalProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ title: '', shopifyProductId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (shop) {
            fetchProducts();
        }
    }, [shop]);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`/api/shopify/digital-products?shop=${shop}`);
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
            }
        } catch (error) {
            console.error('Failed to load products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/shopify/digital-products?shop=${shop}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setNewProduct({ title: '', shopifyProductId: '' });
                setIsAddDialogOpen(false);
                fetchProducts();
            } else {
                alert(data.error || 'Fehler beim Erstellen des Produkts');
            }
        } catch (error) {
            console.error('Failed to create product', error);
            alert('Ein Fehler ist aufgetreten');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProduct = async (e: React.MouseEvent, productId: string) => {
        // ... (existing delete logic)
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('Möchten Sie dieses Produkt und alle zugehörigen Keys wirklich löschen?')) return;

        try {
            const res = await fetch(`/api/digital-products/${productId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchProducts();
            } else {
                alert('Fehler beim Löschen des Produkts');
            }
        } catch (error) {
            console.error('Failed to delete product', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Key className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Digitale Produkte</h2>
                        <p className="text-sm text-gray-500">Verwalten Sie Ihre Lizenzschlüssel und Downloads</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <BarChart className="w-4 h-4 mr-2" />
                        Berichte
                    </Button>

                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Neues Produkt
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Neues digitales Produkt</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddProduct} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Produkt Titel</Label>
                                    <Input
                                        id="title"
                                        value={newProduct.title}
                                        onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                                        placeholder="z.B. Windows 11 Pro"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shopifyId">Shopify Produkt ID</Label>
                                    <Input
                                        id="shopifyId"
                                        value={newProduct.shopifyProductId}
                                        onChange={(e) => setNewProduct({ ...newProduct, shopifyProductId: e.target.value })}
                                        placeholder="z.B. 832910..."
                                        required
                                    />
                                    <p className="text-xs text-gray-500">Die ID finden Sie in der URL der Produktseite im Shopify Admin.</p>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Abbrechen</Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Wird erstellt...' : 'Erstellen'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Laden...</div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow border border-dashed border-gray-300">
                    <Key className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine digitalen Produkte</h3>
                    <p className="mt-1 text-sm text-gray-500">Starten Sie mit dem Hinzufügen Ihres ersten Microsoft-Produkts.</p>
                    <div className="mt-6">
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Produkt hinzufügen
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                        <Card key={product.id} className="hover:shadow-lg transition-shadow cursor-pointer h-full relative group">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-start">
                                    <span className="truncate pr-8">{product.title}</span>
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button
                                            onClick={(e) => handleDeleteProduct(e, product.id)}
                                            className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                                            title="Produkt löschen"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </CardTitle>
                                <CardDescription>ID: {product.shopifyProductId}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${product._count.keys === 0 ? 'bg-red-500' :
                                            product._count.keys < 10 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`} />
                                        <span className={`text-sm font-medium ${product._count.keys < 10 ? 'text-yellow-700' : 'text-gray-700'
                                            }`}>
                                            {product._count.keys} Keys verfügbar
                                            {product._count.keys < 10 && (
                                                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                                    Niedriger Bestand
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="sm">Verwalten &rarr;</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
