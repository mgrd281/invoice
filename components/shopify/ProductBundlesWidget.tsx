import React, { useState } from 'react'
import { Plus, ShoppingBag, Check, Copy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ProductBundlesWidget() {
    const [copied, setCopied] = useState(false)

    // Dummy Data for Preview
    const mainProduct = {
        title: "Premium T-Shirt",
        price: 29.90,
        image: "https://placehold.co/100x100/3b82f6/white?text=T-Shirt"
    }

    const bundleProducts = [
        {
            title: "Passende Cap",
            price: 19.90,
            image: "https://placehold.co/100x100/10b981/white?text=Cap"
        },
        {
            title: "Socken (3er Pack)",
            price: 14.90,
            image: "https://placehold.co/100x100/f59e0b/white?text=Socken"
        }
    ]

    const totalPrice = mainProduct.price + bundleProducts.reduce((acc, p) => acc + p.price, 0)

    const liquidCode = `
<!-- 
  Shopify Product Bundles Snippet 
  1. Create a Product Metafield: custom.bundle_products (List of Products)
  2. Add this snippet to your product-template.liquid
-->

<style>
  .bundle-container {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    background: #f9fafb;
  }
  .bundle-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
  }
  .bundle-items {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .bundle-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 80px;
  }
  .bundle-image {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid #ddd;
  }
  .bundle-plus {
    font-size: 20px;
    color: #666;
    font-weight: bold;
  }
  .bundle-total {
    margin-top: 10px;
    font-weight: bold;
    font-size: 16px;
  }
  .bundle-btn {
    width: 100%;
    background: #000;
    color: #fff;
    border: none;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    margin-top: 10px;
  }
  .bundle-btn:hover {
    opacity: 0.9;
  }
</style>

{% if product.metafields.custom.bundle_products %}
  <div class="bundle-container">
    <h3 class="bundle-title">Wird oft zusammen gekauft</h3>
    
    <div class="bundle-items">
      <!-- Main Product -->
      <div class="bundle-item">
        <img src="{{ product.featured_image | img_url: '100x100', crop: 'center' }}" class="bundle-image" alt="{{ product.title }}">
      </div>

      <!-- Bundle Products -->
      {% for bundle_product in product.metafields.custom.bundle_products.value %}
        <div class="bundle-plus">+</div>
        <div class="bundle-item">
          <a href="{{ bundle_product.url }}">
            <img src="{{ bundle_product.featured_image | img_url: '100x100', crop: 'center' }}" class="bundle-image" alt="{{ bundle_product.title }}">
          </a>
        </div>
      {% endfor %}
    </div>

    <div class="bundle-total">
      Gesamtpreis: <span id="bundle-total-price">Berechne...</span>
    </div>

    <button class="bundle-btn" onclick="addAllToCart()">
      Alle in den Warenkorb
    </button>
  </div>

  <script>
    function addAllToCart() {
      const items = [
        { id: {{ product.selected_or_first_available_variant.id }}, quantity: 1 }
      ];
      
      {% for bundle_product in product.metafields.custom.bundle_products.value %}
        items.push({ id: {{ bundle_product.selected_or_first_available_variant.id }}, quantity: 1 });
      {% endfor %}

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items })
      })
      .then(response => response.json())
      .then(data => {
        window.location.href = '/cart';
      })
      .catch((error) => {
        console.error('Error:', error);
      });
    }
  </script>
{% endif %}
`

    const copyToClipboard = () => {
        navigator.clipboard.writeText(liquidCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Preview Column */}
            <div>
                <Card className="h-full border-purple-100 shadow-md overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                        <CardTitle className="text-purple-900">Vorschau: Product Bundles</CardTitle>
                        <CardDescription className="text-purple-700">
                            Zeigen Sie passende Produkte direkt auf der Produktseite an.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 bg-white flex items-center justify-center min-h-[400px]">

                        <div className="w-full max-w-md border rounded-xl p-6 bg-gray-50">
                            <h3 className="font-bold text-lg mb-4 text-gray-900">Wird oft zusammen gekauft</h3>

                            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                                {/* Main Product */}
                                <div className="flex-shrink-0 flex flex-col items-center w-20">
                                    <div className="w-20 h-20 rounded-lg border bg-white p-1 mb-2">
                                        <img src={mainProduct.image} alt={mainProduct.title} className="w-full h-full object-contain rounded" />
                                    </div>
                                    <span className="text-xs text-center font-medium truncate w-full">{mainProduct.title}</span>
                                </div>

                                {/* Bundle Items */}
                                {bundleProducts.map((prod, idx) => (
                                    <React.Fragment key={idx}>
                                        <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <div className="flex-shrink-0 flex flex-col items-center w-20">
                                            <div className="w-20 h-20 rounded-lg border bg-white p-1 mb-2 relative group cursor-pointer hover:border-purple-400 transition-colors">
                                                <img src={prod.image} alt={prod.title} className="w-full h-full object-contain rounded" />
                                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                                            </div>
                                            <span className="text-xs text-center font-medium truncate w-full">{prod.title}</span>
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mb-4 pt-4 border-t">
                                <span className="text-gray-600">Gesamtpreis:</span>
                                <span className="font-bold text-lg text-purple-600">{totalPrice.toFixed(2).replace('.', ',')} €</span>
                            </div>

                            <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                                Alle 3 in den Warenkorb
                            </Button>
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* Code Column */}
            <div>
                <Tabs defaultValue="liquid">
                    <TabsList className="mb-4">
                        <TabsTrigger value="liquid">Liquid / HTML</TabsTrigger>
                        <TabsTrigger value="setup">Anleitung</TabsTrigger>
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
                    <TabsContent value="setup">
                        <Card>
                            <CardHeader>
                                <CardTitle>Einrichtung in Shopify</CardTitle>
                                <CardDescription>So aktivieren Sie die Bundles für Ihre Produkte</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
                                    <div>
                                        <h4 className="font-medium">Metafield erstellen</h4>
                                        <p className="text-sm text-gray-600 mt-1">Gehen Sie in Shopify zu <strong>Einstellungen &gt; Benutzerdefinierte Daten &gt; Produkte</strong> und erstellen Sie ein neues Metafield:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded">
                                            <li>Name: Bundle Products</li>
                                            <li>Namespace & Key: <code>custom.bundle_products</code></li>
                                            <li>Typ: <strong>Produkt (Liste)</strong></li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
                                    <div>
                                        <h4 className="font-medium">Produkte verknüpfen</h4>
                                        <p className="text-sm text-gray-600 mt-1">Gehen Sie zu einem Produkt im Shopify Admin und wählen Sie unten bei "Metafields" die Produkte aus, die im Bundle angezeigt werden sollen.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
                                    <div>
                                        <h4 className="font-medium">Code einfügen</h4>
                                        <p className="text-sm text-gray-600 mt-1">Kopieren Sie den Code aus dem "Liquid / HTML" Tab und fügen Sie ihn in Ihr Theme ein (z.B. in <code>main-product.liquid</code>).</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
