'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Key, Trash2, BarChart } from 'lucide-react';

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

    const handleDeleteProduct = async (e: React.MouseEvent, productId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('Möchten Sie dieses Produkt und alle zugehörigen Keys wirklich löschen?')) return;

        // Note: This delete endpoint might need to be secured/updated for Shopify context too
        // For now we assume the existing endpoint works if we don't need specific shopify auth for DELETE
        // OR we should create a shopify-specific delete endpoint.
        // Given the constraints, let's try to use the existing one but it might fail if it checks session.
        // If it fails, we might need to add a shopify-specific delete route.
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
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Neues Produkt
                    </Button>
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
                        <Button>
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
