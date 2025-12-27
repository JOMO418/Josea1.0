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

exports.getAdminStats = async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:admin:commandcenter';
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Measure DB latency
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStartTime;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate hourly sales for today (The Trend)
    const hourlySales = await prisma.$queryRaw`
      SELECT
        EXTRACT(HOUR FROM "Sale"."createdAt") as hour,
        COALESCE(SUM("Sale".total), 0) as revenue,
        COUNT(*) as count
      FROM "Sale"
      WHERE "Sale"."createdAt" >= ${today}
        AND "Sale"."isReversed" = false
      GROUP BY EXTRACT(HOUR FROM "Sale"."createdAt")
      ORDER BY hour ASC
    `;

    // Calculate daily revenue and profit for the last 7 days
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 6);

    const dailyStats = await prisma.$queryRaw`
      SELECT
        DATE(s."createdAt") as date,
        COALESCE(SUM(s.total), 0) as revenue,
        COALESCE(SUM(si.quantity * p."costPrice"), 0) as cost,
        COALESCE(SUM(s.total) - SUM(si.quantity * p."costPrice"), 0) as profit
      FROM "Sale" s
      INNER JOIN "SaleItem" si ON si."saleId" = s.id
      INNER JOIN "Product" p ON p.id = si."productId"
      WHERE s."createdAt" >= ${last7Days}
        AND s."isReversed" = false
      GROUP BY DATE(s."createdAt")
      ORDER BY date ASC
    `;

    // Sales by branch for today (The Race)
    const salesByBranch = await prisma.$queryRaw`
      SELECT
        b.id as "branchId",
        b.name as "branchName",
        COALESCE(SUM(s.total), 0) as revenue,
        COUNT(s.id) as count
      FROM "Branch" b
      LEFT JOIN "Sale" s ON s."branchId" = b.id
        AND s."createdAt" >= ${today}
        AND s."isReversed" = false
      WHERE b."isActive" = true
      GROUP BY b.id, b.name
      ORDER BY revenue DESC
    `;

    // Branch sales by hour (The Race Chart Data)
    const branchSalesByHour = await prisma.$queryRaw`
      SELECT
        EXTRACT(HOUR FROM s."createdAt") as hour,
        b.name as branch,
        COALESCE(SUM(s.total), 0) as revenue
      FROM "Sale" s
      INNER JOIN "Branch" b ON b.id = s."branchId"
      WHERE s."createdAt" >= ${today}
        AND s."isReversed" = false
        AND b."isActive" = true
      GROUP BY EXTRACT(HOUR FROM s."createdAt"), b.name
      ORDER BY hour ASC
    `;

    // Recent activity across all branches
    const recentActivity = await prisma.$queryRaw`
      SELECT
        'SALE' as type,
        s."createdAt" as timestamp,
        b.name as branch,
        u.name as "userName",
        s.total as amount,
        s."receiptNumber" as reference
      FROM "Sale" s
      INNER JOIN "Branch" b ON b.id = s."branchId"
      INNER JOIN "User" u ON u.id = s."userId"
      WHERE s."isReversed" = false
      ORDER BY s."createdAt" DESC
      LIMIT 10
    `;

    // Danger Zone Metrics
    const [lowStockCount, pendingReversals] = await Promise.all([
      // Count items where quantity <= lowStockThreshold
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT i.id)::int as count
        FROM "Inventory" i
        INNER JOIN "Product" p ON p.id = i."productId"
        WHERE i.quantity <= p."lowStockThreshold"
          AND p."isActive" = true
      `,

      // Count pending reversal requests
      prisma.sale.count({
        where: {
          reversalStatus: 'PENDING',
        },
      }),
    ]);

    // Aggregate metrics
    const [todayRevenue, monthRevenue, totalDebt, inventoryValue, todayProfit, monthProfit, activeUsers] = await Promise.all([
      // Today's revenue
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: today },
          isReversed: false,
        },
        _sum: { total: true },
      }),

      // This month's revenue
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          isReversed: false,
        },
        _sum: { total: true },
      }),

      // Total outstanding debt
      prisma.sale.aggregate({
        where: {
          isCredit: true,
          creditStatus: { in: ['PENDING', 'PARTIAL'] },
          isReversed: false,
        },
        _sum: { total: true },
      }),

      // Total inventory value (Sum of Quantity * CostPrice)
      prisma.$queryRaw`
        SELECT COALESCE(SUM(i.quantity * p."costPrice"), 0) as value
        FROM "Inventory" i
        INNER JOIN "Product" p ON p.id = i."productId"
      `,

      // Today's net profit
      prisma.$queryRaw`
        SELECT COALESCE(SUM(s.total) - SUM(si.quantity * p."costPrice"), 0) as profit
        FROM "Sale" s
        INNER JOIN "SaleItem" si ON si."saleId" = s.id
        INNER JOIN "Product" p ON p.id = si."productId"
        WHERE s."createdAt" >= ${today}
          AND s."isReversed" = false
      `,

      // This month's net profit
      prisma.$queryRaw`
        SELECT COALESCE(SUM(s.total) - SUM(si.quantity * p."costPrice"), 0) as profit
        FROM "Sale" s
        INNER JOIN "SaleItem" si ON si."saleId" = s.id
        INNER JOIN "Product" p ON p.id = si."productId"
        WHERE s."createdAt" >= ${startOfMonth}
          AND s."isReversed" = false
      `,

      // Active users count
      prisma.user.count({
        where: {
          isActive: true,
        },
      }),
    ]);

    // Serialize BigInt values
    const hourlySalesSerialized = serializeBigInt(hourlySales);
    const dailyStatsSerialized = serializeBigInt(dailyStats);
    const salesByBranchSerialized = serializeBigInt(salesByBranch);
    const branchSalesByHourSerialized = serializeBigInt(branchSalesByHour);
    const recentActivitySerialized = serializeBigInt(recentActivity);
    const inventoryValueSerialized = serializeBigInt(inventoryValue);
    const todayProfitSerialized = serializeBigInt(todayProfit);
    const monthProfitSerialized = serializeBigInt(monthProfit);
    const lowStockCountSerialized = serializeBigInt(lowStockCount);

    const stats = {
      // The Vitals
      vitals: {
        todayRevenue: Number(todayRevenue?._sum?.total) || 0,
        monthRevenue: Number(monthRevenue?._sum?.total) || 0,
        todayProfit: Number(todayProfitSerialized?.[0]?.profit) || 0,
        monthProfit: Number(monthProfitSerialized?.[0]?.profit) || 0,
        totalDebt: Number(totalDebt?._sum?.total) || 0,
        inventoryValue: Number(inventoryValueSerialized?.[0]?.value) || 0,
      },

      // The Trend (Hourly sales for today) - Ensure array
      hourlySales: Array.isArray(hourlySalesSerialized) ? hourlySalesSerialized : [],

      // The Profit Wedge (Last 7 days) - Ensure array
      dailyStats: Array.isArray(dailyStatsSerialized) ? dailyStatsSerialized : [],

      // Branch Performance (The Race) - Ensure array
      salesByBranch: Array.isArray(salesByBranchSerialized) ? salesByBranchSerialized : [],

      // Branch Sales by Hour (The Race Chart) - Ensure array
      branchSalesByHour: Array.isArray(branchSalesByHourSerialized) ? branchSalesByHourSerialized : [],

      // Recent Activity - Ensure array
      recentActivity: Array.isArray(recentActivitySerialized) ? recentActivitySerialized : [],

      // Danger Zone
      dangerZone: {
        lowStockCount: Number(lowStockCountSerialized?.[0]?.count) || 0,
        pendingReversals: Number(pendingReversals) || 0,
      },

      // System Status
      systemStatus: {
        dbLatency: `${dbLatency || 0}ms`,
        activeUsers: Number(activeUsers) || 0,
      },
    };

    await cache.set(cacheKey, stats, 60); // Cache for 1 minute

    res.json(stats);
  } catch (error) {
    console.error('❌ Admin stats critical error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Return safe fallback data to prevent frontend crash
    const safeFallback = {
      vitals: {
        todayRevenue: 0,
        monthRevenue: 0,
        todayProfit: 0,
        monthProfit: 0,
        totalDebt: 0,
        inventoryValue: 0,
      },
      hourlySales: [],
      dailyStats: [],
      salesByBranch: [],
      branchSalesByHour: [],
      recentActivity: [],
      dangerZone: {
        lowStockCount: 0,
        pendingReversals: 0,
      },
      systemStatus: {
        dbLatency: 'N/A',
        activeUsers: 0,
      },
      error: true,
      errorMessage: 'System temporarily unavailable. Please try again.',
    };

    return res.status(200).json(safeFallback);
  }
};
