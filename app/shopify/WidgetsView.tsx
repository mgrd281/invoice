'use client'

import { useState } from 'react'
import { ProductVariantSelector } from '@/components/shopify/ProductVariantSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Check } from 'lucide-react'

export default function WidgetsView() {
    const [copied, setCopied] = useState(false)

    // Dummy Data for Preview
    const dummyOptions = [
        { name: 'Farbe', values: ['Gold', 'Silber', 'Schwarz'] },
        { name: 'Größe', values: ['S', 'M', 'L'] }
    ]

    const dummyVariants = [
        { id: 'VAR-001', title: 'Gold / S', price: '29,90 €', available: true, options: ['Gold', 'S'], image: 'https://placehold.co/100x100/gold/white?text=Gold' },
        { id: 'VAR-002', title: 'Gold / M', price: '29,90 €', available: true, options: ['Gold', 'M'], image: 'https://placehold.co/100x100/gold/white?text=Gold' },
        { id: 'VAR-003', title: 'Gold / L', price: '29,90 €', available: false, options: ['Gold', 'L'], image: 'https://placehold.co/100x100/gold/white?text=Gold' },
        { id: 'VAR-004', title: 'Silber / S', price: '29,90 €', available: true, options: ['Silber', 'S'], image: 'https://placehold.co/100x100/silver/white?text=Silber' },
        { id: 'VAR-005', title: 'Silber / M', price: '29,90 €', available: true, options: ['Silber', 'M'], image: 'https://placehold.co/100x100/silver/white?text=Silber' },
        { id: 'VAR-006', title: 'Silber / L', price: '29,90 €', available: true, options: ['Silber', 'L'], image: 'https://placehold.co/100x100/silver/white?text=Silber' },
        { id: 'VAR-007', title: 'Schwarz / S', price: '34,90 €', available: true, options: ['Schwarz', 'S'], image: 'https://placehold.co/100x100/black/white?text=Schwarz' },
        { id: 'VAR-008', title: 'Schwarz / M', price: '34,90 €', available: true, options: ['Schwarz', 'M'], image: 'https://placehold.co/100x100/black/white?text=Schwarz' },
        { id: 'VAR-009', title: 'Schwarz / L', price: '34,90 €', available: true, options: ['Schwarz', 'L'], image: 'https://placehold.co/100x100/black/white?text=Schwarz' },
    ]

    const liquidCode = `
<!-- 
  Shopify Variant Selector Snippet 
  Add this to your product-template.liquid or main-product.liquid
-->

<style>
  .variant-selector-container {
    margin-bottom: 20px;
  }
  .variant-option-label {
    font-weight: bold;
    margin-bottom: 8px;
    display: block;
    font-size: 14px;
  }
  .variant-option-value {
    font-weight: normal;
    color: #666;
  }
  .variant-images-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .variant-image-btn {
    width: 60px;
    height: 60px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    padding: 0;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .variant-image-btn:hover {
    transform: scale(1.05);
    border-color: #d1d5db;
  }
  .variant-image-btn.active {
    border-color: #2563eb;
    box-shadow: 0 0 0 1px #2563eb;
  }
  .variant-image-btn img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* Mobile Scroll */
  @media (max-width: 640px) {
    .variant-images-row {
      overflow-x: auto;
      padding-bottom: 10px;
      flex-wrap: nowrap;
    }
    .variant-image-btn {
      flex-shrink: 0;
    }
  }
</style>

<div class="variant-selector-container" id="custom-variant-selector">
  {% for option in product.options_with_values %}
    <div class="variant-option-group">
      <label class="variant-option-label">
        {{ option.name }}: <span class="variant-option-value" id="option-value-{{ forloop.index0 }}">{{ option.selected_value }}</span>
      </label>

      {% if forloop.first %}
        <!-- First Option as Images -->
        <div class="variant-images-row">
          {% for value in option.values %}
            {% assign variant_image = product.variants[forloop.index0].image | default: product.featured_image %}
            <button 
              type="button" 
              class="variant-image-btn {% if option.selected_value == value %}active{% endif %}"
              data-value="{{ value }}"
              data-option-index="{{ forloop.parentloop.index0 }}"
              onclick="selectVariantOption(this, {{ forloop.parentloop.index0 }}, '{{ value }}')"
            >
              <img src="{{ variant_image | img_url: '100x100', crop: 'center' }}" alt="{{ value }}">
            </button>
          {% endfor %}
        </div>
      {% else %}
        <!-- Other Options as Buttons/Dropdown -->
        <div class="variant-buttons-row">
          {% for value in option.values %}
            <button 
              type="button"
              class="variant-text-btn {% if option.selected_value == value %}active{% endif %}"
              onclick="selectVariantOption(this, {{ forloop.parentloop.index0 }}, '{{ value }}')"
            >
              {{ value }}
            </button>
          {% endfor %}
        </div>
      {% endif %}
    </div>
  {% endfor %}
</div>

<script>
  function selectVariantOption(btn, optionIndex, value) {
    // 1. Update UI
    // Remove active class from siblings
    const siblings = btn.parentElement.children;
    for (let i = 0; i < siblings.length; i++) {
      siblings[i].classList.remove('active');
    }
    // Add active class to clicked
    btn.classList.add('active');
    
    // Update label text
    const labelSpan = document.getElementById('option-value-' + optionIndex);
    if (labelSpan) labelSpan.innerText = value;

    // 2. Trigger Shopify Variant Change
    // This depends on your theme. Usually you need to update the hidden select
    // or trigger a custom event.
    
    // Example for Dawn Theme:
    // const select = document.querySelector('variant-selects');
    // if (select) select.onVariantChange(...);
    
    console.log('Selected:', optionIndex, value);
  }
</script>
    `

    const copyToClipboard = () => {
        navigator.clipboard.writeText(liquidCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Storefront Widgets</h2>
                    <p className="text-gray-500">Erweitern Sie Ihren Shopify-Shop mit professionellen Elementen.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Preview Column */}
                <div>
                    <Card className="h-full border-blue-100 shadow-md overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                            <CardTitle className="text-blue-900">Vorschau: Variant Selector</CardTitle>
                            <CardDescription className="text-blue-700">
                                So sieht das Element in Ihrem Shop aus.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 bg-gray-50 flex items-center justify-center min-h-[400px]">
                            <ProductVariantSelector
                                productTitle="Premium T-Shirt"
                                variants={dummyVariants}
                                options={dummyOptions}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Code Column */}
                <div>
                    <Tabs defaultValue="liquid">
                        <TabsList className="mb-4">
                            <TabsTrigger value="liquid">Liquid / HTML</TabsTrigger>
                            <TabsTrigger value="css">CSS</TabsTrigger>
                            <TabsTrigger value="js">JavaScript</TabsTrigger>
                        </TabsList>
                        <TabsContent value="liquid">
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-medium">Code Snippet</CardTitle>
                                        <Button size="sm" variant="outline" onClick={copyToClipboard}>
                                            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                            {copied ? 'Kopiert!' : 'Kopieren'}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-auto h-[400px]">
                                        <pre>{liquidCode}</pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
