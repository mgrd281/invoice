
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Analyzing Data Structure ---');

    // 1. Find the Organization with Products
    const orgsWithProducts = await prisma.organization.findMany({
        include: {
            _count: {
                select: { digitalProducts: true }
            }
        },
        orderBy: {
            digitalProducts: {
                _count: 'desc'
            }
        }
    });

    console.log('\nOrganizations and Product Counts:');
    orgsWithProducts.forEach(org => {
        console.log(`- Org: "${org.name}" (ID: ${org.id}) | Products: ${org._count.digitalProducts}`);
    });

    const mainOrg = orgsWithProducts[0]; // The one with most products
    if (!mainOrg) {
        console.log('No organizations found.');
        return;
    }

    // 2. Check Shopify Connections
    const connections = await prisma.shopifyConnection.findMany({
        include: { organization: true }
    });

    console.log('\nShopify Connections:');
    connections.forEach(conn => {
        console.log(`- Shop: "${conn.shopName}" is linked to Org: "${conn.organization.name}" (ID: ${conn.organizationId})`);
    });

    // 3. Check specific shop
    const targetShop = '45dv93-bk.myshopify.com';
    const targetConn = connections.find(c => c.shopName.includes('45dv93-bk'));

    if (targetConn) {
        if (targetConn.organizationId !== mainOrg.id) {
            console.log(`\n⚠️ MISMATCH DETECTED: Shop ${targetShop} is linked to empty Org "${targetConn.organization.name}", but data is in "${mainOrg.name}".`);

            // Fix it?
            // await prisma.shopifyConnection.update(...)
        } else {
            console.log(`\n✅ Shop ${targetShop} is correctly linked to the Main Org.`);
        }
    } else {
        console.log(`\n⚠️ Shop ${targetShop} has NO connection record yet.`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
