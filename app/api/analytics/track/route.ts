import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDeviceInfo } from '@/lib/device-detection';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            event,
            url,
            path,
            visitorToken,
            sessionId,
            organizationId,
            referrer,
            utmSource,
            utmMedium,
            utmCampaign,
            utmTerm,
            utmContent,
            isReturning,
            cartToken,
            checkoutToken,
            metadata
        } = body;

        if (!organizationId || !visitorToken || !sessionId || !event) {
            console.warn('[Analytics Tracker] Missing fields:', {
                hasOrg: !!organizationId,
                hasVisitor: !!visitorToken,
                hasSession: !!sessionId,
                event
            });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log(`[Analytics Tracker] Incoming: ${event} for Org: ${organizationId} (Session: ${sessionId.substring(0, 8)})`);

        const ua = req.headers.get('user-agent') || '';
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '0.0.0.0';

        // Mask IP for privacy (GDPR)
        let maskedIp = '0.0.0.0';
        if (ip.includes('.')) {
            maskedIp = ip.split('.').slice(0, 3).join('.') + '.0';
        } else if (ip.includes(':')) {
            maskedIp = ip.split(':').slice(0, 3).join(':') + '::0';
        }
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);

        const deviceInfo = parseDeviceInfo(ua);

        // Geo-IP Extraction (Best effort from headers)
        const country = req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || 'DE';
        const city = req.headers.get('cf-ipcity') || req.headers.get('x-vercel-ip-city') || undefined;
        const region = req.headers.get('cf-region') || req.headers.get('x-vercel-ip-region') || undefined;

        // Traffic Source Classification Logic
        const getTrafficSource = () => {
            if (utmSource) {
                let label = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
                if (utmSource.toLowerCase() === 'google' && utmMedium?.toLowerCase() === 'cpc') {
                    label = 'Google Ads';
                }
                return { label, medium: utmMedium || 'cpc' };
            }

            if (!referrer || referrer === '') {
                return { label: 'Direct', medium: 'direct' };
            }

            try {
                const refUrl = new URL(referrer);
                const host = refUrl.hostname.toLowerCase();

                if (host.includes('google.')) return { label: 'Google Organic', medium: 'organic' };
                if (host.includes('facebook.') || host.includes('instagram.') || host.includes('t.co')) return { label: 'Social', medium: 'social' };
                if (host.includes('idealo.')) return { label: 'Idealo', medium: 'referral' };
                if (host.includes('bing.')) return { label: 'Bing Organic', medium: 'organic' };

                return { label: host.replace('www.', ''), medium: 'referral' };
            } catch (e) {
                return { label: 'Referral', medium: 'referral' };
            }
        };

        const source = getTrafficSource();

        // 0. Intent Scoring Logic
        const getScoreBoost = () => {
            switch (event) {
                case 'view_product': return 20;
                case 'add_to_cart': return 35;
                case 'start_checkout': return 50;
                case 'page_view': return 5;
                case 'scroll_depth': return metadata?.depth === 100 ? 15 : 5;
                case 'rage_click': return -10; // Negative intent
                default: return 0;
            }
        };

        const scoreBoost = getScoreBoost();

        // 1. Ensure Visitor exists
        const visitor = await prisma.visitor.upsert({
            where: { visitorToken },
            update: {
                userAgent: ua,
                ipHash,
                country: country || undefined,
            },
            create: {
                visitorToken,
                organizationId,
                ipHash,
                userAgent: ua,
                deviceType: deviceInfo.device.toLowerCase(),
                os: deviceInfo.os,
                browser: deviceInfo.browser,
                country: country || undefined,
            }
        });

        // 2. Ensure Session exists
        const cartMetadata = metadata?.cart;
        const shopifyCustomerId = metadata?.customerId || body.customerId;

        const session = await prisma.visitorSession.upsert({
            where: { sessionId },
            update: {
                lastActiveAt: new Date(),
                exitUrl: url,
                status: 'ACTIVE',
                intentScore: { increment: scoreBoost },
                cartToken: cartToken || undefined,
                checkoutToken: checkoutToken || undefined,
                city: city || undefined,
                region: region || undefined,
                ipMasked: maskedIp,
                customerId: shopifyCustomerId || undefined,
                // Update cart snapshot if provided
                ...(cartMetadata && {
                    cartSnapshot: cartMetadata.items || undefined,
                    itemsCount: cartMetadata.itemsCount || 0,
                    totalValue: cartMetadata.totalValue || 0,
                    currency: cartMetadata.currency || 'EUR',
                })
            },
            create: {
                sessionId,
                visitorId: visitor.id,
                organizationId,
                status: 'ACTIVE',
                referrer,
                entryUrl: url,
                deviceType: deviceInfo.device.toLowerCase(),
                os: deviceInfo.os,
                browser: deviceInfo.browser,
                sourceLabel: source.label,
                sourceMedium: source.medium,
                utmSource,
                utmMedium,
                utmCampaign,
                utmTerm,
                utmContent,
                isReturning: !!isReturning,
                intentScore: scoreBoost + (isReturning ? 15 : 0),
                cartToken,
                checkoutToken,
                city: city || undefined,
                region: region || undefined,
                ipMasked: maskedIp,
                customerId: shopifyCustomerId || undefined,
                ...(cartMetadata && {
                    cartSnapshot: cartMetadata.items,
                    itemsCount: cartMetadata.itemsCount,
                    totalValue: cartMetadata.totalValue,
                    currency: cartMetadata.currency || 'EUR',
                    peakCartValue: cartMetadata.totalValue
                })
            }
        });

        // Update Peak Value if current is higher
        if (cartMetadata?.totalValue > (session.peakCartValue || 0)) {
            await prisma.visitorSession.update({
                where: { id: session.id },
                data: { peakCartValue: cartMetadata.totalValue }
            });
        }

        // Update Intent Label based on new score
        const updatedScore = session.intentScore;
        let intentLabel = 'Low';
        if (updatedScore > 70) intentLabel = 'High';
        else if (updatedScore > 30) intentLabel = 'Medium';

        if (intentLabel !== session.intentLabel) {
            await prisma.visitorSession.update({
                where: { id: session.id },
                data: { intentLabel }
            });
        }

        // 3. Log Event
        if (event !== 'heartbeat') {
            await prisma.sessionEvent.create({
                data: {
                    sessionId: session.id,
                    type: event,
                    url,
                    path,
                    metadata: metadata || {},
                }
            });
        }

        const response = NextResponse.json({ success: true });

        // Add CORS Headers
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

        return response;
    } catch (error: any) {
        console.error('[Analytics Tracker] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}
