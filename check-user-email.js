
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkUser() {
  try {
    const user = await prisma.user.findFirst({
      where: { username: 'kevin' }
    });
    console.log('User kevin:', user);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
