const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const productCount = await prisma.product.count();
    const branchCount = await prisma.branch.count();
    const userCount = await prisma.user.count();

    console.log('=== DATABASE STATUS ===');
    console.log('Products:', productCount);
    console.log('Branches:', branchCount);
    console.log('Users:', userCount);

    if (branchCount > 0) {
      const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
      console.log('\nBranches:');
      branches.forEach(b => console.log(`  - ${b.name} (ID: ${b.id})`));
    }

    if (userCount > 0) {
      const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
      console.log('\nUsers:');
      users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
