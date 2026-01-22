import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const data = await req.json()
        const { checkoutId, shopDomain, deviceInfo } = data

        if (!checkoutId || !shopDomain || !deviceInfo) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Find the organization
        let connection = await prisma.shopifyConnection.findFirst({
            where: {
                OR: [
                    { shopName: shopDomain },
                    { shopName: shopDomain.replace('.myshopify.com', '') }
                ]
            }
        })

        if (!connection) {
            return NextResponse.json({ error: 'Shop connection not found' }, { status: 404 })
        }

        // Upsert the abandoned cart with high-confidence device info
        // We use upsert because the client might ping before the webhook arrives
        await prisma.abandonedCart.upsert({
            where: {
                organizationId_checkoutId: {
                    organizationId: connection.organizationId,
                    checkoutId: checkoutId.toString()
                }
            },
            create: {
                organizationId: connection.organizationId,
                checkoutId: checkoutId.toString(),
                email: 'pending@tracking.com', // Placeholder until webhook arrives
                cartUrl: '#',
                deviceInfo: {
                    ...deviceInfo,
                    detection_confidence: 'high'
                },
                isRecovered: false,
                recoverySent: false
            },
            update: {
                deviceInfo: {
                    ...deviceInfo,
                    detection_confidence: 'high'
                },
                updatedAt: new Date()
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[DeviceFingerprint] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
