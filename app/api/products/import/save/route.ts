import { NextRequest, NextResponse } from 'next/server'
import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'

export async function POST(request: NextRequest) {
    try {
        const { product, settings } = await request.json()

        if (!product) {
            return NextResponse.json({ error: 'Product data is required' }, { status: 400 })
        }

        // Initialize Shopify API
        const shopifySettings = getShopifySettings()
        if (!shopifySettings.accessToken || !shopifySettings.shopDomain) {
            return NextResponse.json({ error: 'Shopify settings are not configured' }, { status: 500 })
        }
        const api = new ShopifyAPI(shopifySettings)

        // Helper to create metafields
        const createMetafields = (metaData: any) => {
            if (!metaData) return []
            console.log('Processing variant metafields:', metaData)
            return Object.entries(metaData).map(([key, value]) => {
                let type = 'single_line_text_field'

                // Determine type based on key or content
                // STRICTLY enforce rich_text_field for known rich text keys
                if (key.includes('collapsible_row_content') || key === 'faq') {
                    type = 'rich_text_field'
                } else if ((value as string).length > 200 || (value as string).includes('\n')) {
                    type = 'multi_line_text_field'
                }

                // For rich_text_field, Shopify expects a JSON string of the content tree
                // But for simplicity via API, we can often send just text if we don't have the complex structure.
                // However, to be safe and fix the error, let's try 'multi_line_text_field' for everything EXCEPT
                // those explicitly defined as rich_text in the store.
                // The error explicitly says: "must be consistent with the definition's type: 'rich_text_field'".
                // So we MUST use 'rich_text_field' for those keys.

                // Construct rich text value (simple paragraph wrapper)
                let finalValue = value

                if (type === 'rich_text_field') {
                    // Always format as JSON for rich_text_field
                    finalValue = JSON.stringify({
                        type: "root",
                        children: [
                            {
                                type: "paragraph",
                                children: [
                                    {
                                        type: "text",
                                        value: value
                                    }
                                ]
                            }
                        ]
                    })
                }

                return {
                    namespace: 'custom',
                    key: key,
                    value: finalValue || '',
                    type: type
                }
            }).filter(m => m.value !== '' && m.value !== null && m.value !== undefined)
        }

        const variantMetafields = createMetafields(product.variantMetafields)
        const productMetafields = createMetafields(product.productMetafields)

        // Add FAQ to product metafields if available
        if (product.faq) {
            productMetafields.push({
                namespace: 'custom',
                key: 'collapsible_row_content_2',
                value: JSON.stringify({
                    type: "root",
                    children: [
                        {
                            type: "paragraph",
                            children: [
                                {
                                    type: "text",
                                    value: product.faq
                                }
                            ]
                        }
                    ]
                }),
                type: 'rich_text_field'
            })
            // Add heading for FAQ
            productMetafields.push({
                namespace: 'custom',
                key: 'collapsible_row_heading_2',
                value: 'Häufige Fragen',
                type: 'single_line_text_field'
            })
        }

        console.log('Final variant metafields:', variantMetafields)
        console.log('Final product metafields:', productMetafields)

        // Calculate Compare At Price (30% markup to show "Sale")
        const price = parseFloat(product.price)
        const compareAtPrice = (price * 1.3).toFixed(2)

        // Prepare product data for Shopify
        const shopifyProduct: any = {
            title: product.title,
            body_html: product.fullDescription || product.description,
            vendor: product.vendor,
            product_type: product.product_type,
            tags: product.tags ? `${product.tags}, Imported` : 'Imported',
            status: settings.isActive ? 'active' : 'draft',
            images: product.images.map((src: string, index: number) => ({
                src,
                alt: index === 0 && product.image_alt_text ? product.image_alt_text : undefined
            })),
            metafields: productMetafields.length > 0 ? productMetafields : undefined,
            variants: [
                {
                    price: product.price,
                    compare_at_price: compareAtPrice,
                    sku: product.sku,
                    barcode: product.ean,
                    taxable: settings.chargeTax,
                    inventory_management: 'shopify', // Always track inventory to set quantity
                    inventory_quantity: 889, // Set default quantity to 889 as requested
                    requires_shipping: settings.isPhysical,
                    metafields: variantMetafields.length > 0 ? variantMetafields : undefined,
                    weight: product.shipping?.weight || 0,
                    weight_unit: 'kg'
                }
            ]
        }

        // If original product had variants, we might want to try mapping them,
        // but for this simple import we'll stick to a single variant created from the main price
        // to avoid complex option mapping issues unless we want to do a full clone.
        // For a "Migration" tool, a full clone is better, but let's start with the simple version
        // that matches the preview data.

        // If the user provided a collection, we can't easily add it during creation
        // (requires a separate call to Collects API), so we'll skip it for now or handle it later.

        const createdProduct = await api.createProduct(shopifyProduct)

        // Update Inventory Item with HS Code and Country of Origin
        if (createdProduct && createdProduct.variants && createdProduct.variants.length > 0 && product.shipping) {
            const inventoryItemId = (createdProduct.variants[0] as any).inventory_item_id
            if (inventoryItemId) {
                try {
                    await api.updateInventoryItem(inventoryItemId, {
                        harmonized_system_code: product.shipping.hs_code,
                        country_code_of_origin: product.shipping.origin_country
                    })
                    console.log('Updated inventory item with shipping data')
                } catch (invError) {
                    console.error('Failed to update inventory item:', invError)
                }
            }
        }

        // Add to collection if specified
        if (settings.collection && createdProduct.id) {
            // Check if collection is an ID (numeric) or title (string)
            // If it's a string, we might need to find the ID first, but for now we assume the frontend sends the ID
            // if we implement the Select component correctly.
            // However, the current settings.collection might be a string title if coming from the old Input.
            // We'll try to parse it as an ID.
            const collectionId = parseInt(settings.collection)
            if (!isNaN(collectionId)) {
                await api.addProductToCollection(createdProduct.id, collectionId)
            } else {
                console.warn('Collection ID is not a number, skipping add to collection:', settings.collection)
            }
        }

        return NextResponse.json({ success: true, product: createdProduct })

    } catch (error) {
        console.error('Error saving product to Shopify:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to save product'
        }, { status: 500 })
    }
}
