import { NextResponse } from 'next/server'

// Mock data for demonstration
// In a real application, this would come from a database and a web scraper
const trackedProducts = [
    {
        id: '1',
        name: 'Windows 11 Pro',
        myPrice: 14.99,
        competitors: [
            { name: 'KeySeller24', price: 12.99, url: 'https://keyseller24.example/win11' },
            { name: 'CheapKeys', price: 11.50, url: 'https://cheapkeys.example/win11' },
            { name: 'SoftwareGiant', price: 19.99, url: 'https://softwaregiant.example/win11' }
        ],
        suggestion: {
            action: 'decrease',
            suggestedPrice: 12.49,
            reason: 'Konkurrenz ist günstiger. Empfohlener Preis um wettbewerbsfähig zu bleiben.'
        },
        history: [
            { date: '2025-12-01', price: 15.99 },
            { date: '2025-12-02', price: 15.99 },
            { date: '2025-12-03', price: 14.99 },
            { date: '2025-12-04', price: 14.99 },
            { date: '2025-12-05', price: 14.99 },
            { date: '2025-12-06', price: 14.99 },
            { date: '2025-12-07', price: 14.99 }
        ]
    },
    {
        id: '2',
        name: 'Office 2021 Professional Plus',
        myPrice: 24.99,
        competitors: [
            { name: 'KeySeller24', price: 29.99, url: 'https://keyseller24.example/office2021' },
            { name: 'CheapKeys', price: 22.99, url: 'https://cheapkeys.example/office2021' },
            { name: 'SoftwareGiant', price: 34.99, url: 'https://softwaregiant.example/office2021' }
        ],
        suggestion: {
            action: 'hold',
            suggestedPrice: 24.99,
            reason: 'Preis ist stabil und wettbewerbsfähig. Keine Änderung empfohlen.'
        },
        history: [
            { date: '2025-12-01', price: 24.99 },
            { date: '2025-12-02', price: 24.99 },
            { date: '2025-12-03', price: 24.99 },
            { date: '2025-12-04', price: 24.99 },
            { date: '2025-12-05', price: 24.99 },
            { date: '2025-12-06', price: 24.99 },
            { date: '2025-12-07', price: 24.99 }
        ]
    },
    {
        id: '3',
        name: 'Norton 360 Deluxe',
        myPrice: 19.99,
        competitors: [
            { name: 'KeySeller24', price: 24.99, url: 'https://keyseller24.example/norton' },
            { name: 'CheapKeys', price: 21.99, url: 'https://cheapkeys.example/norton' },
            { name: 'SoftwareGiant', price: 29.99, url: 'https://softwaregiant.example/norton' }
        ],
        suggestion: {
            action: 'increase',
            suggestedPrice: 21.49,
            reason: 'Sie sind der Günstigste. Potenzial für höhere Marge.'
        },
        history: [
            { date: '2025-12-01', price: 18.99 },
            { date: '2025-12-02', price: 18.99 },
            { date: '2025-12-03', price: 19.99 },
            { date: '2025-12-04', price: 19.99 },
            { date: '2025-12-05', price: 19.99 },
            { date: '2025-12-06', price: 19.99 },
            { date: '2025-12-07', price: 19.99 }
        ]
    }
]

export async function GET() {
    return NextResponse.json({
        success: true,
        data: trackedProducts
    })
}
