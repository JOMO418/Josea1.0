const prisma = require('../utils/prisma');
const { Queue } = require('bullmq');
const { redis, isRedisAvailable } = require('../utils/redis');

// Only create queue if Redis is available
let exportQueue = null;

const initQueue = () => {
  if (isRedisAvailable() && !exportQueue) {
    exportQueue = new Queue('audit-exports', { connection: redis });
  }
  return exportQueue;
};

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

    // Try to use queue if Redis is available
    const queue = initQueue();
    if (queue) {
      const job = await queue.add('export-audit-logs', {
        userId: req.user.id,
        startDate,
        endDate,
        format,
      });

      return res.json({
        message: 'Export queued',
        jobId: job.id,
      });
    }

    // Fallback: Process export synchronously without Redis
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const headers = ['ID', 'Entity Type', 'Entity ID', 'Action', 'User', 'Changes', 'Created At'];
      const rows = logs.map(log => [
        log.id,
        log.entityType,
        log.entityId,
        log.action,
        log.user?.name || 'System',
        JSON.stringify(log.changes || {}),
        log.createdAt.toISOString(),
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
      return res.send(csv);
    }

    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
    return res.json(logs);
  } catch (error) {
    next(error);
  }
};
