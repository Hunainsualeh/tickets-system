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

  // Create branches
  const branches = [
    {
      name: 'Main Branch Downtown',
      branchNumber: 'BR001',
      address: '123 Main Street, Downtown, City, State 12345',
      localContact: '+1 (555) 123-4567',
      category: 'BRANCH',
    },
    {
      name: 'North Side Branch',
      branchNumber: 'BR002',
      address: '456 North Avenue, Northside, City, State 12346',
      localContact: '+1 (555) 234-5678',
      category: 'BRANCH',
    },
    {
      name: 'Corporate Back Office',
      branchNumber: 'BO001',
      address: '789 Corporate Drive, Business District, City, State 12347',
      localContact: '+1 (555) 345-6789',
      category: 'BACK_OFFICE',
    },
    {
      name: 'Hybrid Operations Center',
      branchNumber: 'HY001',
      address: '321 Hybrid Way, Tech Park, City, State 12348',
      localContact: '+1 (555) 456-7890',
      category: 'HYBRID',
    },
    {
      name: 'Primary Data Center',
      branchNumber: 'DC001',
      address: '654 Data Center Road, Industrial Zone, City, State 12349',
      localContact: '+1 (555) 567-8901',
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
        priority: 'HIGH',
        issue: 'Network connectivity issues in the main office. Multiple workstations unable to connect to the network.',
        additionalDetails: 'Started around 9 AM this morning. Affecting approximately 15 workstations.',
        status: 'IN_PROGRESS',
      },
      {
        userId: allUsers[0].id,
        branchId: allBranches[1].id,
        priority: 'MEDIUM',
        issue: 'Printer not working properly. Paper jams frequently.',
        additionalDetails: 'Model: HP LaserJet Pro. Located in the main office area.',
        status: 'ACKNOWLEDGED',
      },
      {
        userId: allUsers[1]?.id || allUsers[0].id,
        branchId: allBranches[2].id,
        priority: 'LOW',
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
