'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Palette, LayoutGrid, ShoppingBag } from "lucide-react";
import { ProductBundlesWidget } from '@/components/shopify/ProductBundlesWidget';
import WidgetsView from '@/app/shopify/WidgetsView';

export default function StorefrontWidgetsPage() {
    const router = useRouter();
    const [activeWidget, setActiveWidget] = useState<'variant-selector' | 'product-bundles'>('variant-selector');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/dashboard')}
                                className="mr-4 text-gray-500 hover:text-gray-900"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Zurück
                            </Button>
                            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 p-2 rounded-lg mr-3">
                                <Palette className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    Storefront Widgets
                                </h1>
                                <p className="text-xs text-gray-500">Erweitern Sie Ihren Shop mit professionellen Elementen</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 gap-8">
                    {/* Intro Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Willkommen bei den Storefront Widgets</h2>
                        <p className="text-gray-600 mb-4">
                            Hier finden Sie vorgefertigte Komponenten, die Sie direkt in Ihr Shopify-Theme kopieren können.
                            Diese Widgets funktionieren unabhängig von Apps und benötigen keine monatlichen Gebühren.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveWidget('variant-selector')}
                                className={`flex items-center text-sm px-3 py-1 rounded-full transition-colors ${activeWidget === 'variant-selector'
                                    ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                <LayoutGrid className="w-4 h-4 mr-2" />
                                Variant Selector
                            </button>
                            <button
                                onClick={() => setActiveWidget('product-bundles')}
                                className={`flex items-center text-sm px-3 py-1 rounded-full transition-colors ${activeWidget === 'product-bundles'
                                    ? 'bg-purple-50 text-purple-600 ring-1 ring-purple-200'
                                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                <ShoppingBag className="w-4 h-4 mr-2" />
                                Product Bundles
                            </button>
                        </div>
                    </div>

                    {/* Main Widget View */}
                    {activeWidget === 'variant-selector' ? (
                        <WidgetsView />
                    ) : (
                        <ProductBundlesWidget />
                    )}
                </div>
            </main>
        </div>
    );
}
