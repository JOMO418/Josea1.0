const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create branches
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        name: 'Main Branch',
        location: 'Kirinyaga Road, Nairobi CBD',
        isHeadquarters: true,
        phone: '+254712345678',
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Kiserian Branch',
        location: 'Kiserian, Kajiado County',
        phone: '+254712345679',
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Kisumu Branch',
        location: 'Kisumu County',
        phone: '+254712345680',
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Kakamega Branch',
        location: 'Kakamega County',
        phone: '+254712345681',
      },
    }),
  ]);

  console.log('✅ Branches created');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Uncle (Owner)',
        email: 'owner@pram.demo',
        password: hashedPassword,
        role: 'OWNER',
        phone: '+254700000000',
      },
    }),
    prisma.user.create({
      data: {
        name: 'JOMOG (Overseer)',
        email: 'overseer@pram.demo',
        password: hashedPassword,
        role: 'ADMIN',
        branchId: branches[0].id,
        phone: '+254700000001',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kiserian Manager',
        email: 'kiserian@pram.demo',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[1].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kisumu Manager',
        email: 'kisumu@pram.demo',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[2].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kakamega Manager',
        email: 'kakamega@pram.demo',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[3].id,
      },
    }),
  ]);

  console.log('✅ Users created');
  console.log('\n📧 Login credentials:');
  console.log('   owner@pram.demo / password123 (OWNER)');
  console.log('   overseer@pram.demo / password123 (ADMIN)');
  console.log('   kiserian@pram.demo / password123 (MANAGER)\n');

  // Create products
  const productsData = [
    { name: 'Brake Pad Set', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 1800, min: 2200, sell: 2500, part: 'BP-5L-001' },
    { name: 'Clutch Plate', make: 'Toyota', model: 'Hiace', engine: '3L', cost: 3500, min: 4200, sell: 4800, part: 'CP-3L-001' },
    { name: 'Fuel Filter', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 280, min: 380, sell: 450, part: 'FF-5L-001' },
    { name: 'Oil Filter', make: 'Toyota', model: 'General', engine: 'All', cost: 220, min: 300, sell: 350, part: 'OF-TY-001' },
    { name: 'Fan Belt', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 420, min: 550, sell: 650, part: 'FB-5L-001' },
    { name: 'Water Pump', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 2200, min: 2800, sell: 3200, part: 'WP-5L-001' },
    { name: 'Starter Motor', make: 'Toyota', model: 'Hiace', engine: '3L', cost: 6500, min: 7500, sell: 8500, part: 'SM-3L-001' },
    { name: 'Alternator', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 9000, min: 10500, sell: 12000, part: 'AL-5L-001' },
    { name: 'Shock Absorber Front', make: 'Toyota', model: 'Hiace', engine: 'All', cost: 2000, min: 2400, sell: 2800, part: 'SA-HC-001' },
    { name: 'Tie Rod End', make: 'Toyota', model: 'Hiace', engine: 'All', cost: 650, min: 800, sell: 950, part: 'TR-HC-001' },
  ];

  const products = [];
  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        vehicleMake: p.make,
        vehicleModel: p.model,
        vehicleEngine: p.engine,
        costPrice: p.cost,
        minPrice: p.min,
        sellingPrice: p.sell,
        partNumber: p.part,
        lowStockThreshold: 5,
      },
    });
    products.push(product);
  }

  console.log('✅ Products created');

  // Create inventory (varied distribution across branches)
  const inventoryDistribution = [
    [45, 12, 8, 6],   // Brake Pad
    [12, 6, 4, 3],    // Clutch Plate
    [28, 12, 8, 6],   // Fuel Filter
    [45, 22, 18, 12], // Oil Filter
    [23, 15, 12, 8],  // Fan Belt
    [5, 3, 2, 1],     // Water Pump
    [3, 1, 2, 0],     // Starter Motor (low stock)
    [2, 2, 1, 1],     // Alternator (low stock)
    [7, 5, 4, 3],     // Shock Absorber
    [18, 12, 8, 6],   // Tie Rod
  ];

  for (let i = 0; i < products.length; i++) {
    for (let j = 0; j < branches.length; j++) {
      await prisma.inventory.create({
        data: {
          productId: products[i].id,
          branchId: branches[j].id,
          quantity: inventoryDistribution[i][j],
        },
      });
    }
  }

  console.log('✅ Inventory created');
  console.log('\n🎉 Seeding completed!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });