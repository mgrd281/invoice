const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const keys = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
    console.log('Prisma keys:', keys);
}

main();
