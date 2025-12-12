import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUserQuery() {
  try {
    // Test fetching a user with teams
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        username: true,
        role: true,
        teamId: true,
        teams: {
          include: {
            team: true,
          },
        },
      },
    });

    console.log('✅ User query with teams successful!');
    console.log('User:', JSON.stringify(user, null, 2));
    
    if (user?.teams) {
      console.log(`✅ User has ${user.teams.length} team(s)`);
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testUserQuery();
