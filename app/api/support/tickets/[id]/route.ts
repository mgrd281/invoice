
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

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ticketId = params.id
        const body = await req.json()
        const { status, subject } = body

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
        }

        const ticket = await prisma.supportTicket.update({
            where: { id: ticketId },
            data: {
                ...(status && { status }),
                ...(subject && { subject })
            }
        })

        return NextResponse.json({ success: true, data: ticket })
    } catch (error) {
        console.error('Error updating ticket:', error)
        return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }
}
