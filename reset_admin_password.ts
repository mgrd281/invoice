import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'mgrdegh@web.de';
  const newPassword = '1532@@@';
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email },
    data: { 
      passwordHash: hashedPassword,
      isSuspended: false,
      emailVerified: new Date()
    }
  });

  console.log('✅ Password reset successfully for mgrdegh@web.de');
}

resetPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
