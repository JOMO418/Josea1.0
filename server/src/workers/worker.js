const { Worker } = require('bullmq');
const { redis, isRedisAvailable } = require('../utils/redis');
const prisma = require('../utils/prisma');
const fs = require('fs').promises;
const path = require('path');

// Wait for Redis connection to be established
const startWorker = async () => {
  // Give Redis time to connect
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!isRedisAvailable()) {
    console.log('⚠️ Redis not available - worker not started (exports will run synchronously)');
    return;
  }

  // Audit export worker
  const auditExportWorker = new Worker(
    'audit-exports',
    async (job) => {
      const { userId, startDate, endDate, format } = job.data;

      const where = {};
      if (startDate) where.createdAt = { gte: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

      const logs = await prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });

      if (format === 'csv') {
        const csv = [
          'Timestamp,User,Action,Entity Type,Entity ID,IP Address',
          ...logs.map(log =>
            `${log.createdAt},${log.user?.name || 'System'},${log.action},${log.entityType},${log.entityId},${log.ipAddress || ''}`
          ),
        ].join('\n');

        const filename = `audit-export-${Date.now()}.csv`;
        const filepath = path.join(__dirname, '../../exports', filename);

        await fs.mkdir(path.dirname(filepath), { recursive: true });
        await fs.writeFile(filepath, csv);

        return { filename, filepath, recordCount: logs.length };
      }

      return { recordCount: logs.length };
    },
    { connection: redis }
  );

  auditExportWorker.on('completed', (job) => {
    console.log(`✅ Export job ${job.id} completed:`, job.returnvalue);
  });

  auditExportWorker.on('failed', (job, err) => {
    console.error(`❌ Export job ${job.id} failed:`, err);
  });

  console.log('🔧 Worker started with Redis connection');
};

startWorker().catch(err => {
  console.error('Worker startup error:', err.message);
});
