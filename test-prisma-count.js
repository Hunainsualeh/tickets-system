
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      take: 1,
      select: {
        id: true,
        _count: {
          select: {
            tickets: true,
            assignedTickets: true,
          },
        },
      },
    });
    console.log('Query successful:', JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
