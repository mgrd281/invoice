import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id

        if (!id) {
            return NextResponse.json({ error: 'Review ID is required' }, { status: 400 })
        }

        const review = await prisma.review.update({
            where: { id },
            data: {
                helpful: {
                    increment: 1
                }
            },
            select: {
                helpful: true
            }
        })

        return NextResponse.json({
            success: true,
            helpful: review.helpful
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            }
        })

    } catch (error) {
        console.error('Error updating helpful count:', error)
        return NextResponse.json({ error: 'Failed to update helpful count' }, { status: 500 })
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}
