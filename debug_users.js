const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        include: { organization: true }
    });
    console.log('Users:', JSON.stringify(users, null, 2));

    const orgs = await prisma.organization.findMany();
    console.log('Organizations:', JSON.stringify(orgs, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
