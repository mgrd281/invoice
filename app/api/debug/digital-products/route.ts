import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        // 1. Fetch ALL digital products (raw)
        const allProducts = await prisma.digitalProduct.findMany({
            include: {
                organization: true
            }
        })

        // 2. Fetch ALL organizations
        const allOrgs = await prisma.organization.findMany()

        // 3. Fetch current user details
        let currentUser = null
        if (session?.user?.email) {
            currentUser = await prisma.user.findUnique({
                where: { email: session.user.email },
                include: { organization: true }
            })
        }

        return NextResponse.json({
            session: session,
            currentUser: currentUser,
            totalProducts: allProducts.length,
            totalOrgs: allOrgs.length,
            products: allProducts,
            organizations: allOrgs,
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
