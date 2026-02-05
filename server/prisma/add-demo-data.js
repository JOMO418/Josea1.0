// prisma/add-demo-data.js
// ADD demo data to existing database WITHOUT deleting anything
// Safe to run - will only ADD, never DELETE

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  ADDITIONAL_PRODUCTS: 90, // Add 90 more (total will be 100)
  CUSTOMERS: 150,
  SALES: 500,
  MONTHS_HISTORY: 3,
  SUPPLIERS: 5,
};

// ============================================
// DATA TEMPLATES
// ============================================

// Your actual business focuses on Toyota and Nissan
const CAR_MAKES = [
  {
    make: 'Toyota',
    models: ['Hiace', 'Corolla', 'Fielder', 'Vitz', 'Probox', 'Succeed', 'Noah', 'Voxy'],
    engines: ['5L', '7L', '3L', '1KZ', '2L', '1TR', '2TR'] // Diesel engines
  },
  {
    make: 'Nissan',
    models: ['Caravan', 'Matatu', 'Note', 'March', 'Tiida', 'AD Van', 'Wingroad'],
    engines: ['TD27', 'QD32', 'ZD30', 'YD25', 'CR12', 'HR15']
  },
];

// Your actual product categories - practical parts
const CATEGORIES = {
  'Suspension': [
    'Shock Absorber Front',
    'Shock Absorber Rear',
    'Tie Rod End',
    'Ball Joint Lower',
    'Ball Joint Upper',
    'Control Arm Bushing',
    'Stabilizer Link',
    'Center Link',
    'Idler Arm'
  ],
  'Engine Parts': [
    'Piston Ring Set',
    'Main Bearing',
    'Con Rod Bearing',
    'Cylinder Head Gasket',
    'Valve Cover Gasket',
    'Oil Seal Camshaft',
    'Oil Seal Crankshaft',
    'Timing Belt',
    'Water Pump',
    'Thermostat',
    'Injector Nozzle',
    'Fuel Pump'
  ],
  'Lubricants': [
    'Engine Oil 15W40 (4L)',
    'Engine Oil 10W30 (4L)',
    'Engine Oil 20W50 (4L)',
    'Gear Oil 90 (1L)',
    'Hydraulic Oil (1L)',
    'Coolant (1L)',
    'Brake Fluid DOT 3',
    'Grease (500g)'
  ],
  'Bearings': [
    'Wheel Bearing Front',
    'Wheel Bearing Rear',
    'Clutch Release Bearing',
    'Pilot Bearing',
    'Propeller Shaft Bearing',
    'Carrier Bearing'
  ],
  'Filters': [
    'Oil Filter',
    'Fuel Filter',
    'Air Filter',
    'Diesel Filter'
  ],
  'Brake Parts': [
    'Brake Pad Front',
    'Brake Pad Rear',
    'Brake Shoe Set',
    'Brake Master Cylinder',
    'Wheel Cylinder',
    'Brake Hose'
  ]
};

const KENYAN_FIRST_NAMES = [
  'John', 'Mary', 'James', 'Jane', 'Peter', 'Grace', 'David', 'Sarah', 'Daniel', 'Ruth',
  'Joseph', 'Elizabeth', 'Samuel', 'Lucy', 'Michael', 'Ann', 'Paul', 'Rose', 'Stephen', 'Faith',
];

const KENYAN_LAST_NAMES = [
  'Kamau', 'Wanjiku', 'Mwangi', 'Njeri', 'Otieno', 'Akinyi', 'Ochieng', 'Adhiambo',
  'Kipchoge', 'Chebet', 'Kariuki', 'Wambui', 'Mutua', 'Muthoni', 'Omondi', 'Awino',
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
// ADD FUNCTIONS
// ============================================

async function addSuppliers() {
  console.log('🏭 Adding suppliers...');

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

  await prisma.supplier.createMany({ data: suppliersData });
  const suppliers = await prisma.supplier.findMany();
  console.log(`✅ Added ${suppliers.length} suppliers`);
  return suppliers;
}

async function addProducts(suppliers) {
  console.log(`📦 Adding ${CONFIG.ADDITIONAL_PRODUCTS} new products...`);

  const existingCount = await prisma.product.count();
  console.log(`   Current products: ${existingCount}`);

  const products = [];
  let productCount = existingCount;

  for (const [category, partTypes] of Object.entries(CATEGORIES)) {
    const productsPerCategory = Math.ceil(CONFIG.ADDITIONAL_PRODUCTS / Object.keys(CATEGORIES).length);

    for (let i = 0; i < productsPerCategory && products.length < CONFIG.ADDITIONAL_PRODUCTS; i++) {
      const carData = randomItem(CAR_MAKES);
      const model = randomItem(carData.models);
      const engine = randomItem(carData.engines);
      const partType = randomItem(partTypes);

      // Lubricants are universal, other parts are vehicle-specific
      const isUniversal = category === 'Lubricants';

      // Some parts are Ex-Japan (used imports)
      const isExJapan = !isUniversal && Math.random() < 0.3;

      // Realistic pricing based on part type
      let costPrice;
      if (category === 'Lubricants') {
        costPrice = randomInt(800, 2000);
      } else if (category === 'Engine Parts') {
        costPrice = randomInt(500, 8000);
      } else if (category === 'Suspension') {
        costPrice = randomInt(800, 4000);
      } else if (category === 'Bearings') {
        costPrice = randomInt(400, 3000);
      } else if (category === 'Filters') {
        costPrice = randomInt(200, 800);
      } else {
        costPrice = randomInt(500, 3500);
      }

      const minPrice = Math.round(costPrice * 1.25);
      const sellingPrice = Math.round(costPrice * 1.45);

      // Build product name
      let productName;
      if (isUniversal) {
        productName = partType;
      } else if (isExJapan) {
        productName = `${carData.make} ${model} ${partType} [Ex-Japan]`;
      } else {
        productName = `${carData.make} ${model} ${partType}`;
      }

      const product = {
        name: productName,
        partNumber: `${carData.make.substring(0, 3).toUpperCase()}-${category.substring(0, 2).toUpperCase()}-${String(productCount).padStart(3, '0')}`,
        category,
        vehicleMake: isUniversal ? null : carData.make,
        vehicleModel: isUniversal ? null : model,
        vehicleEngine: isUniversal ? null : engine,
        costPrice,
        minPrice,
        sellingPrice,
        lowStockThreshold: category === 'Lubricants' ? randomInt(8, 15) : randomInt(3, 8),
        description: isUniversal
          ? `${partType} - suitable for most vehicles`
          : isExJapan
            ? `Ex-Japan ${partType.toLowerCase()} for ${carData.make} ${model} ${engine} engine`
            : `${partType} for ${carData.make} ${model} ${engine} engine`,
        isActive: true,
      };

      products.push(product);
      productCount++;
    }
  }

  await prisma.product.createMany({ data: products });
  const allProducts = await prisma.product.findMany();

  // Link new products to suppliers
  console.log('🔗 Linking products to suppliers...');
  const newProducts = allProducts.slice(existingCount);
  const supplierProducts = [];

  for (const product of newProducts) {
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

  console.log(`✅ Added ${newProducts.length} products (Total: ${allProducts.length})`);
  return allProducts;
}

async function addInventory(products, branches) {
  console.log('📊 Adding inventory for new products...');

  const existingInventory = await prisma.inventory.findMany();
  const existingProductIds = new Set(existingInventory.map(inv => inv.productId));

  const newProducts = products.filter(p => !existingProductIds.has(p.id));

  const inventory = [];

  // Main Branch: All new products, higher quantities
  for (const product of newProducts) {
    inventory.push({
      productId: product.id,
      branchId: branches[0].id,
      quantity: randomInt(15, 50),
      sellingPrice: product.sellingPrice,
      lowStockThreshold: product.lowStockThreshold,
      isActive: true,
    });
  }

  // Kisumu: 75% of new products
  const kisumuProducts = newProducts.slice(0, Math.floor(newProducts.length * 0.75));
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

  // Kiserian: 60% of new products
  const kiserianProducts = newProducts.slice(0, Math.floor(newProducts.length * 0.6));
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

  // Kakamega: 50% of new products
  const kakamegaProducts = newProducts.slice(0, Math.floor(newProducts.length * 0.5));
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
  console.log(`✅ Added ${inventory.length} inventory records`);
}

async function addCustomers() {
  console.log(`👤 Adding ${CONFIG.CUSTOMERS} customers...`);

  const customers = [];
  const usedPhones = new Set();

  // Get existing phones to avoid duplicates
  const existingCustomers = await prisma.customer.findMany({ select: { phone: true } });
  existingCustomers.forEach(c => usedPhones.add(c.phone));

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
  const allCustomers = await prisma.customer.findMany();
  console.log(`✅ Added ${customers.length} customers (Total: ${allCustomers.length})`);
  return allCustomers;
}

async function addSalesHistory(products, customers, branches, users) {
  console.log(`💰 Generating ${CONFIG.SALES} sales transactions...`);

  const now = new Date();
  const startDate = new Date(now.getTime() - CONFIG.MONTHS_HISTORY * 30 * 24 * 60 * 60 * 1000);

  // Get highest receipt number from all existing sales
  const allSales = await prisma.sale.findMany({
    select: { receiptNumber: true },
    orderBy: { receiptNumber: 'desc' },
  });

  let receiptCounter = 1;
  if (allSales.length > 0) {
    // Extract the highest sequence number from all receipts
    const maxSequence = Math.max(
      ...allSales.map(s => {
        const parts = s.receiptNumber.split('-');
        return parseInt(parts[2]) || 0;
      })
    );
    receiptCounter = maxSequence + 1;
  }

  console.log(`  Starting from receipt number: ${receiptCounter}`);

  for (let i = 0; i < CONFIG.SALES; i++) {
    const saleDate = randomDate(startDate, now);
    const branch = randomItem(branches);
    const user = randomItem(users.filter(u => u.branchId === branch.id || u.role === 'OWNER' || u.role === 'ADMIN'));

    const hasCustomer = Math.random() < 0.7;
    const customer = hasCustomer ? randomItem(customers) : null;

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

  console.log(`✅ Added ${CONFIG.SALES} sales transactions`);
}

// ============================================
// MAIN FUNCTION
// ============================================

async function main() {
  console.log('\n🌱 Adding demo data to existing database...\n');
  console.log('⚠️  This will NOT delete any existing data!\n');

  // Get existing data
  const branches = await prisma.branch.findMany();
  const users = await prisma.user.findMany();

  console.log('📊 Current database status:');
  console.log(`  • Branches: ${branches.length}`);
  console.log(`  • Users: ${users.length}`);
  console.log(`  • Products: ${await prisma.product.count()}`);
  console.log(`  • Customers: ${await prisma.customer.count()}`);
  console.log(`  • Sales: ${await prisma.sale.count()}\n`);

  // Add new data
  const suppliers = await addSuppliers();
  const products = await addProducts(suppliers);
  await addInventory(products, branches);
  const customers = await addCustomers();
  await addSalesHistory(products, customers, branches, users);

  // Print summary
  const summary = {
    branches: await prisma.branch.count(),
    users: await prisma.user.count(),
    suppliers: await prisma.supplier.count(),
    products: await prisma.product.count(),
    inventory: await prisma.inventory.count(),
    customers: await prisma.customer.count(),
    sales: await prisma.sale.count(),
  };

  console.log('\n' + '='.repeat(50));
  console.log('✅ DEMO DATA ADDED SUCCESSFULLY!');
  console.log('='.repeat(50));
  console.log('\n📊 FINAL DATABASE SUMMARY:');
  console.log(`  • Branches: ${summary.branches}`);
  console.log(`  • Users: ${summary.users}`);
  console.log(`  • Suppliers: ${summary.suppliers}`);
  console.log(`  • Products: ${summary.products}`);
  console.log(`  • Inventory Records: ${summary.inventory}`);
  console.log(`  • Customers: ${summary.customers}`);
  console.log(`  • Sales: ${summary.sales}`);
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Adding demo data failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
