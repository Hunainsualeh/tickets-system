
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkUser() {
  const email = 'hunainsualeh8@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email: email }
  });

  if (user) {
    console.log(`User found: ${user.username}, Role: ${user.role}`);
    if (user.role !== 'ADMIN') {
        console.log('Updating user to ADMIN to receive notifications...');
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
        });
        console.log('User updated to ADMIN.');
    }
  } else {
    console.log('User not found. Creating admin user...');
    await prisma.user.create({
        data: {
            username: 'hunain_admin',
            password: 'hashed_password_placeholder', // In a real scenario, hash this
            email: email,
            role: 'ADMIN'
        }
    });
    console.log('Admin user created.');
  }
  
  await prisma.$disconnect();
}

checkUser().catch(console.error);
