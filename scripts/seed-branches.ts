
import 'dotenv/config';
import { PrismaClient, BranchCategory } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

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
  console.log('Starting database cleanup...');

  // 1. Delete dependent data first to be safe
  
  console.log('Deleting Ticket Notes...');
  await prisma.ticketNote.deleteMany({});
  
  console.log('Deleting Attachments...');
  await prisma.attachment.deleteMany({});
  
  console.log('Deleting Status History...');
  await prisma.statusHistory.deleteMany({});
  
  console.log('Deleting Request Attachments...');
  await prisma.requestAttachment.deleteMany({});
  
  console.log('Deleting Tickets...');
  await prisma.ticket.deleteMany({});
  
  console.log('Deleting Requests...');
  await prisma.request.deleteMany({});
  
  console.log('Deleting Branches...');
  await prisma.branch.deleteMany({});
  
  console.log('Deleting Users (except ADMIN)...');
  await prisma.user.deleteMany({
    where: {
      role: {
        not: 'ADMIN'
      }
    }
  });

  console.log('Database cleared (Admin preserved).');

  // 5. Seed Branches
  const filePath = path.join(process.cwd(), 'public', 'bracnhes.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} branches to seed.`);

  let createdCount = 0;
  for (const row of data as any[]) {
    const branchNumber = row['Branch Number'] ? String(row['Branch Number']).trim() : null;
    const locationType = row['Location Type'] ? String(row['Location Type']).trim() : '';
    const location = row['Location'] ? String(row['Location']).trim() : '';

    if (!branchNumber) {
      console.warn('Skipping row with missing Branch Number:', row);
      continue;
    }

    let category: BranchCategory = 'BRANCH';
    const typeUpper = locationType.toUpperCase();
    
    if (typeUpper.includes('BACK OFFICE')) category = 'BACK_OFFICE';
    else if (typeUpper.includes('HYBRID')) category = 'HYBRID';
    else if (typeUpper.includes('DATA CENTER')) category = 'DATA_CENTER';
    else category = 'BRANCH';

    try {
      await prisma.branch.create({
        data: {
          branchNumber,
          name: location || `Branch ${branchNumber}`,
          category
        }
      });
      createdCount++;
    } catch (error) {
      console.error(`Failed to create branch ${branchNumber}:`, error);
    }
  }

  console.log(`Seeding completed. Created ${createdCount} branches.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
