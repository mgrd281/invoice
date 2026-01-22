
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarts() {
    try {
        const carts = await prisma.abandonedCart.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${carts.length} carts.`);
        carts.forEach(cart => {
            console.log(`Cart ID: ${cart.id}`);
            console.log(`Last Enrichment Attempt: ${cart.lastEnrichmentAttempt}`);
            console.log(`Line Items: ${JSON.stringify(cart.lineItems).substring(0, 100)}...`);
            const hasImage = (cart.lineItems || []).some(item => item.image && item.image.src);
            console.log(`Has Images: ${hasImage}`);
            console.log('---');
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkCarts();
