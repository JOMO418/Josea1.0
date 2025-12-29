const prisma = require('../utils/prisma');
const cache = require('../utils/cache');
const { startOfDay, subDays, format } = require('date-fns');

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

    // Recent activity across all branches (Intelligent Feed with Product Details)
    const recentActivityRaw = await prisma.sale.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { name: true } },
        user: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    // Transform to include product names
    const recentActivity = recentActivityRaw.map((sale) => ({
      id: sale.id,
      receiptNumber: sale.receiptNumber,
      branch: sale.branch.name,
      user: sale.user.name,
      amount: Number(sale.total),
      items: sale.items.map((item) => item.product.name),
      type: sale.isReversed ? 'REVERSAL' : 'SALE',
      timestamp: sale.createdAt.toISOString(),
    }));

    // ============================================
    // PHASE 2: DATA CENTER HUB ANALYTICS
    // ============================================

    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 29);

    // 1. Weekly Stats: Last 7 days revenue & cost
    const weeklyStats = await prisma.$queryRaw`
      SELECT
        TO_CHAR("Sale"."createdAt", 'Dy') as day,
        COALESCE(SUM("Sale".total), 0) as revenue,
        COALESCE(SUM("SaleItem".quantity * "Product"."costPrice"), 0) as cost
      FROM "Sale"
      INNER JOIN "SaleItem" ON "SaleItem"."saleId" = "Sale".id
      INNER JOIN "Product" ON "Product".id = "SaleItem"."productId"
      WHERE "Sale"."createdAt" >= ${last7Days}
        AND "Sale"."isReversed" = false
      GROUP BY TO_CHAR("Sale"."createdAt", 'Dy'), DATE("Sale"."createdAt")
      ORDER BY DATE("Sale"."createdAt") ASC
    `;

    // 2. Branch Share: Current month revenue by branch
    const branchShare = await prisma.$queryRaw`
      SELECT
        "Branch".name,
        COALESCE(SUM("Sale".total), 0) as value
      FROM "Branch"
      LEFT JOIN "Sale" ON "Sale"."branchId" = "Branch".id
        AND "Sale"."createdAt" >= ${startOfMonth}
        AND "Sale"."isReversed" = false
      WHERE "Branch"."isActive" = true
      GROUP BY "Branch".name
      ORDER BY value DESC
    `;

    // 3. Top Products: Best-selling by quantity (Last 30 days)
    const topProductsRaw = await prisma.$queryRaw`
      SELECT
        "Product".name,
        COALESCE(SUM("SaleItem".quantity), 0) as count
      FROM "Product"
      INNER JOIN "SaleItem" ON "SaleItem"."productId" = "Product".id
      INNER JOIN "Sale" ON "Sale".id = "SaleItem"."saleId"
      WHERE "Sale"."createdAt" >= ${last30Days}
        AND "Sale"."isReversed" = false
        AND "Product"."isActive" = true
      GROUP BY "Product".id, "Product".name
      ORDER BY count DESC
      LIMIT 5
    `;

    // Calculate percentage relative to #1 product
    const maxCount = topProductsRaw.length > 0 ? Number(topProductsRaw[0].count) : 1;
    const topProducts = topProductsRaw.map((p) => ({
      name: p.name,
      count: Number(p.count),
      percentage: maxCount > 0 ? Math.round((Number(p.count) / maxCount) * 100) : 0,
    }));

    // 4. Payment Stats: Payment method distribution (Last 30 days)
    // FIXED: Query SalePayment table instead of non-existent Sale.paymentMethod
    const paymentStatsRaw = await prisma.salePayment.groupBy({
      by: ['method'],
      where: {
        sale: {
          createdAt: { gte: last30Days },
          isReversed: false,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Transform to chart format
    const paymentStats = paymentStatsRaw.map((item) => ({
      name: item.method,
      value: Number(item._sum.amount) || 0,
    }));

    // ============================================
    // PHASE 3: GOD MODE ANALYTICS (The Masterpiece)
    // ============================================

    // METRIC 1: The Oracle - Revenue Forecast Engine (30 days + 7 day projection)
    const oracleDataRaw = await prisma.$queryRaw`
      SELECT
        DATE("Sale"."createdAt") as date,
        COALESCE(SUM("Sale".total), 0) as revenue,
        COALESCE(SUM("SaleItem".quantity * "Product"."costPrice"), 0) as cost
      FROM "Sale"
      INNER JOIN "SaleItem" ON "SaleItem"."saleId" = "Sale".id
      INNER JOIN "Product" ON "Product".id = "SaleItem"."productId"
      WHERE "Sale"."createdAt" >= ${last30Days}
        AND "Sale"."isReversed" = false
      GROUP BY DATE("Sale"."createdAt")
      ORDER BY DATE("Sale"."createdAt") ASC
    `;

    // Calculate margins and forecast
    const oracleDataSerialized = serializeBigInt(oracleDataRaw);
    const oracleData = oracleDataSerialized.map((d) => {
      const rev = Number(d.revenue) || 0;
      const cost = Number(d.cost) || 0;
      const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
      return {
        date: d.date,
        revenue: rev,
        cost: cost,
        margin: Math.round(margin * 100) / 100,
        predictedRevenue: null,
      };
    });

    // Calculate average daily growth rate for forecasting
    if (oracleData.length > 1) {
      const recentDays = oracleData.slice(-7); // Last 7 days
      let totalGrowth = 0;
      let growthCount = 0;

      for (let i = 1; i < recentDays.length; i++) {
        if (recentDays[i - 1].revenue > 0) {
          const growth = (recentDays[i].revenue - recentDays[i - 1].revenue) / recentDays[i - 1].revenue;
          totalGrowth += growth;
          growthCount++;
        }
      }

      const avgGrowthRate = growthCount > 0 ? totalGrowth / growthCount : 0.02; // Default 2% growth
      const lastRevenue = oracleData[oracleData.length - 1].revenue;

      // Project next 7 days
      const lastDate = new Date(oracleData[oracleData.length - 1].date);
      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + i);
        const predictedRev = lastRevenue * Math.pow(1 + avgGrowthRate, i);

        oracleData.push({
          date: futureDate.toISOString().split('T')[0],
          revenue: null,
          cost: null,
          margin: null,
          predictedRevenue: Math.round(predictedRev),
        });
      }
    }

    // METRIC 2: Branch Revenue Race - Daily revenue by branch (Last 30 days)
    const branchRaceRaw = await prisma.$queryRaw`
      SELECT
        DATE("Sale"."createdAt") as date,
        "Branch".name as branch,
        COALESCE(SUM("Sale".total), 0) as revenue
      FROM "Sale"
      INNER JOIN "Branch" ON "Branch".id = "Sale"."branchId"
      WHERE "Sale"."createdAt" >= ${last30Days}
        AND "Sale"."isReversed" = false
        AND "Branch"."isActive" = true
      GROUP BY DATE("Sale"."createdAt"), "Branch".name
      ORDER BY DATE("Sale"."createdAt") ASC
    `;

    // Transform to chart format: [{ date, Branch1: value, Branch2: value }]
    const branchRaceSerialized = serializeBigInt(branchRaceRaw);
    const branchRaceMap = new Map();

    branchRaceSerialized.forEach(({ date, branch, revenue }) => {
      const dateStr = date;
      if (!branchRaceMap.has(dateStr)) {
        branchRaceMap.set(dateStr, { date: dateStr });
      }
      branchRaceMap.get(dateStr)[branch] = Number(revenue);
    });

    const branchRaceData = Array.from(branchRaceMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // METRIC 3: Dead Stock - Inventory aging analysis
    const deadStockRaw = await prisma.$queryRaw`
      SELECT
        "Product".name,
        "Inventory".quantity,
        "Product"."costPrice",
        "Inventory"."updatedAt"
      FROM "Inventory"
      INNER JOIN "Product" ON "Product".id = "Inventory"."productId"
      WHERE "Inventory".quantity > 0
        AND "Product"."isActive" = true
    `;

    const deadStockSerialized = serializeBigInt(deadStockRaw);
    const now = new Date();
    let freshValue = 0;
    let deadValue = 0;

    deadStockSerialized.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.costPrice) || 0;
      const itemValue = qty * cost;
      const updatedAt = new Date(item.updatedAt);
      const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceUpdate > 90) {
        deadValue += itemValue;
      } else {
        freshValue += itemValue;
      }
    });

    const deadStockData = [
      { name: 'Fresh', value: Math.round(freshValue) },
      { name: 'Dead', value: Math.round(deadValue) },
    ];

    // METRIC 4: Top Products by Revenue (Not Quantity!)
    // FIXED: Changed "SaleItem".price to "SaleItem"."unitPrice" (correct schema)
    const topProductsByRevenueRaw = await prisma.$queryRaw`
      SELECT
        "Product".name,
        COALESCE(SUM("SaleItem".quantity * "SaleItem"."unitPrice"), 0) as totalRevenue
      FROM "Product"
      INNER JOIN "SaleItem" ON "SaleItem"."productId" = "Product".id
      INNER JOIN "Sale" ON "Sale".id = "SaleItem"."saleId"
      WHERE "Sale"."createdAt" >= ${last30Days}
        AND "Sale"."isReversed" = false
        AND "Product"."isActive" = true
      GROUP BY "Product".id, "Product".name
      ORDER BY totalRevenue DESC
      LIMIT 5
    `;

    const topProductsByRevenueSerialized = serializeBigInt(topProductsByRevenueRaw);
    const maxRevenue = topProductsByRevenueSerialized.length > 0 ? Number(topProductsByRevenueSerialized[0].totalRevenue) : 1;
    const topProductsByRevenue = topProductsByRevenueSerialized.map((p) => ({
      name: p.name,
      value: Number(p.totalRevenue),
      percent: maxRevenue > 0 ? Math.round((Number(p.totalRevenue) / maxRevenue) * 100) : 0,
    }));

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
    // recentActivity is already transformed, no serialization needed
    const inventoryValueSerialized = serializeBigInt(inventoryValue);
    const todayProfitSerialized = serializeBigInt(todayProfit);
    const monthProfitSerialized = serializeBigInt(monthProfit);
    const lowStockCountSerialized = serializeBigInt(lowStockCount);

    // Phase 2: Serialize new analytics data
    const weeklyStatsSerialized = serializeBigInt(weeklyStats);
    const branchShareSerialized = serializeBigInt(branchShare);
    // paymentStats is already transformed from Prisma groupBy, no serialization needed
    // topProducts is already transformed, no serialization needed

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

      // Recent Activity (Intelligent Feed) - Ensure array
      recentActivity: Array.isArray(recentActivity) ? recentActivity : [],

      // Phase 2: Data Center Hub Analytics
      weeklyStats: Array.isArray(weeklyStatsSerialized) ? weeklyStatsSerialized : [],
      branchShare: Array.isArray(branchShareSerialized) ? branchShareSerialized : [],
      topProducts: Array.isArray(topProducts) ? topProducts : [],
      paymentStats: Array.isArray(paymentStats) ? paymentStats : [],

      // Phase 3: God Mode Analytics (The Masterpiece)
      oracleData: Array.isArray(oracleData) ? oracleData : [],
      branchRaceData: Array.isArray(branchRaceData) ? branchRaceData : [],
      deadStockData: Array.isArray(deadStockData) ? deadStockData : [],
      topProductsByRevenue: Array.isArray(topProductsByRevenue) ? topProductsByRevenue : [],

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
    console.error('âŒ Admin stats critical error:', error);
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
      weeklyStats: [],
      branchShare: [],
      topProducts: [],
      paymentStats: [],
      oracleData: [],
      branchRaceData: [],
      deadStockData: [],
      topProductsByRevenue: [],
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

/**
 * Mission Control Dashboard API (Command Center)
 * Production-ready endpoint with real KPI calculations and 7-day performance data
 */
exports.getCommandCenterStats = async (req, res, next) => {
  try {
    console.log('\n========================================');
    console.log('ðŸš€ Command Center Stats Request Started');
    console.log('========================================\n');

    const cacheKey = 'dashboard:mission-control';

    // Clear cache to ensure fresh data (temporary for debugging)
    await cache.del(cacheKey);
    console.log('ðŸ—‘ï¸  Cache cleared');

    const cached = await cache.get(cacheKey);

    if (cached) {
      console.log('âš¡ Serving cached Command Center data');
      return res.json({ ...cached, cached: true });
    }

    console.log('ðŸ”„ Fetching fresh Command Center data from database...');

    // First, verify database connectivity and data existence
    const dbCheck = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM "Sale") as total_sales,
        (SELECT COUNT(*) FROM "Sale" WHERE "createdAt" >= NOW() - INTERVAL '7 days') as sales_last_7_days,
        (SELECT COUNT(*) FROM "Product") as total_products,
        (SELECT COUNT(*) FROM "Inventory") as total_inventory
    `;
    console.log('ðŸ“Š Database Check:', serializeBigInt(dbCheck)[0]);

    // ============================================
    // TIMEZONE-AWARE DATE RANGES (Kenya EAT = UTC+3)
    // ============================================

    const KENYA_OFFSET_HOURS = 3; // EAT is UTC+3

    // Get current time
    const now = new Date();
    console.log('ðŸ• Server Time (UTC):', now.toISOString());

    // Calculate Kenya time (UTC + 3 hours)
    const utcMillis = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kenyaTime = new Date(utcMillis + (3600000 * KENYA_OFFSET_HOURS));
    console.log('ðŸ• Kenya Time (EAT):', kenyaTime.toISOString());

    // Set to midnight Kenya time (00:00:00)
    kenyaTime.setHours(0, 0, 0, 0);
    console.log('ðŸ• Kenya Midnight:', kenyaTime.toISOString());

    // Convert Kenya midnight BACK to UTC for database queries
    // If Kenya midnight is Mon 00:00 (EAT), it's Sun 21:00 (UTC)
    const todayStartUTC = new Date(kenyaTime.getTime() - (3600000 * KENYA_OFFSET_HOURS));
    const tomorrowStartUTC = new Date(todayStartUTC.getTime() + (24 * 3600000));
    const yesterdayStartUTC = new Date(todayStartUTC.getTime() - (24 * 3600000));
    const last7DaysStartUTC = new Date(todayStartUTC.getTime() - (6 * 24 * 3600000)); // 6 days ago + today = 7 days

    console.log('ðŸ“… Date Ranges (UTC for DB queries):');
    console.log('  - Today Start (Kenya Mon 00:00):', todayStartUTC.toISOString());
    console.log('  - Yesterday Start:', yesterdayStartUTC.toISOString());
    console.log('  - Tomorrow Start:', tomorrowStartUTC.toISOString());
    console.log('  - Last 7 Days Start:', last7DaysStartUTC.toISOString());

    // Use these for queries
    const today = todayStartUTC;
    const yesterday = yesterdayStartUTC;
    const tomorrowStart = tomorrowStartUTC;
    const last7Days = last7DaysStartUTC;

    // ============================================
    // VITALS SECTION - REAL KPI CALCULATIONS
    // ============================================

    const [
      todayRevenueRaw,
      yesterdayRevenueRaw,
      todayProfitRaw,
      yesterdayProfitRaw,
      totalDebtRaw,
      inventoryValueRaw,
      lowStockCountRaw,
    ] = await Promise.all([
      // Today's revenue - Sum of Sale.total
      prisma.$queryRaw`
        SELECT COALESCE(SUM(total), 0) as revenue
        FROM "Sale"
        WHERE "createdAt" >= ${today}
          AND "isReversed" = false
      `,

      // Yesterday's revenue
      prisma.$queryRaw`
        SELECT COALESCE(SUM(total), 0) as revenue
        FROM "Sale"
        WHERE "createdAt" >= ${yesterday}
          AND "createdAt" < ${today}
          AND "isReversed" = false
      `,

      // Today's profit - Real calculation: (unitPrice - costPrice) * quantity
      prisma.$queryRaw`
        SELECT COALESCE(SUM(si.quantity * (si."unitPrice" - p."costPrice")), 0) as profit
        FROM "Sale" s
        INNER JOIN "SaleItem" si ON si."saleId" = s.id
        INNER JOIN "Product" p ON p.id = si."productId"
        WHERE s."createdAt" >= ${today}
          AND s."isReversed" = false
      `,

      // Yesterday's profit
      prisma.$queryRaw`
        SELECT COALESCE(SUM(si.quantity * (si."unitPrice" - p."costPrice")), 0) as profit
        FROM "Sale" s
        INNER JOIN "SaleItem" si ON si."saleId" = s.id
        INNER JOIN "Product" p ON p.id = si."productId"
        WHERE s."createdAt" >= ${yesterday}
          AND s."createdAt" < ${today}
          AND s."isReversed" = false
      `,

      // Total outstanding debt - Credit sales pending/partial payment
      prisma.$queryRaw`
        SELECT COALESCE(SUM(total), 0) as debt
        FROM "Sale"
        WHERE "isCredit" = true
          AND "creditStatus" IN ('PENDING', 'PARTIAL')
          AND "isReversed" = false
      `,

      // Inventory value (for reference, not displayed)
      prisma.$queryRaw`
        SELECT COALESCE(SUM(i.quantity * p."costPrice"), 0) as value
        FROM "Inventory" i
        INNER JOIN "Product" p ON p.id = i."productId"
        WHERE p."isActive" = true
      `,

      // Low stock count - Inventory where quantity <= lowStockThreshold
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT i.id)::int as count
        FROM "Inventory" i
        INNER JOIN "Product" p ON p.id = i."productId"
        WHERE i.quantity <= p."lowStockThreshold"
          AND p."isActive" = true
      `,
    ]);

    // Serialize and extract values
    const todayRevenue = Number(serializeBigInt(todayRevenueRaw)?.[0]?.revenue) || 0;
    const yesterdayRevenue = Number(serializeBigInt(yesterdayRevenueRaw)?.[0]?.revenue) || 0;
    const todayProfit = Number(serializeBigInt(todayProfitRaw)?.[0]?.profit) || 0;
    const yesterdayProfit = Number(serializeBigInt(yesterdayProfitRaw)?.[0]?.profit) || 0;

    // Calculate trends with division-by-zero handling
    const calculateTrend = (today, yesterday) => {
      if (yesterday === 0) {
        return today > 0 ? 100 : 0;
      }
      return ((today - yesterday) / yesterday) * 100;
    };

    const revenueTrend = calculateTrend(todayRevenue, yesterdayRevenue);
    const profitTrend = calculateTrend(todayProfit, yesterdayProfit);

    const vitals = {
      todayRevenue,
      yesterdayRevenue,
      todayProfit,
      yesterdayProfit,
      revenueTrend: Math.round(revenueTrend * 100) / 100,
      profitTrend: Math.round(profitTrend * 100) / 100,
      totalDebt: Number(serializeBigInt(totalDebtRaw)?.[0]?.debt) || 0,
      inventoryValue: Number(serializeBigInt(inventoryValueRaw)?.[0]?.value) || 0,
      lowStockCount: Number(serializeBigInt(lowStockCountRaw)?.[0]?.count) || 0,
    };

    // ============================================
    // CHART DATA - ROLLING 7 DAYS (Today - 6 days)
    // ============================================

    // Fetch daily revenue for the rolling 7-day period
    // CRITICAL FIX: Group by Kenya date (UTC + 3 hours), not UTC date
    const dailyRevenueRaw = await prisma.$queryRaw`
      SELECT
        DATE(s."createdAt" + INTERVAL '3 hours') as date,
        COALESCE(SUM(s.total), 0) as revenue
      FROM "Sale" s
      WHERE s."createdAt" >= ${last7Days}
        AND s."createdAt" < ${tomorrowStart}
        AND s."isReversed" = false
      GROUP BY DATE(s."createdAt" + INTERVAL '3 hours')
      ORDER BY date ASC
    `;

    const dailySerialized = serializeBigInt(dailyRevenueRaw);

    console.log('🔍 Raw SQL Results (grouped by Kenya date):', dailySerialized);

    // Create a complete rolling 7-day array with zero-filled values
    // Loop from (today - 6 days) to today (inclusive)
    const chartData = [];
    for (let i = 0; i < 7; i++) {
      // Calculate Kenya date for this day
      const utcDate = new Date(last7Days.getTime() + (i * 24 * 3600000));
      const kenyaDateForDay = new Date(utcDate.getTime() + (3600000 * KENYA_OFFSET_HOURS));
      const dayName = format(kenyaDateForDay, 'EEE'); // Mon, Tue, Wed (Kenya calendar)

      // CRITICAL FIX: Match using Kenya date, not UTC date
      const kenyaDateStr = format(kenyaDateForDay, 'yyyy-MM-dd');

      console.log(`  Day ${i}: ${dayName} (${kenyaDateStr})`);

      // Find matching revenue data
      const dayData = dailySerialized.find((item) => item.date === kenyaDateStr);
      const revenue = dayData ? Number(dayData.revenue) || 0 : 0;

      console.log(`    -> Found: ${dayData ? 'YES' : 'NO'}, Revenue: ${revenue}`);

      chartData.push({
        name: dayName,
        value: revenue,
      });
    }

    console.log('📈 Rolling 7-Day Chart Data (ends on Today):', chartData.map(d => `${d.name}: KES ${d.value}`).join(', '));

    // Debug logging for troubleshooting
    console.log('\nðŸ“Š CALCULATED STATS:');
    console.log('  - Today Revenue:', todayRevenue);
    console.log('  - Yesterday Revenue:', yesterdayRevenue);
    console.log('  - Today Profit:', todayProfit);
    console.log('  - Yesterday Profit:', yesterdayProfit);
    console.log('  - Total Debt:', vitals.totalDebt);
    console.log('  - Low Stock Count:', vitals.lowStockCount);
    console.log('  - Chart Data (7 days):', JSON.stringify(chartData, null, 2));

    // ============================================
    // BRANCH PERFORMANCE (Revenue + Transaction Count)
    // ============================================

    const branchPerformanceRaw = await prisma.$queryRaw`
      SELECT
        b.name,
        COALESCE(SUM(s.total), 0) as revenue,
        COUNT(s.id)::int as transactions
      FROM "Branch" b
      LEFT JOIN "Sale" s ON s."branchId" = b.id
        AND s."createdAt" >= ${today}
        AND s."createdAt" < ${tomorrowStart}
        AND s."isReversed" = false
      WHERE b."isActive" = true
      GROUP BY b.id, b.name
      ORDER BY revenue DESC
    `;

    const branchPerformanceSerialized = serializeBigInt(branchPerformanceRaw);
    const branchPerformance = branchPerformanceSerialized.map((item) => ({
      name: item.name,
      revenue: Number(item.revenue) || 0,
      transactions: Number(item.transactions) || 0,
    }));

    // ============================================
    // RECENT ACTIVITY (Live Feed)
    // ============================================

    const recentSales = await prisma.sale.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { name: true } },
        user: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    const recentActivity = recentSales.map((sale) => {
      // Create item summary
      let itemSummary = '';
      if (sale.items.length === 0) {
        itemSummary = 'No items';
      } else if (sale.items.length === 1) {
        itemSummary = sale.items[0].product.name;
      } else {
        const firstName = sale.items[0].product.name;
        const remaining = sale.items.length - 1;
        itemSummary = `${firstName} + ${remaining} other${remaining > 1 ? 's' : ''}`;
      }

      return {
        id: sale.id,
        receiptNumber: sale.receiptNumber,
        total: Number(sale.total),
        createdAt: sale.createdAt.toISOString(),
        isReversed: sale.isReversed,
        branch: sale.branch.name,
        user: sale.user.name,
        itemSummary,
      };
    });

    // ============================================
    // RESPONSE
    // ============================================

    const stats = {
      vitals,
      chartData,
      branchPerformance,
      recentActivity,
    };

    // Final logging before sending
    console.log('\nâœ… RESPONSE STRUCTURE:');
    console.log('  - Vitals Keys:', Object.keys(vitals));
    console.log('  - Chart Data Points:', chartData.length);
    console.log('  - Branch Performance:', branchPerformance.length);
    console.log('  - Recent Activity:', recentActivity.length);
    console.log('\nðŸ“¤ SENDING RESPONSE:', JSON.stringify(stats, null, 2));
    console.log('\n========================================\n');

    // Cache for 1 minute
    await cache.set(cacheKey, stats, 60);

    res.json(stats);
  } catch (error) {
    console.error('âŒ Mission Control stats error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Return safe fallback data
    const safeFallback = {
      vitals: {
        todayRevenue: 0,
        yesterdayRevenue: 0,
        todayProfit: 0,
        yesterdayProfit: 0,
        revenueTrend: 0,
        profitTrend: 0,
        totalDebt: 0,
        inventoryValue: 0,
        lowStockCount: 0,
      },
      chartData: [],
      branchPerformance: [],
      recentActivity: [],
      error: true,
      errorMessage: 'System temporarily unavailable. Please try again.',
    };

    return res.status(200).json(safeFallback);
  }
};

/**
 * Get All Branches
 * Fetches all branches for dropdown/filter purposes
 */
exports.getBranches = async (req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    res.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error('âŒ Get branches error:', error);
    next(error);
  }
};