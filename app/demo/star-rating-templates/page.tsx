'use client';

import { StarRatingMulti } from '@/components/ui/star-rating-multi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export default function StarRatingTemplatesPage() {
    const [selectedColor, setSelectedColor] = useState<string>('yellow');

    const templates = [
        {
            id: 'default',
            name: 'Default (كلاسيكي)',
            description: 'التصميم الافتراضي مع النجوم الممتلئة',
            recommended: true,
        },
        {
            id: 'minimal',
            name: 'Minimal (بسيط)',
            description: 'تصميم مضغوط وبسيط للمساحات الصغيرة',
            recommended: false,
        },
        {
            id: 'badge',
            name: 'Badge (شارة)',
            description: 'نمط الشارة مع خلفية ملونة',
            recommended: true,
        },
        {
            id: 'outlined',
            name: 'Outlined (محدد)',
            description: 'نجوم بإطار فقط، تصميم عصري',
            recommended: false,
        },
        {
            id: 'gradient',
            name: 'Gradient (متدرج)',
            description: 'نجوم مع تدرج لوني وظل',
            recommended: true,
        },
        {
            id: 'large-primary',
            name: 'Large Primary (كبير)',
            description: 'رقم كبير بارز مع النجوم',
            recommended: false,
        },
        {
            id: 'card',
            name: 'Card (بطاقة)',
            description: 'تصميم البطاقة مع خلفية',
            recommended: true,
        },
        {
            id: 'inline-compact',
            name: 'Inline Compact (مضغوط جداً)',
            description: 'تصميم مضغوط للغاية للأماكن الضيقة',
            recommended: false,
        },
        {
            id: 'percentage-bar',
            name: 'Percentage Bar (شريط النسبة)',
            description: 'نجوم مع شريط نسبة مئوية',
            recommended: true,
        },
    ];

    const colors = [
        { name: 'Yellow (أصفر)', value: 'yellow', hex: '#FBBF24' },
        { name: 'Blue (أزرق)', value: 'blue', hex: '#3B82F6' },
        { name: 'Purple (بنفسجي)', value: 'purple', hex: '#A855F7' },
        { name: 'Green (أخضر)', value: 'green', hex: '#10B981' },
        { name: 'Orange (برتقالي)', value: 'orange', hex: '#F97316' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        قوالب تقييم النجوم | Star Rating Templates
                    </h1>
                    <p className="text-gray-600">
                        9 قوالب مختلفة لعرض التقييمات | 9 different templates for displaying ratings
                    </p>
                </div>

                {/* Color Selector */}
                <Card>
                    <CardHeader>
                        <CardTitle>اختر اللون الأساسي | Choose Primary Color</CardTitle>
                        <CardDescription>سيتم تطبيق اللون على جميع القوالب أدناه</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {colors.map((color) => (
                                <button
                                    key={color.value}
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`px-6 py-3 rounded-lg border-2 transition-all ${selectedColor === color.value
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 rounded-full border-2 border-gray-200"
                                            style={{ backgroundColor: color.hex }}
                                        />
                                        <span className="font-medium text-sm">{color.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {templates.map((template) => (
                        <Card key={template.id} className="overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl">{template.name}</CardTitle>
                                    {template.recommended && (
                                        <Badge className="bg-green-100 text-green-800">موصى به</Badge>
                                    )}
                                </div>
                                <CardDescription className="text-right">{template.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {/* With Reviews */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        مع تقييمات | With Reviews
                                    </p>
                                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                                        <StarRatingMulti
                                            rating={4.5}
                                            reviewCount={128}
                                            template={template.id as any}
                                            primaryColor={selectedColor}
                                        />
                                    </div>
                                </div>

                                {/* Without Reviews */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        بدون تقييمات | Without Reviews (0)
                                    </p>
                                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                                        <StarRatingMulti
                                            rating={0}
                                            reviewCount={0}
                                            template={template.id as any}
                                            primaryColor={selectedColor}
                                        />
                                    </div>
                                </div>

                                {/* Size Variations */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        الأحجام | Sizes
                                    </p>
                                    <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500 w-12">Small:</span>
                                            <StarRatingMulti
                                                rating={4.2}
                                                reviewCount={42}
                                                template={template.id as any}
                                                size="sm"
                                                primaryColor={selectedColor}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500 w-12">Medium:</span>
                                            <StarRatingMulti
                                                rating={4.2}
                                                reviewCount={42}
                                                template={template.id as any}
                                                size="md"
                                                primaryColor={selectedColor}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500 w-12">Large:</span>
                                            <StarRatingMulti
                                                rating={4.2}
                                                reviewCount={42}
                                                template={template.id as any}
                                                size="lg"
                                                primaryColor={selectedColor}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Usage Example */}
                <Card>
                    <CardHeader>
                        <CardTitle>كيفية الاستخدام | How to Use</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            {`import { StarRatingMulti } from '@/components/ui/star-rating-multi';

// استخدام قالب معين
<StarRatingMulti 
  rating={4.5} 
  reviewCount={128} 
  template="badge"        // اختر القالب
  primaryColor="blue"     // اختر اللون
  size="md" 
/>

// القوالب المتاحة:
// 'default', 'minimal', 'badge', 'outlined', 
// 'gradient', 'large-primary', 'card', 
// 'inline-compact', 'percentage-bar'

// الألوان المتاحة:
// 'yellow', 'blue', 'purple', 'green', 'orange'`}
                        </pre>
                    </CardContent>
                </Card>

                {/* Product Cards Demo */}
                <Card>
                    <CardHeader>
                        <CardTitle>مثال: بطاقات المنتجات | Example: Product Cards</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Product 1 - Default */}
                            <div className="bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                    <span className="text-4xl">🎧</span>
                                </div>
                                <div className="p-4 space-y-2">
                                    <h3 className="font-semibold text-gray-900">Premium Headphones</h3>
                                    <StarRatingMulti
                                        rating={4.7}
                                        reviewCount={234}
                                        template="default"
                                        size="sm"
                                        primaryColor={selectedColor}
                                    />
                                    <p className="text-xl font-bold text-gray-900">€89.99</p>
                                </div>
                            </div>

                            {/* Product 2 - Badge */}
                            <div className="bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="aspect-square bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center">
                                    <span className="text-4xl">📱</span>
                                </div>
                                <div className="p-4 space-y-2">
                                    <h3 className="font-semibold text-gray-900">Smartphone Pro</h3>
                                    <StarRatingMulti
                                        rating={4.9}
                                        reviewCount={512}
                                        template="badge"
                                        size="sm"
                                        primaryColor={selectedColor}
                                    />
                                    <p className="text-xl font-bold text-gray-900">€699.99</p>
                                </div>
                            </div>

                            {/* Product 3 - No Reviews */}
                            <div className="bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="aspect-square bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                                    <span className="text-4xl">⌚</span>
                                </div>
                                <div className="p-4 space-y-2">
                                    <h3 className="font-semibold text-gray-900">Smartwatch New</h3>
                                    <StarRatingMulti
                                        rating={0}
                                        reviewCount={0}
                                        template="minimal"
                                        size="sm"
                                        primaryColor={selectedColor}
                                    />
                                    <p className="text-xl font-bold text-gray-900">€249.99</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
