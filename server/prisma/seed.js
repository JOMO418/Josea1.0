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

  // Get all created products and users for later use
  const allProducts = await prisma.product.findMany();
  const allUsers = await prisma.user.findMany();

  // Create 30 Customers
  console.log('👥 Creating 30 customers...');
  const customerNames = [
    'John Kamau', 'Mary Wanjiru', 'David Omondi', 'Grace Akinyi', 'Peter Mwangi',
    'Lucy Njeri', 'James Otieno', 'Faith Wangari', 'Daniel Kipchoge', 'Alice Chebet',
    'Michael Mutua', 'Jane Auma', 'Joseph Kariuki', 'Ann Moraa', 'Samuel Wafula',
    'Rose Nduta', 'Patrick Maina', 'Nancy Nekesa', 'Francis Kimani', 'Margaret Adhiambo',
    'Stephen Gitonga', 'Susan Wambui', 'George Okoth', 'Esther Nyambura', 'Anthony Onyango',
    'Catherine Mukami', 'Vincent Koech', 'Beatrice Njoki', 'Robert Wesonga', 'Florence Wanjiku'
  ];

  const customers = [];
  for (let i = 0; i < 30; i++) {
    const customer = await prisma.customer.create({
      data: {
        name: customerNames[i],
        phone: `+25471${String(2000000 + i).padStart(7, '0')}`,
        totalSpent: 0,
        totalDebt: 0,
      },
    });
    customers.push(customer);
  }
  console.log(`✅ Created ${customers.length} customers\n`);

  // Create 300 Suppliers
  console.log('🏪 Creating 300 suppliers...');
  const locations = ['NAIROBI_CBD', 'DUBAI', 'UGANDA', 'OTHER'];
  const nairobiShops = [
    'Muthurwa Auto Parts', 'Kirinyaga Road Motors', 'River Road Spares', 'Luthuli Avenue Auto',
    'Tom Mboya Street Parts', 'Biashara Street Motors', 'Grogan Road Spares', 'Duruma Road Auto',
    'Ronald Ngala Street Parts', 'Latema Road Motors', 'Accra Road Spares', 'Kenyatta Avenue Auto',
    'Moi Avenue Parts', 'Muindi Mbingu Street', 'Haile Selassie Motors', 'Koinange Street Auto'
  ];
  const dubaiShops = [
    'Al Aweer Auto Parts', 'Ras Al Khor Trading', 'Sharjah Auto Market', 'Dubai Auto Zone',
    'Emirates Motor Parts', 'Al Quoz Industrial', 'Deira Auto Trading', 'Bur Dubai Motors'
  ];
  const ugandaShops = [
    'Kampala Auto Spares', 'Wandegeya Motors', 'Ntinda Auto Parts', 'Nasser Road Trading',
    'Nakivubo Motors', 'Kikuubo Auto Market', 'Owino Market Parts', 'Kalerwe Auto Zone'
  ];
  const otherShops = [
    'Mombasa Auto Hub', 'Kisumu Motors Ltd', 'Nakuru Spares', 'Eldoret Auto Parts',
    'Thika Road Motors', 'Machakos Auto Zone', 'Nyeri Parts Center', 'Meru Motor Spares'
  ];

  const contactPersons = [
    'Ahmed Hassan', 'John Mwangi', 'David Ochieng', 'Mohammed Ali', 'Peter Kamau',
    'James Otieno', 'Samuel Kiplagat', 'Joseph Njuguna', 'Anthony Wafula', 'Stephen Mutua',
    'Michael Korir', 'Francis Kimani', 'Patrick Omondi', 'Vincent Cheruiyot', 'Robert Wanjala',
    'George Kariuki', 'Daniel Rotich', 'Thomas Makau', 'Charles Wekesa', 'Paul Maina',
    'Ibrahim Yusuf', 'Hassan Abdallah', 'Juma Rashid', 'Khalid Salim', 'Omar Farah'
  ];

  const specialtiesOptions = [
    ['Engine Parts', 'Transmission'], ['Filters', 'Belts'], ['Suspension', 'Brakes'],
    ['Electrical', 'Cooling'], ['Steering', 'Gaskets'], ['Engine Parts', 'Filters'],
    ['Brakes', 'Suspension'], ['Electrical', 'Belts'], ['Transmission', 'Clutch'],
    ['Cooling', 'Gaskets'], ['Engine Parts', 'Brakes'], ['Filters', 'Suspension']
  ];

  const suppliers = [];
  for (let i = 0; i < 300; i++) {
    let location, branchName;

    // Distribute suppliers: 150 Nairobi, 50 Dubai, 50 Uganda, 50 Other
    if (i < 150) {
      location = 'NAIROBI_CBD';
      branchName = nairobiShops[i % nairobiShops.length] + (i >= nairobiShops.length ? ` Branch ${Math.floor(i / nairobiShops.length)}` : '');
    } else if (i < 200) {
      location = 'DUBAI';
      branchName = dubaiShops[(i - 150) % dubaiShops.length] + (i >= 150 + dubaiShops.length ? ` Shop ${Math.floor((i - 150) / dubaiShops.length)}` : '');
    } else if (i < 250) {
      location = 'UGANDA';
      branchName = ugandaShops[(i - 200) % ugandaShops.length] + (i >= 200 + ugandaShops.length ? ` Branch ${Math.floor((i - 200) / ugandaShops.length)}` : '');
    } else {
      location = 'OTHER';
      branchName = otherShops[(i - 250) % otherShops.length] + (i >= 250 + otherShops.length ? ` Outlet ${Math.floor((i - 250) / otherShops.length)}` : '');
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: branchName,
        location: location,
        branchName: branchName,
        contactPerson: contactPersons[i % contactPersons.length],
        phone: `+25472${String(3000000 + i).padStart(7, '0')}`,
        email: `${branchName.toLowerCase().replace(/\s+/g, '')}${i}@supplier.com`,
        specialties: specialtiesOptions[i % specialtiesOptions.length],
        isActive: true,
      },
    });
    suppliers.push(supplier);

    if ((i + 1) % 50 === 0) {
      console.log(`   ✅ Created ${i + 1}/300 suppliers...`);
    }
  }
  console.log(`✅ All ${suppliers.length} suppliers created\n`);

  // Create 30 Sales
  console.log('💰 Creating 30 sales...');
  const receiptCounter = 1000;

  for (let i = 0; i < 30; i++) {
    const customer = customers[i % customers.length];
    const branch = branches[i % branches.length];
    const user = allUsers.find(u => u.branchId === branch.id) || allUsers[0];

    // Random 2-5 items per sale
    const numItems = Math.floor(Math.random() * 4) + 2;
    const saleItems = [];
    let subtotal = 0;

    // Select random products for this sale
    const selectedProducts = [];
    for (let j = 0; j < numItems; j++) {
      const product = allProducts[Math.floor(Math.random() * allProducts.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 units
      const unitPrice = parseFloat(product.sellingPrice);
      const itemTotal = unitPrice * quantity;

      selectedProducts.push({
        productId: product.id,
        quantity: quantity,
        unitPrice: unitPrice,
        total: itemTotal,
      });

      subtotal += itemTotal;
    }

    // Random discount 0-10%
    const discountPercent = Math.random() < 0.3 ? Math.floor(Math.random() * 10) : 0;
    const discount = (subtotal * discountPercent) / 100;
    const total = subtotal - discount;

    // Determine if credit sale (30% chance)
    const isCredit = Math.random() < 0.3;

    const sale = await prisma.sale.create({
      data: {
        receiptNumber: `RCP-${String(receiptCounter + i).padStart(6, '0')}`,
        branchId: branch.id,
        userId: user.id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        subtotal: subtotal,
        discount: discount,
        total: total,
        isCredit: isCredit,
        creditStatus: isCredit ? 'PENDING' : null,
        isWalkIn: false,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Random date within last 30 days
        items: {
          create: selectedProducts,
        },
        payments: isCredit ? undefined : {
          create: [
            {
              method: Math.random() < 0.6 ? 'MPESA' : 'CASH',
              amount: total,
              reference: Math.random() < 0.6 ? `MPE${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}` : null,
            },
          ],
        },
      },
    });

    // Update customer stats
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalSpent: { increment: isCredit ? 0 : total },
        totalDebt: { increment: isCredit ? total : 0 },
        lastVisitAt: sale.createdAt,
      },
    });

    if ((i + 1) % 10 === 0) {
      console.log(`   ✅ Created ${i + 1}/30 sales...`);
    }
  }
  console.log(`✅ All 30 sales created\n`);

  console.log('🎉 Seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`   🏢 Branches: ${branches.length}`);
  console.log(`   👥 Users: 6`);
  console.log(`   📦 Products: ${productsCreated}`);
  console.log(`   📸 All images using Cloudinary URLs`);
  console.log(`   👨‍💼 Customers: ${customers.length}`);
  console.log(`   🏪 Suppliers: ${suppliers.length}`);
  console.log(`   💰 Sales: 30`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });