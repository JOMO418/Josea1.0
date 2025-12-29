// Quick database check script
// Run with: node server/test-db-data.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('\n========================================');
  console.log('🔍 DATABASE DATA CHECK');
  console.log('========================================\n');

  try {
    // Check Sales
    const totalSales = await prisma.sale.count();
    const todaySales = await prisma.sale.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    const last7DaysSales = await prisma.sale.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    console.log('📊 SALES:');
    console.log(`  - Total Sales: ${totalSales}`);
    console.log(`  - Today's Sales: ${todaySales}`);
    console.log(`  - Last 7 Days: ${last7DaysSales}`);

    // Check Products
    const totalProducts = await prisma.product.count();
    const activeProducts = await prisma.product.count({
      where: { isActive: true },
    });

    console.log('\n📦 PRODUCTS:');
    console.log(`  - Total Products: ${totalProducts}`);
    console.log(`  - Active Products: ${activeProducts}`);

    // Check Inventory
    const totalInventory = await prisma.inventory.count();
    const lowStockItems = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT i.id)::int as count
      FROM "Inventory" i
      INNER JOIN "Product" p ON p.id = i."productId"
      WHERE i.quantity <= p."lowStockThreshold"
        AND p."isActive" = true
    `;

    console.log('\n📋 INVENTORY:');
    console.log(`  - Total Inventory Records: ${totalInventory}`);
    console.log(`  - Low Stock Items: ${lowStockItems[0]?.count || 0}`);

    // Check Branches
    const totalBranches = await prisma.branch.count();
    const activeBranches = await prisma.branch.count({
      where: { isActive: true },
    });

    console.log('\n🏢 BRANCHES:');
    console.log(`  - Total Branches: ${totalBranches}`);
    console.log(`  - Active Branches: ${activeBranches}`);

    // Sample recent sales
    if (last7DaysSales > 0) {
      const recentSales = await prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          receiptNumber: true,
          total: true,
          createdAt: true,
          isReversed: true,
        },
      });

      console.log('\n📝 RECENT SALES (Last 5):');
      recentSales.forEach((sale, i) => {
        console.log(
          `  ${i + 1}. ${sale.receiptNumber} - KES ${sale.total} - ${sale.createdAt.toLocaleDateString()}`
        );
      });
    }

    console.log('\n========================================');
    console.log('✅ Database check complete!');
    console.log('========================================\n');

    if (totalSales === 0) {
      console.log('⚠️  WARNING: No sales found in database!');
      console.log('   The Command Center will show zeros until you create some sales.\n');
    }
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
