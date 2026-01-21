import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
    const email = 'mgrdegh@web.de'
    const password = '1532@@@'
    const role = 'ADMIN'

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            console.log('❌ User already exists:', email)
            console.log('Updating password instead...')

            // Hash the new password
            const hashedPassword = await bcrypt.hash(password, 12)

            // Update existing user
            await prisma.user.update({
                where: { email },
                data: {
                    passwordHash: hashedPassword,
                    role: role
                }
            })

            console.log('✅ User password updated successfully!')
        } else {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 12)

            // Create new user
            const user = await prisma.user.create({
                data: {
                    email: email,
                    passwordHash: hashedPassword,
                    name: 'Admin User',
                    role: role,
                    emailVerified: new Date(), // Mark as verified
                    isSuspended: false
                }
            })

            console.log('✅ Admin user created successfully!')
            console.log('Email:', user.email)
            console.log('Role:', user.role)
        }

        console.log('\n🔐 Login credentials:')
        console.log('Email:', email)
        console.log('Password:', password)
        console.log('\n🌐 You can now login at: /login')

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

createAdminUser()
