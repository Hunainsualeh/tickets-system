
import { prisma } from './src/lib/prisma';

async function test() {
  console.log('Checking prisma.workLog...');
  if (prisma.workLog) {
    console.log('prisma.workLog exists!');
    const count = await prisma.workLog.count();
    console.log('Count:', count);
  } else {
    console.error('prisma.workLog is undefined!');
  }
}

test()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
