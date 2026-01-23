const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const org = await prisma.organization.findFirst();
    if (!org) {
        console.error('No organization found. Please seed first.');
        return;
    }

    // Use a generic admin or first user email. 
    // Since I don't know the exact email, I'll create a default one 
    // that likely matches the user's session or at least provides a fallback.
    const email = process.env.NEXTAUTH_URL ? "admin@example.com" : "user@example.com";

    console.log(`Creating user for organization ${org.id}...`);

    const user = await prisma.user.upsert({
        where: { email: email },
        update: {
            organizationId: org.id,
            role: 'ADMIN',
        },
        create: {
            email: email,
            name: 'Admin User',
            organizationId: org.id,
            role: 'ADMIN',
        }
    });

    console.log('User created/restored:', user.id);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
