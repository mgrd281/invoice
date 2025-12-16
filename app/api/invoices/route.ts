import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { Prisma, InvoiceStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const dateRange = searchParams.get('dateRange') || 'all'

    const skip = (page - 1) * limit

    const where: Prisma.InvoiceWhereInput = {}

    // Search filter
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Status filter
    if (status !== 'all') {
      where.status = status as InvoiceStatus
    }

    // Date range filter
    const now = new Date()
    if (dateRange === 'today') {
      const start = new Date(now.setHours(0, 0, 0, 0))
      const end = new Date(now.setHours(23, 59, 59, 999))
      where.issueDate = { gte: start, lte: end }
    } else if (dateRange === 'week') {
      const start = new Date(now.setDate(now.getDate() - 7))
      where.issueDate = { gte: start }
    } else if (dateRange === 'month') {
      const start = new Date(now.setMonth(now.getMonth() - 1))
      where.issueDate = { gte: start }
    } else if (dateRange === 'year') {
      const start = new Date(now.setFullYear(now.getFullYear() - 1))
      where.issueDate = { gte: start }
    }

    // Execute query
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          items: true
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.invoice.count({ where })
    ])

    // Calculate stats
    const totalAmount = await prisma.invoice.aggregate({
      where,
      _sum: { totalGross: true }
    })

    // Map to frontend format
    const mappedInvoices = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.issueDate.toISOString(),
      dueDate: inv.dueDate?.toISOString(),
      status: inv.status,
      customer: {
        name: inv.customer.name,
        email: inv.customer.email,
        address: inv.customer.address,
      },
      items: inv.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.grossAmount),
        taxRate: 0 // Placeholder
      })),
      subtotal: Number(inv.totalNet),
      taxTotal: Number(inv.totalTax),
      total: Number(inv.totalGross),
      currency: inv.currency || 'EUR',
      notes: '' // Notes field does not exist on Invoice model
    }))

    return NextResponse.json({
      invoices: mappedInvoices,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      },
      stats: {
        totalAmount: Number(totalAmount._sum.totalGross || 0),
        count: total
      }
    })

  } catch (error) {
    console.error('Error fetching invoices:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()

    // Create invoice in DB
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: body.invoiceNumber,
        issueDate: new Date(body.date),
        dueDate: body.dueDate ? new Date(body.dueDate) : new Date(), // Fallback to now if null
        status: (body.status || 'DRAFT') as InvoiceStatus,
        totalNet: body.subtotal,
        totalTax: body.taxTotal,
        totalGross: body.total,
        currency: body.currency || 'EUR',
        // notes: body.notes, // Removed as it doesn't exist
        organization: {
          connect: { id: 'default-org-id' } // Placeholder
        },
        template: {
          connect: { id: 'default-template-id' } // Placeholder
        },
        customer: {
          create: {
            name: body.customer.name,
            email: body.customer.email,
            address: body.customer.address,
            phone: body.customer.phone,
            // Add required fields with defaults if missing
            zipCode: body.customer.zipCode || '',
            city: body.customer.city || '',
            organization: {
              connect: { id: 'default-org-id' }
            }
          }
        },
        items: {
          create: body.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            grossAmount: item.total, // Mapped total to grossAmount
            netAmount: item.total, // Assuming net = gross for now or calc properly
            taxAmount: 0, // Default
            taxRateId: 'default-tax-rate' // Placeholder
          }))
        }
      },
      include: {
        customer: true,
        items: true
      }
    })

    return NextResponse.json(invoice)

  } catch (error) {
    console.error('Error creating invoice:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
