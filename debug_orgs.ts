
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Listing all organizations:');
    const orgs = await prisma.organization.findMany({
        orderBy: { createdAt: 'asc' }
    });

    orgs.forEach(org => {
        console.log(`ID: ${org.id} | Name: ${org.name} | Plan: ${org.plan} | CreatedAt: ${org.createdAt}`);
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
