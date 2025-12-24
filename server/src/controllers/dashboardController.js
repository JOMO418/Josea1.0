const prisma = require('../utils/prisma');
const cache = require('../utils/cache');

// Helper to convert BigInt values to numbers/strings
const serializeBigInt = (obj) => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
};

exports.getOverseerDashboard = async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:overseer:stats';
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [branches, salesByBranch, lowStock, creditStats, recentSales] = await Promise.all([
      prisma.branch.findMany({ where: { isActive: true } }),
      
      // Sales per branch today
      prisma.$queryRaw`
        SELECT 
          b.id as "branchId",
          b.name as "branchName",
          COALESCE(SUM(s.total), 0) as "todaySales",
          COUNT(s.id) as "todayCount"
        FROM "Branch" b
        LEFT JOIN "Sale" s ON s."branchId" = b.id 
          AND s."createdAt" >= ${today}
          AND s."isReversed" = false
        WHERE b."isActive" = true
        GROUP BY b.id, b.name
      `,
      
      // Low stock items across all branches
      prisma.$queryRaw`
        SELECT 
          i.*, 
          p.name as "productName", 
          p."lowStockThreshold", 
          b.name as "branchName"
        FROM "Inventory" i
        INNER JOIN "Product" p ON i."productId" = p.id
        INNER JOIN "Branch" b ON i."branchId" = b.id
        WHERE i.quantity <= p."lowStockThreshold"
        ORDER BY i.quantity ASC
        LIMIT 20
      `,
      
      // Credit statistics
      prisma.sale.aggregate({
        where: {
          isCredit: true,
          creditStatus: { in: ['PENDING', 'PARTIAL'] },
          isReversed: false,
        },
        _sum: { total: true },
        _count: true,
      }),
      
      // Recent sales
      prisma.sale.findMany({
        where: { isReversed: false },
        take: 10,
        include: {
          branch: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Convert BigInt values from raw queries
    const salesByBranchSerialized = serializeBigInt(salesByBranch);
    const lowStockSerialized = serializeBigInt(lowStock);

    const totalSalesToday = salesByBranchSerialized.reduce(
      (sum, b) => sum + parseFloat(b.todaySales), 
      0
    );

    const totalStock = await prisma.inventory.aggregate({
      _sum: { quantity: true },
    });

    const pendingTransfers = await prisma.transfer.count({
      where: { status: { in: ['REQUESTED', 'APPROVED', 'DISPATCHED'] } },
    });

    const stats = {
      totalSalesToday,
      salesByBranch: salesByBranchSerialized,
      totalStock: totalStock._sum.quantity || 0,
      lowStockCount: lowStockSerialized.length,
      lowStockItems: lowStockSerialized,
      outstandingCredit: Number(creditStats._sum.total) || 0,
      creditSalesCount: creditStats._count || 0,
      pendingTransfers,
      recentSales,
      branches: branches.map(b => ({
        id: b.id,
        name: b.name,
        location: b.location,
      })),
    };

    await cache.set(cacheKey, stats, parseInt(process.env.CACHE_TTL_DASHBOARD) || 60);

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

exports.getBranchDashboard = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    // Managers can only access their own branch
    if (req.user.role === 'MANAGER' && req.user.branchId !== branchId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const cacheKey = `dashboard:${branchId}:stats`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [branch, todaySales, lowStock, creditStats, recentSales, pendingTransfers] = await Promise.all([
      prisma.branch.findUnique({ where: { id: branchId } }),
      
      prisma.sale.aggregate({
        where: {
          branchId,
          createdAt: { gte: today },
          isReversed: false,
        },
        _sum: { total: true },
        _count: true,
      }),
      
      prisma.$queryRaw`
        SELECT i.*, p.name as "productName", p."lowStockThreshold"
        FROM "Inventory" i
        INNER JOIN "Product" p ON i."productId" = p.id
        WHERE i."branchId" = ${branchId}
          AND i.quantity <= p."lowStockThreshold"
        ORDER BY i.quantity ASC
      `,
      
      prisma.sale.aggregate({
        where: {
          branchId,
          isCredit: true,
          creditStatus: { in: ['PENDING', 'PARTIAL'] },
          isReversed: false,
        },
        _sum: { total: true },
        _count: true,
      }),
      
      prisma.sale.findMany({
        where: { branchId, isReversed: false },
        take: 10,
        include: {
          user: { select: { name: true } },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      
      prisma.transfer.count({
        where: {
          OR: [
            { fromBranchId: branchId },
            { toBranchId: branchId },
          ],
          status: { in: ['REQUESTED', 'APPROVED', 'DISPATCHED'] },
        },
      }),
    ]);

    const totalInventory = await prisma.inventory.aggregate({
      where: { branchId },
      _sum: { quantity: true },
    });

    // Convert BigInt values from raw queries
    const lowStockSerialized = serializeBigInt(lowStock);

    const stats = {
      branch,
      todaySales: Number(todaySales._sum.total) || 0,
      todaySalesCount: todaySales._count || 0,
      totalStock: totalInventory._sum.quantity || 0,
      lowStockCount: lowStockSerialized.length,
      lowStockItems: lowStockSerialized,
      outstandingCredit: Number(creditStats._sum.total) || 0,
      creditSalesCount: creditStats._count || 0,
      pendingTransfers,
      recentSales,
    };

    await cache.set(cacheKey, stats, parseInt(process.env.CACHE_TTL_DASHBOARD) || 60);

    res.json(stats);
  } catch (error) {
    next(error);
  }
};