// server/controllers/salesController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ===================================
// CREATE SALE WITH SPLIT PAYMENT SUPPORT
// ===================================

exports.createSale = async (req, res) => {
  const {
    items,
    customerName,
    customerPhone,
    payments,
    discount = 0,
    saveToCustomerDB = false,
    flagForVerification = false,
    mpesaReceiptNumber = null
  } = req.body;
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
      let linkedCustomerId = null;

      // ===== INTELLIGENT CUSTOMER LINKING (CRM LOGIC) =====

      // ONLY save to customer database if name is provided (saveToCustomerDB flag)
      if (saveToCustomerDB && customerPhone && customerPhone.trim().length > 0 && customerName && customerName.trim().length > 0) {
        const phone = customerPhone.trim();
        const name = customerName.trim();

        // Search for existing customer by phone
        let customer = await tx.customer.findUnique({
          where: { phone },
        });

        if (customer) {
          // EXISTING CUSTOMER: Update name if different and link to sale
          if (customer.name !== name) {
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: {
                name,
                lastVisitAt: new Date()
              },
            });
            console.log(`🔄 Updated customer name: ${customer.name} (${customer.phone})`);
          } else {
            // Just update last visit
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: { lastVisitAt: new Date() },
            });
          }
          linkedCustomerId = customer.id;
          console.log(`🔗 Linked existing customer: ${customer.name} (${customer.phone})`);
        } else {
          // NEW CUSTOMER: Create and link (only if name provided)
          customer = await tx.customer.create({
            data: {
              name,
              phone,
              totalSpent: 0,
              totalDebt: 0,
              lastVisitAt: new Date(),
            },
          });
          linkedCustomerId = customer.id;
          console.log(`✨ Created new customer: ${customer.name} (${customer.phone})`);
        }
      }
      // Case 2: No name or saveToCustomerDB=false - Walk-in customer (not saved to CRM)
      else {
        console.log('🚶 Walk-in customer - No CRM record (name not provided or cash-only sale)');
      }

      // ===== PROCESS EACH ITEM =====

      for (const item of items) {
        // Validate product exists
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product not found. Please refresh and try again`);
        }

        if (!product.isActive) {
          throw new Error(`${product.name} is currently unavailable for sale`);
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
          throw new Error(`${product.name} is not available at this branch`);
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

      console.log('💰 [Payment Validation]:', {
        subtotal,
        discount: finalDiscount,
        total,
        payments,
        paymentsTotal,
        flagForVerification,
        mpesaReceiptNumber
      });

      // CRITICAL: Sum check - payments must exactly equal total
      if (Math.abs(paymentsTotal - total) > 0.01) { // Allow 1 cent tolerance for rounding
        console.error('❌ [Payment Mismatch]:', {
          paymentsTotal,
          total,
          difference: Math.abs(paymentsTotal - total)
        });
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

      // Check if there's M-Pesa payment
      const hasMpesaPayment = payments.some(p => p.method === 'MPESA');

      // Determine M-Pesa verification status
      let mpesaVerificationStatus = 'NOT_APPLICABLE';
      if (hasMpesaPayment) {
        if (flagForVerification) {
          mpesaVerificationStatus = 'PENDING'; // Flagged for later verification
        } else if (mpesaReceiptNumber) {
          mpesaVerificationStatus = 'VERIFIED'; // Receipt already provided
        } else {
          mpesaVerificationStatus = 'PENDING'; // Has M-Pesa but no receipt yet
        }
      }

      // ===== CREATE SALE RECORD =====
      const sale = await tx.sale.create({
        data: {
          receiptNumber,
          branchId,
          userId,
          customerId: linkedCustomerId, // CRM Link
          customerName: customerName?.trim() || 'Walk-in Customer',
          customerPhone: customerPhone?.trim() || null,
          subtotal,
          discount: finalDiscount,
          total,
          isCredit: hasCredit,
          creditStatus: hasCredit ? (creditAmount === total ? 'PENDING' : 'PARTIAL') : null,
          isWalkIn,
          reversalStatus: 'NONE',
          // M-Pesa Verification Fields
          mpesaVerificationStatus,
          flaggedForVerification: flagForVerification && hasMpesaPayment,
          flaggedAt: flagForVerification && hasMpesaPayment ? new Date() : null,
          mpesaReceiptNumber: mpesaReceiptNumber || null,
          verificationMethod: mpesaReceiptNumber ? 'AUTOMATIC' : 'NOT_VERIFIED',
          verificationNotes: flagForVerification ? 'Complete Later pressed - awaiting M-Pesa confirmation' : null,
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
          customer: true, // Include customer in response
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

      // ===== UPDATE CUSTOMER STATS (IF LINKED) =====
      if (linkedCustomerId) {
        await tx.customer.update({
          where: { id: linkedCustomerId },
          data: {
            totalSpent: { increment: total },
            totalDebt: { increment: creditAmount },
            lastVisitAt: new Date(),
          },
        });
        console.log(`📊 Updated customer stats: +KES ${total} spent, +KES ${creditAmount} debt`);
      }

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
            customerId: linkedCustomerId,
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
      message: error.message || 'Unable to complete sale. Please try again',
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

    // Date range filtering - Supports full ISO timestamps for exact daily filtering
    // Accepts: "2024-12-29" or "2024-12-29T00:00:00.000Z"
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
        console.log('📅 Sales filter - Start:', new Date(startDate).toISOString());
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
        console.log('📅 Sales filter - End:', new Date(endDate).toISOString());
      }
    }

    // DEEP SEARCH: Receipt, Customer, OR Product Name in Items
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        {
          items: {
            some: {
              product: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
      console.log('🔍 Deep Search Active:', search);
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
    res.status(500).json({ message: 'Unable to load sales. Please refresh the page' });
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
    res.status(500).json({ message: 'Unable to load sale details. Please try again' });
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
    res.status(500).json({ message: 'Unable to submit reversal request. Please try again' });
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
        include: {
          creditPayments: {
            orderBy: { createdAt: 'desc' }
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true }
              }
            }
          },
          payments: true,
          customer: true
        }
      });

      // UPDATE CUSTOMER TOTAL DEBT (CRITICAL FIX)
      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            totalDebt: { decrement: paymentAmount }
          }
        });
        console.log(`📉 Customer debt reduced by KES ${paymentAmount}`);
      }

      // Audit Log with full details for history tracking
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DEBT_PAYMENT',
          entityType: 'SALE',
          entityId: id,
          oldValue: JSON.stringify({
            remainingBefore: remainingBalance,
            creditStatus: sale.creditStatus
          }),
          newValue: JSON.stringify({
            amount: paymentAmount,
            method,
            newStatus,
            remainingAfter: newBalance,
            paidAt: new Date().toISOString()
          })
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
      message: error.message || 'Unable to process payment. Please try again',
    });
  }
};

// ===================================
// PROCESS REVERSAL DECISION (ADMIN ONLY)
// ===================================

exports.processReversal = async (req, res) => {
  const { id } = req.params;
  const { decision, adminNotes } = req.body;
  const userId = req.user.id;

  // Validation
  if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({
      message: 'Invalid decision. Must be APPROVED or REJECTED'
    });
  }

  // Verify Admin Role
  if (!['ADMIN', 'OWNER'].includes(req.user.role)) {
    return res.status(403).json({
      message: 'Access denied. Admin role required.'
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Fetch the sale with items
      const sale = await tx.sale.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          branch: true,
          user: true,
        },
      });

      if (!sale) {
        throw new Error('Sale not found');
      }

      // Check if sale is in PENDING reversal status
      if (sale.reversalStatus !== 'PENDING') {
        throw new Error('No pending reversal request for this sale');
      }

      // Check if already reversed
      if (sale.isReversed) {
        throw new Error('Sale has already been reversed');
      }

      if (decision === 'APPROVED') {
        console.log('✅ Processing APPROVED reversal for sale:', id);

        // INVENTORY RESTORATION: Iterate and increment stock
        for (const item of sale.items) {
          console.log(`📦 Restoring ${item.quantity}x ${item.product.name} to branch ${sale.branchId}`);

          // Find inventory record
          const inventory = await tx.inventory.findUnique({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: sale.branchId,
              },
            },
          });

          if (!inventory) {
            throw new Error(
              `Inventory not found for ${item.product.name} at branch ${sale.branch.name}`
            );
          }

          // Increment stock
          const updatedInventory = await tx.inventory.update({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: sale.branchId,
              },
            },
            data: {
              quantity: { increment: item.quantity },
              version: { increment: 1 },
            },
          });

          console.log(`✅ Stock restored: ${inventory.quantity} → ${updatedInventory.quantity}`);

          // Create Stock Movement Record (Type: RETURN)
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              inventoryId: inventory.id,
              branchId: sale.branchId,
              userId: userId,
              type: 'RETURN',
              quantity: item.quantity, // Positive value for return
              notes: `Manager Reversal Approved - Sale #${sale.receiptNumber}`,
            },
          });
        }

        // Update Sale: Mark as reversed
        const updatedSale = await tx.sale.update({
          where: { id },
          data: {
            isReversed: true,
            reversalStatus: 'APPROVED',
            reversedAt: new Date(),
            reversedBy: userId,
            notes: adminNotes?.trim() || null,
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            branch: true,
            user: true,
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'REVERSAL_APPROVED',
            entityType: 'SALE',
            entityId: sale.id,
            oldValue: JSON.stringify({
              reversalStatus: 'PENDING',
              isReversed: false,
            }),
            newValue: JSON.stringify({
              reversalStatus: 'APPROVED',
              isReversed: true,
              adminNotes,
            }),
          },
        });

        return updatedSale;
      } else {
        // REJECTED
        console.log('❌ Processing REJECTED reversal for sale:', id);

        const updatedSale = await tx.sale.update({
          where: { id },
          data: {
            reversalStatus: 'REJECTED',
            notes: adminNotes?.trim() || null,
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            branch: true,
            user: true,
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'REVERSAL_REJECTED',
            entityType: 'SALE',
            entityId: sale.id,
            oldValue: JSON.stringify({ reversalStatus: 'PENDING' }),
            newValue: JSON.stringify({
              reversalStatus: 'REJECTED',
              adminNotes,
            }),
          },
        });

        return updatedSale;
      }
    });

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`branch:${result.branchId}`).emit('reversal.decision', {
        saleId: result.id,
        decision,
        timestamp: new Date(),
      });
      io.to('overseer').emit('reversal.decision', {
        saleId: result.id,
        decision,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: `Reversal ${decision.toLowerCase()} successfully`,
      sale: result,
    });
  } catch (error) {
    console.error('Process reversal error:', error);
    res.status(400).json({
      message: error.message || 'Unable to process reversal. Please try again',
    });
  }
};

// ===================================
// SEARCH CUSTOMERS (FOR CRM DROPDOWN)
// ===================================

exports.searchCustomers = async (req, res) => {
  const { q } = req.query;

  // Validation
  if (!q || q.trim().length === 0) {
    return res.json([]);
  }

  try {
    const searchTerm = q.trim();

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        totalDebt: true,
      },
      take: 5,
      orderBy: {
        lastVisitAt: 'desc',
      },
    });

    res.json(customers);
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({ message: 'Unable to search customers. Please try again' });
  }
};

// ===================================
// GET SALES KPIs (ADMIN ONLY)
// ===================================

exports.getSalesKPIs = async (req, res) => {
  const { startDate, endDate, branchId, search } = req.query;

  try {
    // Build where clause for filtering
    const where = {};

    // Date range filtering - Supports full ISO timestamps for exact daily filtering
    // DEFAULT: If no dates provided, default to TODAY (00:00:00 to 23:59:59)
    where.createdAt = {};

    if (startDate || endDate) {
      // Parse ISO timestamps or date strings from frontend
      if (startDate) {
        const start = new Date(startDate);
        where.createdAt.gte = start;
        console.log('📅 Start Date Filter:', start.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        where.createdAt.lte = end;
        console.log('📅 End Date Filter:', end.toISOString());
      }
    } else {
      // DEFAULT: Today (00:00:00 to 23:59:59)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      where.createdAt.gte = todayStart;
      where.createdAt.lte = todayEnd;

      console.log('📅 DEFAULT: Today\'s KPIs:', {
        start: todayStart.toISOString(),
        end: todayEnd.toISOString(),
      });
    }

    // Branch filtering
    if (branchId) {
      where.branchId = branchId;
    }

    // DEEP SEARCH: Context-Aware KPIs (same filter as table)
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        {
          items: {
            some: {
              product: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
      console.log('🔍 KPI Deep Search Active:', search);
    }

    // Exclude reversed sales
    where.isReversed = false;

    console.log('📊 Fetching KPIs with filters:', where);

    // Fetch all sales with payments and branch info
    const sales = await prisma.sale.findMany({
      where,
      include: {
        payments: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`📦 Found ${sales.length} sales`);

    // Initialize aggregation objects (Branch → Amount)
    const cashByBranch = {};
    const mpesaByBranch = {};
    const creditByBranch = {};
    const volumeByBranch = {};

    // Aggregate payments by branch and method
    for (const sale of sales) {
      const branchName = sale.branch.name;

      // Initialize branch if not exists
      if (!volumeByBranch[branchName]) {
        volumeByBranch[branchName] = 0;
        cashByBranch[branchName] = 0;
        mpesaByBranch[branchName] = 0;
        creditByBranch[branchName] = 0;
      }

      // Increment volume
      volumeByBranch[branchName]++;

      // Aggregate payments by method
      for (const payment of sale.payments) {
        const amount = Number(payment.amount);

        switch (payment.method) {
          case 'CASH':
            cashByBranch[branchName] += amount;
            break;
          case 'MPESA':
            mpesaByBranch[branchName] += amount;
            break;
          case 'CREDIT':
            creditByBranch[branchName] += amount;
            break;
        }
      }
    }

    // Transform to new structure: { total, breakdown: [{ branch, amount }] }
    const cashBreakdown = Object.entries(cashByBranch).map(([branch, amount]) => ({
      branch,
      amount: Number(amount.toFixed(2)),
    }));

    const mpesaBreakdown = Object.entries(mpesaByBranch).map(([branch, amount]) => ({
      branch,
      amount: Number(amount.toFixed(2)),
    }));

    const creditBreakdown = Object.entries(creditByBranch).map(([branch, amount]) => ({
      branch,
      amount: Number(amount.toFixed(2)),
    }));

    const volumeBreakdown = Object.entries(volumeByBranch).map(([branch, count]) => ({
      branch,
      count,
    }));

    // Calculate totals
    const totalCash = cashBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const totalMpesa = mpesaBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const totalCredit = creditBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const totalVolume = volumeBreakdown.reduce((sum, item) => sum + item.count, 0);

    console.log('✅ KPI Summary:', {
      totalCash,
      totalMpesa,
      totalCredit,
      totalVolume,
    });

    console.log('📊 Granular Breakdown Sample:', {
      cash: cashBreakdown,
      mpesa: mpesaBreakdown,
      credit: creditBreakdown,
    });

    // NEW STRUCTURE: Grouped by Payment Method with Totals + Branch Breakdown
    res.json({
      success: true,
      data: {
        cash: {
          total: Number(totalCash.toFixed(2)),
          breakdown: cashBreakdown,
        },
        mpesa: {
          total: Number(totalMpesa.toFixed(2)),
          breakdown: mpesaBreakdown,
        },
        credit: {
          total: Number(totalCredit.toFixed(2)),
          breakdown: creditBreakdown,
        },
        volume: {
          total: totalVolume,
          breakdown: volumeBreakdown,
        },
        // Grand totals for convenience
        totals: {
          cash: Number(totalCash.toFixed(2)),
          mpesa: Number(totalMpesa.toFixed(2)),
          credit: Number(totalCredit.toFixed(2)),
          revenue: Number((totalCash + totalMpesa + totalCredit).toFixed(2)),
          volume: totalVolume,
        },
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        branchId: branchId || null,
      },
    });
  } catch (error) {
    console.error('Get KPIs error:', error);
    res.status(500).json({
      message: 'Unable to load statistics. Please refresh the page',
    });
  }
};

// ===================================
// M-PESA VERIFICATION SYSTEM
// ===================================

/**
 * Get all flagged sales (pending M-Pesa verification)
 * @route GET /api/sales/flagged
 * @access Manager, Admin
 */
exports.getFlaggedSales = async (req, res) => {
  const { branchId, limit = 50 } = req.query;

  try {
    const where = {
      flaggedForVerification: true,
      mpesaVerificationStatus: 'PENDING', // Only get unverified ones
    };

    // Branch filtering based on role
    if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    const flaggedSales = await prisma.sale.findMany({
      where,
      orderBy: { flaggedAt: 'desc' }, // Most recent first
      take: parseInt(limit),
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payments: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Calculate how long each sale has been flagged
    const enrichedSales = flaggedSales.map(sale => {
      const flaggedMinutes = sale.flaggedAt
        ? Math.floor((Date.now() - new Date(sale.flaggedAt).getTime()) / 1000 / 60)
        : 0;

      // Get M-Pesa payment amount
      const mpesaPayment = sale.payments.find(p => p.method === 'MPESA');
      const mpesaAmount = mpesaPayment ? Number(mpesaPayment.amount) : 0;

      return {
        ...sale,
        flaggedMinutes,
        mpesaAmount,
      };
    });

    res.json({
      success: true,
      count: enrichedSales.length,
      sales: enrichedSales,
    });
  } catch (error) {
    console.error('[Flagged Sales] Error:', error);
    res.status(500).json({
      message: 'Failed to fetch flagged sales',
      error: error.message,
    });
  }
};

/**
 * Manually verify M-Pesa payment with receipt code
 * @route POST /api/sales/:id/verify-mpesa
 * @access Manager, Admin
 */
exports.verifyMpesaManually = async (req, res) => {
  const { id } = req.params;
  const { mpesaCode } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!mpesaCode || mpesaCode.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Invalid M-Pesa receipt code. Must be at least 10 characters.',
    });
  }

  try {
    // Get the sale
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        payments: true,
        branch: true,
      },
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found',
      });
    }

    // Authorization check: Manager can only verify their branch
    if (userRole === 'MANAGER' && sale.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        message: 'You can only verify sales from your own branch',
      });
    }

    // Check if already verified
    if (sale.mpesaVerificationStatus === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'This sale has already been verified',
      });
    }

    // Get M-Pesa payment amount
    const mpesaPayment = sale.payments.find(p => p.method === 'MPESA');
    if (!mpesaPayment) {
      return res.status(400).json({
        success: false,
        message: 'No M-Pesa payment found in this sale',
      });
    }

    const expectedAmount = Number(mpesaPayment.amount);

    // Verify the M-Pesa code against our records
    const mpesaTransaction = await prisma.mpesaTransaction.findFirst({
      where: {
        mpesaReceiptNumber: mpesaCode.trim().toUpperCase(),
        status: 'COMPLETED',
        branchId: sale.branchId,
      },
    });

    if (!mpesaTransaction) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa receipt code not found in our records. Please verify the code is correct.',
      });
    }

    // Verify amount matches (allow 1 KES tolerance for rounding)
    const amountDifference = Math.abs(Number(mpesaTransaction.amount) - expectedAmount);
    if (amountDifference > 1) {
      return res.status(400).json({
        success: false,
        message: `Amount mismatch! Receipt shows KES ${mpesaTransaction.amount}, but sale requires KES ${expectedAmount}.`,
      });
    }

    // SUCCESS - Update sale as verified
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        mpesaVerificationStatus: 'VERIFIED',
        flaggedForVerification: false,
        mpesaReceiptNumber: mpesaCode.trim().toUpperCase(),
        verifiedAt: new Date(),
        verifiedBy: userId,
        verificationMethod: userRole === 'MANAGER' ? 'MANUAL_MANAGER' : 'MANUAL_ADMIN',
        verificationNotes: `Manually verified by ${userRole} - M-Pesa code: ${mpesaCode.trim().toUpperCase()}`,
      },
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'MPESA_VERIFIED',
        entityType: 'SALE',
        entityId: sale.id,
        oldValue: JSON.stringify({
          status: 'PENDING',
          flagged: true
        }),
        newValue: JSON.stringify({
          status: 'VERIFIED',
          flagged: false,
          mpesaCode: mpesaCode.trim().toUpperCase(),
          verificationMethod: userRole === 'MANAGER' ? 'MANUAL_MANAGER' : 'MANUAL_ADMIN'
        }),
      },
    });

    console.log(`✅ [M-Pesa Verified] Sale ${sale.receiptNumber} verified by ${userRole} ${userId}`);

    // Real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`branch:${sale.branchId}`).emit('sale.verified', updatedSale);
      io.to('overseer').emit('sale.verified', updatedSale);
    }

    res.json({
      success: true,
      message: 'M-Pesa payment verified successfully',
      sale: updatedSale,
    });
  } catch (error) {
    console.error('[M-Pesa Verification] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify M-Pesa payment',
      error: error.message,
    });
  }
};

/**
 * Admin override - Confirm verification without M-Pesa code
 * @route POST /api/sales/:id/confirm-verification
 * @access Admin only
 */
exports.confirmVerificationOverride = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user.id;

  // Admin only
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can override verification',
    });
  }

  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found',
      });
    }

    // Update sale as verified (admin override)
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        mpesaVerificationStatus: 'VERIFIED',
        flaggedForVerification: false,
        verifiedAt: new Date(),
        verifiedBy: userId,
        verificationMethod: 'MANUAL_ADMIN',
        verificationNotes: notes || 'Admin override - verified without M-Pesa code',
      },
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'MPESA_ADMIN_OVERRIDE',
        entityType: 'SALE',
        entityId: sale.id,
        oldValue: JSON.stringify({
          status: 'PENDING',
          flagged: true
        }),
        newValue: JSON.stringify({
          status: 'VERIFIED',
          flagged: false,
          verificationMethod: 'MANUAL_ADMIN',
          notes: notes || 'Admin override'
        }),
      },
    });

    console.log(`⚠️  [Admin Override] Sale ${sale.receiptNumber} verified by admin ${userId}`);

    // Real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`branch:${sale.branchId}`).emit('sale.verified', updatedSale);
      io.to('overseer').emit('sale.verified', updatedSale);
    }

    res.json({
      success: true,
      message: 'Sale verification confirmed by administrator',
      sale: updatedSale,
    });
  } catch (error) {
    console.error('[Admin Override] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm verification',
      error: error.message,
    });
  }
};

// Export remaining functions
module.exports = exports;