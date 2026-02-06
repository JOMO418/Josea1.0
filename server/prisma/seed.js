const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

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

  // Create users (keep same credentials)
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
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
        phone: '+254700000010',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kiserian Manager',
        email: 'kiserian@pram.co.ke',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[1].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kisumu Manager',
        email: 'kisumu@pram.co.ke',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[2].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kakamega Manager',
        email: 'kakamega@pram.co.ke',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[3].id,
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

  // Create 50 Toyota Products with Images
  const productsData = [
    // Engine Parts - 5L Engine
    { name: 'Piston Set 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 12000, min: 14500, sell: 16500, part: 'PS-5L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=500' },
    { name: 'Piston Rings 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 3500, min: 4200, sell: 4800, part: 'PR-5L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },
    { name: 'Cylinder Head Gasket 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 2800, min: 3400, sell: 3900, part: 'CHG-5L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500' },
    { name: 'Connecting Rod 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 8500, min: 10200, sell: 11500, part: 'CR-5L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500' },
    { name: 'Crankshaft 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 28000, min: 32000, sell: 36000, part: 'CS-5L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=500' },

    // Engine Parts - 7L Engine
    { name: 'Piston Set 7L', make: 'Toyota', model: 'Landcruiser', engine: '7L', cost: 15000, min: 18000, sell: 20500, part: 'PS-7L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=500' },
    { name: 'Piston Rings 7L', make: 'Toyota', model: 'Landcruiser', engine: '7L', cost: 4200, min: 5000, sell: 5800, part: 'PR-7L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },
    { name: 'Cylinder Head 7L', make: 'Toyota', model: 'Landcruiser', engine: '7L', cost: 45000, min: 52000, sell: 58000, part: 'CH-7L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500' },
    { name: 'Oil Pump 7L', make: 'Toyota', model: 'Landcruiser', engine: '7L', cost: 6500, min: 7800, sell: 8900, part: 'OP-7L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500' },

    // Engine Parts - 9L Engine (Rare)
    { name: 'Piston Set 9L', make: 'Toyota', model: 'Coaster', engine: '9L', cost: 18000, min: 21500, sell: 24500, part: 'PS-9L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=500' },
    { name: 'Turbocharger 9L', make: 'Toyota', model: 'Coaster', engine: '9L', cost: 35000, min: 42000, sell: 48000, part: 'TC-9L-001', category: 'Engine Parts', img: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=500' },

    // Filters
    { name: 'Oil Filter', make: 'Toyota', model: 'General', engine: 'All', cost: 220, min: 300, sell: 350, part: 'OF-TY-001', category: 'Filters', img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500' },
    { name: 'Fuel Filter 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 280, min: 380, sell: 450, part: 'FF-5L-001', category: 'Filters', img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500' },
    { name: 'Air Filter', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 420, min: 550, sell: 650, part: 'AF-CR-001', category: 'Filters', img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500' },
    { name: 'Cabin Air Filter', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 380, min: 480, sell: 580, part: 'CAF-CR-001', category: 'Filters', img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500' },

    // Suspension Parts - Front
    { name: 'Ball Joint Lower', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 1200, min: 1500, sell: 1800, part: 'BJ-CR-001', category: 'Suspension', img: 'https://images.unsplash.com/photo-1632823469770-e9f735d043b7?w=500' },
    { name: 'Ball Joint Upper', make: 'Toyota', model: '110', engine: 'All', cost: 1400, min: 1700, sell: 2000, part: 'BJ-110-001', category: 'Suspension', img: 'https://images.unsplash.com/photo-1632823469770-e9f735d043b7?w=500' },
    { name: 'Tie Rod End Left', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 650, min: 800, sell: 950, part: 'TR-CR-L001', category: 'Suspension', img: 'https://images.unsplash.com/photo-1632823471265-aaa5e3d7f4e8?w=500' },
    { name: 'Tie Rod End Right', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 650, min: 800, sell: 950, part: 'TR-CR-R001', category: 'Suspension', img: 'https://images.unsplash.com/photo-1632823471265-aaa5e3d7f4e8?w=500' },
    { name: 'Shock Absorber Front', make: 'Toyota', model: 'Hiace', engine: 'All', cost: 2000, min: 2400, sell: 2800, part: 'SA-HC-F001', category: 'Suspension', img: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=500' },
    { name: 'Shock Absorber Rear', make: 'Toyota', model: 'Hiace', engine: 'All', cost: 2200, min: 2600, sell: 3000, part: 'SA-HC-R001', category: 'Suspension', img: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=500' },
    { name: 'Control Arm Lower', make: 'Toyota', model: '110', engine: 'All', cost: 3500, min: 4200, sell: 4800, part: 'CA-110-001', category: 'Suspension', img: 'https://images.unsplash.com/photo-1632823469770-e9f735d043b7?w=500' },
    { name: 'Stabilizer Link', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 580, min: 720, sell: 850, part: 'SL-CR-001', category: 'Suspension', img: 'https://images.unsplash.com/photo-1632823471265-aaa5e3d7f4e8?w=500' },

    // Brake Parts
    { name: 'Brake Pad Set Front', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 1500, min: 1900, sell: 2200, part: 'BP-CR-F001', category: 'Brakes', img: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500' },
    { name: 'Brake Pad Set Rear', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 1600, min: 2000, sell: 2300, part: 'BP-CR-R001', category: 'Brakes', img: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500' },
    { name: 'Brake Disc Front', make: 'Toyota', model: '110', engine: 'All', cost: 2800, min: 3400, sell: 3900, part: 'BD-110-F001', category: 'Brakes', img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500' },
    { name: 'Brake Shoe Set', make: 'Toyota', model: 'Hiace', engine: 'All', cost: 1800, min: 2200, sell: 2500, part: 'BS-HC-001', category: 'Brakes', img: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500' },
    { name: 'Master Cylinder', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 4500, min: 5400, sell: 6200, part: 'MC-CR-001', category: 'Brakes', img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500' },

    // Clutch & Transmission
    { name: 'Clutch Plate 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 3500, min: 4200, sell: 4800, part: 'CP-5L-001', category: 'Transmission', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500' },
    { name: 'Clutch Cover 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 4200, min: 5000, sell: 5700, part: 'CC-5L-001', category: 'Transmission', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500' },
    { name: 'Release Bearing', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 850, min: 1050, sell: 1250, part: 'RB-CR-001', category: 'Transmission', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },
    { name: 'Gearbox Oil Seal', make: 'Toyota', model: '110', engine: 'All', cost: 320, min: 420, sell: 500, part: 'GOS-110-001', category: 'Transmission', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },

    // Steering Parts
    { name: 'Power Steering Pump', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 8500, min: 10200, sell: 11500, part: 'PSP-CR-001', category: 'Steering', img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500' },
    { name: 'Steering Rack', make: 'Toyota', model: '110', engine: 'All', cost: 15000, min: 18000, sell: 20500, part: 'SR-110-001', category: 'Steering', img: 'https://images.unsplash.com/photo-1632823471265-aaa5e3d7f4e8?w=500' },
    { name: 'Rack End Left', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 980, min: 1200, sell: 1400, part: 'RE-CR-L001', category: 'Steering', img: 'https://images.unsplash.com/photo-1632823471265-aaa5e3d7f4e8?w=500' },
    { name: 'Rack End Right', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 980, min: 1200, sell: 1400, part: 'RE-CR-R001', category: 'Steering', img: 'https://images.unsplash.com/photo-1632823471265-aaa5e3d7f4e8?w=500' },

    // Electrical Parts
    { name: 'Starter Motor 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 6500, min: 7800, sell: 8900, part: 'SM-5L-001', category: 'Electrical', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500' },
    { name: 'Alternator 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 9000, min: 10800, sell: 12300, part: 'AL-5L-001', category: 'Electrical', img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500' },
    { name: 'Ignition Coil', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 2800, min: 3400, sell: 3900, part: 'IC-CR-001', category: 'Electrical', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500' },
    { name: 'Spark Plug Set', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 1200, min: 1500, sell: 1750, part: 'SP-CR-001', category: 'Electrical', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },

    // Cooling System
    { name: 'Water Pump 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 2200, min: 2800, sell: 3200, part: 'WP-5L-001', category: 'Cooling', img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500' },
    { name: 'Radiator', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 8500, min: 10200, sell: 11500, part: 'RD-CR-001', category: 'Cooling', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500' },
    { name: 'Thermostat', make: 'Toyota', model: 'General', engine: 'All', cost: 420, min: 550, sell: 650, part: 'TH-TY-001', category: 'Cooling', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },
    { name: 'Radiator Hose Upper', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 580, min: 720, sell: 850, part: 'RH-5L-U001', category: 'Cooling', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500' },

    // Belts & Hoses
    { name: 'Fan Belt 5L', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 420, min: 550, sell: 650, part: 'FB-5L-001', category: 'Belts', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },
    { name: 'Timing Belt', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 1800, min: 2200, sell: 2500, part: 'TB-CR-001', category: 'Belts', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },
    { name: 'Serpentine Belt', make: 'Toyota', model: '110', engine: 'All', cost: 920, min: 1150, sell: 1350, part: 'SB-110-001', category: 'Belts', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },

    // Gaskets & Seals
    { name: 'Head Gasket Set', make: 'Toyota', model: 'Hiace', engine: '5L', cost: 3200, min: 3900, sell: 4500, part: 'HGS-5L-001', category: 'Gaskets', img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500' },
    { name: 'Oil Pan Gasket', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 280, min: 380, sell: 450, part: 'OPG-CR-001', category: 'Gaskets', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },
    { name: 'Valve Cover Gasket', make: 'Toyota', model: 'Corolla', engine: 'All', cost: 420, min: 550, sell: 650, part: 'VCG-CR-001', category: 'Gaskets', img: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=500' },
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
        category: p.category,
        imageUrl: p.img,
        lowStockThreshold: 5,
      },
    });
    products.push(product);
  }

  console.log('✅ 50 Products created with images');

  // Create inventory for all branches
  for (const product of products) {
    for (const branch of branches) {
      const qty = Math.floor(Math.random() * 30) + 5; // Random stock between 5-35
      await prisma.inventory.create({
        data: {
          productId: product.id,
          branchId: branch.id,
          quantity: qty,
        },
      });
    }
  }

  console.log('✅ Inventory created for all products');

  // Create 50 Customers
  const customerNames = [
    'John Kamau', 'Mary Wanjiku', 'Peter Omondi', 'Grace Achieng', 'David Mwangi',
    'Susan Njeri', 'James Otieno', 'Lucy Wambui', 'Michael Kipchoge', 'Jane Moraa',
    'Patrick Karanja', 'Catherine Nyambura', 'Stephen Odhiambo', 'Anne Wangari', 'Daniel Kimani',
    'Rose Akinyi', 'Joseph Mutua', 'Faith Njoki', 'Charles Onyango', 'Margaret Wairimu',
    'Robert Maina', 'Esther Adhiambo', 'Francis Ndung\'u', 'Alice Wangui', 'George Kibet',
    'Nancy Nekesa', 'Samuel Waweru', 'Ruth Chemutai', 'Thomas Macharia', 'Betty Anyango',
    'Paul Githinji', 'Rebecca Chesang', 'Anthony Obonyo', 'Sarah Gathoni', 'Benjamin Kiptoo',
    'Lydia Awuor', 'Moses Njihia', 'Janet Chepkoech', 'Andrew Njoroge', 'Florence Apiyo',
    'Kenneth Korir', 'Beatrice Muthoni', 'Isaac Owuor', 'Monica Jelagat', 'Emmanuel Munyao',
    'Christine Nasike', 'Simon Njenga', 'Veronica Chelangat', 'Vincent Mboya', 'Elizabeth Wanjiru'
  ];

  const customers = [];
  for (let i = 0; i < 50; i++) {
    const customer = await prisma.customer.create({
      data: {
        name: customerNames[i],
        phone: `+2547${String(10000000 + i).slice(1)}`,
        totalSpent: Math.floor(Math.random() * 50000) + 5000,
        totalDebt: Math.random() > 0.7 ? Math.floor(Math.random() * 5000) : 0,
        lastVisitAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      },
    });
    customers.push(customer);
  }

  console.log('✅ 50 Customers created');

  // Create 50 Sales
  for (let i = 0; i < 50; i++) {
    const branch = branches[Math.floor(Math.random() * branches.length)];
    const manager = users.find(u => u.branchId === branch.id && u.role === 'MANAGER') || users[2];
    const customer = Math.random() > 0.3 ? customers[Math.floor(Math.random() * customers.length)] : null;

    const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items per sale
    const saleItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      const price = parseFloat(product.sellingPrice);
      const itemTotal = price * qty;

      saleItems.push({
        productId: product.id,
        quantity: qty,
        unitPrice: price,
        total: itemTotal,
      });

      subtotal += itemTotal;
    }

    const discount = Math.random() > 0.8 ? Math.floor(Math.random() * 500) : 0;
    const total = subtotal - discount;
    const isCredit = Math.random() > 0.85;

    const sale = await prisma.sale.create({
      data: {
        receiptNumber: `RCP-${Date.now()}-${i}`,
        branchId: branch.id,
        userId: manager.id,
        customerId: customer?.id,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        subtotal,
        discount,
        total,
        isCredit,
        creditStatus: isCredit ? 'PENDING' : undefined,
        isWalkIn: !customer,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
        items: {
          create: saleItems,
        },
        payments: {
          create: isCredit ? [] : [
            {
              method: Math.random() > 0.5 ? 'CASH' : 'MPESA',
              amount: total,
              reference: Math.random() > 0.5 ? `MPESA-${Math.floor(Math.random() * 100000000)}` : null,
            },
          ],
        },
      },
    });
  }

  console.log('✅ 50 Sales created');
  console.log('\n🎉 Seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - 4 Branches`);
  console.log(`   - 6 Users`);
  console.log(`   - 50 Products with images`);
  console.log(`   - 50 Customers`);
  console.log(`   - 50 Sales`);
  console.log(`   - ${products.length * branches.length} Inventory records\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
