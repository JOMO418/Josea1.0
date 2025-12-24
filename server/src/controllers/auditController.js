const prisma = require('../utils/prisma');
const { Queue } = require('bullmq');
const redis = require('../utils/redis');

const exportQueue = new Queue('audit-exports', { connection: redis });

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { 
      entityType, 
      action, 
      userId, 
      startDate,
      endDate,
      page = 1,
      limit = 100,
    } = req.query;

    const where = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
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

exports.exportAuditLogs = async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'csv' } = req.query;

    // Queue the export job
    const job = await exportQueue.add('export-audit-logs', {
      userId: req.user.id,
      startDate,
      endDate,
      format,
    });

    res.json({
      message: 'Export queued',
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
};