
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetShop = '45dv93-bk.myshopify.com';
    const mainOrgId = '365eb115-4fa4-4e66-96ee-f7b4d2c19fe1'; // From previous output

    console.log(`Linking shop ${targetShop} to Main Org ${mainOrgId}...`);

    // 1. Check if connection exists (just in case)
    const existingConn = await prisma.shopifyConnection.findFirst({
        where: { shopName: targetShop }
    });

    if (existingConn) {
        console.log('Connection exists. Updating...');
        await prisma.shopifyConnection.update({
            where: { id: existingConn.id },
            data: { organizationId: mainOrgId }
        });
    } else {
        console.log('Creating new connection...');
        await prisma.shopifyConnection.create({
            data: {
                shopName: targetShop,
                organizationId: mainOrgId,
                accessToken: 'placeholder_manual_link',
                scopes: 'read_orders,write_products',
                isActive: true
            }
        });
    }

    // 2. Also ensure the Main Org has ENTERPRISE plan
    await prisma.organization.update({
        where: { id: mainOrgId },
        data: { plan: 'ENTERPRISE' }
    });

    console.log('✅ Successfully linked shop to Main Org and set plan to ENTERPRISE.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
