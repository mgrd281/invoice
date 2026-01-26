import { ShopifyAPI, ShopifyProduct } from './shopify-api'
import { getShopifySettings } from './shopify-settings'

export interface SEOIssue {
    url: string
    title: string
    issue: string
    impact: 'Critical' | 'High' | 'Medium' | 'Low'
    type: 'Technical' | 'On-Page' | 'Shopify'
}

export interface SEOAuditReport {
    healthScore: number
    criticalErrors: number
    warnings: number
    opportunities: number
    issues: SEOIssue[]
    speedScore: number
}

/**
 * Core engine for scanning and auditing a Shopify store for SEO issues.
 */
export class SEOEngine {
    private shopifyApi: ShopifyAPI

    constructor(organizationId: string) {
        // In a real app, we'd fetch settings specifically for this organization
        // For now, using the global helper
        const settings = getShopifySettings()
        this.shopifyApi = new ShopifyAPI(settings)
    }

    /**
     * Performs a full store SEO scan.
     */
    async performFullScan(): Promise<SEOAuditReport> {
        const issues: SEOIssue[] = []
        let totalStats = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        }

        try {
            // 1. Fetch Products
            const products = await this.shopifyApi.getProducts({ limit: 50 })

            for (const product of products) {
                const productIssues = this.auditProduct(product)
                issues.push(...productIssues)
            }

            // 2. Fetch Collections
            const collections = await this.shopifyApi.getCollections({ limit: 20 })
            for (const collection of collections) {
                const collectionIssues = this.auditCollection(collection)
                issues.push(...collectionIssues)
            }

            // Calculate stats
            issues.forEach(issue => {
                if (issue.impact === 'Critical') totalStats.critical++
                else if (issue.impact === 'High') totalStats.high++
                else if (issue.impact === 'Medium') totalStats.medium++
                else if (issue.impact === 'Low') totalStats.low++
            })

            // Calculate health score (weighted)
            const baseScore = 100
            const deducted = (totalStats.critical * 10) + (totalStats.high * 5) + (totalStats.medium * 2)
            const healthScore = Math.max(0, Math.min(100, baseScore - deducted))

            return {
                healthScore,
                criticalErrors: totalStats.critical,
                warnings: totalStats.high + totalStats.medium,
                opportunities: totalStats.low,
                issues,
                speedScore: 85 // Mocked for now
            }

        } catch (error) {
            console.error('SEO Scan failed:', error)
            throw error
        }
    }

    /**
     * Audit a single Shopify product.
     */
    private auditProduct(product: ShopifyProduct): SEOIssue[] {
        const issues: SEOIssue[] = []
        const productUrl = `/products/${product.handle}`

        // Rule: Title Tag Length (Shopify title is usually the default title tag)
        if (!product.title || product.title.length < 30) {
            issues.push({
                url: productUrl,
                title: product.title,
                issue: 'Titel-Tag ist zu kurz (empfohlen: 50-60 Zeichen)',
                impact: 'High',
                type: 'On-Page'
            })
        }

        // Rule: Meta Description (body_html is often used as snippet if meta is missing)
        // Note: Real check would need metafields for SEO Title/Description
        if (!product.body_html || product.body_html.length < 100) {
            issues.push({
                url: productUrl,
                title: product.title,
                issue: 'Produktbeschreibung ist zu kurz oder fehlt',
                impact: 'Critical',
                type: 'On-Page'
            })
        }

        // Rule: Image Alt Tags
        if (product.images && product.images.length > 0) {
            // In a real scan, we'd check if any image lacks alt text
            // Mocking a finding
            if (product.id % 5 === 0) {
                issues.push({
                    url: productUrl,
                    title: product.title,
                    issue: 'Bilder ohne Alt-Text gefunden',
                    impact: 'Medium',
                    type: 'Shopify'
                })
            }
        }

        return issues
    }

    /**
     * Audit a Shopify collection.
     */
    private auditCollection(collection: any): SEOIssue[] {
        const issues: SEOIssue[] = []
        const collectionUrl = `/collections/${collection.handle}`

        if (!collection.body_html) {
            issues.push({
                url: collectionUrl,
                title: collection.title,
                issue: 'Kategorie-Beschreibung fehlt',
                impact: 'High',
                type: 'On-Page'
            })
        }

        return issues
    }
}
