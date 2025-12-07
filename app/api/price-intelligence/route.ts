import { NextResponse } from 'next/server'
import { PriceScraper } from '@/lib/price-scraper'

// In-memory store for demonstration (would be a database in production)
let trackedProducts = [
    {
        id: '1',
        name: 'Windows 11 Pro',
        myPrice: 14.99,
        competitors: [
            { name: 'Idealo.de', price: 0, url: 'https://www.idealo.de/preisvergleich/OffersOfProduct/201606029_-windows-11-pro-microsoft.html', logo: 'idealo' },
            { name: 'Billiger.de', price: 0, url: 'https://www.billiger.de/products/windows-11-pro', logo: 'billiger' },
            { name: 'SoftwareDeals24', price: 0, url: 'https://softwaredeals24.de/windows-11', logo: 'sd24' },
            { name: 'Best-Software', price: 0, url: 'https://best-software.de/windows-11-pro', logo: 'bs' }
        ],
        suggestion: {
            action: 'hold',
            suggestedPrice: 14.99,
            reason: 'Daten werden geladen...'
        },
        history: []
    },
    {
        id: '2',
        name: 'Office 2021 Professional Plus',
        myPrice: 24.99,
        competitors: [
            { name: 'Idealo.de', price: 0, url: 'https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=office+2021', logo: 'idealo' },
            { name: 'Billiger.de', price: 0, url: 'https://www.billiger.de/suche?q=office+2021', logo: 'billiger' },
            { name: 'SoftwareDeals24', price: 0, url: 'https://softwaredeals24.de/office-2021', logo: 'sd24' },
            { name: 'Best-Software', price: 0, url: 'https://best-software.de/office-2021', logo: 'bs' }
        ],
        suggestion: {
            action: 'hold',
            suggestedPrice: 24.99,
            reason: 'Daten werden geladen...'
        },
        history: []
    }
]

export async function GET() {
    // On every GET request, we try to update prices for a few items to keep it fresh
    // In production, this should be a background job (Cron)

    const updatePromises = trackedProducts.map(async (product) => {
        let hasUpdates = false

        const competitorPromises = product.competitors.map(async (comp) => {
            if (!comp.url) return

            let newPrice = 0
            try {
                if (comp.name.includes('Idealo')) {
                    newPrice = await PriceScraper.scrapeIdealo(comp.url)
                } else if (comp.name.includes('Billiger')) {
                    newPrice = await PriceScraper.scrapeBilliger(comp.url)
                } else if (comp.name.includes('SoftwareDeals24')) {
                    newPrice = await PriceScraper.scrapeSoftwareDeals24(comp.url)
                } else if (comp.name.includes('Best-Software')) {
                    newPrice = await PriceScraper.scrapeBestSoftware(comp.url)
                } else {
                    newPrice = await PriceScraper.scrapeGeneric(comp.url)
                }

                if (newPrice > 0 && newPrice !== comp.price) {
                    comp.price = newPrice
                    hasUpdates = true
                }
            } catch (e) {
                console.error(`Failed to update price for ${comp.name}:`, e)
            }
        })

        await Promise.all(competitorPromises)

        // Update suggestion based on new prices
        if (hasUpdates) {
            const validPrices = product.competitors.map(c => c.price).filter(p => p > 0)
            if (validPrices.length > 0) {
                const minPrice = Math.min(...validPrices)
                if (minPrice < product.myPrice) {
                    product.suggestion = {
                        action: 'decrease',
                        suggestedPrice: Number((minPrice - 0.01).toFixed(2)),
                        reason: `Wettbewerber sind günstiger (ab ${minPrice} €).`
                    }
                } else if (minPrice > product.myPrice * 1.1) {
                    product.suggestion = {
                        action: 'increase',
                        suggestedPrice: Number((minPrice - 0.10).toFixed(2)),
                        reason: `Sie sind deutlich günstiger. Preiserhöhung möglich.`
                    }
                } else {
                    product.suggestion = {
                        action: 'hold',
                        suggestedPrice: product.myPrice,
                        reason: 'Preis ist wettbewerbsfähig.'
                    }
                }
            }
        }
    })

    // Wait for updates (or maybe don't wait to be faster, but for demo we wait)
    await Promise.all(updatePromises)

    return NextResponse.json({
        success: true,
        data: trackedProducts
    })
}

export async function POST(req: Request) {
    try {
        const body = await req.json()

        const newProduct = {
            id: Date.now().toString(),
            name: body.name,
            myPrice: parseFloat(body.myPrice),
            competitors: [
                { name: 'Idealo.de', price: 0, url: body.idealoUrl || '', logo: 'idealo' },
                { name: 'Billiger.de', price: 0, url: body.billigerUrl || '', logo: 'billiger' },
                { name: 'SoftwareDeals24', price: 0, url: body.sd24Url || '', logo: 'sd24' },
                { name: 'Best-Software', price: 0, url: body.bsUrl || '', logo: 'bs' }
            ],
            suggestion: {
                action: 'hold',
                suggestedPrice: parseFloat(body.myPrice),
                reason: 'Wird analysiert...'
            },
            history: []
        }

        trackedProducts.push(newProduct)

        // Trigger an immediate update for this new product (async)
        // In a real app we'd use a queue
        GET()

        return NextResponse.json({ success: true, data: newProduct })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to add product' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (id) {
            trackedProducts = trackedProducts.filter(p => p.id !== id)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
    }
}
