// Database Connection Check Script
// Run this to verify your database is set up correctly
// Usage: node check-db.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking database connection...\n');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Check tables
    console.log('\n📊 Checking database tables...');
    
    const userCount = await prisma.user.count();
    const branchCount = await prisma.branch.count();
    const ticketCount = await prisma.ticket.count();
    
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Branches: ${branchCount}`);
    console.log(`   - Tickets: ${ticketCount}`);

    if (userCount === 0) {
      console.log('\n⚠️  No users found. Run: npm run db:seed');
    }

    if (branchCount === 0) {
      console.log('⚠️  No branches found. Run: npm run db:seed');
    }

    console.log('\n✨ Database check complete!');
    
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);
    console.log('\n📝 Troubleshooting tips:');
    console.log('   1. Make sure PostgreSQL is running');
    console.log('   2. Check DATABASE_URL in .env file');
    console.log('   3. Verify database exists');
    console.log('   4. Run: npm run db:push');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
