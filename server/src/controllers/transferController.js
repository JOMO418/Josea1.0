const prisma = require('../utils/prisma');
const cache = require('../utils/cache');
const { emitToBranch, emitToOverseer } = require('../utils/socket');

exports.requestTransfer = async (req, res, next) => {
  try {
    const { toBranchId, items, notes } = req.body;

    const fromBranchId = req.user.branchId || req.body.fromBranchId;
    if (!fromBranchId) {
      return res.status(400).json({ message: 'Source branch required' });
    }

    const transferNumber = `TRN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const transfer = await prisma.transfer.create({
      data: {
        transferNumber,
        fromBranchId,
        toBranchId,
        requestedById: req.user.id,
        notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantityRequested: item.quantity,
          })),
        },
      },
      include: { 
        items: { include: { product: true } },
        fromBranch: true,
        toBranch: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'TRANSFER_REQUESTED',
        entityType: 'Transfer',
        entityId: transfer.id,
        newValue: transfer,
        ipAddress: req.ipAddress,
      },
    });

    emitToBranch(fromBranchId, 'transfer.statusChanged', transfer);
    emitToBranch(toBranchId, 'transfer.statusChanged', transfer);
    emitToOverseer('transfer.statusChanged', transfer);

    res.status(201).json(transfer);
  } catch (error) {
    next(error);
  }
};

exports.approveTransfer = async (req, res, next) => {
  try {
    const { items } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });

      if (!transfer || transfer.status !== 'REQUESTED') {
        throw new Error('Transfer not found or cannot be approved');
      }

      for (const item of items) {
        await tx.transferItem.update({
          where: { id: item.id },
          data: { quantityApproved: item.quantityApproved },
        });
      }

      const updatedTransfer = await tx.transfer.update({
        where: { id: req.params.id },
        data: {
          status: 'APPROVED',
          approvedById: req.user.id,
          approvedAt: new Date(),
        },
        include: { 
          items: { include: { product: true } },
          fromBranch: true,
          toBranch: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'TRANSFER_APPROVED',
          entityType: 'Transfer',
          entityId: updatedTransfer.id,
          oldValue: transfer,
          newValue: updatedTransfer,
          ipAddress: req.ipAddress,
        },
      });

      return updatedTransfer;
    });

    emitToBranch(result.fromBranchId, 'transfer.statusChanged', result);
    emitToBranch(result.toBranchId, 'transfer.statusChanged', result);
    emitToOverseer('transfer.statusChanged', result);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.packTransfer = async (req, res, next) => {
  try {
    const transfer = await prisma.transfer.update({
      where: { id: req.params.id },
      data: { status: 'PACKED' },
      include: { 
        items: { include: { product: true } },
        fromBranch: true,
        toBranch: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'TRANSFER_PACKED',
        entityType: 'Transfer',
        entityId: transfer.id,
        newValue: transfer,
        ipAddress: req.ipAddress,
      },
    });

    emitToBranch(transfer.fromBranchId, 'transfer.statusChanged', transfer);
    emitToBranch(transfer.toBranchId, 'transfer.statusChanged', transfer);
    emitToOverseer('transfer.statusChanged', transfer);

    res.json(transfer);
  } catch (error) {
    next(error);
  }
};

exports.dispatchTransfer = async (req, res, next) => {
  try {
    const { parcelTracking } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });

      if (!transfer || !['APPROVED', 'PACKED'].includes(transfer.status)) {
        throw new Error('Transfer not ready for dispatch');
      }

      // Deduct from source branch
      for (const item of transfer.items) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: transfer.fromBranchId,
            },
          },
        });

        if (!inventory || inventory.quantity < item.quantityApproved) {
          throw new Error(`Insufficient stock to dispatch`);
        }

        await tx.inventory.update({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: transfer.fromBranchId,
            },
            version: inventory.version,
          },
          data: {
            quantity: { decrement: item.quantityApproved },
            version: { increment: 1 },
          },
        });

        await tx.transferItem.update({
          where: { id: item.id },
          data: { quantityDispatched: item.quantityApproved },
        });
      }

      const updatedTransfer = await tx.transfer.update({
        where: { id: req.params.id },
        data: {
          status: 'DISPATCHED',
          dispatchedById: req.user.id,
          dispatchedAt: new Date(),
          parcelTracking,
        },
        include: { 
          items: { include: { product: true } },
          fromBranch: true,
          toBranch: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'TRANSFER_DISPATCHED',
          entityType: 'Transfer',
          entityId: updatedTransfer.id,
          newValue: { transfer: updatedTransfer, parcelTracking },
          ipAddress: req.ipAddress,
        },
      });

      return updatedTransfer;
    });

    await cache.delPattern(`inventory:${result.fromBranchId}:*`);

    emitToBranch(result.fromBranchId, 'transfer.statusChanged', result);
    emitToBranch(result.toBranchId, 'transfer.statusChanged', result);
    emitToOverseer('transfer.statusChanged', result);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.receiveTransfer = async (req, res, next) => {
  try {
    const { items, discrepancyNotes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });

      if (!transfer || transfer.status !== 'DISPATCHED') {
        throw new Error('Transfer not dispatched');
      }

      let hasDiscrepancy = false;

      // Update received quantities and add to destination branch
      for (const item of items) {
        await tx.transferItem.update({
          where: { id: item.id },
          data: {
            quantityReceived: item.quantityReceived,
            discrepancyReason: item.discrepancyReason,
          },
        });

        const transferItem = transfer.items.find((ti) => ti.id === item.id);
        if (item.quantityReceived !== transferItem.quantityDispatched) {
          hasDiscrepancy = true;
        }

        // Add to receiving branch inventory
        await tx.inventory.upsert({
          where: {
            productId_branchId: {
              productId: transferItem.productId,
              branchId: transfer.toBranchId,
            },
          },
          update: {
            quantity: { increment: item.quantityReceived },
            version: { increment: 1 },
            lastRestockAt: new Date(),
          },
          create: {
            productId: transferItem.productId,
            branchId: transfer.toBranchId,
            quantity: item.quantityReceived,
            lastRestockAt: new Date(),
          },
        });
      }

      const updatedTransfer = await tx.transfer.update({
        where: { id: req.params.id },
        data: {
          status: hasDiscrepancy ? 'RECEIVED_WITH_DISCREPANCY' : 'RECEIVED',
          receivedById: req.user.id,
          receivedAt: new Date(),
          discrepancyNotes: hasDiscrepancy ? discrepancyNotes : null,
        },
        include: { 
          items: { include: { product: true } },
          fromBranch: true,
          toBranch: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'TRANSFER_RECEIVED',
          entityType: 'Transfer',
          entityId: updatedTransfer.id,
          newValue: { 
            transfer: updatedTransfer,
            hasDiscrepancy,
            discrepancyNotes,
          },
          ipAddress: req.ipAddress,
        },
      });

      return updatedTransfer;
    });

    await cache.delPattern(`inventory:${result.toBranchId}:*`);
    await cache.delPattern('dashboard:*');

    emitToBranch(result.fromBranchId, 'transfer.statusChanged', result);
    emitToBranch(result.toBranchId, 'transfer.statusChanged', result);
    emitToOverseer('transfer.statusChanged', result);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.cancelTransfer = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const transfer = await prisma.transfer.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        notes: `${transfer.notes || ''}\n[CANCELLED: ${reason}]`,
      },
      include: { 
        items: { include: { product: true } },
        fromBranch: true,
        toBranch: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'TRANSFER_CANCELLED',
        entityType: 'Transfer',
        entityId: transfer.id,
        newValue: { transfer, reason },
        ipAddress: req.ipAddress,
      },
    });

    emitToBranch(transfer.fromBranchId, 'transfer.statusChanged', transfer);
    emitToBranch(transfer.toBranchId, 'transfer.statusChanged', transfer);
    emitToOverseer('transfer.statusChanged', transfer);

    res.json(transfer);
  } catch (error) {
    next(error);
  }
};

exports.getTransfers = async (req, res, next) => {
  try {
    const { status, branchId, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) where.status = status;

    // Branch managers see transfers involving their branch
    if (req.user.role === 'MANAGER' && req.user.branchId) {
      where.OR = [
        { fromBranchId: req.user.branchId },
        { toBranchId: req.user.branchId },
      ];
    } else if (branchId) {
      where.OR = [
        { fromBranchId: branchId },
        { toBranchId: branchId },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          items: { include: { product: true } },
          fromBranch: true,
          toBranch: true,
          requestedBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
          dispatchedBy: { select: { name: true } },
          receivedBy: { select: { name: true } },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.transfer.count({ where }),
    ]);

    res.json({
      data: transfers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getTransfer = async (req, res, next) => {
  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        fromBranch: true,
        toBranch: true,
        requestedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        dispatchedBy: { select: { name: true } },
        receivedBy: { select: { name: true } },
      },
    });

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    res.json(transfer);
  } catch (error) {
    next(error);
  }
};

// ===================================
// GET BRANCH ORDER STREAM (Admin View - Branch Orders History)
// Fetches last 100 transfers for the order ledger view
// ===================================
exports.getPendingRequests = async (req, res, next) => {
  try {
    const { branchId } = req.query;

    // Build where clause - fetch ALL transfers (history view)
    // No status filter - we want to see the full order stream
    const where = {};

    // Filter by specific branch if provided
    if (branchId) {
      where.fromBranchId = branchId;
    }

    console.log('📋 Fetching Branch Order Stream:', where);

    const transfers = await prisma.transfer.findMany({
      where,
      take: 100, // Last 100 transfers for history
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                partNumber: true,
                vehicleMake: true,
                vehicleModel: true,
              },
            },
          },
        },
        fromBranch: {
          select: {
            id: true,
            name: true,
          },
        },
        toBranch: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' }, // Newest first
    });

    console.log(`✅ Found ${transfers.length} transfers in order stream`);

    res.json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    console.error('Get Branch Order Stream error:', error);
    next(error);
  }
};

// ===================================
// UPDATE TRANSFER STATUS (Admin Action)
// Hub-and-Spoke: Admin approves or rejects branch requests
// ===================================
exports.updateTransferStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    // APPROVED = Admin has seen/acknowledged the request (ready for processing)
    // CANCELLED = Admin has rejected the request
    const validStatuses = ['APPROVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    console.log(`📝 Admin updating Transfer ${id} to status: ${status}`);

    const result = await prisma.$transaction(async (tx) => {
      // Get existing transfer
      const existingTransfer = await tx.transfer.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          toBranch: true,
        },
      });

      if (!existingTransfer) {
        throw new Error('Transfer not found');
      }

      // Build update data
      const updateData = {
        status,
        notes: notes ? `${existingTransfer.notes || ''}\n${notes}` : existingTransfer.notes,
      };

      // If approving, log who approved and when
      if (status === 'APPROVED') {
        updateData.approvedById = req.user.id;
        updateData.approvedAt = new Date();
        console.log(`✅ Transfer approved by user: ${req.user.id}`);
      }

      // Update transfer status
      const updatedTransfer = await tx.transfer.update({
        where: { id },
        data: updateData,
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
          toBranch: {
            select: {
              id: true,
              name: true,
            },
          },
          requestedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: `TRANSFER_${status}`,
          entityType: 'Transfer',
          entityId: updatedTransfer.id,
          oldValue: JSON.stringify({ status: existingTransfer.status }),
          newValue: JSON.stringify({
            status,
            notes,
            approvedById: status === 'APPROVED' ? req.user.id : undefined,
            approvedAt: status === 'APPROVED' ? updateData.approvedAt : undefined,
          }),
          ipAddress: req.ipAddress,
        },
      });

      return updatedTransfer;
    });

    // Emit socket events to notify branch
    emitToBranch(result.toBranchId, 'transfer.statusChanged', result);
    emitToOverseer('transfer.statusChanged', result);

    const message = status === 'APPROVED'
      ? 'Request approved - Ready for allocation'
      : 'Request cancelled';

    console.log(`✅ Transfer ${id} updated to ${status}`);

    res.json({
      success: true,
      data: result,
      message,
    });
  } catch (error) {
    console.error('Update Transfer Status error:', error);
    next(error);
  }
};