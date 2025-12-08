
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetShop = '45dv93-bk.myshopify.com';
    console.log(`Searching for organization linked to shop: ${targetShop}`);

    // 1. Try to find via ShopifyConnection
    const connection = await prisma.shopifyConnection.findFirst({
        where: {
            shopName: {
                contains: '45dv93-bk' // simplified match
            }
        },
        include: {
            organization: true
        }
    });

    let organizationId;

    if (connection) {
        console.log(`Found ShopifyConnection for ${connection.shopName}. Organization ID: ${connection.organizationId}`);
        organizationId = connection.organizationId;
    } else {
        console.log('No specific ShopifyConnection found. Falling back to the first Organization (Main Account).');
        const firstOrg = await prisma.organization.findFirst({
            orderBy: { createdAt: 'asc' }
        });

        if (firstOrg) {
            console.log(`Found Main Organization: ${firstOrg.name} (${firstOrg.id})`);
            organizationId = firstOrg.id;
        } else {
            console.error('No organizations found in the database.');
            return;
        }
    }

    // 2. Update the plan to ENTERPRISE
    if (organizationId) {
        const updated = await prisma.organization.update({
            where: { id: organizationId },
            data: {
                plan: 'ENTERPRISE'
            }
        });
        console.log(`✅ Successfully updated plan to ENTERPRISE for Organization: ${updated.name}`);
        console.log(`Shop: ${targetShop} now has full access.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
