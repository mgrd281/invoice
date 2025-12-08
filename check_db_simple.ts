
import { PrismaClient } from '@prisma/client';

async function main() {
    const url = process.env.DATABASE_URL;
    console.log(`\n--- Checking DB: ${url?.substring(0, 50)}... ---`);

    const prisma = new PrismaClient();

    try {
        const productCount = await prisma.digitalProduct.count();
        console.log(`Digital Products: ${productCount}`);

        const orgCount = await prisma.organization.count();
        console.log(`Organizations: ${orgCount}`);

        if (productCount > 0) {
            const products = await prisma.digitalProduct.findMany({ take: 3 });
            console.log('Sample Products:', products.map(p => p.title));
        }
    } catch (e: any) {
        console.error(`Error connecting:`, e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
