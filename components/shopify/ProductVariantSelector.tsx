'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Variant {
    id: string
    title: string
    price: string
    image?: string
    available: boolean
    options: string[] // e.g. ["Gold", "L"]
}

interface ProductOption {
    name: string
    values: string[]
}

interface ProductVariantSelectorProps {
    productTitle: string
    variants: Variant[]
    options: ProductOption[]
    onVariantChange?: (variant: Variant) => void
}

export function ProductVariantSelector({ productTitle, variants, options, onVariantChange }: ProductVariantSelectorProps) {
    const [selectedOptions, setSelectedOptions] = useState<string[]>(() => {
        // Default to first variant's options
        return variants[0]?.options || []
    })

    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(variants[0] || null)

    // Update selected variant when options change
    useEffect(() => {
        const found = variants.find(v =>
            v.options.every((opt, index) => opt === selectedOptions[index])
        )
        if (found) {
            setSelectedVariant(found)
            onVariantChange?.(found)
        }
    }, [selectedOptions, variants, onVariantChange])

    const handleOptionChange = (optionIndex: number, value: string) => {
        const newOptions = [...selectedOptions]
        newOptions[optionIndex] = value
        setSelectedOptions(newOptions)
    }

    // Helper to get image for a specific option value (e.g. "Gold")
    // We look for the first variant that has this option value
    const getImageForOptionValue = (optionIndex: number, value: string) => {
        const variant = variants.find(v => v.options[optionIndex] === value)
        return variant?.image || '/placeholder-product.jpg'
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{productTitle}</h3>

            {/* Price & Stock Display */}
            <div className="mb-6">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{selectedVariant?.price || '-'}</span>
                    {selectedVariant && !selectedVariant.available && (
                        <span className="text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded">Ausverkauft</span>
                    )}
                    {selectedVariant && selectedVariant.available && (
                        <span className="text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Auf Lager</span>
                    )}
                </div>
                <p className="text-sm text-gray-500 mt-1">SKU: {selectedVariant?.id || '-'}</p>
            </div>

            <div className="space-y-6">
                {options.map((option, index) => (
                    <div key={option.name}>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">
                                {option.name}: <span className="text-gray-500">{selectedOptions[index]}</span>
                            </span>
                        </div>

                        {/* First Option: Show as Images (if it looks like Color) */}
                        {index === 0 ? (
                            <div className="flex flex-wrap gap-3">
                                {option.values.map((value) => {
                                    const isSelected = selectedOptions[index] === value
                                    const image = getImageForOptionValue(index, value)

                                    return (
                                        <button
                                            key={value}
                                            onClick={() => handleOptionChange(index, value)}
                                            className={cn(
                                                "relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                                                isSelected
                                                    ? "border-blue-600 ring-1 ring-blue-600 shadow-md scale-105"
                                                    : "border-gray-200 hover:border-gray-300 hover:scale-105"
                                            )}
                                            title={value}
                                        >
                                            <img
                                                src={image}
                                                alt={value}
                                                className="w-full h-full object-cover"
                                            />
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                                                    <div className="bg-white rounded-full p-0.5 shadow-sm">
                                                        <Check className="w-3 h-3 text-blue-600" />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            /* Other Options: Show as Buttons/Chips */
                            <div className="flex flex-wrap gap-2">
                                {option.values.map((value) => {
                                    const isSelected = selectedOptions[index] === value
                                    return (
                                        <button
                                            key={value}
                                            onClick={() => handleOptionChange(index, value)}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200",
                                                isSelected
                                                    ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                                                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                            )}
                                        >
                                            {value}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button
                className={cn(
                    "w-full mt-8 py-3 px-4 rounded-lg font-bold text-white transition-all duration-200 shadow-lg transform active:scale-95",
                    selectedVariant?.available
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                        : "bg-gray-300 cursor-not-allowed"
                )}
                disabled={!selectedVariant?.available}
            >
                {selectedVariant?.available ? 'In den Warenkorb' : 'Nicht verfügbar'}
            </button>
        </div>
    )
}
