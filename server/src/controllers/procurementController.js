// ============================================
// PROCUREMENT CONTROLLER
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ===== HELPER FUNCTIONS =====

// Generate unique order number
const generateOrderNumber = async () => {
  const today = new Date();
  const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

  const lastOrder = await prisma.procurementOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  });

  const sequence = lastOrder
    ? parseInt(lastOrder.orderNumber.split('-').pop()) + 1
    : 1;

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

// Map location enum to display name
const locationDisplayMap = {
  'NAIROBI_CBD': 'Nairobi CBD',
  'DUBAI': 'Dubai',
  'UGANDA': 'Uganda',
  'OTHER': 'Other',
};

const locationEnumMap = {
  'Nairobi CBD': 'NAIROBI_CBD',
  'Dubai': 'DUBAI',
  'Uganda': 'UGANDA',
  'Other': 'OTHER',
};

// Map status enum to display name
const statusDisplayMap = {
  'PENDING': 'Pending',
  'IN_PROGRESS': 'In Progress',
  'COMPLETED': 'Completed',
  'CANCELLED': 'Cancelled',
};

const paymentStatusDisplayMap = {
  'UNPAID': 'Unpaid',
  'PARTIAL': 'Partial',
  'PAID': 'Paid',
};

const priorityDisplayMap = {
  'NORMAL': 'Normal',
  'URGENT': 'Urgent',
};

const priorityEnumMap = {
  'Normal': 'NORMAL',
  'Urgent': 'URGENT',
};

const paymentMethodDisplayMap = {
  'CASH': 'Cash',
  'MPESA': 'M-Pesa',
  'DENI': 'Bank Transfer',
  'CREDIT': 'Credit',
};

const paymentMethodEnumMap = {
  'Cash': 'CASH',
  'M-Pesa': 'MPESA',
  'Bank Transfer': 'DENI',
  'Credit': 'CREDIT',
};

// Format supplier for response
const formatSupplier = (supplier) => ({
  id: supplier.id,
  name: supplier.name,
  location: locationDisplayMap[supplier.location] || supplier.location,
  branch_name: supplier.branchName,
  contact_person: supplier.contactPerson,
  phone: supplier.phone,
  email: supplier.email,
  specialties: supplier.specialties || [],
  notes: supplier.notes,
  is_active: supplier.isActive,
  created_at: supplier.createdAt,
  updated_at: supplier.updatedAt,
  product_count: supplier._count?.supplierProducts || 0,
});

// Format supplier product for response
const formatSupplierProduct = (sp) => {
  const wholesalePrice = parseFloat(sp.wholesalePrice);
  const sellingPrice = sp.product?.sellingPrice ? parseFloat(sp.product.sellingPrice) : null;

  // Calculate margin: (Selling - Wholesale) / Selling * 100
  let marginPercent = null;
  if (sellingPrice && sellingPrice > 0) {
    marginPercent = ((sellingPrice - wholesalePrice) / sellingPrice) * 100;
  }

  return {
    id: sp.id,
    supplier_id: sp.supplierId,
    product_id: sp.productId,
    wholesale_price: wholesalePrice,
    selling_price: sellingPrice,
    margin_percent: marginPercent !== null ? Math.round(marginPercent * 10) / 10 : null,
    currency: sp.currency,
    is_available: sp.isAvailable,
    notes: sp.notes,
    last_updated: sp.lastUpdated,
    created_at: sp.createdAt,
    supplier: sp.supplier ? formatSupplier(sp.supplier) : null,
    product: sp.product ? {
      id: sp.product.id,
      name: sp.product.name,
      category: sp.product.category,
      part_number: sp.product.partNumber,
      selling_price: sellingPrice,
    } : null,
  };
};

// Format procurement order for response
const formatOrder = (order) => ({
  id: order.id,
  order_number: order.orderNumber,
  status: statusDisplayMap[order.status] || order.status,
  payment_status: paymentStatusDisplayMap[order.paymentStatus] || order.paymentStatus,
  priority: priorityDisplayMap[order.priority] || order.priority || 'Normal',
  assigned_to: order.assignedToId,
  assigned_worker: order.assignedTo ? {
    id: order.assignedTo.id,
    name: order.assignedTo.name,
    email: order.assignedTo.email,
  } : null,
  total_amount: parseFloat(order.totalAmount),
  route_order: order.routeOrder,
  notes: order.notes,
  created_by: order.createdById,
  created_at: order.createdAt,
  updated_at: order.updatedAt,
  items: order.items?.map(formatOrderItem) || [],
  items_count: order._count?.items || order.items?.length || 0,
  supplier_payments: order.supplierPayments?.map(formatSupplierPayment) || [],
  // Group items by supplier for UI convenience
  items_by_supplier: groupItemsBySupplier(order.items || []),
});

// Format order item for response
const formatOrderItem = (item) => ({
  id: item.id,
  procurement_order_id: item.procurementOrderId,
  product_id: item.productId,
  supplier_id: item.supplierId,
  quantity: item.quantity,
  unit_price: parseFloat(item.unitPrice),
  expected_price: parseFloat(item.expectedPrice || item.unitPrice),
  actual_price: item.actualPrice ? parseFloat(item.actualPrice) : null,
  subtotal: parseFloat(item.subtotal),
  is_received: item.isReceived,
  is_purchased: item.isPurchased || false,
  purchased_at: item.purchasedAt,
  worker_notes: item.workerNotes,
  alternative_supplier_id: item.alternativeSupplierId,
  notes: item.notes,
  product: item.product ? {
    id: item.product.id,
    name: item.product.name,
    category: item.product.category,
    part_number: item.product.partNumber,
  } : null,
  supplier: item.supplier ? {
    id: item.supplier.id,
    name: item.supplier.name,
    location: locationDisplayMap[item.supplier.location],
    branch_name: item.supplier.branchName,
  } : null,
  alternative_supplier: item.alternativeSupplier ? {
    id: item.alternativeSupplier.id,
    name: item.alternativeSupplier.name,
    location: locationDisplayMap[item.alternativeSupplier.location],
  } : null,
});

// Format supplier payment for response
const formatSupplierPayment = (payment) => ({
  id: payment.id,
  procurement_order_id: payment.procurementOrderId,
  supplier_id: payment.supplierId,
  expected_amount: parseFloat(payment.expectedAmount),
  actual_amount: payment.actualAmount ? parseFloat(payment.actualAmount) : null,
  payment_status: paymentStatusDisplayMap[payment.paymentStatus] || payment.paymentStatus,
  payment_method: payment.paymentMethod ? paymentMethodDisplayMap[payment.paymentMethod] : null,
  paid_at: payment.paidAt,
  receipt_image_url: payment.receiptImageUrl,
  notes: payment.notes,
  created_at: payment.createdAt,
  updated_at: payment.updatedAt,
  supplier: payment.supplier ? formatSupplier(payment.supplier) : null,
  order: payment.procurementOrder ? {
    id: payment.procurementOrder.id,
    order_number: payment.procurementOrder.orderNumber,
  } : null,
});

// Group items by supplier for supplier-centric view
const groupItemsBySupplier = (items) => {
  const grouped = {};
  items.forEach(item => {
    const supplierId = item.supplierId;
    if (!grouped[supplierId]) {
      grouped[supplierId] = {
        supplier: item.supplier ? {
          id: item.supplier.id,
          name: item.supplier.name,
          location: locationDisplayMap[item.supplier.location],
          branch_name: item.supplier.branchName,
          phone: item.supplier.phone,
        } : { id: supplierId },
        items: [],
        expected_subtotal: 0,
        actual_subtotal: 0,
        items_purchased: 0,
        items_total: 0,
      };
    }
    const formattedItem = formatOrderItem(item);
    grouped[supplierId].items.push(formattedItem);
    grouped[supplierId].expected_subtotal += formattedItem.expected_price * formattedItem.quantity;
    if (formattedItem.actual_price) {
      grouped[supplierId].actual_subtotal += formattedItem.actual_price * formattedItem.quantity;
    }
    if (formattedItem.is_purchased) {
      grouped[supplierId].items_purchased += 1;
    }
    grouped[supplierId].items_total += 1;
  });
  return Object.values(grouped);
};

// ============================================
// SUPPLIERS CRUD
// ============================================

exports.getSuppliers = async (req, res) => {
  try {
    const { search, location } = req.query;

    const where = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { branchName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (location && location !== 'all') {
      where.location = locationEnumMap[location] || location;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { supplierProducts: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(suppliers.map(formatSupplier));
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { supplierProducts: true } },
        supplierProducts: {
          include: { product: true },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(formatSupplier(supplier));
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier' });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, location, branch_name, contact_person, phone, email, specialties, notes } = req.body;

    const supplier = await prisma.supplier.create({
      data: {
        name,
        location: locationEnumMap[location] || 'NAIROBI_CBD',
        branchName: branch_name,
        contactPerson: contact_person,
        phone,
        email,
        specialties: specialties || [],
        notes,
      },
      include: {
        _count: { select: { supplierProducts: true } },
      },
    });

    res.status(201).json(formatSupplier(supplier));
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Failed to create supplier' });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, branch_name, contact_person, phone, email, specialties, notes } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = locationEnumMap[location] || location;
    if (branch_name !== undefined) updateData.branchName = branch_name;
    if (contact_person !== undefined) updateData.contactPerson = contact_person;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (specialties !== undefined) updateData.specialties = specialties;
    if (notes !== undefined) updateData.notes = notes;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { supplierProducts: true } },
      },
    });

    res.json(formatSupplier(supplier));
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Failed to update supplier' });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ message: 'Failed to delete supplier' });
  }
};

// ============================================
// SUPPLIER PRODUCTS (PRICING) CRUD
// ============================================

exports.getSupplierProducts = async (req, res) => {
  try {
    const { supplier_id, product_id } = req.query;

    const where = {};
    if (supplier_id) where.supplierId = supplier_id;
    if (product_id) where.productId = product_id;

    const supplierProducts = await prisma.supplierProduct.findMany({
      where,
      include: {
        supplier: true,
        product: true,
      },
      orderBy: { lastUpdated: 'desc' },
    });

    res.json(supplierProducts.map(formatSupplierProduct));
  } catch (error) {
    console.error('Get supplier products error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier products' });
  }
};

exports.createSupplierProduct = async (req, res) => {
  try {
    const { supplier_id, product_id, wholesale_price, currency, notes, is_available } = req.body;

    const supplierProduct = await prisma.supplierProduct.create({
      data: {
        supplierId: supplier_id,
        productId: product_id,
        wholesalePrice: wholesale_price,
        currency: currency || 'KES',
        notes,
        isAvailable: is_available ?? true,
      },
      include: {
        supplier: true,
        product: true,
      },
    });

    res.status(201).json(formatSupplierProduct(supplierProduct));
  } catch (error) {
    console.error('Create supplier product error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'This product is already linked to this supplier' });
    }
    res.status(500).json({ message: 'Failed to create supplier product' });
  }
};

exports.updateSupplierProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { wholesale_price, currency, notes, is_available } = req.body;

    const updateData = { lastUpdated: new Date() };
    if (wholesale_price !== undefined) updateData.wholesalePrice = wholesale_price;
    if (currency !== undefined) updateData.currency = currency;
    if (notes !== undefined) updateData.notes = notes;
    if (is_available !== undefined) updateData.isAvailable = is_available;

    const supplierProduct = await prisma.supplierProduct.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        product: true,
      },
    });

    res.json(formatSupplierProduct(supplierProduct));
  } catch (error) {
    console.error('Update supplier product error:', error);
    res.status(500).json({ message: 'Failed to update supplier product' });
  }
};

exports.deleteSupplierProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.supplierProduct.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete supplier product error:', error);
    res.status(500).json({ message: 'Failed to delete supplier product' });
  }
};

// Search products with supplier prices
exports.searchProductsWithPrices = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    // Search products
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { partNumber: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        supplierProducts: {
          where: { isAvailable: true },
          include: { supplier: true },
          orderBy: { wholesalePrice: 'asc' },
        },
      },
      take: 20,
    });

    // Format results with best price indicator
    const results = products.map(product => {
      const prices = product.supplierProducts.map((sp, index) => ({
        supplier: formatSupplier(sp.supplier),
        price: parseFloat(sp.wholesalePrice),
        currency: sp.currency,
        is_available: sp.isAvailable,
        is_best_price: index === 0, // First one is best (sorted by price)
      }));

      return {
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          part_number: product.partNumber,
          description: product.description,
        },
        suppliers: prices,
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Failed to search products' });
  }
};

// ============================================
// PROCUREMENT ORDERS CRUD
// ============================================

exports.getProcurementOrders = async (req, res) => {
  try {
    const { search, status, payment_status, sort_by, sort_order } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      const statusMap = {
        'Pending': 'PENDING',
        'In Progress': 'IN_PROGRESS',
        'Completed': 'COMPLETED',
        'Cancelled': 'CANCELLED',
      };
      where.status = statusMap[status] || status;
    }

    if (payment_status && payment_status !== 'all') {
      const paymentMap = {
        'Unpaid': 'UNPAID',
        'Partial': 'PARTIAL',
        'Paid': 'PAID',
      };
      where.paymentStatus = paymentMap[payment_status] || payment_status;
    }

    const orderBy = {};
    if (sort_by === 'total_amount') {
      orderBy.totalAmount = sort_order === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = sort_order === 'asc' ? 'asc' : 'desc';
    }

    const orders = await prisma.procurementOrder.findMany({
      where,
      include: {
        assignedTo: true,
        createdBy: true,
        _count: { select: { items: true } },
      },
      orderBy,
    });

    res.json(orders.map(formatOrder));
  } catch (error) {
    console.error('Get procurement orders error:', error);
    res.status(500).json({ message: 'Failed to fetch procurement orders' });
  }
};

exports.getProcurementOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.procurementOrder.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        createdBy: true,
        items: {
          include: {
            product: true,
            supplier: true,
            alternativeSupplier: true,
          },
        },
        supplierPayments: {
          include: {
            supplier: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(formatOrder(order));
  } catch (error) {
    console.error('Get procurement order error:', error);
    res.status(500).json({ message: 'Failed to fetch procurement order' });
  }
};

exports.createProcurementOrder = async (req, res) => {
  try {
    const { assigned_to, payment_status, priority, route_order, notes, items } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    const orderNumber = await generateOrderNumber();

    // Calculate total
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    // Group items by supplier to calculate supplier payment amounts
    const supplierAmounts = {};
    items.forEach(item => {
      if (!supplierAmounts[item.supplier_id]) {
        supplierAmounts[item.supplier_id] = 0;
      }
      supplierAmounts[item.supplier_id] += item.quantity * item.unit_price;
    });

    // Create order with items and supplier payments
    const order = await prisma.procurementOrder.create({
      data: {
        orderNumber,
        status: 'PENDING',
        paymentStatus: payment_status === 'Paid' ? 'PAID' : payment_status === 'Partial' ? 'PARTIAL' : 'UNPAID',
        priority: priorityEnumMap[priority] || 'NORMAL',
        assignedToId: assigned_to || null,
        totalAmount,
        routeOrder: route_order || null,
        notes,
        createdById: userId,
        items: {
          create: items.map(item => ({
            productId: item.product_id,
            supplierId: item.supplier_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            expectedPrice: item.unit_price,  // Store expected price at time of creation
            subtotal: item.quantity * item.unit_price,
            notes: item.notes,
          })),
        },
        // Auto-create supplier payments for each unique supplier
        supplierPayments: {
          create: Object.entries(supplierAmounts).map(([supplierId, amount]) => ({
            supplierId,
            expectedAmount: amount,
            paymentStatus: 'UNPAID',
          })),
        },
      },
      include: {
        assignedTo: true,
        createdBy: true,
        items: {
          include: {
            product: true,
            supplier: true,
            alternativeSupplier: true,
          },
        },
        supplierPayments: {
          include: {
            supplier: true,
          },
        },
      },
    });

    res.status(201).json(formatOrder(order));
  } catch (error) {
    console.error('Create procurement order error:', error);
    res.status(500).json({ message: 'Failed to create procurement order' });
  }
};

exports.updateProcurementOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status, assigned_to, notes, items } = req.body;

    const updateData = {};

    if (status !== undefined) {
      const statusMap = {
        'Pending': 'PENDING',
        'In Progress': 'IN_PROGRESS',
        'Completed': 'COMPLETED',
        'Cancelled': 'CANCELLED',
      };
      updateData.status = statusMap[status] || status;
    }

    if (payment_status !== undefined) {
      const paymentMap = {
        'Unpaid': 'UNPAID',
        'Partial': 'PARTIAL',
        'Paid': 'PAID',
      };
      updateData.paymentStatus = paymentMap[payment_status] || payment_status;
    }

    if (assigned_to !== undefined) updateData.assignedToId = assigned_to || null;
    if (notes !== undefined) updateData.notes = notes;

    // If items are provided, update them
    if (items) {
      // Delete existing items and supplier payments
      await prisma.procurementOrderItem.deleteMany({
        where: { procurementOrderId: id },
      });
      await prisma.supplierPayment.deleteMany({
        where: { procurementOrderId: id },
      });

      const totalAmount = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
      }, 0);

      // Group items by supplier for payment records
      const supplierAmounts = {};
      items.forEach(item => {
        if (!supplierAmounts[item.supplier_id]) {
          supplierAmounts[item.supplier_id] = 0;
        }
        supplierAmounts[item.supplier_id] += item.quantity * item.unit_price;
      });

      updateData.totalAmount = totalAmount;
      updateData.items = {
        create: items.map(item => ({
          productId: item.product_id,
          supplierId: item.supplier_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          expectedPrice: item.unit_price,
          subtotal: item.quantity * item.unit_price,
          notes: item.notes,
        })),
      };
      updateData.supplierPayments = {
        create: Object.entries(supplierAmounts).map(([supplierId, amount]) => ({
          supplierId,
          expectedAmount: amount,
          paymentStatus: 'UNPAID',
        })),
      };
    }

    const order = await prisma.procurementOrder.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: true,
        createdBy: true,
        items: {
          include: {
            product: true,
            supplier: true,
            alternativeSupplier: true,
          },
        },
        supplierPayments: {
          include: {
            supplier: true,
          },
        },
      },
    });

    res.json(formatOrder(order));
  } catch (error) {
    console.error('Update procurement order error:', error);
    res.status(500).json({ message: 'Failed to update procurement order' });
  }
};

exports.deleteProcurementOrder = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.procurementOrder.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete procurement order error:', error);
    res.status(500).json({ message: 'Failed to delete procurement order' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const statusMap = {
      'Pending': 'PENDING',
      'In Progress': 'IN_PROGRESS',
      'Completed': 'COMPLETED',
      'Cancelled': 'CANCELLED',
    };

    const order = await prisma.procurementOrder.update({
      where: { id },
      data: { status: statusMap[status] || status },
      include: {
        assignedTo: true,
        createdBy: true,
        items: { include: { product: true, supplier: true } },
      },
    });

    res.json(formatOrder(order));
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    const paymentMap = {
      'Unpaid': 'UNPAID',
      'Partial': 'PARTIAL',
      'Paid': 'PAID',
    };

    const order = await prisma.procurementOrder.update({
      where: { id },
      data: { paymentStatus: paymentMap[payment_status] || payment_status },
      include: {
        assignedTo: true,
        createdBy: true,
        items: { include: { product: true, supplier: true } },
      },
    });

    res.json(formatOrder(order));
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ message: 'Failed to update payment status' });
  }
};

// Mark item as received
exports.markItemReceived = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { is_received } = req.body;

    await prisma.procurementOrderItem.update({
      where: { id: itemId },
      data: { isReceived: is_received },
    });

    // Check if all items are received
    const order = await prisma.procurementOrder.findUnique({
      where: { id: orderId },
      include: {
        assignedTo: true,
        createdBy: true,
        items: { include: { product: true, supplier: true } },
      },
    });

    res.json(formatOrder(order));
  } catch (error) {
    console.error('Mark item received error:', error);
    res.status(500).json({ message: 'Failed to update item' });
  }
};

// ============================================
// WORKERS (for assignment)
// ============================================

exports.getWorkers = async (req, res) => {
  try {
    const workers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(workers);
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ message: 'Failed to fetch workers' });
  }
};

// ============================================
// DASHBOARD STATS
// ============================================

exports.getStats = async (req, res) => {
  try {
    const [
      totalSuppliers,
      activeOrders,
      unpaidOrders,
      totalProducts,
    ] = await Promise.all([
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.procurementOrder.count({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      prisma.procurementOrder.count({
        where: { paymentStatus: 'UNPAID' },
      }),
      prisma.supplierProduct.count(),
    ]);

    res.json({
      total_suppliers: totalSuppliers,
      active_orders: activeOrders,
      unpaid_orders: unpaidOrders,
      total_products: totalProducts,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent orders as activity
    const recentOrders = await prisma.procurementOrder.findMany({
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    });

    const activities = recentOrders.map(order => ({
      id: order.id,
      type: 'order_created',
      description: `Order ${order.orderNumber} created by ${order.createdBy?.name || 'Unknown'}`,
      timestamp: order.createdAt.toISOString(),
      order_id: order.id,
    }));

    res.json(activities);
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
};

// ============================================
// SUPPLIER CATALOG (Supplier-specific products)
// ============================================

// Get all products for a specific supplier
exports.getSupplierCatalog = async (req, res) => {
  try {
    const { id } = req.params;
    const { search, available_only } = req.query;

    const where = { supplierId: id };

    if (available_only === 'true') {
      where.isAvailable = true;
    }

    const supplierProducts = await prisma.supplierProduct.findMany({
      where,
      include: {
        product: true,
        supplier: true,
      },
      orderBy: { product: { name: 'asc' } },
    });

    // Filter by search if provided
    let results = supplierProducts;
    if (search) {
      const searchLower = search.toLowerCase();
      results = supplierProducts.filter(sp =>
        sp.product.name.toLowerCase().includes(searchLower) ||
        (sp.product.partNumber && sp.product.partNumber.toLowerCase().includes(searchLower)) ||
        (sp.product.category && sp.product.category.toLowerCase().includes(searchLower))
      );
    }

    res.json(results.map(formatSupplierProduct));
  } catch (error) {
    console.error('Get supplier catalog error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier catalog' });
  }
};

// Add product to supplier catalog
exports.addProductToSupplier = async (req, res) => {
  try {
    const { id } = req.params; // supplier_id
    const { product_id, wholesale_price, currency, notes, is_available } = req.body;

    const supplierProduct = await prisma.supplierProduct.create({
      data: {
        supplierId: id,
        productId: product_id,
        wholesalePrice: wholesale_price,
        currency: currency || 'KES',
        notes,
        isAvailable: is_available ?? true,
      },
      include: {
        supplier: true,
        product: true,
      },
    });

    res.status(201).json(formatSupplierProduct(supplierProduct));
  } catch (error) {
    console.error('Add product to supplier error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'This product is already in this supplier catalog' });
    }
    res.status(500).json({ message: 'Failed to add product to supplier' });
  }
};

// Get all suppliers for a specific product
exports.getProductSuppliers = async (req, res) => {
  try {
    const { id } = req.params; // product_id

    const supplierProducts = await prisma.supplierProduct.findMany({
      where: { productId: id },
      include: {
        supplier: {
          include: {
            _count: { select: { supplierProducts: true } },
          },
        },
        product: true,
      },
      orderBy: { wholesalePrice: 'asc' },
    });

    // Mark the best price (first one since sorted by price)
    const results = supplierProducts.map((sp, index) => ({
      ...formatSupplierProduct(sp),
      is_best_price: index === 0,
    }));

    res.json(results);
  } catch (error) {
    console.error('Get product suppliers error:', error);
    res.status(500).json({ message: 'Failed to fetch product suppliers' });
  }
};

// ============================================
// ORDER ITEM UPDATES (Worker actions)
// ============================================

// Update order item (actual price, mark purchased, worker notes)
exports.updateOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const {
      actual_price,
      is_purchased,
      is_received,
      worker_notes,
      alternative_supplier_id
    } = req.body;

    const updateData = {};

    if (actual_price !== undefined) {
      updateData.actualPrice = actual_price;
    }

    if (is_purchased !== undefined) {
      updateData.isPurchased = is_purchased;
      if (is_purchased) {
        updateData.purchasedAt = new Date();
      }
    }

    if (is_received !== undefined) {
      updateData.isReceived = is_received;
    }

    if (worker_notes !== undefined) {
      updateData.workerNotes = worker_notes;
    }

    if (alternative_supplier_id !== undefined) {
      updateData.alternativeSupplierId = alternative_supplier_id || null;
    }

    await prisma.procurementOrderItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Update supplier payment actual amount if actual price changed
    if (actual_price !== undefined) {
      // Get all items for this order grouped by supplier
      const items = await prisma.procurementOrderItem.findMany({
        where: { procurementOrderId: orderId },
      });

      // Recalculate actual amounts per supplier
      const supplierActuals = {};
      items.forEach(item => {
        if (!supplierActuals[item.supplierId]) {
          supplierActuals[item.supplierId] = { expected: 0, actual: 0, hasActual: false };
        }
        const expectedPrice = parseFloat(item.expectedPrice);
        const actualPrice = item.actualPrice ? parseFloat(item.actualPrice) : null;

        supplierActuals[item.supplierId].expected += expectedPrice * item.quantity;
        if (actualPrice !== null) {
          supplierActuals[item.supplierId].actual += actualPrice * item.quantity;
          supplierActuals[item.supplierId].hasActual = true;
        }
      });

      // Update supplier payments
      for (const [supplierId, amounts] of Object.entries(supplierActuals)) {
        if (amounts.hasActual) {
          await prisma.supplierPayment.updateMany({
            where: { procurementOrderId: orderId, supplierId },
            data: { actualAmount: amounts.actual },
          });
        }
      }
    }

    // Return updated order
    const order = await prisma.procurementOrder.findUnique({
      where: { id: orderId },
      include: {
        assignedTo: true,
        createdBy: true,
        items: {
          include: {
            product: true,
            supplier: true,
            alternativeSupplier: true,
          },
        },
        supplierPayments: {
          include: {
            supplier: true,
          },
        },
      },
    });

    res.json(formatOrder(order));
  } catch (error) {
    console.error('Update order item error:', error);
    res.status(500).json({ message: 'Failed to update order item' });
  }
};

// ============================================
// SUPPLIER PAYMENTS
// ============================================

// Get all supplier payments
exports.getSupplierPayments = async (req, res) => {
  try {
    const { order_id, supplier_id, status } = req.query;

    const where = {};
    if (order_id) where.procurementOrderId = order_id;
    if (supplier_id) where.supplierId = supplier_id;
    if (status && status !== 'all') {
      const statusMap = { 'Unpaid': 'UNPAID', 'Partial': 'PARTIAL', 'Paid': 'PAID' };
      where.paymentStatus = statusMap[status] || status;
    }

    const payments = await prisma.supplierPayment.findMany({
      where,
      include: {
        supplier: true,
        procurementOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments.map(formatSupplierPayment));
  } catch (error) {
    console.error('Get supplier payments error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier payments' });
  }
};

// Update supplier payment (status, receipt, etc.)
exports.updateSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method, receipt_image_url, notes, actual_amount } = req.body;

    const updateData = {};

    if (payment_status !== undefined) {
      const statusMap = { 'Unpaid': 'UNPAID', 'Partial': 'PARTIAL', 'Paid': 'PAID' };
      updateData.paymentStatus = statusMap[payment_status] || payment_status;

      if (payment_status === 'Paid') {
        updateData.paidAt = new Date();
      }
    }

    if (payment_method !== undefined) {
      updateData.paymentMethod = paymentMethodEnumMap[payment_method] || payment_method;
    }

    if (receipt_image_url !== undefined) {
      updateData.receiptImageUrl = receipt_image_url;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (actual_amount !== undefined) {
      updateData.actualAmount = actual_amount;
    }

    const payment = await prisma.supplierPayment.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        procurementOrder: true,
      },
    });

    // Check if all supplier payments are paid, update order payment status
    const orderId = payment.procurementOrderId;
    const allPayments = await prisma.supplierPayment.findMany({
      where: { procurementOrderId: orderId },
    });

    const allPaid = allPayments.every(p => p.paymentStatus === 'PAID');
    const somePaid = allPayments.some(p => p.paymentStatus === 'PAID' || p.paymentStatus === 'PARTIAL');

    let orderPaymentStatus = 'UNPAID';
    if (allPaid) {
      orderPaymentStatus = 'PAID';
    } else if (somePaid) {
      orderPaymentStatus = 'PARTIAL';
    }

    await prisma.procurementOrder.update({
      where: { id: orderId },
      data: { paymentStatus: orderPaymentStatus },
    });

    res.json(formatSupplierPayment(payment));
  } catch (error) {
    console.error('Update supplier payment error:', error);
    res.status(500).json({ message: 'Failed to update supplier payment' });
  }
};

// Get pending payments grouped by supplier
exports.getPendingPayments = async (req, res) => {
  try {
    // Get all unpaid or partial payments
    const payments = await prisma.supplierPayment.findMany({
      where: {
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      include: {
        supplier: {
          include: {
            _count: { select: { supplierProducts: true } },
          },
        },
        procurementOrder: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by supplier
    const grouped = {};
    payments.forEach(payment => {
      const supplierId = payment.supplierId;
      if (!grouped[supplierId]) {
        grouped[supplierId] = {
          supplier: formatSupplier(payment.supplier),
          payments: [],
          total_expected: 0,
          total_actual: 0,
          total_pending: 0,
        };
      }

      const formattedPayment = formatSupplierPayment(payment);
      grouped[supplierId].payments.push(formattedPayment);
      grouped[supplierId].total_expected += formattedPayment.expected_amount;
      grouped[supplierId].total_actual += formattedPayment.actual_amount || formattedPayment.expected_amount;
      grouped[supplierId].total_pending += formattedPayment.actual_amount || formattedPayment.expected_amount;
    });

    // Convert to array and calculate grand total
    const result = Object.values(grouped);
    const grandTotal = result.reduce((sum, g) => sum + g.total_pending, 0);

    res.json({
      suppliers: result,
      grand_total: grandTotal,
      total_suppliers: result.length,
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ message: 'Failed to fetch pending payments' });
  }
};

// ============================================
// SUPPLIERS BY LOCATION (Tree view)
// ============================================

exports.getSuppliersByLocation = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { supplierProducts: true } },
      },
      orderBy: [{ location: 'asc' }, { name: 'asc' }],
    });

    // Group by location
    const grouped = {
      'Nairobi CBD': [],
      'Dubai': [],
      'Uganda': [],
      'Other': [],
    };

    suppliers.forEach(supplier => {
      const location = locationDisplayMap[supplier.location] || 'Other';
      if (!grouped[location]) {
        grouped[location] = [];
      }
      grouped[location].push(formatSupplier(supplier));
    });

    // Convert to tree structure
    const tree = Object.entries(grouped)
      .filter(([_, suppliers]) => suppliers.length > 0)
      .map(([location, suppliers]) => ({
        location,
        suppliers,
        count: suppliers.length,
      }));

    res.json(tree);
  } catch (error) {
    console.error('Get suppliers by location error:', error);
    res.status(500).json({ message: 'Failed to fetch suppliers by location' });
  }
};
