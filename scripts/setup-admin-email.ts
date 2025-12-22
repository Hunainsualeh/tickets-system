
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { prisma } from '../src/lib/prisma';

async function main() {
  const email = process.env.SMTP_USER;
  if (!email) {
    console.error('SMTP_USER not found in env');
    return;
  }

  console.log(`Updating admin user email to: ${email}`);

  try {
    const admin = await prisma.user.findFirst({
      where: { username: 'admin' }
    });

    if (!admin) {
      console.error('Admin user not found!');
      return;
    }

    const updated = await prisma.user.update({
      where: { id: admin.id },
      data: { email: email }
    });

    console.log('Admin updated:', updated);
  } catch (error) {
    console.error('Error updating admin:', error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
