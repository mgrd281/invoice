import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { SeoIssue } from '@/types/seo-types'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const url = new URL(req.url)
        const severity = url.searchParams.get('severity')
        const category = url.searchParams.get('category')
        const resourceType = url.searchParams.get('resourceType')

        // Mocking fetching from DB
        const issues: SeoIssue[] = [
            {
                id: 'iss_1',
                url: '/products/classic-leather-belt',
                title: 'Titel-Tag zu kurz',
                issue: 'Der Titel ist mit 15 Zeichen zu kurz. Empfohlen sind 50-60.',
                resourceType: 'Product',
                severity: 'High',
                category: 'On-Page',
                fixType: 'auto',
                status: 'pending',
                impact: 7,
                recommendation: 'Optimieren Sie den Titel auf: "Klassischer Ledergürtel - Premium Qualität & Handgefertigt"',
                createdAt: new Date().toISOString()
            },
            {
                id: 'iss_2',
                url: '/collections/summer-sale',
                title: 'Meta-Beschreibung fehlt',
                issue: 'Die Seite hat keine Meta-Beschreibung, was die CTR in Google senkt.',
                resourceType: 'Collection',
                severity: 'Critical',
                category: 'On-Page',
                fixType: 'auto',
                status: 'pending',
                impact: 9,
                recommendation: 'Fügen Sie eine ansprechende Meta-Beschreibung hinzu.',
                createdAt: new Date().toISOString()
            }
        ]

        let filteredIssues = issues
        if (severity) filteredIssues = filteredIssues.filter(i => i.severity === severity)
        if (category) filteredIssues = filteredIssues.filter(i => i.category === category)
        if (resourceType) filteredIssues = filteredIssues.filter(i => i.resourceType === resourceType)

        return NextResponse.json({
            success: true,
            issues: filteredIssues,
            total: filteredIssues.length
        })

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
