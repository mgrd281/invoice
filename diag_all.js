const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Database Field Audit ---');
        await prisma.$connect();
        console.log('✅ Connected to Database.');

        const tables = {
            'VisitorSession': [
                'status', 'cartSnapshot', 'itemsCount', 'peakCartValue',
                'isVip', 'adminNotes', 'recordingStatus', 'thumbnailUrl',
                'city', 'region', 'ipMasked', 'customerId'
            ],
            'AbandonedCart': [
                'removedItems', 'totalPricePeak', 'deviceInfo',
                'lastEnrichmentAttempt', 'couponCode', 'couponExpiresAt',
                'discountType', 'discountValue'
            ],
            'Visitor': [
                'ipHash', 'userAgent', 'deviceType', 'os', 'browser'
            ]
        };

        for (const [table, fields] of Object.entries(tables)) {
            console.log(`\nChecking Table: ${table}...`);
            try {
                const item = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].findFirst();
                console.log(`✅ Table ${table} exists.`);

                for (const field of fields) {
                    try {
                        const select = {};
                        select[field] = true;
                        await prisma[table.charAt(0).toLowerCase() + table.slice(1)].findFirst({ select });
                        console.log(`  ✅ Field [${field}] exists.`);
                    } catch (e) {
                        console.error(`  ❌ Field [${field}] MISSING:`, e.message);
                    }
                }
            } catch (e) {
                console.error(`❌ Table ${table} ERROR:`, e.message);
            }
        }

        try {
            console.log('\nChecking Table: CartSnapshot...');
            await prisma.cartSnapshot.findFirst();
            console.log('✅ Table CartSnapshot exists.');
        } catch (e) {
            console.error('❌ Table CartSnapshot MISSING:', e.message);
        }

    } catch (error) {
        console.error('Main Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
