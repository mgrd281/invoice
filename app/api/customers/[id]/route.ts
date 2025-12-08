import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerAuth } from '@/lib/auth'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await getServerAuth()
        if (!auth.isAuthenticated) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const id = params.id

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                invoices: {
                    orderBy: { issueDate: 'desc' },
                    include: {
                        payments: true
                    }
                },
                payments: {
                    orderBy: { paymentDate: 'desc' }
                },
                licenseKeys: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        digitalProduct: true
                    }
                },
                supportTickets: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        messages: {
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                },
                emails: {
                    orderBy: { receivedAt: 'desc' }
                },
                notes: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!customer) {
            return new NextResponse('Customer not found', { status: 404 })
        }

        return NextResponse.json(customer)
    } catch (error) {
        console.error('Error fetching customer:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
