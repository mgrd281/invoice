
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Digital Products...');

    const count = await prisma.digitalProduct.count();
    console.log(`Total Digital Products in DB: ${count}`);

    const products = await prisma.digitalProduct.findMany({
        include: {
            organization: true
        }
    });

    products.forEach(p => {
        console.log(`Product: ${p.title} | ID: ${p.id} | OrgID: ${p.organizationId} | OrgName: ${p.organization.name}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
