
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting Products ---');

    const products = await prisma.digitalProduct.findMany({
        select: {
            id: true,
            title: true,
            organizationId: true
        }
    });

    console.log(`Found ${products.length} products.`);
    products.forEach(p => {
        console.log(`- Product: "${p.title.substring(0, 20)}..." | OrgID: ${p.organizationId}`);
    });

    const orgs = await prisma.organization.findMany();
    console.log('\nAvailable Orgs:');
    orgs.forEach(o => {
        console.log(`- ${o.name} (${o.id})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
