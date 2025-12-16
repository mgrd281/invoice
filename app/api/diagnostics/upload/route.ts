import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { loadInvoicesFromDisk, loadCustomersFromDisk } from '@/lib/server-storage'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        const type = formData.get('type') as string

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const validTypes = ['invoices.json', 'customers.json', 'shopify-settings.json']
        if (!validTypes.includes(file.name)) {
            return NextResponse.json({ error: 'Invalid file name. Must be invoices.json, customers.json, or shopify-settings.json' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Determine storage path
        const storageDir = path.join(process.cwd(), 'user-storage')
        const filePath = path.join(storageDir, file.name)

        // Write file
        await writeFile(filePath, buffer)

        // Verify content
        let count = 0
        if (file.name === 'invoices.json') {
            const data = loadInvoicesFromDisk()
            count = data.length
        } else if (file.name === 'customers.json') {
            const data = loadCustomersFromDisk()
            count = data.length
        }

        return NextResponse.json({
            success: true,
            message: `File ${file.name} uploaded successfully`,
            count
        })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
