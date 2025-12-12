import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'
import { ImmoscoutProvider } from '@/lib/real-estate/immoscout'
import { RealEstateFilter } from '@/lib/real-estate/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // 1. Fetch active profiles
        const profiles = await prisma.realEstateSearchProfile.findMany({
            where: { isActive: true },
            include: { organization: true }
        })

        if (profiles.length === 0) {
            return NextResponse.json({ message: 'No active profiles' })
        }

        const provider = new ImmoscoutProvider()
        let totalSent = 0

        for (const profile of profiles) {
            // 2. Get Telegram Settings for this organization
            const settings = await prisma.telegramSettings.findUnique({
                where: { organizationId: profile.organizationId },
                include: { allowedUsers: true }
            })

            if (!settings || !settings.isEnabled || !settings.botToken) {
                console.log(`Skipping profile ${profile.name}: Telegram not configured`)
                continue
            }

            // 3. Prepare Filter
            const filter: RealEstateFilter = {
                city: profile.city || undefined,
                zipCode: profile.zipCode || undefined,
                district: profile.district || undefined,
                transactionType: profile.transactionType as any,
                propertyType: profile.propertyType as any,
                priceMin: profile.priceMin || undefined,
                priceMax: profile.priceMax || undefined,
                roomsMin: profile.roomsMin || undefined,
                areaMin: profile.areaMin || undefined
            }

            // 4. Search
            const listings = await provider.search(filter)

            // 5. Filter New Listings
            const newListings = []
            for (const listing of listings) {
                const seen = await prisma.realEstateSeenListing.findUnique({
                    where: {
                        profileId_externalId: {
                            profileId: profile.id,
                            externalId: listing.id
                        }
                    }
                })

                if (!seen) {
                    newListings.push(listing)
                }
            }

            // Notify start (Debugging)
            for (const user of settings.allowedUsers) {
                await sendTelegramMessage(settings.botToken, user.telegramUserId, `🔎 Prüfe Angebote für: ${profile.name}...`, undefined)
            }

            // 6. Send Notifications & Mark as Seen
            if (newListings.length > 0) {
                for (const listing of newListings) {
                    const message = `🏠 *Neues Angebot gefunden!* (${profile.name})
                    
📍 ${listing.title}
🏙️ ${listing.address}

💶 *${listing.price.toLocaleString('de-DE')} ${listing.currency}*
📐 ${listing.area} m² • 🚪 ${listing.rooms} Zi.

🔗 [Exposé ansehen](${listing.link})
_Anbieter: ${listing.provider}_`

                    // Send to all allowed users
                    for (const user of settings.allowedUsers) {
                        await sendTelegramMessage(settings.botToken, user.telegramUserId, message)
                    }

                    // Mark as seen
                    await prisma.realEstateSeenListing.create({
                        data: {
                            profileId: profile.id,
                            externalId: listing.id
                        }
                    })
                }
                totalSent += newListings.length
            } else {
                // Notify no results (Debugging)
                for (const user of settings.allowedUsers) {
                    await sendTelegramMessage(settings.botToken, user.telegramUserId, `✅ Keine neuen Angebote für ${profile.name} gefunden.`, undefined)
                }
            }

            // 7. Update Last Run
            await prisma.realEstateSearchProfile.update({
                where: { id: profile.id },
                data: { lastRunAt: new Date() }
            })
        }

        return NextResponse.json({ success: true, sent: totalSent })

    } catch (error) {
        console.error('Real Estate Monitor failed:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
