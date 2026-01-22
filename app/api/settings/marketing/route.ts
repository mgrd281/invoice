import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper to get the default organization (same as in company-settings)
async function getDefaultOrganization() {
    const org = await prisma.organization.findFirst()
    if (!org) {
        return await prisma.organization.create({
            data: {
                name: 'Meine Firma',
                slug: 'default-org',
                address: '',
                zipCode: '',
                city: '',
                country: 'DE'
            }
        })
    }
    return org
}

export async function GET() {
    try {
        const org = await getDefaultOrganization()

        const settings = await prisma.marketingSettings.findUnique({
            where: { organizationId: org.id }
        })

        if (!settings) {
            // Return defaults if not found
            return NextResponse.json({
                fpdEnabled: false,
                fpdPercentage: 10,
                fpdValidityDays: 30,
                fpdEmailSubject: 'Ihr persönlicher 10%-Rabattcode als Dankeschön 🎁',
                fpdEmailBody: `Hallo {{ customer_name }},

vielen Dank für Ihren ersten Einkauf bei uns!
Als kleines Dankeschön haben wir für Sie einen persönlichen Rabattcode über 10 % erstellt, den Sie für Ihre nächste Bestellung verwenden können.

Ihr individueller Code lautet:
{{ discount_code }}

Dieser Code ist 30 Tage gültig und kann einmalig für das gesamte Sortiment eingelöst werden.

Wir freuen uns darauf, Sie bald wieder bei uns begrüßen zu dürfen.
Vielen Dank für Ihr Vertrauen!

Mit freundlichen Grüßen
Ihr Kundenservice`
            })
        }

        return NextResponse.json(settings)
    } catch (error) {
        console.error('Error fetching marketing settings:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const org = await getDefaultOrganization()
        const body = await req.json()
        console.log('Received marketing settings update:', body)

        const { fpdEnabled, fpdPercentage, fpdValidityDays, fpdEmailSubject, fpdEmailBody } = body

        // Validate and cast types
        const percentage = parseInt(String(fpdPercentage), 10)
        const validity = parseInt(String(fpdValidityDays), 10)

        if (isNaN(percentage) || isNaN(validity)) {
            return NextResponse.json({ error: 'Invalid number format' }, { status: 400 })
        }

        const settings = await prisma.marketingSettings.upsert({
            where: { organizationId: org.id },
            update: {
                fpdEnabled: Boolean(fpdEnabled),
                fpdPercentage: percentage,
                fpdValidityDays: validity,
                fpdEmailSubject: String(fpdEmailSubject || ''),
                fpdEmailBody: String(fpdEmailBody || '')
            },
            create: {
                organizationId: org.id,
                fpdEnabled: Boolean(fpdEnabled),
                fpdPercentage: percentage,
                fpdValidityDays: validity,
                fpdEmailSubject: String(fpdEmailSubject || ''),
                fpdEmailBody: String(fpdEmailBody || '')
            }
        })

        return NextResponse.json(settings)
    } catch (error) {
        console.error('Error updating marketing settings:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 })
    }
}
