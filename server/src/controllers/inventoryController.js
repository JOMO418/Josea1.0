const prisma = require('../utils/prisma');
const cache = require('../utils/cache');
const { emitToBranch, emitToOverseer } = require('../utils/socket');

exports.getInventory = async (req, res, next) => {
  try {
    const { branchId, lowStockOnly, productId } = req.query;

    // Branch managers can only see their own inventory
    let filterBranchId = branchId;
    if (req.user.role === 'MANAGER' && req.user.branchId) {
      filterBranchId = req.user.branchId;
    }

    const where = {};
    if (filterBranchId) where.branchId = filterBranchId;
    if (productId) where.productId = productId;

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        product: true,
        branch: true,
      },
    });

    let filtered = inventory;
    if (lowStockOnly === 'true') {
      filtered = inventory.filter((inv) => inv.quantity <= inv.product.lowStockThreshold);
    }

    res.json(filtered);
  } catch (error) {
    next(error);
  }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { productId, branchId, quantity, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Adjustment reason required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Use SELECT FOR UPDATE for optimistic locking
      const oldInventory = await tx.inventory.findUnique({
        where: { productId_branchId: { productId, branchId } },
      });

      if (!oldInventory) {
        throw new Error('Inventory record not found');
      }

      const inventory = await tx.inventory.update({
        where: {
          productId_branchId: { productId, branchId },
          version: oldInventory.version, // Optimistic locking
        },
        data: {
          quantity,
          version: { increment: 1 },
          // Track restock only when quantity increases
          ...(quantity > oldInventory.quantity && { lastRestockAt: new Date() }),
        },
        include: { product: true },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'STOCK_ADJUSTED',
          entityType: 'Inventory',
          entityId: inventory.id,
          oldValue: { quantity: oldInventory.quantity, reason },
          newValue: { quantity, reason },
          ipAddress: req.ipAddress,
        },
      });

      // ============================================
      // CLOSED LOOP FULFILLMENT - "Hunter" Logic
      // When stock is ADDED, auto-complete matching Branch Orders
      // ============================================
      if (quantity > oldInventory.quantity) {
        // Find pending transfer requests FROM this branch for this product
        // (Branch Orders where this branch requested stock for this product)
        const pendingTransfers = await tx.transfer.findMany({
          where: {
            fromBranchId: branchId,
            status: { in: ['REQUESTED', 'APPROVED'] },
            items: {
              some: { productId: productId },
            },
          },
          select: { id: true, transferNumber: true },
        });

        if (pendingTransfers.length > 0) {
          // Update all matching transfers to RECEIVED status
          await tx.transfer.updateMany({
            where: {
              id: { in: pendingTransfers.map((t) => t.id) },
            },
            data: {
              status: 'RECEIVED',
              receivedAt: new Date(),
            },
          });

          // Log the auto-completion for audit trail
          for (const transfer of pendingTransfers) {
            await tx.auditLog.create({
              data: {
                userId: req.user.id,
                action: 'TRANSFER_AUTO_COMPLETED',
                entityType: 'Transfer',
                entityId: transfer.id,
                oldValue: { status: 'REQUESTED' },
                newValue: {
                  status: 'RECEIVED',
                  reason: 'Auto-completed via stock allocation',
                  productId,
                  branchId,
                },
                ipAddress: req.ipAddress,
              },
            });
          }

          console.log(`[Closed Loop] Auto-completed ${pendingTransfers.length} transfer(s) for product ${productId} at branch ${branchId}`);
        }
      }

      return inventory;
    });

    // Clear cache
    await cache.delPattern(`inventory:${branchId}:*`);

    // Emit real-time update
    emitToBranch(branchId, 'inventory.updated', {
      productId,
      branchId,
      quantity: result.quantity,
    });
    emitToOverseer('inventory.updated', {
      productId,
      branchId,
      quantity: result.quantity,
    });

    // Check low stock
    if (result.quantity <= result.product.lowStockThreshold) {
      emitToBranch(branchId, 'lowStock.alert', {
        product: result.product,
        currentQuantity: result.quantity,
        threshold: result.product.lowStockThreshold,
      });
      emitToOverseer('lowStock.alert', {
        product: result.product,
        branch: branchId,
        currentQuantity: result.quantity,
      });
    }

    res.json(result);
  } catch (error) {
    if (error.code === 'P2034') {
      return res.status(409).json({ 
        message: 'Inventory was modified by another process. Please retry.',
      });
    }
    next(error);
  }
};