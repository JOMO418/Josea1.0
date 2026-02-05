// prisma/seed-production-demo.js
// Production Demo Data Seeding Script
// Populates database with realistic data for demo purposes

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  PRODUCTS: 100,
  CUSTOMERS: 150,
  SALES: 500,
  MONTHS_HISTORY: 3,
  SUPPLIERS: 5,
};

// ============================================
// DATA TEMPLATES
// ============================================

const CAR_MAKES = [
  { make: 'Toyota', models: ['Corolla', 'Camry', 'RAV4', 'Hilux', 'Vitz', 'Fielder'] },
  { make: 'Nissan', models: ['Note', 'X-Trail', 'Serena', 'March', 'Tiida', 'Patrol'] },
  { make: 'Honda', models: ['Fit', 'Civic', 'CRV', 'Accord', 'Vezel', 'Stream'] },
  { make: 'Mazda', models: ['Axela', 'Demio', 'Atenza', 'CX-5', 'Premacy', 'Biante'] },
  { make: 'Subaru', models: ['Impreza', 'Forester', 'Legacy', 'Outback', 'XV', 'WRX'] },
  { make: 'Mercedes', models: ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLC', 'A-Class'] },
  { make: 'BMW', models: ['3 Series', '5 Series', 'X5', 'X3', '7 Series', 'X1'] },
  { make: 'Mitsubishi', models: ['Lancer', 'Outlander', 'Pajero', 'RVR', 'Colt', 'ASX'] },
];

const CATEGORIES = {
  'Engine Parts': ['Piston', 'Gasket Set', 'Timing Belt', 'Water Pump', 'Oil Pump', 'Valve Cover'],
  'Brakes': ['Brake Pads', 'Brake Discs', 'Brake Fluid', 'Brake Caliper', 'Brake Shoes', 'Brake Hose'],
  'Suspension': ['Shock Absorber', 'Strut', 'Control Arm', 'Ball Joint', 'Stabilizer Link', 'Bushing'],
  'Electrical': ['Battery', 'Alternator', 'Starter Motor', 'Spark Plug', 'Ignition Coil', 'Sensor'],
  'Filters': ['Oil Filter', 'Air Filter', 'Fuel Filter', 'Cabin Filter', 'Transmission Filter'],
  'Oils & Fluids': ['Engine Oil', 'Coolant', 'Brake Fluid', 'Transmission Oil', 'Power Steering Fluid'],
  'Body Parts': ['Bumper', 'Side Mirror', 'Headlight', 'Tail Light', 'Fender', 'Hood'],
  'Interior': ['Floor Mat', 'Seat Cover', 'Steering Wheel Cover', 'Dashboard Cover'],
};

const KENYAN_FIRST_NAMES = [
  'John', 'Mary', 'James', 'Jane', 'Peter', 'Grace', 'David', 'Sarah', 'Daniel', 'Ruth',
  'Joseph', 'Elizabeth', 'Samuel', 'Lucy', 'Michael', 'Ann', 'Paul', 'Rose', 'Stephen', 'Faith',
  'Patrick', 'Joyce', 'Robert', 'Catherine', 'Charles', 'Margaret', 'George', 'Alice', 'Thomas', 'Nancy',
];

const KENYAN_LAST_NAMES = [
  'Kamau', 'Wanjiku', 'Mwangi', 'Njeri', 'Otieno', 'Akinyi', 'Ochieng', 'Adhiambo',
  'Kipchoge', 'Chebet', 'Kariuki', 'Wambui', 'Mutua', 'Muthoni', 'Omondi', 'Awino',
  'Kipruto', 'Jepkoech', 'Kimani', 'Nyambura', 'Owino', 'Auma', 'Korir', 'Chepkemoi',
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[randomInt(0, array.length - 1)];
}

function generateKenyanPhone() {
  const prefixes = ['0712', '0722', '0723', '0733', '0734', '0745', '0746', '0757', '0758'];
  const prefix = randomItem(prefixes);
  const suffix = String(randomInt(100000, 999999));
  return prefix + suffix;
}

function generateReceiptNumber(date, sequence) {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const seqStr = String(sequence).padStart(5, '0');
  return `SALE-${dateStr}-${seqStr}`;
}

function generateMpesaCode() {
  const prefixes = ['QAB', 'QAC', 'QAD', 'QAE'];
  const prefix = randomItem(prefixes);
  const number = randomInt(100000, 999999);
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return prefix + number + suffix;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function createBranches() {
  console.log('🏢 Creating branches...');

  const branches = await prisma.$transaction([
    prisma.branch.create({
      data: {
        name: 'Main Branch',
        location: 'Nairobi Main Office',
        phone: '0712345001',
        isHeadquarters: true,
        isActive: true,
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Kisumu Branch',
        location: 'Kisumu Office',
        phone: '0712345002',
        isHeadquarters: false,
        isActive: true,
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Kiserian Branch',
        location: 'Kiserian Office',
        phone: '0712345003',
        isHeadquarters: false,
        isActive: true,
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Kakamega Branch',
        location: 'Kakamega Office',
        phone: '0712345004',
        isHeadquarters: false,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${branches.length} branches`);
  return branches;
}

async function createUsers(branches) {
  console.log('👥 Creating users...');

  const hashedPassword = await bcrypt.hash('password123', 10);
  const users = [];

  // Create admin (can access all branches)
  users.push(
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@pram.co.ke',
        phone: '0712345000',
        password: hashedPassword,
        role: 'ADMIN',
        branchId: branches[0].id, // Main branch
        isActive: true,
      },
    })
  );

  // Create managers for each branch
  const branchLogins = [
    { name: 'Main Branch Manager', email: 'main@pram.co.ke', branch: 0 },
    { name: 'Kisumu Branch Manager', email: 'kisumu@pram.co.ke', branch: 1 },
    { name: 'Kiserian Branch Manager', email: 'kiserian@pram.co.ke', branch: 2 },
    { name: 'Kakamega Branch Manager', email: 'kakamega@pram.co.ke', branch: 3 },
  ];

  for (const login of branchLogins) {
    users.push(
      await prisma.user.create({
        data: {
          name: login.name,
          email: login.email,
          phone: `071234500${login.branch + 1}`,
          password: hashedPassword,
          role: 'MANAGER',
          branchId: branches[login.branch].id,
          isActive: true,
        },
      })
    );
  }

  console.log(`✅ Created ${users.length} users (1 admin, ${users.length - 1} branch managers)`);
  console.log('\n🔐 LOGIN CREDENTIALS (all use password: password123):');
  console.log('  Admin Dashboard: admin@pram.co.ke');
  console.log('  Main Branch: main@pram.co.ke');
  console.log('  Kisumu Branch: kisumu@pram.co.ke');
  console.log('  Kiserian Branch: kiserian@pram.co.ke');
  console.log('  Kakamega Branch: kakamega@pram.co.ke');
  return users;
}

async function createSuppliers() {
  console.log('🏭 Creating suppliers...');

  const suppliersData = [
    {
      name: 'Nairobi Auto Parts Ltd',
      location: 'NAIROBI_CBD',
      branchName: 'River Road Shop',
      contactPerson: 'James Kariuki',
      phone: '0712300001',
      email: 'info@nairobiautopats.co.ke',
      specialties: ['Engine Parts', 'Filters', 'Oils & Fluids'],
    },
    {
      name: 'Mombasa Spares Hub',
      location: 'NAIROBI_CBD',
      branchName: 'Luthuli Avenue',
      contactPerson: 'Sarah Njeri',
      phone: '0712300002',
      email: 'sales@mombasaspares.co.ke',
      specialties: ['Brakes', 'Suspension', 'Electrical'],
    },
    {
      name: 'Dubai Auto Imports',
      location: 'DUBAI',
      branchName: 'Deira District',
      contactPerson: 'Ahmed Hassan',
      phone: '+971501234567',
      email: 'dubai@autoimports.ae',
      specialties: ['Body Parts', 'Electrical', 'Interior'],
    },
    {
      name: 'Uganda Parts Dealers',
      location: 'UGANDA',
      branchName: 'Kampala Industrial Area',
      contactPerson: 'Moses Okello',
      phone: '+256700123456',
      email: 'moses@ugandaparts.ug',
      specialties: ['Suspension', 'Brakes', 'Engine Parts'],
    },
    {
      name: 'Premium Parts Kenya',
      location: 'NAIROBI_CBD',
      branchName: 'Kirinyaga Road',
      contactPerson: 'Lucy Wambui',
      phone: '0712300005',
      email: 'premium@premiumparts.co.ke',
      specialties: ['Filters', 'Oils & Fluids', 'Electrical'],
    },
  ];

  const suppliers = await prisma.supplier.createMany({
    data: suppliersData,
  });

  const createdSuppliers = await prisma.supplier.findMany();
  console.log(`✅ Created ${createdSuppliers.length} suppliers`);
  return createdSuppliers;
}

async function createProducts(suppliers) {
  console.log('📦 Creating 100 products...');

  const products = [];
  let productCount = 0;

  for (const [category, partTypes] of Object.entries(CATEGORIES)) {
    const productsPerCategory = Math.ceil(CONFIG.PRODUCTS / Object.keys(CATEGORIES).length);

    for (let i = 0; i < productsPerCategory && productCount < CONFIG.PRODUCTS; i++) {
      const carData = randomItem(CAR_MAKES);
      const model = randomItem(carData.models);
      const partType = randomItem(partTypes);

      // Some products are universal (no specific car)
      const isUniversal = Math.random() < 0.15;

      const costPrice = randomInt(200, 5000);
      const minPrice = Math.round(costPrice * 1.2);
      const sellingPrice = Math.round(costPrice * 1.4);

      const product = {
        name: isUniversal ? partType : `${carData.make} ${model} ${partType}`,
        partNumber: `${carData.make.substring(0, 3).toUpperCase()}-${category.substring(0, 2).toUpperCase()}-${String(productCount).padStart(3, '0')}`,
        category,
        vehicleMake: isUniversal ? null : carData.make,
        vehicleModel: isUniversal ? null : model,
        vehicleEngine: isUniversal ? null : `${randomItem(['1.5L', '1.8L', '2.0L', '2.5L', '3.0L', '3.5L'])}`,
        costPrice,
        minPrice,
        sellingPrice,
        lowStockThreshold: randomInt(3, 10),
        description: isUniversal
          ? `Universal ${partType.toLowerCase()} suitable for most vehicles`
          : `Genuine ${partType.toLowerCase()} for ${carData.make} ${model}`,
        isActive: true,
      };

      products.push(product);
      productCount++;
    }
  }

  await prisma.product.createMany({ data: products });
  const createdProducts = await prisma.product.findMany();

  // Link products to suppliers
  console.log('🔗 Linking products to suppliers...');
  const supplierProducts = [];

  for (const product of createdProducts) {
    const numSuppliers = randomInt(1, 3);
    const selectedSuppliers = [];

    for (let i = 0; i < numSuppliers; i++) {
      const supplier = randomItem(suppliers.filter(s => !selectedSuppliers.includes(s.id)));
      selectedSuppliers.push(supplier.id);

      supplierProducts.push({
        supplierId: supplier.id,
        productId: product.id,
        wholesalePrice: Math.round(product.costPrice * 0.9),
        currency: supplier.location === 'DUBAI' ? 'USD' : supplier.location === 'UGANDA' ? 'UGX' : 'KES',
        isAvailable: true,
      });
    }
  }

  await prisma.supplierProduct.createMany({ data: supplierProducts });

  console.log(`✅ Created ${createdProducts.length} products with ${supplierProducts.length} supplier relationships`);
  return createdProducts;
}

async function createInventory(products, branches) {
  console.log('📊 Distributing inventory across branches...');

  const inventory = [];

  // Main Branch (HQ): All 100 products, highest quantities
  for (const product of products) {
    inventory.push({
      productId: product.id,
      branchId: branches[0].id,
      quantity: randomInt(15, 50),
      sellingPrice: product.sellingPrice,
      lowStockThreshold: product.lowStockThreshold,
      isActive: true,
    });
  }

  // Kisumu: 75% of products, medium-high quantities
  const kisumuProducts = products.slice(0, Math.floor(products.length * 0.75));
  for (const product of kisumuProducts) {
    inventory.push({
      productId: product.id,
      branchId: branches[1].id,
      quantity: randomInt(8, 30),
      sellingPrice: product.sellingPrice,
      lowStockThreshold: product.lowStockThreshold,
      isActive: true,
    });
  }

  // Kiserian: 60% of products, medium quantities
  const kiserianProducts = products.slice(0, Math.floor(products.length * 0.6));
  for (const product of kiserianProducts) {
    inventory.push({
      productId: product.id,
      branchId: branches[2].id,
      quantity: randomInt(5, 25),
      sellingPrice: product.sellingPrice,
      lowStockThreshold: product.lowStockThreshold,
      isActive: true,
    });
  }

  // Kakamega: 50% of products, lower quantities
  const kakamegaProducts = products.slice(0, Math.floor(products.length * 0.5));
  for (const product of kakamegaProducts) {
    inventory.push({
      productId: product.id,
      branchId: branches[3].id,
      quantity: randomInt(3, 20),
      sellingPrice: product.sellingPrice,
      lowStockThreshold: product.lowStockThreshold,
      isActive: true,
    });
  }

  await prisma.inventory.createMany({ data: inventory });
  console.log(`✅ Created ${inventory.length} inventory records across ${branches.length} branches`);
}

async function createCustomers() {
  console.log('👤 Creating 150 customers...');

  const customers = [];
  const usedPhones = new Set();

  for (let i = 0; i < CONFIG.CUSTOMERS; i++) {
    let phone = generateKenyanPhone();
    while (usedPhones.has(phone)) {
      phone = generateKenyanPhone();
    }
    usedPhones.add(phone);

    customers.push({
      name: `${randomItem(KENYAN_FIRST_NAMES)} ${randomItem(KENYAN_LAST_NAMES)}`,
      phone,
      totalSpent: 0,
      totalDebt: 0,
      lastVisitAt: randomDate(
        new Date(Date.now() - CONFIG.MONTHS_HISTORY * 30 * 24 * 60 * 60 * 1000),
        new Date()
      ),
    });
  }

  await prisma.customer.createMany({ data: customers });
  const createdCustomers = await prisma.customer.findMany();
  console.log(`✅ Created ${createdCustomers.length} customers`);
  return createdCustomers;
}

async function createSalesHistory(products, customers, branches, users) {
  console.log('💰 Generating 500 sales transactions...');

  const now = new Date();
  const startDate = new Date(now.getTime() - CONFIG.MONTHS_HISTORY * 30 * 24 * 60 * 60 * 1000);

  let receiptCounter = 1;

  for (let i = 0; i < CONFIG.SALES; i++) {
    const saleDate = randomDate(startDate, now);
    const branch = randomItem(branches);
    const user = randomItem(users.filter(u => u.branchId === branch.id || u.role === 'OWNER'));

    // 70% of sales have customer, 30% walk-in
    const hasCustomer = Math.random() < 0.7;
    const customer = hasCustomer ? randomItem(customers) : null;

    // Determine payment method
    const paymentType = Math.random();
    const isCashOnly = paymentType < 0.6;
    const isMpesaOnly = paymentType >= 0.6 && paymentType < 0.85;
    const isMixed = paymentType >= 0.85 && paymentType < 0.95;
    const isCredit = paymentType >= 0.95;

    // Get available products for this branch
    const branchInventory = await prisma.inventory.findMany({
      where: { branchId: branch.id, quantity: { gt: 0 } },
      include: { product: true },
    });

    if (branchInventory.length === 0) continue;

    // Create sale with 1-4 items
    const numItems = randomInt(1, 4);
    const saleItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const invItem = randomItem(branchInventory);
      const quantity = randomInt(1, 3);
      const unitPrice = invItem.product.sellingPrice;
      const total = unitPrice * quantity;

      saleItems.push({
        productId: invItem.product.id,
        quantity,
        unitPrice,
        total,
      });

      subtotal += total;
    }

    const discount = Math.random() < 0.2 ? randomInt(50, 500) : 0;
    const total = subtotal - discount;

    // Create sale
    const sale = await prisma.sale.create({
      data: {
        receiptNumber: generateReceiptNumber(saleDate, receiptCounter++),
        branchId: branch.id,
        userId: user.id,
        customerId: customer?.id,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        subtotal,
        discount,
        total,
        isCredit,
        creditStatus: isCredit ? 'PENDING' : null,
        isWalkIn: !hasCustomer,
        createdAt: saleDate,
        items: {
          create: saleItems,
        },
      },
    });

    // Create payments
    const payments = [];

    if (isCashOnly) {
      payments.push({
        saleId: sale.id,
        method: 'CASH',
        amount: total,
        createdAt: saleDate,
      });
    } else if (isMpesaOnly) {
      payments.push({
        saleId: sale.id,
        method: 'MPESA',
        amount: total,
        reference: generateMpesaCode(),
        createdAt: saleDate,
      });
    } else if (isMixed) {
      const cashAmount = Math.round(total * 0.5);
      const mpesaAmount = total - cashAmount;

      payments.push(
        {
          saleId: sale.id,
          method: 'CASH',
          amount: cashAmount,
          createdAt: saleDate,
        },
        {
          saleId: sale.id,
          method: 'MPESA',
          amount: mpesaAmount,
          reference: generateMpesaCode(),
          createdAt: saleDate,
        }
      );
    } else if (isCredit) {
      payments.push({
        saleId: sale.id,
        method: 'CREDIT',
        amount: total,
        createdAt: saleDate,
      });
    }

    await prisma.salePayment.createMany({ data: payments });

    // Update customer totals
    if (customer) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: { increment: total },
          totalDebt: isCredit ? { increment: total } : undefined,
          lastVisitAt: saleDate,
        },
      });
    }

    // Update inventory quantities
    for (const item of saleItems) {
      await prisma.inventory.updateMany({
        where: {
          productId: item.productId,
          branchId: branch.id,
        },
        data: {
          quantity: { decrement: item.quantity },
        },
      });
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  Progress: ${i + 1}/${CONFIG.SALES} sales created...`);
    }
  }

  console.log(`✅ Created ${CONFIG.SALES} sales transactions`);
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('\n🌱 Starting production demo data seeding...\n');
  console.log('⚠️  This will DELETE all existing data!\n');

  // Clean database
  console.log('🗑️  Cleaning existing data...');
  await prisma.creditPayment.deleteMany();
  await prisma.salePayment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  console.log('✅ Database cleaned\n');

  // Create data
  const branches = await createBranches();
  const users = await createUsers(branches);
  const suppliers = await createSuppliers();
  const products = await createProducts(suppliers);
  await createInventory(products, branches);
  const customers = await createCustomers();
  await createSalesHistory(products, customers, branches, users);

  // Print summary
  const summary = {
    branches: await prisma.branch.count(),
    users: await prisma.user.count(),
    suppliers: await prisma.supplier.count(),
    products: await prisma.product.count(),
    inventory: await prisma.inventory.count(),
    customers: await prisma.customer.count(),
    sales: await prisma.sale.count(),
    saleItems: await prisma.saleItem.count(),
  };

  console.log('\n' + '='.repeat(50));
  console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(50));
  console.log('\n📊 DATABASE SUMMARY:');
  console.log(`  • Branches: ${summary.branches}`);
  console.log(`  • Users: ${summary.users}`);
  console.log(`  • Suppliers: ${summary.suppliers}`);
  console.log(`  • Products: ${summary.products}`);
  console.log(`  • Inventory Records: ${summary.inventory}`);
  console.log(`  • Customers: ${summary.customers}`);
  console.log(`  • Sales: ${summary.sales}`);
  console.log(`  • Sale Items: ${summary.saleItems}`);
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('  Email: owner@pramautospares.com');
  console.log('  Password: password123');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
