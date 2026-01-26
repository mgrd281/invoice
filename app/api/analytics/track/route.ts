import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDeviceInfo } from '@/lib/device-detection';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        if (process.env.DISABLE_ANALYTICS === 'true') {
            return NextResponse.json({ success: true, message: 'Analytics disabled' });
        }
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
            browser,
            browserVersion,
            os,
            osVersion,
            visitorName,
            visitorEmail,
            metadata
        } = body;

        if (!organizationId || !visitorToken || !sessionId || !event) {
            // Quietly ignore missing fields to reduce noise
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const ua = req.headers.get('user-agent') || '';
        const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '0.0.0.0';
        const ip = rawIp.split(',')[0].trim();

        // Detect IPv4 vs IPv6 for specific fields
        const isIPv6 = ip.includes(':');
        const ipv4 = isIPv6 ? (metadata?.ip || undefined) : ip;
        const ipv6 = isIPv6 ? ip : undefined;

        console.log(`[IP DEBUG] Incoming IP: ${ip} (Raw: ${rawIp}) for Org: ${organizationId}`);

        // 0. Check for Blocked IP (Flexible matching for exact IP or Masked Subnet)
        const isBlocked = await prisma.blockedIp.findFirst({
            where: {
                organizationId,
                OR: [
                    { ipAddress: ip }, // Exact match
                    {
                        ipAddress: {
                            in: [
                                ip.split('.').slice(0, 3).join('.') + '.0', // IPv4 Masked match
                                ip.split(':').slice(0, 3).join(':') + '::0'  // IPv6 Masked match
                            ]
                        }
                    }
                ]
            }
        });

        if (isBlocked) {
            console.warn(`[IP DEBUG] BLOCK TRIGGERED for IP: ${ip} (Org: ${organizationId})`);
            return NextResponse.json({
                success: false,
                actions: [{
                    type: 'BLOCK_VISITOR',
                    payload: { reason: isBlocked.reason || 'Security Policy' }
                }]
            });
        }

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
        let country = req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || 'DE';
        let city = req.headers.get('cf-ipcity') || req.headers.get('x-vercel-ip-city') || undefined;
        let region = req.headers.get('cf-region') || req.headers.get('x-vercel-ip-region') || undefined;

        // Fallback Geo-IP for local/non-proxy development
        if (!city && ip !== '0.0.0.0' && !ip.startsWith('127.') && !ip.startsWith('192.168.')) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

                const geoResp = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,countryCode,regionName,city`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (geoResp.ok) {
                    const text = await geoResp.text();
                    if (text && text.startsWith('{')) {
                        const geoData = JSON.parse(text);
                        if (geoData.status === 'success') {
                            city = geoData.city;
                            region = geoData.regionName;
                            country = geoData.countryCode;
                        }
                    }
                }
            } catch (e) {
                // Silently fail for geo fallback to avoid log spam
                // console.error('[Geo Fallback] Failed:', e); 
            }
        }

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

        // 0.5: Radical Session-Start Handling
        if (event === 'session_start') {
            console.log(`[Analytics] Radical Session Start: ${sessionId} for Org: ${organizationId}`);
            // Force create or find
            const existing = await prisma.visitorSession.findUnique({ where: { sessionId } });
            if (existing && (new Date().getTime() - new Date(existing.lastActiveAt).getTime() < 10000)) {
                // If it exists and very recent, just extend
                await prisma.visitorSession.update({
                    where: { sessionId },
                    data: { status: 'ACTIVE', lastActiveAt: new Date() }
                });
            }
        }

        // 1. Ensure Visitor exists
        const visitor = await prisma.visitor.upsert({
            where: { visitorToken },
            update: {
                userAgent: ua,
                ipHash,
                country: country || undefined,
                browserVersion: browserVersion || undefined,
                osVersion: osVersion || undefined,
                ipv4: ipv4 || undefined,
                ipv6: ipv6 || undefined,
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
                browserVersion: browserVersion || undefined,
                osVersion: osVersion || undefined,
                ipv4: ipv4 || undefined,
                ipv6: ipv6 || undefined,
            }
        });

        // 2. Ensure Session exists
        // 2. Ensure Session exists & Handle Cart Diff
        const cartMetadata = metadata?.cart;
        const shopifyCustomerId = metadata?.customerId || body.customerId;

        let finalRemovedItems: any[] | undefined = undefined;

        // Handle explicit remove_from_cart event from client
        if (event === 'remove_from_cart' && metadata?.removedItems?.length) {
            const clientRemovedItems = metadata.removedItems.map((item: any) => ({
                ...item,
                removedAt: item.removedAt || new Date().toISOString()
            }));

            // Get current session to append to existing removed list
            const currentSession = await prisma.visitorSession.findUnique({
                where: { sessionId },
                select: { removedItems: true }
            });

            const prevRemoved = (currentSession?.removedItems as any[]) || [];

            // Avoid duplicates
            const newItems = clientRemovedItems.filter((newItem: any) =>
                !prevRemoved.some((existing: any) =>
                    existing.variant_id === newItem.id || existing.id === newItem.id
                )
            );

            finalRemovedItems = [...prevRemoved, ...newItems];
            console.log(`[Analytics] Added ${newItems.length} explicitly removed items to session`);
        }

        if (cartMetadata) {
            const currentSession = await prisma.visitorSession.findUnique({
                where: { sessionId },
                select: { cartSnapshot: true, removedItems: true }
            });

            if (currentSession) {
                const oldItems = (currentSession.cartSnapshot as any[]) || [];
                const newItems = cartMetadata.items || [];

                // Identify items present in old snapshot but missing in new one
                const newlyRemoved = oldItems.filter(old => !newItems.some((n: any) => n.id === old.id))
                    .map(item => ({
                        ...item,
                        removedAt: new Date().toISOString()
                    }));

                const prevRemoved = (currentSession.removedItems as any[]) || [];

                if (newlyRemoved.length > 0) {
                    console.log(`[Analytics] Detected ${newlyRemoved.length} removed items for session ${sessionId}`);
                    finalRemovedItems = [...prevRemoved, ...newlyRemoved];
                } else {
                    finalRemovedItems = prevRemoved.length > 0 ? prevRemoved : undefined;
                }
            }
        }

        const session = await prisma.visitorSession.upsert({
            where: { sessionId },
            update: {
                lastActiveAt: new Date(),
                exitUrl: url,
                status: event === 'session_ended' ? 'ENDED' : 'ACTIVE',
                intentScore: { increment: scoreBoost },
                cartToken: cartToken || undefined,
                checkoutToken: checkoutToken || undefined,
                city: city || undefined,
                region: region || undefined,
                ipMasked: maskedIp,
                customerId: shopifyCustomerId || undefined,
                visitorName: visitorName || undefined,
                visitorEmail: visitorEmail || undefined,
                browserVersion: browserVersion || undefined,
                osVersion: osVersion || undefined,
                ipv4: ipv4 || undefined,
                ipv6: ipv6 || undefined,
                // Update cart snapshot & removed items if provided
                ...(cartMetadata && {
                    cartSnapshot: cartMetadata.items || undefined,
                    itemsCount: cartMetadata.itemsCount || 0,
                    totalValue: cartMetadata.totalValue || 0,
                    currency: cartMetadata.currency || 'EUR',
                    removedItems: finalRemovedItems ?? undefined
                })
            },
            create: {
                sessionId,
                visitorId: visitor.id,
                organizationId,
                status: event === 'session_ended' ? 'ENDED' : 'ACTIVE',
                referrer,
                entryUrl: url,
                deviceType: deviceInfo.device.toLowerCase(),
                os: os || deviceInfo.os,
                browser: browser || deviceInfo.browser,
                browserVersion: browserVersion || undefined,
                osVersion: osVersion || undefined,
                ipv4: ipv4 || undefined,
                ipv6: ipv6 || undefined,
                visitorName: visitorName || undefined,
                visitorEmail: visitorEmail || undefined,
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
                    peakCartValue: cartMetadata.totalValue,
                    removedItems: []
                })
            }
        });

        // Sync to AbandonedCart (Create or Update) for ALL cart events
        const isCartEvent = ['add_to_cart', 'remove_from_cart', 'update_cart', 'start_checkout', 'view_cart'].includes(event);
        const hasCartData = session.checkoutToken || session.cartToken;

        if ((isCartEvent || finalRemovedItems?.length) && hasCartData) {
            try {
                // Try to find by checkoutToken OR (checkoutId = cartToken)
                let cart = await prisma.abandonedCart.findFirst({
                    where: {
                        organizationId,
                        OR: [
                            session.checkoutToken ? { checkoutToken: session.checkoutToken } : {},
                            session.cartToken ? { checkoutId: session.cartToken } : {}
                        ].filter(cond => Object.keys(cond).length > 0) as any
                    }
                });

                // DATA PREP
                const currentItems = (cartMetadata?.items as any[]) || [];
                const currency = cartMetadata?.currency || 'EUR';
                const totalPrice = cartMetadata?.totalValue || 0;

                // SCORING LOGIC
                // Base score from session
                let currentScore = cart ? (cart as any).intentScore : (session.intentScore || 0);

                // Event impact
                if (event === 'add_to_cart') currentScore += 10;
                if (event === 'start_checkout') currentScore += 30;
                if (event === 'remove_from_cart') currentScore -= 5;
                if (totalPrice > 100) currentScore += 5; // High value bonus

                // Cap score
                const intentScore = Math.max(0, Math.min(100, currentScore));

                // RECOMMENDATION LOGIC
                let recommendation: any = { action: 'wait', reason: 'Low intent', delay: 24 };
                if (intentScore > 60 || event === 'start_checkout') {
                    recommendation = { action: 'email_soon', reason: 'High Intent Detected', delay: 1 }; // 1 hour
                } else if (intentScore > 30) {
                    recommendation = { action: 'email_discount', reason: 'Needs Nudge', delay: 4 }; // 4 hours
                }

                // TIMELINE LOGIC
                const newTimelineEvent = {
                    type: event,
                    timestamp: new Date().toISOString(),
                    details: {
                        removedCount: finalRemovedItems?.length || 0,
                        cartTotal: totalPrice,
                        itemsCount: currentItems.length
                    }
                };

                if (!cart) {
                    // CREATE NEW (Instant Visibility)
                    if (session.cartToken) {
                        console.log(`[Analytics] Creating new AbandonedCart for session ${sessionId} (Instant)`);
                        cart = await prisma.abandonedCart.create({
                            data: {
                                organizationId,
                                checkoutId: session.cartToken, // Use cartToken as ID
                                checkoutToken: session.checkoutToken || session.cartToken,
                                email: `anonymous-${session.cartToken.substring(0, 8)}@hidden.com`, // Placeholder
                                cartUrl: `${url ? new URL(url).origin : ''}/cart`,
                                totalPrice: totalPrice,
                                currency: currency,
                                lineItems: currentItems,
                                removedItems: finalRemovedItems,
                                isRecovered: false,
                                recoverySent: false,
                                // Enterprise Fields
                                timeline: [newTimelineEvent],
                                intentScore: intentScore,
                                recommendation: recommendation,
                                lastActiveAt: new Date()
                            } as any
                        });
                    }
                } else {
                    // UPDATE EXISTING
                    const existingRemoved = ((cart as any).removedItems as any[]) || [];
                    const existingTimeline = ((cart as any).timeline as any[]) || [];

                    // Merge new removed items
                    const newItems = finalRemovedItems ? finalRemovedItems.filter((newItem: any) =>
                        !existingRemoved.some((existing: any) =>
                            existing.variant_id === newItem.id || existing.id === newItem.id
                        )
                    ) : [];

                    // Always determine the new state based on the latest snapshot (cartMetadata)
                    const shouldUpdateState = !!cartMetadata;
                    const hasNewRemovals = newItems.length > 0;

                    if (shouldUpdateState || hasNewRemovals || isCartEvent) {
                        const mergedRemoved = [...existingRemoved, ...newItems];
                        const updatedTimeline = [...existingTimeline, newTimelineEvent]; // Append event

                        const updateData: any = {
                            removedItems: mergedRemoved,
                            updatedAt: new Date(),
                            timeline: updatedTimeline,
                            intentScore: intentScore,
                            recommendation: recommendation,
                            lastActiveAt: new Date()
                        };

                        // Critical: Always update the main cart state if we have fresh metadata
                        if (shouldUpdateState) {
                            updateData.lineItems = currentItems;
                            updateData.totalPrice = totalPrice;
                            updateData.currency = currency;
                        }

                        await prisma.abandonedCart.update({
                            where: { id: (cart as any).id }, // Fix bypass
                            data: updateData
                        });
                        console.log(`[Analytics] Updated AbandonedCart ${(cart as any).id} [Score: ${intentScore}]`);
                    }
                }
            } catch (err) {
                console.error('[Analytics] Failed to sync removed items to AbandonedCart:', err);
            }
        }

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

        // 3. Handle special event types

        // Page Performance Tracking
        if (event === 'page_performance' && metadata?.loadTime) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const isMobile = metadata.deviceType === 'mobile';
            const isSlow = metadata.loadTime > 3000;

            await prisma.pageAnalytics.upsert({
                where: {
                    organizationId_url_date: {
                        organizationId,
                        url,
                        date: today
                    }
                },
                update: {
                    totalViews: { increment: 1 },
                    avgLoadTime: metadata.loadTime, // We'll average this properly later
                    slowLoadCount: isSlow ? { increment: 1 } : undefined,
                    mobileViews: isMobile ? { increment: 1 } : undefined,
                },
                create: {
                    organizationId,
                    url,
                    date: today,
                    totalViews: 1,
                    avgLoadTime: metadata.loadTime,
                    slowLoadCount: isSlow ? 1 : 0,
                    mobileViews: isMobile ? 1 : 0,
                }
            });
        }

        // Mobile Error Tracking
        if (event === 'mobile_error') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await prisma.pageAnalytics.upsert({
                where: {
                    organizationId_url_date: {
                        organizationId,
                        url,
                        date: today
                    }
                },
                update: {
                    mobileErrors: { increment: 1 }
                },
                create: {
                    organizationId,
                    url,
                    date: today,
                    mobileErrors: 1
                }
            });
        }

        // Goal Tracking
        if (event === 'goal_complete' && metadata?.goalType) {
            await prisma.goalTracking.create({
                data: {
                    organizationId,
                    sessionId: session.id,
                    goalType: metadata.goalType,
                    goalValue: metadata.goalValue || null,
                    metadata: metadata || {}
                }
            });
        }

        // Track Page Views and Exits for analytics
        if (event === 'page_view') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await prisma.pageAnalytics.upsert({
                where: {
                    organizationId_url_date: {
                        organizationId,
                        url,
                        date: today
                    }
                },
                update: {
                    totalViews: { increment: 1 }
                },
                create: {
                    organizationId,
                    url,
                    date: today,
                    totalViews: 1
                }
            });
        }

        if (event === '404') {
            await prisma.brokenLink.upsert({
                where: {
                    organizationId_url: {
                        organizationId,
                        url: path || url
                    }
                },
                update: {
                    hits: { increment: 1 },
                    lastSeen: new Date(),
                    referrer: referrer || undefined
                },
                create: {
                    organizationId,
                    url: path || url,
                    referrer,
                    hits: 1
                }
            });
        }

        if (event === 'session_ended') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await prisma.pageAnalytics.upsert({
                where: {
                    organizationId_url_date: {
                        organizationId,
                        url,
                        date: today
                    }
                },
                update: {
                    exitCount: { increment: 1 }
                },
                create: {
                    organizationId,
                    url,
                    date: today,
                    exitCount: 1
                }
            });
        }

        // 4. Log Event
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



        // 5. Check for Pending Actions (Piggyback)
        let actionsToExecute: any[] = [];
        try {
            const pendingActions = await prisma.sessionAction.findMany({
                where: {
                    sessionId: session.id,
                    status: 'PENDING'
                }
            });

            if (pendingActions.length > 0) {
                actionsToExecute = pendingActions.map(a => ({
                    id: a.id,
                    type: a.type,
                    payload: a.payload
                }));

                // Mark as DELIVERED
                await prisma.sessionAction.updateMany({
                    where: {
                        id: { in: pendingActions.map(a => a.id) }
                    },
                    data: {
                        status: 'DELIVERED',
                        deliveredAt: new Date()
                    }
                });
            }
        } catch (e) {
            console.error('[Action Piggyback] Error:', e);
        }

        const response = NextResponse.json({
            success: true,
            actions: actionsToExecute
        });

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
