import { NextResponse } from 'next/server'

// In-memory store for demonstration (would be a database in production)
let trackedProducts = [
    {
        id: '1',
        name: 'Windows 11 Pro',
        myPrice: 14.99,
        competitors: [
            { name: 'Idealo.de', price: 12.90, url: 'https://www.idealo.de/preisvergleich/OffersOfProduct/201616054_-windows-11-pro-microsoft.html', logo: 'idealo' },
            { name: 'Billiger.de', price: 13.49, url: 'https://www.billiger.de/products/windows-11-pro', logo: 'billiger' },
            { name: 'SoftwareDeals24', price: 15.90, url: 'https://softwaredeals24.de/windows-11', logo: 'sd24' },
            { name: 'Best-Software', price: 14.90, url: 'https://best-software.de/windows-11-pro', logo: 'bs' }
        ],
        suggestion: {
            action: 'decrease',
            suggestedPrice: 12.89,
            reason: 'Idealo bietet den günstigsten Preis (12,90 €). Wir sollten knapp darunter liegen.'
        },
        history: []
    },
    {
        id: '2',
        name: 'Office 2021 Professional Plus',
        myPrice: 24.99,
        competitors: [
            { name: 'Idealo.de', price: 22.50, url: 'https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=office+2021', logo: 'idealo' },
            { name: 'Billiger.de', price: 23.99, url: 'https://www.billiger.de/suche?q=office+2021', logo: 'billiger' },
            { name: 'SoftwareDeals24', price: 29.99, url: 'https://softwaredeals24.de/office-2021', logo: 'sd24' },
            { name: 'Best-Software', price: 25.99, url: 'https://best-software.de/office-2021', logo: 'bs' }
        ],
        suggestion: {
            action: 'decrease',
            suggestedPrice: 22.49,
            reason: 'Um auf Idealo Top-Ranking zu erreichen, müssen wir unter 22,50 € gehen.'
        },
        history: []
    }
]

export async function GET() {
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
            // Simulate fetching prices (random for demo)
            suggestion: {
                action: 'hold',
                suggestedPrice: parseFloat(body.myPrice),
                reason: 'Daten werden analysiert...'
            },
            history: []
        }

        // Simulate scraping delay and result
        newProduct.competitors.forEach(comp => {
            if (comp.url) {
                // Mock price generation around the user's price
                comp.price = parseFloat((newProduct.myPrice * (0.8 + Math.random() * 0.4)).toFixed(2))
            }
        })

        trackedProducts.push(newProduct)

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
