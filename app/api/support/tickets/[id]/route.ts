
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ticketId = params.id

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
        }

        await prisma.supportTicket.delete({
            where: { id: ticketId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting ticket:', error)
        return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
    }
}
