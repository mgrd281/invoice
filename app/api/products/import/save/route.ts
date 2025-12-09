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
            return Object.entries(metaData).map(([key, value]) => ({
                namespace: 'custom',
                key: key,
                value: value || '',
                type: 'single_line_text_field'
            })).filter(m => m.value !== '' && m.value !== null && m.value !== undefined)
        }

        const variantMetafields = createMetafields(product.variantMetafields)
        const productMetafields = createMetafields(product.productMetafields)

        console.log('Final variant metafields:', variantMetafields)
        console.log('Final product metafields:', productMetafields)

        // Prepare product data for Shopify
        const shopifyProduct: any = {
            title: product.title,
            body_html: product.fullDescription || product.description,
            vendor: product.vendor,
            product_type: product.product_type,
            tags: product.tags ? `${product.tags}, Imported` : 'Imported',
            status: settings.isActive ? 'active' : 'draft',
            images: product.images.map((src: string) => ({ src })),
            metafields: productMetafields.length > 0 ? productMetafields : undefined,
            variants: [
                {
                    price: product.price,
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
