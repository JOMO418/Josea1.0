// server/controllers/customerController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ===================================
// GET CUSTOMER STATISTICS
// ===================================

exports.getCustomerStats = async (req, res) => {
  const { branchId } = req.query;

  try {
    // Calculate date 30 days ago for active customers
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Calculate date 60 days ago for previous period comparison
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Build where clause for branch filtering
    const whereAllCustomers = {};
    const whereSales = branchId ? { branchId } : {};

    // Get all customers (optionally filtered by branch through their sales)
    let allCustomers;
    if (branchId) {
      // Get customers who have made purchases at this branch
      allCustomers = await prisma.customer.findMany({
        where: {
          sales: {
            some: { branchId },
          },
        },
        select: {
          id: true,
          totalSpent: true,
          totalDebt: true,
          lastVisitAt: true,
          createdAt: true,
        },
      });
    } else {
      // Get all customers
      allCustomers = await prisma.customer.findMany({
        select: {
          id: true,
          totalSpent: true,
          totalDebt: true,
          lastVisitAt: true,
          createdAt: true,
        },
      });
    }

    // Calculate metrics
    const totalCustomers = allCustomers.length;
    const activeCustomers = allCustomers.filter(
      c => new Date(c.lastVisitAt) >= thirtyDaysAgo
    ).length;
    const totalDebt = allCustomers.reduce(
      (sum, c) => sum + Number(c.totalDebt),
      0
    );
    const vipCustomers = allCustomers.filter(
      c => Number(c.totalSpent) > 100000
    ).length;

    // Calculate previous period metrics for trends
    const previousPeriodCustomers = allCustomers.filter(
      c => new Date(c.createdAt) < thirtyDaysAgo
    ).length;
    const previousActiveCustomers = allCustomers.filter(
      c => new Date(c.lastVisitAt) >= sixtyDaysAgo && new Date(c.lastVisitAt) < thirtyDaysAgo
    ).length;

    // Calculate trends
    const customersGrowth = previousPeriodCustomers > 0
      ? ((totalCustomers - previousPeriodCustomers) / previousPeriodCustomers * 100).toFixed(1)
      : 0;
    const activeGrowth = previousActiveCustomers > 0
      ? ((activeCustomers - previousActiveCustomers) / previousActiveCustomers * 100).toFixed(1)
      : 0;

    // Get branch breakdown if not filtering by specific branch
    let branchBreakdown = [];
    if (!branchId) {
      const branches = await prisma.branch.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      branchBreakdown = await Promise.all(
        branches.map(async (branch) => {
          const branchCustomers = await prisma.customer.findMany({
            where: {
              sales: {
                some: { branchId: branch.id },
              },
            },
            select: {
              id: true,
              lastVisitAt: true,
            },
          });

          return {
            branchId: branch.id,
            branchName: branch.name,
            customerCount: branchCustomers.length,
            activeCount: branchCustomers.filter(
              c => new Date(c.lastVisitAt) >= thirtyDaysAgo
            ).length,
          };
        })
      );
    }

    res.json({
      totalCustomers,
      activeCustomers,
      totalDebt: Number(totalDebt.toFixed(2)),
      vipCustomers,
      trends: {
        customersGrowth: Number(customersGrowth),
        activeGrowth: Number(activeGrowth),
        debtGrowth: 0, // Can be enhanced later
      },
      branchBreakdown,
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({ message: 'Unable to load customer statistics. Please refresh the page' });
  }
};

// ===================================
// GET ALL CUSTOMERS (WITH PAGINATION AND FILTERS)
// ===================================

exports.getCustomers = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    branchId,
    status,
    sortBy = 'lastVisitAt',
    sortOrder = 'desc',
  } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {};

    // Search by name or phone
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Branch filter - customers who have made purchases at this branch
    if (branchId) {
      where.sales = {
        some: { branchId },
      };
    }

    // Status filters
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    if (status === 'active') {
      where.lastVisitAt = { gte: thirtyDaysAgo };
    } else if (status === 'hasDebt') {
      where.totalDebt = { gt: 0 };
    } else if (status === 'vip') {
      where.totalSpent = { gt: 100000 };
    } else if (status === 'inactive') {
      where.lastVisitAt = { lt: sixtyDaysAgo };
    }

    // Build orderBy clause
    let orderBy = {};
    if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (sortBy === 'totalSpent') {
      orderBy = { totalSpent: sortOrder };
    } else if (sortBy === 'totalDebt') {
      orderBy = { totalDebt: sortOrder };
    } else {
      orderBy = { lastVisitAt: sortOrder };
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        include: {
          sales: {
            select: {
              id: true,
              branchId: true,
              total: true,
              createdAt: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5, // Include last 5 sales for each customer
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    // Enhance customer data with calculated fields
    const enhancedCustomers = customers.map((customer) => {
      // Determine primary branch (branch with most sales)
      const branchCounts = {};
      customer.sales.forEach((sale) => {
        if (!branchCounts[sale.branchId]) {
          branchCounts[sale.branchId] = { count: 0, name: sale.branch.name };
        }
        branchCounts[sale.branchId].count++;
      });

      const primaryBranch = Object.entries(branchCounts).sort(
        ([, a], [, b]) => b.count - a.count
      )[0];

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalSpent: Number(customer.totalSpent),
        totalDebt: Number(customer.totalDebt),
        lastVisitAt: customer.lastVisitAt,
        createdAt: customer.createdAt,
        orderCount: customer.sales.length,
        primaryBranch: primaryBranch
          ? { id: primaryBranch[0], name: primaryBranch[1].name }
          : null,
      };
    });

    res.json({
      customers: enhancedCustomers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Unable to load customers. Please refresh the page' });
  }
};

// ===================================
// GET CUSTOMER DETAILS (FULL PROFILE)
// ===================================

exports.getCustomerDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
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
            payments: true,
            creditPayments: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: 'This customer profile could not be found' });
    }

    // Calculate Credit Score: Total Spent / (Total Debt + 1)
    const creditScore = (
      Number(customer.totalSpent) / (Number(customer.totalDebt) + 1)
    ).toFixed(2);

    // Calculate Frequent Items (Top 3 Most Purchased Products)
    const productCounts = {};

    for (const sale of customer.sales) {
      for (const item of sale.items) {
        const productName = item.product.name;
        if (!productCounts[productName]) {
          productCounts[productName] = 0;
        }
        productCounts[productName] += item.quantity;
      }
    }

    const frequentItems = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Build timeline events from sales and payments
    const timeline = [];

    for (const sale of customer.sales) {
      // Add sale event
      timeline.push({
        type: sale.isCredit ? 'CREDIT_SALE' : 'CASH_SALE',
        date: sale.createdAt,
        amount: Number(sale.total),
        receiptNumber: sale.receiptNumber,
        saleId: sale.id,
        creditStatus: sale.creditStatus,
        branch: sale.branch.name,
        items: sale.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: Number(item.unitPrice),
          total: Number(item.total),
        })),
        payments: sale.payments.map(p => ({
          method: p.method,
          amount: Number(p.amount),
        })),
        creditPayments: sale.creditPayments,
      });

      // Add payment events
      for (const payment of sale.creditPayments) {
        timeline.push({
          type: 'PAYMENT',
          date: payment.createdAt,
          amount: Number(payment.amount),
          method: payment.paymentMethod,
          receiptNumber: sale.receiptNumber,
          saleId: sale.id,
        });
      }
    }

    // Sort timeline by date descending
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Filter active debts (sales with pending/partial credit)
    const activeDebts = customer.sales.filter(
      sale => sale.isCredit && sale.creditStatus !== 'PAID'
    );

    // Filter settled debts
    const settledDebts = customer.sales.filter(
      sale => sale.isCredit && sale.creditStatus === 'PAID'
    );

    res.json({
      ...customer,
      creditScore: parseFloat(creditScore),
      frequentItems,
      timeline,
      activeDebts,
      settledDebts,
    });
  } catch (error) {
    console.error('Get customer details error:', error);
    res.status(500).json({ message: 'Unable to load customer details. Please refresh the page' });
  }
};

// ===================================
// UPDATE CUSTOMER (EDIT PROFILE)
// ===================================

exports.updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;

  // Validation
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Please enter the customer name' });
  }

  if (!phone || phone.trim().length === 0) {
    return res.status(400).json({ message: 'Please enter a phone number' });
  }

  try {
    // Check if phone is already taken by another customer
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: phone.trim() },
    });

    if (existingCustomer && existingCustomer.id !== id) {
      return res.status(400).json({
        message: 'This phone number is already registered to another customer',
      });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CUSTOMER_UPDATED',
        entityType: 'CUSTOMER',
        entityId: id,
        newValue: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      },
    });

    res.json(updatedCustomer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Unable to update customer. Please try again' });
  }
};

// Export all functions
module.exports = exports;
