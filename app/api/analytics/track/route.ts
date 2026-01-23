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

        // 1. Ensure Visitor exists
        const visitor = await prisma.visitor.upsert({
            where: { visitorToken },
            update: {
                userAgent: ua,
                ipHash,
            },
            create: {
                visitorToken,
                organizationId,
                ipHash,
                userAgent: ua,
                deviceType: deviceInfo.device.toLowerCase(),
                os: deviceInfo.os,
                browser: deviceInfo.browser,
                // country: we'd need a geoip lib here, skipping for now or using a placeholder
            }
        });

        // 2. Ensure Session exists
        const session = await prisma.visitorSession.upsert({
            where: { sessionId },
            update: {
                lastActiveAt: new Date(),
                exitUrl: url,
            },
            create: {
                sessionId,
                visitorId: visitor.id,
                organizationId,
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
            }
        });

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
