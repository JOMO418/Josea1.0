// server/controllers/salesController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ===================================
// CREATE SALE WITH SPLIT PAYMENT SUPPORT
// ===================================

exports.createSale = async (req, res) => {
  const { items, customerName, customerPhone, payments, discount = 0 } = req.body;
  const userId = req.user.id;
  const branchId = req.user.branchId;

  // ===== VALIDATION =====

  // Check items
  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'At least one item is required' });
  }

  // Check payments array
  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ message: 'At least one payment method is required' });
  }

  // Validate each payment
  for (const payment of payments) {
    if (!payment.method || !['CASH', 'MPESA', 'CREDIT'].includes(payment.method)) {
      return res.status(400).json({ message: 'Invalid payment method. Must be CASH, MPESA, or CREDIT' });
    }

    const amount = parseFloat(payment.amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const saleItems = [];

      // ===== PROCESS EACH ITEM =====

      for (const item of items) {
        // Validate product exists
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (!product.isActive) {
          throw new Error(`Product ${product.name} is inactive`);
        }

        // ===== MINIMUM PRICE ENFORCEMENT =====
        const unitPrice = parseFloat(item.unitPrice);
        const minPrice = parseFloat(product.minPrice);

        if (unitPrice < minPrice) {
          throw new Error(
            `Cannot sell ${product.name} at KES ${unitPrice.toFixed(2)}. ` +
            `Minimum price is KES ${minPrice.toFixed(2)}. ` +
            `Contact admin for price override.`
          );
        }

        // Check inventory availability
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId,
            },
          },
        });

        if (!inventory) {
          throw new Error(`Inventory not found for ${product.name} at this branch`);
        }

        if (inventory.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. ` +
            `Available: ${inventory.quantity}, Requested: ${item.quantity}`
          );
        }

        // ===== DEDUCT STOCK IMMEDIATELY =====
        const updatedInventory = await tx.inventory.update({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId,
            },
          },
          data: {
            quantity: { decrement: item.quantity },
            version: { increment: 1 }, // Optimistic locking
            lastSoldAt: new Date(),
          },
        });

        // Calculate item total
        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;

        saleItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          total: itemTotal,
        });

        // Audit log for inventory deduction
        await tx.auditLog.create({
          data: {
            userId,
            action: 'INVENTORY_DEDUCTED',
            entityType: 'INVENTORY',
            entityId: inventory.id,
            oldValue: JSON.stringify({ quantity: inventory.quantity }),
            newValue: JSON.stringify({ quantity: updatedInventory.quantity }),
          },
        });

        // Check if stock is now below threshold (low stock alert)
        if (updatedInventory.quantity <= (product.lowStockThreshold || 5)) {
          const io = req.app.get('io');
          if (io) {
            const alertPayload = {
              productId: product.id,
              productName: product.name,
              branchId,
              quantity: updatedInventory.quantity,
              threshold: product.lowStockThreshold,
            };
            io.to('overseer').emit('lowStock.alert', alertPayload);
            io.to(`branch:${branchId}`).emit('lowStock.alert', alertPayload);
          }
        }
      }

      // ===== CALCULATE TOTAL =====
      const finalDiscount = parseFloat(discount);
      const total = subtotal - finalDiscount;

      if (total < 0) {
        throw new Error('Discount cannot exceed subtotal');
      }

      // ===== SPLIT PAYMENT VALIDATION =====
      // Calculate sum of all payments
      const paymentsTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // CRITICAL: Sum check - payments must exactly equal total
      if (Math.abs(paymentsTotal - total) > 0.01) { // Allow 1 cent tolerance for rounding
        throw new Error(
          `Payment total (KES ${paymentsTotal.toFixed(2)}) does not match sale total (KES ${total.toFixed(2)}). ` +
          `Difference: KES ${Math.abs(paymentsTotal - total).toFixed(2)}`
        );
      }

      // Check if any payment is CREDIT
      const hasCredit = payments.some(p => p.method === 'CREDIT');
      const creditAmount = payments
        .filter(p => p.method === 'CREDIT')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // If CREDIT exists, require customer info
      if (hasCredit) {
        if (!customerName || customerName.trim().length === 0) {
          throw new Error('Customer name required for credit payments');
        }
        if (!customerPhone || customerPhone.trim().length === 0) {
          throw new Error('Customer phone required for credit payments');
        }
      }

      // Generate unique receipt number
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const receiptNumber = `RCP${timestamp}${randomSuffix}`;

      // Determine if this is a walk-in customer
      const isWalkIn = !customerName || customerName.trim() === '' || customerName.trim() === 'Walk-in Customer';

      // ===== CREATE SALE RECORD =====
      const sale = await tx.sale.create({
        data: {
          receiptNumber,
          branchId,
          userId,
          customerName: customerName?.trim() || 'Walk-in Customer',
          customerPhone: customerPhone?.trim() || null,
          subtotal,
          discount: finalDiscount,
          total,
          isCredit: hasCredit,
          creditStatus: hasCredit ? (creditAmount === total ? 'PENDING' : 'PARTIAL') : null,
          isWalkIn,
          reversalStatus: 'NONE',
          items: {
            create: saleItems,
          },
          payments: {
            create: payments.map(p => ({
              method: p.method,
              amount: parseFloat(p.amount),
              reference: p.reference || null,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
          branch: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Audit log for sale creation
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SALE_CREATED',
          entityType: 'SALE',
          entityId: sale.id,
          newValue: JSON.stringify({
            receiptNumber,
            total,
            payments: payments.map(p => ({ method: p.method, amount: p.amount })),
            isCredit: hasCredit,
            itemCount: items.length,
          }),
        },
      });

      return sale;
    });

    // ===== REAL-TIME WEBSOCKET EVENTS =====
    const io = req.app.get('io');
    if (io) {
      io.to(`branch:${branchId}`).emit('sale.created', result);
      io.to('overseer').emit('sale.created', result);
      io.to(`branch:${branchId}`).emit('inventory.updated', {
        branchId,
        timestamp: new Date(),
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(400).json({
      message: error.message || 'Failed to create sale',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// ===================================
// GET ALL SALES (WITH PAGINATION & FILTERING)
// ===================================

exports.getAllSales = async (req, res) => {
  const { page = 1, limit = 50, branchId, startDate, endDate, search, isCredit, creditStatus } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {};

    // Branch filtering based on role
    if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Search by receipt number or customer name
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Credit filtering
    if (isCredit !== undefined) {
      where.isCredit = isCredit === 'true';
    }

    // Credit status filtering - supports array or single value
    if (creditStatus) {
      if (Array.isArray(creditStatus)) {
        where.creditStatus = { in: creditStatus };
      } else if (typeof creditStatus === 'string' && creditStatus.includes(',')) {
        // Support comma-separated string
        where.creditStatus = { in: creditStatus.split(',') };
      } else {
        where.creditStatus = creditStatus;
      }
    }

    // Exclude reversed sales by default
    where.isReversed = false;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  partNumber: true,
                },
              },
            },
          },
          payments: true,
          creditPayments: true,
          branch: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ message: 'Failed to fetch sales' });
  }
};

// ===================================
// GET SINGLE SALE BY ID
// ===================================

exports.getSaleById = async (req, res) => {
  const { id } = req.params;

  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        creditPayments: true,
        branch: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Check branch access for managers
    if (req.user.role === 'MANAGER' && sale.branchId !== req.user.branchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ message: 'Failed to fetch sale' });
  }
};

// ===================================
// REQUEST SALE REVERSAL (MANAGER ONLY)
// ===================================

exports.requestReversal = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;

  // Validation
  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ message: 'Reversal reason is required' });
  }

  try {
    // Fetch the sale
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        branch: true,
      },
    });

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Check branch access for managers
    if (req.user.role === 'MANAGER' && sale.branchId !== req.user.branchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if already reversed
    if (sale.isReversed) {
      return res.status(400).json({ message: 'Sale has already been reversed' });
    }

    // Check if reversal is already pending or approved
    if (sale.reversalStatus === 'PENDING') {
      return res.status(400).json({ message: 'Reversal request is already pending' });
    }

    if (sale.reversalStatus === 'APPROVED') {
      return res.status(400).json({ message: 'Reversal has already been approved' });
    }

    // Update sale with reversal request
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        reversalStatus: 'PENDING',
        reversalReason: reason.trim(),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        branch: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REVERSAL_REQUESTED',
        entityType: 'SALE',
        entityId: sale.id,
        oldValue: JSON.stringify({ reversalStatus: sale.reversalStatus }),
        newValue: JSON.stringify({ reversalStatus: 'PENDING', reason: reason.trim() }),
      },
    });

    // Real-time notification to overseers
    const io = req.app.get('io');
    if (io) {
      io.to('overseer').emit('reversal.requested', {
        saleId: sale.id,
        receiptNumber: sale.receiptNumber,
        branchId: sale.branchId,
        branchName: sale.branch.name,
        requestedBy: req.user.name,
        reason: reason.trim(),
        timestamp: new Date(),
      });
    }

    res.json({
      message: 'Reversal request submitted successfully',
      sale: updatedSale,
    });
  } catch (error) {
    console.error('Request reversal error:', error);
    res.status(500).json({ message: 'Failed to request reversal' });
  }
};

// ===================================
// RECORD CREDIT PAYMENT
// ===================================

exports.recordCreditPayment = async (req, res) => {
  // 1. Debug Log: See exactly what the frontend sent
  console.log('💰 Payment Request Received:', { 
    id: req.params.id, 
    body: req.body 
  });

  const { id } = req.params;
  const { amount, paymentMethod } = req.body;
  const userId = req.user.id;

  try {
    // 2. Validate Inputs
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const method = paymentMethod ? paymentMethod.toUpperCase() : '';
    if (!['CASH', 'MPESA'].includes(method)) {
      return res.status(400).json({ message: 'Invalid payment method. Use CASH or MPESA' });
    }

    // 3. Run Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Fetch Sale with current payments
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { payments: true, creditPayments: true }
      });

      if (!sale) {
        throw new Error('Sale not found');
      }

      // Calculate Remaining Balance
      // CRITICAL FIX: Filter out 'CREDIT' method from initial payments.
      // Only CASH and MPESA count as "Paid" initially.
      const totalPaidInitial = sale.payments
        .filter(p => p.method !== 'CREDIT')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalCreditPaid = sale.creditPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      const totalPaid = totalPaidInitial + totalCreditPaid;
      const remainingBalance = Number(sale.total) - totalPaid;

      // Debug Log to confirm the fix
      console.log('Balance Calc:', {
        total: Number(sale.total),
        paidInitial: totalPaidInitial,
        creditPaid: totalCreditPaid,
        balance: remainingBalance
      });

      // Check for Overpayment (Allow 1.00 buffer for rounding diffs)
      if (paymentAmount > remainingBalance + 1.0) {
        throw new Error(`Amount (KES ${paymentAmount}) exceeds balance (KES ${remainingBalance})`);
      }

      // Create Payment Record
      const creditPayment = await tx.creditPayment.create({
        data: {
          saleId: id,
          amount: paymentAmount,
          paymentMethod: method,
          receivedBy: userId,
          createdAt: new Date()
        }
      });

      // Determine New Status
      const newBalance = remainingBalance - paymentAmount;
      // If balance is basically zero (less than 1 shilling), mark PAID
      const newStatus = newBalance < 1 ? 'PAID' : 'PARTIAL';

      // Update Sale Status
      const updatedSale = await tx.sale.update({
        where: { id },
        data: { creditStatus: newStatus },
        include: { creditPayments: true }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DEBT_PAYMENT',
          entityType: 'SALE',
          entityId: id,
          newValue: JSON.stringify({ amount: paymentAmount, method, newStatus })
        }
      });

      return updatedSale;
    });

    // 4. Success Response
    console.log('✅ Payment Success:', result.id);
    res.json(result);

  } catch (error) {
    // 5. Error Handling (Prevents 500 Crash)
    console.error('❌ Payment Logic Error:', error);
    res.status(400).json({ 
      message: error.message || 'Payment processing failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Export remaining functions (to be added: reverse sale, etc.)
module.exports = exports;
