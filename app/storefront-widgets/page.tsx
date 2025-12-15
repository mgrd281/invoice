'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Palette, LayoutGrid, ShoppingBag } from "lucide-react";
import WidgetsView from '@/app/shopify/WidgetsView';

export default function StorefrontWidgetsPage() {
    const router = useRouter();

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
                            <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                <LayoutGrid className="w-4 h-4 mr-2" />
                                Variant Selector
                            </div>
                            <div className="flex items-center text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                <ShoppingBag className="w-4 h-4 mr-2" />
                                Product Bundles (Bald verfügbar)
                            </div>
                        </div>
                    </div>

                    {/* Main Widget View */}
                    <WidgetsView />
                </div>
            </main>
        </div>
    );
}
