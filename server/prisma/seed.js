const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Your Cloudinary cloud name (from your successful migration)
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dxvppzdif/image/upload';

// Helper function to generate Cloudinary URL from part number
function getCloudinaryUrl(partNumber) {
  // Convert part number to filename format (e.g., PS-5L-001 -> ps-5l-001.jpg)
  const filename = partNumber.toLowerCase();
  // Use the format from your migration output
  return `${CLOUDINARY_BASE}/v1770359412/products/${filename}.jpg`;
}

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clear existing data in correct order (respecting foreign key constraints)
  console.log('🧹 Clearing existing data...');

  await prisma.creditPayment.deleteMany({});
  await prisma.salePayment.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.transferItem.deleteMany({});
  await prisma.transfer.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.supplierPayment.deleteMany({});
  await prisma.procurementOrderItem.deleteMany({});
  await prisma.procurementOrder.deleteMany({});
  await prisma.supplierProduct.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.aIConversationMessage.deleteMany({});
  await prisma.aIConversation.deleteMany({});
  await prisma.aIQueryLog.deleteMany({});
  await prisma.aIUsageTracking.deleteMany({});
  await prisma.mpesaTransaction.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.branch.deleteMany({});

  console.log('✅ Database cleared\n');

  // Create branches
  console.log('📍 Creating branches...');
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
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  await Promise.all([
    prisma.user.create({
      data: {
        name: 'Uncle (Owner)',
        email: 'owner@pram.co.ke',
        password: hashedPassword,
        role: 'OWNER',
        phone: '+254700000000',
      },
    }),
    prisma.user.create({
      data: {
        name: 'JOMOG (Overseer)',
        email: 'overseer@pram.co.ke',
        password: hashedPassword,
        role: 'ADMIN',
        branchId: branches[0].id,
        phone: '+254700000001',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Main Branch Manager',
        email: 'mainbranch@pram.co.ke',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[0].id,
        phone: '+254700000002',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kiserian Manager',
        email: 'kiserian@pram.co.ke',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[1].id,
        phone: '+254700000003',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kisumu Manager',
        email: 'kisumu@pram.co.ke',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[2].id,
        phone: '+254700000004',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kakamega Manager',
        email: 'kakamega@pram.co.ke',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[3].id,
        phone: '+254700000005',
      },
    }),
  ]);

  console.log('✅ Users created');
  console.log('\n📧 Login credentials:');
  console.log('   owner@pram.co.ke / password123 (OWNER)');
  console.log('   overseer@pram.co.ke / password123 (ADMIN)');
  console.log('   mainbranch@pram.co.ke / password123 (MANAGER - Main Branch)');
  console.log('   kiserian@pram.co.ke / password123 (MANAGER)');
  console.log('   kisumu@pram.co.ke / password123 (MANAGER)');
  console.log('   kakamega@pram.co.ke / password123 (MANAGER)\n');

  // Create 50 Toyota Products with Cloudinary Images
  console.log('📦 Creating products with Cloudinary images...');
  
  const productsData = [
    // Engine Parts - 5L Engine
    { name: 'Piston Set 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 12000, min: 14500, sell: 16500, part: 'PS-5L-001', category: 'Engine Parts' },
    { name: 'Piston Rings 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 3500, min: 4200, sell: 4800, part: 'PR-5L-001', category: 'Engine Parts' },
    { name: 'Cylinder Head Gasket 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 2800, min: 3400, sell: 3900, part: 'CHG-5L-001', category: 'Engine Parts' },
    { name: 'Connecting Rod 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 8500, min: 10200, sell: 11500, part: 'CR-5L-001', category: 'Engine Parts' },
    { name: 'Crankshaft 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 28000, min: 32000, sell: 36000, part: 'CS-5L-001', category: 'Engine Parts' },

    // Engine Parts - 7L Engine
    { name: 'Piston Set 7L', make: 'Toyota', model: 'Landcruiser', engine: '7L', cost: 15000, min: 18000, sell: 20500, part: 'PS-7L-001', category: 'Engine Parts' },
    { name: 'Piston Rings 7L', make: 'Toyota', model: 'Landcruiser', engine: '7L', cost: 4200, min: 5000, sell: 5800, part: 'PR-7L-001', category: 'Engine Parts' },
    { name: 'Cylinder Head 7L', make: 'Toyota', model: 'Landcruiser', engine: '7L', cost: 45000, min: 52000, sell: 58000, part: 'CH-7L-001', category: 'Engine Parts' },
    { name: 'Oil Pump 7L', make: 'Toyota', model: 'Landcruiser', engine: '7L', cost: 6500, min: 7800, sell: 8900, part: 'OP-7L-001', category: 'Engine Parts' },

    // Engine Parts - 9L Engine
    { name: 'Piston Set 9L', make: 'Toyota', model: 'Coaster', engine: '9L', cost: 18000, min: 21500, sell: 24500, part: 'PS-9L-001', category: 'Engine Parts' },
    { name: 'Turbocharger 9L', make: 'Toyota', model: 'Coaster', engine: '9L', cost: 35000, min: 42000, sell: 48000, part: 'TC-9L-001', category: 'Engine Parts' },

    // Filters
    { name: 'Oil Filter', make: 'Toyota', model: 'General', engine: 'All', cost: 220, min: 300, sell: 350, part: 'OF-TY-001', category: 'Filters' },
    { name: 'Fuel Filter 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 280, min: 380, sell: 450, part: 'FF-5L-001', category: 'Filters' },
    { name: 'Air Filter', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 420, min: 550, sell: 650, part: 'AF-CR-001', category: 'Filters' },
    { name: 'Cabin Air Filter', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 380, min: 480, sell: 580, part: 'CAF-CR-001', category: 'Filters' },

    // Suspension Parts
    { name: 'Ball Joint Lower', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 1200, min: 1500, sell: 1800, part: 'BJ-CR-001', category: 'Suspension' },
    { name: 'Ball Joint Upper', make: 'Toyota', model: '110', engine: 'All', cost: 1400, min: 1700, sell: 2000, part: 'BJ-110-001', category: 'Suspension' },
    { name: 'Tie Rod End Left', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 650, min: 800, sell: 950, part: 'TR-CR-L001', category: 'Suspension' },
    { name: 'Tie Rod End Right', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 650, min: 800, sell: 950, part: 'TR-CR-R001', category: 'Suspension' },
    { name: 'Shock Absorber Front', make: 'Toyota', model: 'Hiace', engine: 'All', cost: 2000, min: 2400, sell: 2800, part: 'SA-HC-F001', category: 'Suspension' },
    { name: 'Shock Absorber Rear', make: 'Toyota', model: 'Hiace', engine: 'All', cost: 2200, min: 2600, sell: 3000, part: 'SA-HC-R001', category: 'Suspension' },
    { name: 'Control Arm Lower', make: 'Toyota', model: '110', engine: 'All', cost: 3500, min: 4200, sell: 4800, part: 'CA-110-001', category: 'Suspension' },
    { name: 'Stabilizer Link', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 580, min: 720, sell: 850, part: 'SL-CR-001', category: 'Suspension' },

    // Brake Parts
    { name: 'Brake Pad Set Front', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 1500, min: 1900, sell: 2200, part: 'BP-CR-F001', category: 'Brakes' },
    { name: 'Brake Pad Set Rear', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 1600, min: 2000, sell: 2300, part: 'BP-CR-R001', category: 'Brakes' },
    { name: 'Brake Disc Front', make: 'Toyota', model: '110', engine: 'All', cost: 2800, min: 3400, sell: 3900, part: 'BD-110-F001', category: 'Brakes' },
    { name: 'Brake Shoe Set', make: 'Toyota', model: 'Hiace', engine: 'All', cost: 1800, min: 2200, sell: 2500, part: 'BS-HC-001', category: 'Brakes' },
    { name: 'Master Cylinder', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 4500, min: 5400, sell: 6200, part: 'MC-CR-001', category: 'Brakes' },

    // Clutch & Transmission
    { name: 'Clutch Plate 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 3500, min: 4200, sell: 4800, part: 'CP-5L-001', category: 'Transmission' },
    { name: 'Clutch Cover 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 4200, min: 5000, sell: 5700, part: 'CC-5L-001', category: 'Transmission' },
    { name: 'Release Bearing', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 850, min: 1050, sell: 1250, part: 'RB-CR-001', category: 'Transmission' },
    { name: 'Gearbox Oil Seal', make: 'Toyota', model: '110', engine: 'All', cost: 320, min: 420, sell: 500, part: 'GOS-110-001', category: 'Transmission' },

    // Steering Parts
    { name: 'Power Steering Pump', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 8500, min: 10200, sell: 11500, part: 'PSP-CR-001', category: 'Steering' },
    { name: 'Steering Rack', make: 'Toyota', model: '110', engine: 'All', cost: 15000, min: 18000, sell: 20500, part: 'SR-110-001', category: 'Steering' },
    { name: 'Rack End Left', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 980, min: 1200, sell: 1400, part: 'RE-CR-L001', category: 'Steering' },
    { name: 'Rack End Right', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 980, min: 1200, sell: 1400, part: 'RE-CR-R001', category: 'Steering' },

    // Electrical Parts
    { name: 'Starter Motor 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 6500, min: 7800, sell: 8900, part: 'SM-5L-001', category: 'Electrical' },
    { name: 'Alternator 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 9000, min: 10800, sell: 12300, part: 'AL-5L-001', category: 'Electrical' },
    { name: 'Ignition Coil', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 750, min: 950, sell: 1150, part: 'IC-CR-001', category: 'Electrical' },
    { name: 'Spark Plug Set', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 450, min: 580, sell: 680, part: 'SP-CR-001', category: 'Electrical' },

    // Cooling System
    { name: 'Water Pump 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 2500, min: 3000, sell: 3500, part: 'WP-5L-001', category: 'Cooling' },
    { name: 'Radiator', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 5500, min: 6600, sell: 7500, part: 'RD-CR-001', category: 'Cooling' },
    { name: 'Thermostat', make: 'Toyota', model: 'General', engine: 'All', cost: 320, min: 420, sell: 500, part: 'TH-TY-001', category: 'Cooling' },
    { name: 'Radiator Hose Upper', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 450, min: 580, sell: 680, part: 'RH-5L-U001', category: 'Cooling' },

    // Belts
    { name: 'Fan Belt 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 380, min: 480, sell: 580, part: 'FB-5L-001', category: 'Belts' },
    { name: 'Timing Belt', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 1200, min: 1500, sell: 1800, part: 'TB-CR-001', category: 'Belts' },
    { name: 'Serpentine Belt', make: 'Toyota', model: '110', engine: 'All', cost: 650, min: 800, sell: 950, part: 'SB-110-001', category: 'Belts' },

    // Gaskets
    { name: 'Head Gasket Set', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 2800, min: 3400, sell: 3900, part: 'HGS-5L-001', category: 'Gaskets' },
    { name: 'Oil Pan Gasket', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 420, min: 550, sell: 650, part: 'OPG-CR-001', category: 'Gaskets' },
    { name: 'Valve Cover Gasket', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 580, min: 720, sell: 850, part: 'VCG-CR-001', category: 'Gaskets' },
  ];

  // Create products with Cloudinary URLs
  let productsCreated = 0;
  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        vehicleMake: p.make,
        vehicleModel: p.model,
        vehicleEngine: p.engine,
        partNumber: p.part,
        category: p.category,
        costPrice: p.cost,
        minPrice: p.min,
        sellingPrice: p.sell,
        imageUrl: getCloudinaryUrl(p.part), // Using Cloudinary URL!
        lowStockThreshold: 5,
      },
    });

    // Create inventory for each branch with random quantities
    for (const branch of branches) {
      await prisma.inventory.create({
        data: {
          productId: product.id,
          branchId: branch.id,
          quantity: Math.floor(Math.random() * 50) + 10, // Random 10-59
          sellingPrice: p.sell,
          lowStockThreshold: 5,
        },
      });
    }

    productsCreated++;
    if (productsCreated % 10 === 0) {
      console.log(`   ✅ Created ${productsCreated}/${productsData.length} products...`);
    }
  }

  console.log(`✅ All ${productsCreated} products created with Cloudinary images\n`);
  console.log('🎉 Seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`   🏢 Branches: ${branches.length}`);
  console.log(`   👥 Users: 6`);
  console.log(`   📦 Products: ${productsCreated}`);
  console.log(`   📸 All images using Cloudinary URLs`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });