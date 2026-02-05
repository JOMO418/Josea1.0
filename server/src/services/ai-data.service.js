const prisma = require('../utils/prisma');
const { format, subDays, startOfDay, endOfDay, parseISO } = require('date-fns');

/**
 * AI Data Access Service
 * Securely fetches and formats data for AI queries
 * Implements branch isolation and time limits for different user roles
 *
 * SECURITY: Masks PII (phone numbers) before sending to external AI
 * ACCURACY: All financial figures remain exact and unmodified
 */

/**
 * SECURITY HELPER: Mask phone number for privacy
 * Keeps last 4 digits visible for reference
 * @param {string} phone - Phone number to mask
 * @returns {string} - Masked phone number
 */
function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return 'N/A';

  // Keep only last 4 digits visible
  if (phone.length > 4) {
    return '****' + phone.slice(-4);
  }
  return '****';
}

/**
 * SECURITY HELPER: Sanitize customer object to remove PII
 * Masks phone numbers while keeping all other data intact
 * @param {Object} customer - Customer object
 * @returns {Object} - Sanitized customer object
 */
function sanitizeCustomer(customer) {
  if (!customer) return null;

  return {
    ...customer,
    phone: maskPhoneNumber(customer.phone), // Mask phone for privacy
    // All financial data remains accurate
    totalSpent: customer.totalSpent,
    totalDebt: customer.totalDebt,
  };
}

class AIDataService {
  /**
   * Get sales data with branch filtering and time limits
   * @param {Object} filters - { branchId?, startDate?, endDate?, userRole, maxDaysBack? }
   * @returns {Promise<Object>} Formatted sales data with summary and samples
   */
  async getSalesData(filters) {
    const { branchId, startDate, endDate, userRole, maxDaysBack = 14 } = filters;

    // Build where clause
    const where = { isReversed: false };

    // Branch filtering for managers
    if (branchId) {
      where.branchId = branchId;
    }

    // Time filtering
    let dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Manager time limit: enforce maximum days back
    if (userRole === 'MANAGER') {
      const maxDate = subDays(new Date(), maxDaysBack);
      if (!dateFilter.gte || dateFilter.gte < maxDate) {
        dateFilter.gte = maxDate;
      }
    }

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    try {
      const sales = await prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { name: true, partNumber: true, category: true },
              },
            },
          },
          payments: true,
          branch: { select: { name: true, location: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Limit to prevent huge datasets
      });

      return this.formatSalesData(sales);
    } catch (error) {
      console.error('❌ Error fetching sales data:', error);
      throw new Error('Failed to fetch sales data');
    }
  }

  /**
   * Format sales data for AI consumption
   * @param {Array} sales - Raw sales data from database
   * @returns {Object} Formatted and aggregated sales data
   */
  formatSalesData(sales) {
    const summary = {
      totalSales: sales.length,
      totalRevenue: 0,
      verifiedRevenue: 0,
      pendingVerification: 0,
      cashSales: 0,
      mpesaSales: 0,
      creditSales: 0,
      byBranch: {},
      topProducts: {},
      byDate: {},
      byPaymentMethod: {},
    };

    sales.forEach(sale => {
      const amount = parseFloat(sale.total);
      summary.totalRevenue += amount;

      // Revenue by verification status
      if (
        sale.mpesaVerificationStatus === 'VERIFIED' ||
        sale.mpesaVerificationStatus === 'NOT_APPLICABLE'
      ) {
        summary.verifiedRevenue += amount;
      } else if (sale.mpesaVerificationStatus === 'PENDING') {
        summary.pendingVerification += amount;
      }

      // By payment method
      sale.payments.forEach(payment => {
        const paymentAmount = parseFloat(payment.amount);
        if (payment.method === 'CASH') {
          summary.cashSales += paymentAmount;
        } else if (payment.method === 'MPESA') {
          summary.mpesaSales += paymentAmount;
        } else if (payment.method === 'CREDIT') {
          summary.creditSales += paymentAmount;
        }

        // Count by method
        if (!summary.byPaymentMethod[payment.method]) {
          summary.byPaymentMethod[payment.method] = { count: 0, amount: 0 };
        }
        summary.byPaymentMethod[payment.method].count++;
        summary.byPaymentMethod[payment.method].amount += paymentAmount;
      });

      // By branch
      const branchName = sale.branch.name;
      if (!summary.byBranch[branchName]) {
        summary.byBranch[branchName] = { count: 0, revenue: 0, items: 0 };
      }
      summary.byBranch[branchName].count++;
      summary.byBranch[branchName].revenue += amount;
      summary.byBranch[branchName].items += sale.items.length;

      // Top products
      sale.items.forEach(item => {
        const productName = item.product.name;
        if (!summary.topProducts[productName]) {
          summary.topProducts[productName] = { quantity: 0, revenue: 0, category: item.product.category };
        }
        summary.topProducts[productName].quantity += item.quantity;
        summary.topProducts[productName].revenue += parseFloat(item.total);
      });

      // By date
      const dateKey = format(new Date(sale.createdAt), 'yyyy-MM-dd');
      if (!summary.byDate[dateKey]) {
        summary.byDate[dateKey] = { count: 0, revenue: 0 };
      }
      summary.byDate[dateKey].count++;
      summary.byDate[dateKey].revenue += amount;
    });

    // Sort top products by revenue
    summary.topProducts = Object.entries(summary.topProducts)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

    // Calculate averages
    summary.averageTransaction = sales.length > 0 ? summary.totalRevenue / sales.length : 0;
    summary.averageItemsPerSale = sales.length > 0
      ? sales.reduce((sum, s) => sum + s.items.length, 0) / sales.length
      : 0;

    // Mask PII in raw sales data before sending to AI
    const sanitizedSales = sales.slice(0, 20).map(sale => ({
      ...sale,
      customer: sale.customer ? sanitizeCustomer(sale.customer) : null,
      // All financial figures remain accurate
      total: sale.total,
      items: sale.items,
      payments: sale.payments,
    }));

    return {
      summary,
      rawData: sanitizedSales, // PII-masked sales data
      dataPoints: sales.length,
    };
  }

  /**
   * Get comprehensive sales data with all details
   * Used for complex analysis queries
   * @param {Object} filters - { branchId?, startDate?, endDate?, status?, userRole? }
   * @returns {Promise<Object>} Complete sales data with all relationships
   */
  async getCompleteSalesData(filters) {
    const { branchId, startDate, endDate, status, userRole, maxDaysBack = 14 } = filters;

    const where = {};

    // Branch filter
    if (branchId) where.branchId = branchId;

    // Date range
    if (startDate || endDate || userRole === 'MANAGER') {
      const dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      // Manager limit
      if (userRole === 'MANAGER') {
        const maxDate = subDays(new Date(), maxDaysBack);
        if (!dateFilter.gte || dateFilter.gte < maxDate) {
          dateFilter.gte = maxDate;
        }
      }

      where.createdAt = dateFilter;
    }

    // Status filters
    if (status === 'flagged') {
      where.flaggedForVerification = true;
      where.mpesaVerificationStatus = 'PENDING';
    } else if (status === 'pending_reversal') {
      where.reversalStatus = 'PENDING';
    } else if (status === 'reversed') {
      where.isReversed = true;
    } else if (status) {
      // Credit status
      where.isCredit = true;
      where.creditStatus = status; // PENDING, PARTIAL, PAID
    } else {
      // Default: exclude reversed
      where.isReversed = false;
    }

    try {
      const sales = await prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { name: true, partNumber: true, category: true, costPrice: true, sellingPrice: true },
              },
            },
          },
          payments: { select: { method: true, amount: true, reference: true, createdAt: true } },
          creditPayments: { select: { amount: true, createdAt: true } },
          branch: { select: { name: true, location: true } },
          user: { select: { name: true } },
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      return this.formatDetailedSalesData(sales, filters);
    } catch (error) {
      console.error('❌ Error fetching complete sales data:', error);
      throw new Error('Failed to fetch sales data');
    }
  }

  /**
   * Format detailed sales data with comprehensive aggregations
   * @private
   */
  formatDetailedSalesData(sales, filters) {
    const summary = {
      totalSales: sales.length,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,

      // Payment breakdowns
      cashSales: 0,
      cashCount: 0,
      mpesaSales: 0,
      mpesaCount: 0,
      creditSales: 0,
      creditCount: 0,

      // Verification status
      verifiedRevenue: 0,
      pendingVerification: 0,
      flaggedCount: 0,
      flaggedValue: 0,

      // Credit analysis
      creditPending: 0,
      creditPartial: 0,
      creditPaid: 0,

      // Reversal tracking
      reversedCount: 0,
      reversedValue: 0,
      pendingReversalCount: 0,
      pendingReversalValue: 0,

      // Aggregations
      byBranch: {},
      byStaff: {},
      byDate: {},
      byHour: {},
      byPaymentMethod: {},
      topProducts: {},
      topCustomers: {},
    };

    sales.forEach(sale => {
      const amount = parseFloat(sale.total);
      summary.totalRevenue += amount;

      // Calculate cost and profit
      let saleCost = 0;
      sale.items.forEach(item => {
        saleCost += parseFloat(item.product.costPrice) * item.quantity;
      });
      summary.totalCost += saleCost;
      summary.totalProfit += (amount - saleCost);

      // Verification status
      if (sale.flaggedForVerification) {
        summary.flaggedCount++;
        summary.flaggedValue += amount;
      }
      if (sale.mpesaVerificationStatus === 'VERIFIED' || sale.mpesaVerificationStatus === 'NOT_APPLICABLE') {
        summary.verifiedRevenue += amount;
      } else if (sale.mpesaVerificationStatus === 'PENDING') {
        summary.pendingVerification += amount;
      }

      // Credit tracking
      if (sale.isCredit) {
        if (sale.creditStatus === 'PENDING') summary.creditPending += amount;
        else if (sale.creditStatus === 'PARTIAL') summary.creditPartial += amount;
        else if (sale.creditStatus === 'PAID') summary.creditPaid += amount;
      }

      // Reversal tracking
      if (sale.isReversed) {
        summary.reversedCount++;
        summary.reversedValue += amount;
      }
      if (sale.reversalStatus === 'PENDING') {
        summary.pendingReversalCount++;
        summary.pendingReversalValue += amount;
      }

      // Payment methods
      sale.payments.forEach(payment => {
        const paymentAmount = parseFloat(payment.amount);
        if (payment.method === 'CASH') {
          summary.cashSales += paymentAmount;
          summary.cashCount++;
        } else if (payment.method === 'MPESA') {
          summary.mpesaSales += paymentAmount;
          summary.mpesaCount++;
        } else if (payment.method === 'CREDIT') {
          summary.creditSales += paymentAmount;
          summary.creditCount++;
        }
      });

      // By branch
      const branchName = sale.branch.name;
      if (!summary.byBranch[branchName]) {
        summary.byBranch[branchName] = { count: 0, revenue: 0, profit: 0 };
      }
      summary.byBranch[branchName].count++;
      summary.byBranch[branchName].revenue += amount;
      summary.byBranch[branchName].profit += (amount - saleCost);

      // By staff
      const staffName = sale.user.name;
      if (!summary.byStaff[staffName]) {
        summary.byStaff[staffName] = { count: 0, revenue: 0 };
      }
      summary.byStaff[staffName].count++;
      summary.byStaff[staffName].revenue += amount;

      // By date
      const dateKey = format(new Date(sale.createdAt), 'yyyy-MM-dd');
      if (!summary.byDate[dateKey]) {
        summary.byDate[dateKey] = { count: 0, revenue: 0 };
      }
      summary.byDate[dateKey].count++;
      summary.byDate[dateKey].revenue += amount;

      // By hour (for pattern analysis)
      const hour = new Date(sale.createdAt).getHours();
      if (!summary.byHour[hour]) {
        summary.byHour[hour] = { count: 0, revenue: 0 };
      }
      summary.byHour[hour].count++;
      summary.byHour[hour].revenue += amount;

      // Top products
      sale.items.forEach(item => {
        const productName = item.product.name;
        if (!summary.topProducts[productName]) {
          summary.topProducts[productName] = {
            quantity: 0,
            revenue: 0,
            profit: 0,
            category: item.product.category
          };
        }
        summary.topProducts[productName].quantity += item.quantity;
        summary.topProducts[productName].revenue += parseFloat(item.total);
        const itemCost = parseFloat(item.product.costPrice) * item.quantity;
        summary.topProducts[productName].profit += (parseFloat(item.total) - itemCost);
      });

      // Top customers
      if (sale.customer) {
        const custName = sale.customer.name;
        if (!summary.topCustomers[custName]) {
          summary.topCustomers[custName] = {
            count: 0,
            revenue: 0,
            phone: maskPhoneNumber(sale.customer.phone)
          };
        }
        summary.topCustomers[custName].count++;
        summary.topCustomers[custName].revenue += amount;
      }
    });

    // Calculate profit margin
    summary.profitMargin = summary.totalRevenue > 0
      ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)
      : 0;

    // Sort top products
    summary.topProducts = Object.entries(summary.topProducts)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    // Sort top customers
    summary.topCustomers = Object.entries(summary.topCustomers)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    // Mask PII in sample sales
    const sanitizedSales = sales.slice(0, 30).map(sale => ({
      ...sale,
      customer: sale.customer ? sanitizeCustomer(sale.customer) : null,
      customerPhone: sale.customerPhone ? maskPhoneNumber(sale.customerPhone) : null,
    }));

    return {
      summary,
      sampleSales: sanitizedSales,
      dataPoints: sales.length,
      filters,
    };
  }

  /**
   * Compare two time periods
   * @param {Object} params - { branchId?, period1, period2, userRole? }
   * @returns {Promise<Object>} Comparison data with % changes
   */
  async comparePeriods(params) {
    const { branchId, period1, period2, userRole } = params;
    const { getDateRangeForTimeframe } = require('../utils/smartSalesAnalyzer');

    const range1 = getDateRangeForTimeframe(period1);
    const range2 = getDateRangeForTimeframe(period2);

    const [data1, data2] = await Promise.all([
      this.getCompleteSalesData({
        branchId,
        startDate: range1.startDate,
        endDate: range1.endDate,
        userRole
      }),
      this.getCompleteSalesData({
        branchId,
        startDate: range2.startDate,
        endDate: range2.endDate,
        userRole
      }),
    ]);

    // Calculate % changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return (((current - previous) / previous) * 100).toFixed(1);
    };

    return {
      period1: {
        name: period1,
        ...data1.summary,
      },
      period2: {
        name: period2,
        ...data2.summary,
      },
      changes: {
        revenue: calculateChange(data1.summary.totalRevenue, data2.summary.totalRevenue),
        salesCount: calculateChange(data1.summary.totalSales, data2.summary.totalSales),
        profit: calculateChange(data1.summary.totalProfit, data2.summary.totalProfit),
        averageTransaction: calculateChange(
          data1.summary.totalRevenue / data1.summary.totalSales,
          data2.summary.totalRevenue / data2.summary.totalSales
        ),
      },
    };
  }

  /**
   * Get inventory data
   * @param {Object} filters - { branchId?, lowStockOnly?, categoryFilter? }
   * @returns {Promise<Object>} Formatted inventory data
   */
  async getInventoryData(filters) {
    const { branchId, lowStockOnly = false, categoryFilter } = filters;

    const where = { isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }

    try {
      const inventory = await prisma.inventory.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              partNumber: true,
              category: true,
              sellingPrice: true,
              costPrice: true,
              lowStockThreshold: true,
              vehicleMake: true,
              vehicleModel: true,
            },
          },
          branch: { select: { name: true, location: true } },
        },
      });

      // Filter by category if specified
      let filteredInventory = inventory;
      if (categoryFilter) {
        filteredInventory = inventory.filter(item =>
          item.product.category?.toLowerCase().includes(categoryFilter.toLowerCase())
        );
      }

      // Filter low stock if requested
      if (lowStockOnly) {
        filteredInventory = filteredInventory.filter(item => {
          const threshold = item.lowStockThreshold || item.product.lowStockThreshold || 5;
          return item.quantity <= threshold;
        });
      }

      return this.formatInventoryData(filteredInventory);
    } catch (error) {
      console.error('❌ Error fetching inventory data:', error);
      throw new Error('Failed to fetch inventory data');
    }
  }

  /**
   * Format inventory data for AI consumption
   */
  formatInventoryData(inventory) {
    const summary = {
      totalProducts: inventory.length,
      totalValue: 0,
      totalCostValue: 0,
      lowStockItems: 0,
      outOfStock: 0,
      byBranch: {},
      byCategory: {},
      criticalItems: [],
    };

    inventory.forEach(item => {
      const sellingPrice = parseFloat(item.sellingPrice || item.product.sellingPrice);
      const costPrice = parseFloat(item.product.costPrice);
      const value = item.quantity * sellingPrice;
      const costValue = item.quantity * costPrice;

      summary.totalValue += value;
      summary.totalCostValue += costValue;

      const threshold = item.lowStockThreshold || item.product.lowStockThreshold || 5;

      if (item.quantity === 0) {
        summary.outOfStock++;
        summary.criticalItems.push({
          product: item.product.name,
          branch: item.branch.name,
          status: 'OUT_OF_STOCK',
          quantity: 0,
          threshold,
        });
      } else if (item.quantity <= threshold) {
        summary.lowStockItems++;
        summary.criticalItems.push({
          product: item.product.name,
          branch: item.branch.name,
          status: 'LOW_STOCK',
          quantity: item.quantity,
          threshold,
        });
      }

      // By branch
      const branchName = item.branch.name;
      if (!summary.byBranch[branchName]) {
        summary.byBranch[branchName] = { products: 0, value: 0, lowStock: 0, outOfStock: 0 };
      }
      summary.byBranch[branchName].products++;
      summary.byBranch[branchName].value += value;
      if (item.quantity === 0) summary.byBranch[branchName].outOfStock++;
      else if (item.quantity <= threshold) summary.byBranch[branchName].lowStock++;

      // By category
      const category = item.product.category || 'Uncategorized';
      if (!summary.byCategory[category]) {
        summary.byCategory[category] = { count: 0, value: 0, quantity: 0 };
      }
      summary.byCategory[category].count++;
      summary.byCategory[category].value += value;
      summary.byCategory[category].quantity += item.quantity;
    });

    // Sort critical items by severity
    summary.criticalItems = summary.criticalItems
      .sort((a, b) => {
        if (a.status === 'OUT_OF_STOCK' && b.status !== 'OUT_OF_STOCK') return -1;
        if (a.status !== 'OUT_OF_STOCK' && b.status === 'OUT_OF_STOCK') return 1;
        return a.quantity - b.quantity;
      })
      .slice(0, 20);

    // Calculate potential profit
    summary.potentialProfit = summary.totalValue - summary.totalCostValue;

    return {
      summary,
      items: inventory.slice(0, 50),
      dataPoints: inventory.length,
    };
  }

  /**
   * Get customer data
   * @param {Object} filters - { branchId?, withDebt?, topCustomers? }
   * @returns {Promise<Object>} Formatted customer data
   */
  async getCustomerData(filters) {
    const { branchId, withDebt = false, topCustomers = false } = filters;

    const where = {};
    if (withDebt) {
      where.totalDebt = { gt: 0 };
    }

    try {
      let customers = await prisma.customer.findMany({
        where,
        include: {
          sales: {
            where: branchId ? { branchId } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              branch: { select: { name: true } },
            },
          },
        },
        orderBy: { totalSpent: 'desc' },
        take: topCustomers ? 50 : 500,
      });

      // Filter by branch if needed (customers with sales in that branch)
      if (branchId) {
        customers = customers.filter(c => c.sales.length > 0);
      }

      return this.formatCustomerData(customers);
    } catch (error) {
      console.error('❌ Error fetching customer data:', error);
      throw new Error('Failed to fetch customer data');
    }
  }

  /**
   * Format customer data for AI consumption
   */
  formatCustomerData(customers) {
    const summary = {
      totalCustomers: customers.length,
      totalSpent: 0,
      totalDebt: 0,
      vipCustomers: 0, // >50,000 KES spent
      customersWithDebt: 0,
      averageSpending: 0,
      topCustomers: [],
      debtDistribution: {
        low: 0,      // 0-5,000
        medium: 0,   // 5,000-20,000
        high: 0,     // 20,000-50,000
        critical: 0, // >50,000
      },
    };

    customers.forEach(c => {
      const totalSpent = parseFloat(c.totalSpent);
      const totalDebt = parseFloat(c.totalDebt);

      summary.totalSpent += totalSpent;
      summary.totalDebt += totalDebt;

      if (totalSpent > 50000) summary.vipCustomers++;
      if (totalDebt > 0) summary.customersWithDebt++;

      // Debt distribution
      if (totalDebt > 0) {
        if (totalDebt <= 5000) summary.debtDistribution.low++;
        else if (totalDebt <= 20000) summary.debtDistribution.medium++;
        else if (totalDebt <= 50000) summary.debtDistribution.high++;
        else summary.debtDistribution.critical++;
      }
    });

    summary.averageSpending = customers.length > 0 ? summary.totalSpent / customers.length : 0;

    // Top customers - MASK PHONE NUMBERS for privacy
    summary.topCustomers = customers.slice(0, 10).map(c => ({
      name: c.name,
      phone: maskPhoneNumber(c.phone), // PRIVACY: Masked phone
      totalSpent: parseFloat(c.totalSpent), // ACCURACY: Exact amount
      totalDebt: parseFloat(c.totalDebt), // ACCURACY: Exact amount
      lastVisit: c.lastVisitAt,
      recentPurchases: c.sales.length,
    }));

    // Sanitize customer objects before sending to AI
    const sanitizedCustomers = customers.slice(0, 30).map(c => sanitizeCustomer(c));

    return {
      summary,
      customers: sanitizedCustomers, // PII-masked customer data
      dataPoints: customers.length,
    };
  }

  /**
   * Get debt/credit data
   * @param {Object} filters - { branchId?, statusFilter? }
   * @returns {Promise<Object>} Formatted debt data
   */
  async getDebtData(filters) {
    const { branchId, statusFilter } = filters;

    const where = {
      isCredit: true,
      isReversed: false,
    };

    if (statusFilter) {
      where.creditStatus = statusFilter;
    } else {
      where.creditStatus = { in: ['PENDING', 'PARTIAL'] };
    }

    if (branchId) {
      where.branchId = branchId;
    }

    try {
      const creditSales = await prisma.sale.findMany({
        where,
        include: {
          customer: true,
          creditPayments: {
            orderBy: { createdAt: 'desc' },
          },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      return this.formatDebtData(creditSales);
    } catch (error) {
      console.error('❌ Error fetching debt data:', error);
      throw new Error('Failed to fetch debt data');
    }
  }

  /**
   * Format debt data for AI consumption
   */
  formatDebtData(creditSales) {
    const summary = {
      totalCreditSales: creditSales.length,
      totalOutstanding: 0,
      totalPaid: 0,
      totalAmount: 0,
      byCustomer: {},
      byBranch: {},
      agingAnalysis: {
        current: 0,      // 0-7 days
        week: 0,         // 7-14 days
        twoWeeks: 0,     // 14-30 days
        month: 0,        // 30-60 days
        overdue: 0,      // >60 days
      },
    };

    const now = new Date();

    creditSales.forEach(sale => {
      const total = parseFloat(sale.total);
      const paid = sale.creditPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const outstanding = total - paid;

      summary.totalAmount += total;
      summary.totalOutstanding += outstanding;
      summary.totalPaid += paid;

      // Aging analysis
      const daysSince = Math.floor((now - new Date(sale.createdAt)) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) summary.agingAnalysis.current += outstanding;
      else if (daysSince <= 14) summary.agingAnalysis.week += outstanding;
      else if (daysSince <= 30) summary.agingAnalysis.twoWeeks += outstanding;
      else if (daysSince <= 60) summary.agingAnalysis.month += outstanding;
      else summary.agingAnalysis.overdue += outstanding;

      // By customer - MASK PHONE NUMBERS for privacy
      if (sale.customer) {
        const custName = sale.customer.name;
        if (!summary.byCustomer[custName]) {
          summary.byCustomer[custName] = {
            sales: 0,
            outstanding: 0, // ACCURACY: Exact debt amount
            paid: 0, // ACCURACY: Exact paid amount
            phone: maskPhoneNumber(sale.customer.phone), // PRIVACY: Masked phone
          };
        }
        summary.byCustomer[custName].sales++;
        summary.byCustomer[custName].outstanding += outstanding;
        summary.byCustomer[custName].paid += paid;
      }

      // By branch
      const branchName = sale.branch.name;
      if (!summary.byBranch[branchName]) {
        summary.byBranch[branchName] = { sales: 0, outstanding: 0, paid: 0 };
      }
      summary.byBranch[branchName].sales++;
      summary.byBranch[branchName].outstanding += outstanding;
      summary.byBranch[branchName].paid += paid;
    });

    // Sort by customer debt (highest first)
    summary.topDebtors = Object.entries(summary.byCustomer)
      .sort((a, b) => b[1].outstanding - a[1].outstanding)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    // Sanitize credit sales to mask customer PII
    const sanitizedCreditSales = creditSales.slice(0, 30).map(sale => ({
      ...sale,
      customer: sale.customer ? sanitizeCustomer(sale.customer) : null,
      // All financial figures remain accurate
      total: sale.total,
      creditPayments: sale.creditPayments,
    }));

    return {
      summary,
      creditSales: sanitizedCreditSales, // PII-masked credit sales data
      dataPoints: creditSales.length,
    };
  }

  /**
   * Get operational insights
   * @param {Object} filters - { branchId?, days? }
   * @returns {Promise<Object>} Operational metrics
   */
  async getOperationalInsights(filters) {
    const { branchId, days = 30 } = filters;

    const startDate = subDays(new Date(), days);
    const where = {
      createdAt: { gte: startDate },
      isReversed: false,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    try {
      const [sales, transfers, flaggedTransactions] = await Promise.all([
        prisma.sale.findMany({
          where,
          include: { payments: true, branch: { select: { name: true } } },
        }),
        prisma.transfer.findMany({
          where: branchId
            ? {
                OR: [{ fromBranchId: branchId }, { toBranchId: branchId }],
              }
            : undefined,
          orderBy: { requestedAt: 'desc' },
          take: 50,
          include: {
            fromBranch: { select: { name: true } },
            toBranch: { select: { name: true } },
          },
        }),
        prisma.sale.findMany({
          where: {
            ...where,
            flaggedForVerification: true,
            mpesaVerificationStatus: 'PENDING',
          },
        }),
      ]);

      // Analyze sales by hour
      const hourlyData = {};
      const dailyData = {};

      sales.forEach(sale => {
        const hour = new Date(sale.createdAt).getHours();
        const dayKey = format(new Date(sale.createdAt), 'EEEE'); // Day name

        if (!hourlyData[hour]) hourlyData[hour] = { count: 0, revenue: 0 };
        hourlyData[hour].count++;
        hourlyData[hour].revenue += parseFloat(sale.total);

        if (!dailyData[dayKey]) dailyData[dayKey] = { count: 0, revenue: 0 };
        dailyData[dayKey].count++;
        dailyData[dayKey].revenue += parseFloat(sale.total);
      });

      // Find busiest hours
      const busiestHours = Object.entries(hourlyData)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([hour, data]) => ({
          hour: `${hour}:00`,
          sales: data.count,
          revenue: data.revenue,
        }));

      // Find busiest days
      const busiestDays = Object.entries(dailyData)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 3)
        .map(([day, data]) => ({
          day,
          sales: data.count,
          revenue: data.revenue,
        }));

      return {
        summary: {
          period: `Last ${days} days`,
          totalSales: sales.length,
          averageDailySales: (sales.length / days).toFixed(1),
          busiestHours,
          busiestDays,
          pendingTransfers: transfers.filter(t => t.status === 'REQUESTED').length,
          flaggedTransactions: flaggedTransactions.length,
          flaggedValue: flaggedTransactions.reduce((sum, s) => sum + parseFloat(s.total), 0),
          transferActivity: transfers.length,
        },
        transfers: transfers.slice(0, 10),
        dataPoints: sales.length + transfers.length,
      };
    } catch (error) {
      console.error('❌ Error fetching operational insights:', error);
      throw new Error('Failed to fetch operational insights');
    }
  }
  /**
   * Get specific product details - INTELLIGENT SEARCH
   * CRITICAL: Used for price queries, stock checks, fitment queries
   * Handles misspellings, spacing issues, and tries multiple search variations
   * @param {Object} filters - { productName?, partNumber?, vehicleMake?, vehicleModel?, branchId?, category? }
   * @returns {Promise<Object>} Product details with inventory
   */
  async getProductDetails(filters) {
    const { productName, partNumber, vehicleMake, vehicleModel, branchId, category } = filters;
    const { generateSearchVariations } = require('../utils/smartProductSearch');

    try {
      let products = [];
      let searchAttempts = [];

      // ATTEMPT 1: Search by part number (EXACT match - highest priority)
      if (partNumber) {
        searchAttempts.push(`Part number: ${partNumber}`);
        products = await this.searchProducts({
          partNumber: partNumber.toUpperCase(),
          branchId,
        });

        if (products.length > 0) {
          return this.formatProductResults(products, searchAttempts, filters);
        }
      }

      // ATTEMPT 2: Try multiple search variations for product name
      if (productName && productName.trim().length >= 3) {
        const variations = generateSearchVariations(productName);
        console.log(`🔍 Trying ${variations.length} search variations for "${productName}"`);

        for (const variation of variations) {
          searchAttempts.push(`Name variation: "${variation}"`);

          products = await this.searchProducts({
            nameOrDescription: variation,
            vehicleMake,
            vehicleModel,
            category,
            branchId,
          });

          if (products.length > 0) {
            console.log(`✅ Found ${products.length} products with variation: "${variation}"`);
            return this.formatProductResults(products, searchAttempts, filters);
          }
        }
      }

      // ATTEMPT 3: Search by category only (if specified)
      if (category && products.length === 0) {
        searchAttempts.push(`Category only: ${category}`);
        products = await this.searchProducts({
          category,
          vehicleMake,
          vehicleModel,
          branchId,
        });

        if (products.length > 0) {
          return this.formatProductResults(products, searchAttempts, filters);
        }
      }

      // ATTEMPT 4: Search by vehicle fitment only (if specified)
      if ((vehicleMake || vehicleModel) && products.length === 0) {
        searchAttempts.push(`Vehicle fitment: ${vehicleMake || ''} ${vehicleModel || ''}`);
        products = await this.searchProducts({
          vehicleMake,
          vehicleModel,
          branchId,
        });

        if (products.length > 0) {
          return this.formatProductResults(products, searchAttempts, filters);
        }
      }

      // No results found after all attempts
      console.log(`❌ No products found after ${searchAttempts.length} attempts`);
      return {
        products: [],
        count: 0,
        searchCriteria: filters,
        searchAttempts,
        message: 'No products found matching your search criteria.',
      };
    } catch (error) {
      console.error('❌ Error in smart product search:', error);
      throw new Error('Failed to search products');
    }
  }

  /**
   * Execute product search with given criteria
   * @private
   */
  async searchProducts(criteria) {
    const { nameOrDescription, partNumber, vehicleMake, vehicleModel, category, branchId } = criteria;

    const where = { isActive: true };

    // Part number search (exact match)
    if (partNumber) {
      where.partNumber = { equals: partNumber, mode: 'insensitive' };
    }

    // Name/description search
    if (nameOrDescription) {
      where.OR = [
        { name: { contains: nameOrDescription, mode: 'insensitive' } },
        { description: { contains: nameOrDescription, mode: 'insensitive' } },
        { partNumber: { contains: nameOrDescription, mode: 'insensitive' } },
        { category: { contains: nameOrDescription, mode: 'insensitive' } },
      ];
    }

    // Vehicle fitment
    if (vehicleMake) {
      where.vehicleMake = { contains: vehicleMake, mode: 'insensitive' };
    }
    if (vehicleModel) {
      where.vehicleModel = { contains: vehicleModel, mode: 'insensitive' };
    }

    // Category filter
    if (category && !nameOrDescription) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    return await prisma.product.findMany({
      where,
      include: {
        inventory: {
          where: branchId ? { branchId, isActive: true } : { isActive: true },
          include: {
            branch: { select: { name: true, location: true } },
          },
        },
        supplierProducts: {
          include: {
            supplier: {
              select: {
                name: true,
                location: true,
                branchName: true,
                contactPerson: true,
                phone: true,
              },
            },
          },
        },
      },
      take: 20, // Limit results
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Format product search results
   * @private
   */
  formatProductResults(products, searchAttempts, originalFilters) {
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      partNumber: product.partNumber,
      category: product.category,
      fitment: {
        make: product.vehicleMake,
        model: product.vehicleModel,
        engine: product.vehicleEngine,
      },
      pricing: {
        costPrice: parseFloat(product.costPrice), // EXACT from database
        minPrice: parseFloat(product.minPrice), // EXACT from database
        sellingPrice: parseFloat(product.sellingPrice), // EXACT from database
        margin: parseFloat(product.sellingPrice) - parseFloat(product.costPrice),
        marginPercent: ((parseFloat(product.sellingPrice) - parseFloat(product.costPrice)) / parseFloat(product.sellingPrice) * 100).toFixed(1),
      },
      inventory: product.inventory.map(inv => ({
        branch: inv.branch.name,
        location: inv.branch.location,
        quantity: inv.quantity, // EXACT stock level
        branchPrice: inv.sellingPrice ? parseFloat(inv.sellingPrice) : parseFloat(product.sellingPrice), // EXACT price
        lowStockThreshold: inv.lowStockThreshold || product.lowStockThreshold,
        isLowStock: inv.quantity <= (inv.lowStockThreshold || product.lowStockThreshold),
        lastSoldAt: inv.lastSoldAt,
        lastRestockAt: inv.lastRestockAt,
      })),
      suppliers: product.supplierProducts.map(sp => ({
        name: sp.supplier.name,
        location: sp.supplier.location,
        branch: sp.supplier.branchName,
        contact: sp.supplier.contactPerson,
        phone: sp.supplier.phone,
        wholesalePrice: parseFloat(sp.wholesalePrice), // EXACT wholesale price
        currency: sp.currency,
        isAvailable: sp.isAvailable,
      })),
    }));

    return {
      products: formattedProducts,
      count: formattedProducts.length,
      searchCriteria: originalFilters,
      searchAttempts,
    };
  }

  /**
   * Get transaction details by receipt number or M-Pesa code
   * CRITICAL: Used for receipt/M-Pesa code lookups
   * @param {Object} filters - { receiptNumber?, mpesaCode?, branchId? }
   * @returns {Promise<Object>} Transaction details
   */
  async getTransactionDetails(filters) {
    const { receiptNumber, mpesaCode, branchId } = filters;

    try {
      let transaction = null;

      if (receiptNumber) {
        transaction = await prisma.sale.findFirst({
          where: {
            receiptNumber,
            ...(branchId ? { branchId } : {}),
          },
          include: {
            items: {
              include: {
                product: {
                  select: { name: true, partNumber: true },
                },
              },
            },
            payments: true,
            creditPayments: true,
            customer: true,
            branch: { select: { name: true, location: true } },
            user: { select: { name: true } },
          },
        });
      } else if (mpesaCode) {
        // Try MpesaTransaction table first
        const mpesaTransaction = await prisma.mpesaTransaction.findFirst({
          where: {
            mpesaReceiptNumber: mpesaCode,
            ...(branchId ? { branchId } : {}),
          },
          include: {
            branch: { select: { name: true } },
            initiatedByUser: { select: { name: true } },
          },
        });

        if (mpesaTransaction) {
          return {
            type: 'mpesa_transaction',
            mpesaCode,
            amount: parseFloat(mpesaTransaction.amount), // EXACT amount
            phoneNumber: maskPhoneNumber(mpesaTransaction.phoneNumber),
            status: mpesaTransaction.status,
            resultDesc: mpesaTransaction.resultDesc,
            transactionDate: mpesaTransaction.transactionDate,
            branch: mpesaTransaction.branch.name,
            initiatedBy: mpesaTransaction.initiatedByUser.name,
            createdAt: mpesaTransaction.createdAt,
          };
        }

        // Try Sale table
        transaction = await prisma.sale.findFirst({
          where: {
            mpesaReceiptNumber: mpesaCode,
            ...(branchId ? { branchId } : {}),
          },
          include: {
            items: {
              include: {
                product: {
                  select: { name: true, partNumber: true },
                },
              },
            },
            payments: true,
            creditPayments: true,
            customer: true,
            branch: { select: { name: true, location: true } },
            user: { select: { name: true } },
          },
        });
      }

      if (!transaction) {
        return {
          found: false,
          searchCriteria: { receiptNumber, mpesaCode },
        };
      }

      // Format transaction details
      return {
        found: true,
        type: 'sale',
        receiptNumber: transaction.receiptNumber,
        date: transaction.createdAt,
        branch: transaction.branch.name,
        branchLocation: transaction.branch.location,
        servedBy: transaction.user.name,
        customer: transaction.customer ? {
          name: transaction.customer.name,
          phone: maskPhoneNumber(transaction.customer.phone), // PRIVACY: Masked
        } : {
          name: transaction.customerName || 'Walk-in Customer',
          phone: transaction.customerPhone ? maskPhoneNumber(transaction.customerPhone) : 'N/A',
        },
        items: transaction.items.map(item => ({
          product: item.product.name,
          partNumber: item.product.partNumber,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice), // EXACT price
          total: parseFloat(item.total), // EXACT total
        })),
        financial: {
          subtotal: parseFloat(transaction.subtotal), // EXACT
          discount: parseFloat(transaction.discount), // EXACT
          total: parseFloat(transaction.total), // EXACT
        },
        payments: transaction.payments.map(payment => ({
          method: payment.method,
          amount: parseFloat(payment.amount), // EXACT
          reference: payment.reference,
        })),
        creditInfo: transaction.isCredit ? {
          status: transaction.creditStatus,
          totalPaid: transaction.creditPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
          outstanding: parseFloat(transaction.total) - transaction.creditPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
        } : null,
        mpesaVerification: {
          status: transaction.mpesaVerificationStatus,
          mpesaCode: transaction.mpesaReceiptNumber,
          verifiedAt: transaction.verifiedAt,
          verificationMethod: transaction.verificationMethod,
          flagged: transaction.flaggedForVerification,
        },
      };
    } catch (error) {
      console.error('❌ Error fetching transaction details:', error);
      throw new Error('Failed to fetch transaction details');
    }
  }

  /**
   * Get supplier information
   * @param {Object} filters - { supplierName?, location?, productId? }
   * @returns {Promise<Object>} Supplier details
   */
  async getSupplierData(filters) {
    const { supplierName, location, productId } = filters;

    try {
      const where = { isActive: true };

      if (supplierName) {
        where.OR = [
          { name: { contains: supplierName, mode: 'insensitive' } },
          { branchName: { contains: supplierName, mode: 'insensitive' } },
        ];
      }

      if (location) {
        where.location = location;
      }

      const suppliers = await prisma.supplier.findMany({
        where,
        include: {
          supplierProducts: productId ? {
            where: { productId },
            include: {
              product: {
                select: { name: true, partNumber: true, sellingPrice: true },
              },
            },
          } : {
            take: 10,
            include: {
              product: {
                select: { name: true, partNumber: true, sellingPrice: true },
              },
            },
          },
        },
        take: 20,
      });

      const formattedSuppliers = suppliers.map(supplier => ({
        name: supplier.name,
        location: supplier.location,
        branchName: supplier.branchName,
        contact: {
          person: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
        },
        specialties: supplier.specialties,
        products: supplier.supplierProducts.map(sp => ({
          name: sp.product.name,
          partNumber: sp.product.partNumber,
          wholesalePrice: parseFloat(sp.wholesalePrice), // EXACT wholesale price
          currency: sp.currency,
          ourSellingPrice: parseFloat(sp.product.sellingPrice), // EXACT selling price
          margin: parseFloat(sp.product.sellingPrice) - parseFloat(sp.wholesalePrice),
          isAvailable: sp.isAvailable,
        })),
        notes: supplier.notes,
      }));

      return {
        suppliers: formattedSuppliers,
        count: formattedSuppliers.length,
      };
    } catch (error) {
      console.error('❌ Error fetching supplier data:', error);
      throw new Error('Failed to fetch supplier data');
    }
  }

  /**
   * Get transfer details
   * @param {Object} filters - { branchId?, transferNumber?, status? }
   * @returns {Promise<Object>} Transfer information
   */
  async getTransferData(filters) {
    const { branchId, transferNumber, status } = filters;

    try {
      const where = {};

      if (transferNumber) {
        where.transferNumber = transferNumber;
      }

      if (status) {
        where.status = status;
      }

      if (branchId && !transferNumber) {
        where.OR = [
          { fromBranchId: branchId },
          { toBranchId: branchId },
        ];
      }

      const transfers = await prisma.transfer.findMany({
        where,
        include: {
          fromBranch: { select: { name: true, location: true } },
          toBranch: { select: { name: true, location: true } },
          requestedBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
          dispatchedBy: { select: { name: true } },
          receivedBy: { select: { name: true } },
          items: {
            include: {
              product: {
                select: { name: true, partNumber: true },
              },
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        take: 20,
      });

      const formattedTransfers = transfers.map(transfer => ({
        transferNumber: transfer.transferNumber,
        from: {
          branch: transfer.fromBranch.name,
          location: transfer.fromBranch.location,
        },
        to: {
          branch: transfer.toBranch.name,
          location: transfer.toBranch.location,
        },
        status: transfer.status,
        timeline: {
          requested: transfer.requestedAt,
          requestedBy: transfer.requestedBy.name,
          approved: transfer.approvedAt,
          approvedBy: transfer.approvedBy?.name,
          dispatched: transfer.dispatchedAt,
          dispatchedBy: transfer.dispatchedBy?.name,
          received: transfer.receivedAt,
          receivedBy: transfer.receivedBy?.name,
        },
        tracking: transfer.parcelTracking,
        items: transfer.items.map(item => ({
          product: item.product.name,
          partNumber: item.product.partNumber,
          requested: item.quantityRequested,
          approved: item.quantityApproved,
          dispatched: item.quantityDispatched,
          received: item.quantityReceived,
          hasDiscrepancy: item.quantityReceived !== item.quantityDispatched,
          discrepancyReason: item.discrepancyReason,
        })),
        notes: transfer.notes,
        discrepancyNotes: transfer.discrepancyNotes,
      }));

      return {
        transfers: formattedTransfers,
        count: formattedTransfers.length,
      };
    } catch (error) {
      console.error('❌ Error fetching transfer data:', error);
      throw new Error('Failed to fetch transfer data');
    }
  }

  /**
   * Get procurement order details (ADMIN ONLY)
   * @param {Object} filters - { orderNumber?, status? }
   * @returns {Promise<Object>} Procurement order information
   */
  async getProcurementData(filters) {
    const { orderNumber, status } = filters;

    try {
      const where = {};

      if (orderNumber) {
        where.orderNumber = orderNumber;
      }

      if (status) {
        where.status = status;
      }

      const orders = await prisma.procurementOrder.findMany({
        where,
        include: {
          assignedTo: { select: { name: true } },
          createdBy: { select: { name: true } },
          items: {
            include: {
              product: { select: { name: true, partNumber: true } },
              supplier: { select: { name: true, location: true, branchName: true } },
              alternativeSupplier: { select: { name: true, location: true } },
            },
          },
          supplierPayments: {
            include: {
              supplier: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      const formattedOrders = orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        priority: order.priority,
        assignedTo: order.assignedTo?.name,
        createdBy: order.createdBy.name,
        totalAmount: parseFloat(order.totalAmount), // EXACT amount
        itemsCount: order.items.length,
        purchasedCount: order.items.filter(i => i.isPurchased).length,
        receivedCount: order.items.filter(i => i.isReceived).length,
        items: order.items.map(item => ({
          product: item.product.name,
          partNumber: item.product.partNumber,
          supplier: item.supplier.name,
          supplierLocation: `${item.supplier.location} - ${item.supplier.branchName}`,
          quantity: item.quantity,
          expectedPrice: parseFloat(item.expectedPrice), // EXACT expected price
          actualPrice: item.actualPrice ? parseFloat(item.actualPrice) : null, // EXACT actual price
          subtotal: parseFloat(item.subtotal), // EXACT
          isPurchased: item.isPurchased,
          isReceived: item.isReceived,
          purchasedAt: item.purchasedAt,
          workerNotes: item.workerNotes,
          usedAlternative: !!item.alternativeSupplierId,
          alternativeSupplier: item.alternativeSupplier ? item.alternativeSupplier.name : null,
        })),
        supplierPayments: order.supplierPayments.map(payment => ({
          supplier: payment.supplier.name,
          expectedAmount: parseFloat(payment.expectedAmount), // EXACT
          actualAmount: payment.actualAmount ? parseFloat(payment.actualAmount) : null, // EXACT
          status: payment.paymentStatus,
          method: payment.paymentMethod,
          paidAt: payment.paidAt,
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }));

      return {
        orders: formattedOrders,
        count: formattedOrders.length,
      };
    } catch (error) {
      console.error('❌ Error fetching procurement data:', error);
      throw new Error('Failed to fetch procurement data');
    }
  }
}

// Export singleton instance
module.exports = new AIDataService();
