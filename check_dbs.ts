
import { PrismaClient } from '@prisma/client';

const db1Url = 'postgresql://neondb_owner:npg_AJ3xgXNjb2DV@ep-flat-king-agzq7c1z-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const db2Url = 'postgresql://neondb_owner:npg_tIBcah4Xy3oM@ep-delicate-hall-ag0vbf8f-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkDb(name: string, url: string) {
    console.log(`\n--- Checking ${name} ---`);
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: url
            }
        }
    });

    try {
        const productCount = await prisma.digitalProduct.count();
        console.log(`Digital Products: ${productCount}`);

        const orgCount = await prisma.organization.count();
        console.log(`Organizations: ${orgCount}`);

        if (productCount > 0) {
            const products = await prisma.digitalProduct.findMany({ take: 3 });
            console.log('Sample Products:', products.map(p => p.title));
        }
    } catch (e) {
        console.error(`Error connecting to ${name}:`, e.message);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    await checkDb('DB 1 (ep-flat-king / .env)', db1Url);
    await checkDb('DB 2 (ep-delicate-hall / .env.local)', db2Url);
}

main();
