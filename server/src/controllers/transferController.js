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
          },
          create: {
            productId: transferItem.productId,
            branchId: transfer.toBranchId,
            quantity: item.quantityReceived,
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