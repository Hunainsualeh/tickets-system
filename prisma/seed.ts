import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('Created admin user:', admin.username);

  // Create test users
  const user1Password = await bcrypt.hash('user123', 10);
  const user1 = await prisma.user.upsert({
    where: { username: 'john_doe' },
    update: {},
    create: {
      username: 'john_doe',
      password: user1Password,
      role: 'USER',
    },
  });
  console.log('Created user:', user1.username);

  const user2Password = await bcrypt.hash('user123', 10);
  const user2 = await prisma.user.upsert({
    where: { username: 'jane_smith' },
    update: {},
    create: {
      username: 'jane_smith',
      password: user2Password,
      role: 'USER',
    },
  });
  console.log('Created user:', user2.username);

  // Create teams
  const team1 = await prisma.team.upsert({
    where: { name: 'Development Team' },
    update: {},
    create: {
      name: 'Development Team',
    },
  });
  console.log('Created team:', team1.name);

  const team2 = await prisma.team.upsert({
    where: { name: 'Support Team' },
    update: {},
    create: {
      name: 'Support Team',
    },
  });
  console.log('Created team:', team2.name);

  const team3 = await prisma.team.upsert({
    where: { name: 'IT Operations' },
    update: {},
    create: {
      name: 'IT Operations',
    },
  });
  console.log('Created team:', team3.name);

  // Assign users to teams
  await prisma.user.update({
    where: { id: user1.id },
    data: { teamId: team1.id },
  });
  console.log('Assigned', user1.username, 'to', team1.name);

  await prisma.user.update({
    where: { id: user2.id },
    data: { teamId: team2.id },
  });
  console.log('Assigned', user2.username, 'to', team2.name);

  // Create branches
  const branches = [
    {
      name: 'Main Branch Downtown',
      branchNumber: 'BR001',
      category: 'BRANCH',
    },
    {
      name: 'North Side Branch',
      branchNumber: 'BR002',
      category: 'BRANCH',
    },
    {
      name: 'Corporate Back Office',
      branchNumber: 'BO001',
      category: 'BACK_OFFICE',
    },
    {
      name: 'Hybrid Operations Center',
      branchNumber: 'HY001',
      category: 'HYBRID',
    },
    {
      name: 'Primary Data Center',
      branchNumber: 'DC001',
      category: 'DATA_CENTER',
    },
  ];

  for (const branch of branches) {
    const created = await prisma.branch.upsert({
      where: { branchNumber: branch.branchNumber },
      update: {},
      create: branch as any,
    });
    console.log('Created branch:', created.name);
  }

  // Create sample tickets
  const allBranches = await prisma.branch.findMany();
  const allUsers = await prisma.user.findMany({ where: { role: 'USER' } });

  if (allBranches.length > 0 && allUsers.length > 0) {
    const sampleTickets = [
      {
        userId: allUsers[0].id,
        branchId: allBranches[0].id,
        priority: 'P1',
        issue: 'Network connectivity issues in the main office. Multiple workstations unable to connect to the network.',
        additionalDetails: 'Started around 9 AM this morning. Affecting approximately 15 workstations.',
        status: 'IN_PROGRESS',
      },
      {
        userId: allUsers[0].id,
        branchId: allBranches[1].id,
        priority: 'P2',
        issue: 'Printer not working properly. Paper jams frequently.',
        additionalDetails: 'Model: HP LaserJet Pro. Located in the main office area.',
        status: 'ACKNOWLEDGED',
      },
      {
        userId: allUsers[1]?.id || allUsers[0].id,
        branchId: allBranches[2].id,
        priority: 'P3',
        issue: 'Request for new software installation - Microsoft Office 365.',
        additionalDetails: 'Needed for the accounting department.',
        status: 'PENDING',
      },
    ];

    for (const ticket of sampleTickets) {
      const created = await prisma.ticket.create({
        data: ticket as any,
      });

      // Create initial status history
      await prisma.statusHistory.create({
        data: {
          ticketId: created.id,
          status: created.status as any,
          note: `Ticket created with ${created.status} status`,
        },
      });

      console.log('Created ticket:', created.id);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
