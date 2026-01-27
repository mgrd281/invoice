import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { ShopifyAPI } from '@/lib/shopify-api'
import { getShopifySettings } from '@/lib/shopify-settings'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const organizationId = (session.user as any).organizationId
        const settings = await getShopifySettings(organizationId)
        const shopify = new ShopifyAPI(settings)
        const redirects = await shopify.getRedirects()

        return NextResponse.json(redirects)
    } catch (error) {
        console.error('Error listing redirects:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
