import { ShopifyAPI, ShopifyProduct } from './shopify-api'
import { getShopifySettings } from './shopify-settings'
import {
    SeoIssue,
    SeoScan,
    SeoScanOptions,
    SeoResourceType,
    SeoSeverity,
    SeoCategory,
    SeoFixType
} from '../types/seo-types'

/**
 * Core engine for scanning and auditing a Shopify store for SEO issues.
 * Expanded for enterprise-grade reporting and AI integration.
 */
export class SEOEngine {
    private shopifyApi: ShopifyAPI

    constructor(organizationId: string) {
        // In a real app, we'd fetch settings specifically for this organization
        const settings = getShopifySettings()
        this.shopifyApi = new ShopifyAPI(settings)
    }

    /**
     * Performs a full store SEO scan based on provided options.
     */
    async performScan(options: SeoScanOptions): Promise<SeoScan> {
        const issues: SeoIssue[] = []
        const startTime = Date.now()

        // Initialize scan progress
        const scanResult: SeoScan = {
            id: `scan_${Math.random().toString(36).substr(2, 9)}`,
            status: 'running',
            progress: 0,
            crawledUrls: 0,
            totalUrls: 0,
            currentStage: 'crawl',
            options,
            startedAt: new Date().toISOString()
        }

        try {
            // 1. Crawl / Fetch URLs
            // In a real scenario, this would involve fetching all products, collections, pages, and blog posts
            let resources: { type: SeoResourceType, data: any }[] = []

            if (options.scope === 'full' || options.scope === 'products') {
                const products = await this.shopifyApi.getProducts({ limit: 50 })
                resources.push(...products.map(p => ({ type: 'Product' as SeoResourceType, data: p })))
            }

            if (options.scope === 'full' || options.scope === 'collections') {
                const collections = await this.shopifyApi.getCollections({ limit: 20 })
                resources.push(...collections.map(c => ({ type: 'Collection' as SeoResourceType, data: c })))
            }

            // Mocking pages and blogs for now if full scan
            if (options.scope === 'full') {
                resources.push({ type: 'Page', data: { handle: '', title: 'Home', body_html: 'Welcome' } })
            }

            scanResult.totalUrls = resources.length
            scanResult.currentStage = 'analyze'
            scanResult.progress = 30

            // 2. Analyze
            for (let i = 0; i < resources.length; i++) {
                const resource = resources[i]
                const resourceIssues = this.auditResource(resource.type, resource.data)
                issues.push(...resourceIssues)

                scanResult.crawledUrls++
                scanResult.progress = 30 + Math.floor((i / resources.length) * 50)
            }

            // 3. Score
            scanResult.currentStage = 'score'
            scanResult.progress = 90

            const stats = this.calculateStats(issues)

            // 4. Report
            scanResult.status = 'completed'
            scanResult.currentStage = 'report'
            scanResult.progress = 100
            scanResult.completedAt = new Date().toISOString()
            scanResult.duration = Date.now() - startTime
            scanResult.healthScore = stats.healthScore
            scanResult.criticalErrors = stats.critical
            scanResult.warnings = stats.high + stats.medium
            scanResult.opportunities = stats.low

            // In a real app, issues would be saved to a DB and linked via scanId
            // We'll return them in a wrapper or handled by the caller

            return scanResult

        } catch (error) {
            console.error('SEO Scan failed:', error)
            scanResult.status = 'failed'
            throw error
        }
    }

    /**
     * Audit a single resource (Product, Collection, etc.)
     */
    private auditResource(type: SeoResourceType, data: any): SeoIssue[] {
        const issues: SeoIssue[] = []
        const url = `/${type.toLowerCase()}s/${data.handle || ''}`
        const resourceId = data.id?.toString() || 'mock-id'

        // Rule: Title Tag
        if (!data.title || data.title.length < 30) {
            issues.push(this.createIssue(url, 'Titel-Tag zu kurz', 'On-Page', 'High', 'auto', 'Optimieren Sie den Titel auf 50-60 Zeichen.', type))
        } else if (data.title.length > 70) {
            issues.push(this.createIssue(url, 'Titel-Tag zu lang', 'On-Page', 'Medium', 'auto', 'Kürzen Sie den Titel auf unter 70 Zeichen.', type))
        }

        // Rule: Meta Description / Body Content
        const content = data.body_html || ''
        const textContent = content.replace(/<[^>]*>?/gm, '') // Strip HTML

        if (textContent.length < 100) {
            issues.push(this.createIssue(url, 'Inhalt zu dünn', 'Content', 'Critical', 'manual', 'Fügen Sie mehr wertvollen Text hinzu.', type))
        }

        // Rule: Images (for products)
        if (type === 'Product' && data.images && data.images.length > 0) {
            // Mocking check for missing alt tags
            if (data.id % 4 === 0) {
                issues.push(this.createIssue(url, 'Bilder ohne Alt-Text', 'Accessibility', 'Medium', 'auto', 'Generieren Sie Alt-Texte für alle Bilder.', type))
            }
        }

        // Rule: Technical (Mobile / Speed - Mocked)
        if (Math.random() > 0.8) {
            issues.push(this.createIssue(url, 'LCP Wert zu hoch', 'Performance', 'High', 'info', 'Optimieren Sie die Ladezeit der Bilder.', type))
        }

        return issues
    }

    private createIssue(
        url: string,
        title: string,
        category: SeoCategory,
        severity: SeoSeverity,
        fixType: SeoFixType,
        recommendation: string,
        resourceType: SeoResourceType
    ): SeoIssue {
        return {
            id: `issue_${Math.random().toString(36).substr(2, 9)}`,
            url,
            title,
            issue: title,
            category,
            severity,
            fixType,
            status: 'pending',
            impact: severity === 'Critical' ? 10 : severity === 'High' ? 7 : severity === 'Medium' ? 4 : 2,
            recommendation,
            resourceType,
            createdAt: new Date().toISOString()
        }
    }

    private calculateStats(issues: SeoIssue[]) {
        let stats = { critical: 0, high: 0, medium: 0, low: 0 }

        issues.forEach(issue => {
            if (issue.severity === 'Critical') stats.critical++
            else if (issue.severity === 'High') stats.high++
            else if (issue.severity === 'Medium') stats.medium++
            else if (issue.severity === 'Low') stats.low++
        })

        const baseScore = 100
        const deducted = (stats.critical * 15) + (stats.high * 8) + (stats.medium * 3) + (stats.low * 1)
        const healthScore = Math.max(0, Math.min(100, baseScore - deducted))

        return { ...stats, healthScore }
    }
}
