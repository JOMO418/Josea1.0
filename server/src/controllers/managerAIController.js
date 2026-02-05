const prisma = require('../utils/prisma');
const geminiService = require('../services/gemini.service');
const aiDataService = require('../services/ai-data.service');
const { getManagerSystemPrompt } = require('../config/ai-prompts');
const { validateAIQuery, sanitizeQuery } = require('../utils/aiQueryValidator');

/**
 * Manager AI Controller
 * Handles AI queries for MANAGER users with branch-limited access
 * - Restricted to their assigned branch only
 * - Maximum 14-day lookback period
 * - No conversation history (stateless)
 * - Simple, clear responses
 */

/**
 * Process AI query with branch-limited access
 */
exports.query = async (req, res, next) => {
  const startTime = Date.now();
  const userId = req.user.id;
  const userRole = req.user.role;
  const userName = req.user.name || 'Manager';
  const branchId = req.user.branchId;

  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Validate query length to prevent excessive token usage
    if (message.length > 1000) {
      return res.status(400).json({
        error: 'Message too long',
        message: 'Please keep your query under 1000 characters'
      });
    }

    // SECURITY: Validate query for malicious patterns (especially branch access attempts)
    const validation = validateAIQuery(message, userRole);
    if (!validation.valid) {
      console.warn('⚠️ Invalid manager query blocked:', validation.error);
      return res.status(400).json({
        error: 'Invalid query',
        message: validation.error,
      });
    }

    // SECURITY: Sanitize query
    const sanitizedMessage = sanitizeQuery(message);

    // Verify manager has a branch assigned
    if (!branchId) {
      return res.status(403).json({
        error: 'No branch assigned to your account. Please contact administrator.',
      });
    }

    // Get manager's branch information
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, location: true },
    });

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Generate system prompt for manager
    const systemPrompt = getManagerSystemPrompt(userName, branch.name, branch.id);

    // Analyze query to determine what data to fetch
    const queryAnalysis = analyzeManagerQuery(sanitizedMessage);
    console.log('📊 Manager query analysis:', queryAnalysis);

    // Fetch relevant data - ALWAYS filtered by manager's branch
    let contextData = {};

    try {
      // PRIORITY 1: Product Details (most common for managers)
      if (queryAnalysis.needsProductDetails) {
        contextData.products = await aiDataService.getProductDetails({
          productName: queryAnalysis.productQuery,
          partNumber: queryAnalysis.partNumber,
          vehicleMake: queryAnalysis.vehicleMake,
          vehicleModel: queryAnalysis.vehicleModel,
          branchId, // CRITICAL: Manager only sees their branch
        });
        console.log('🔍 Manager product search:', {
          branch: branch.name,
          query: queryAnalysis.productQuery,
          vehicle: `${queryAnalysis.vehicleMake} ${queryAnalysis.vehicleModel}`.trim(),
          found: contextData.products?.count || 0
        });
      }

      // PRIORITY 2: Transaction Lookup
      if (queryAnalysis.needsTransactionLookup) {
        contextData.transaction = await aiDataService.getTransactionDetails({
          receiptNumber: queryAnalysis.receiptNumber,
          mpesaCode: queryAnalysis.mpesaCode,
          branchId, // CRITICAL: Manager only sees their branch
        });
      }

      // COMPREHENSIVE SALES DATA (with all details for managers)
      if (queryAnalysis.needsSales) {
        const { analyzeSalesQuery } = require('../utils/smartSalesAnalyzer');
        const salesAnalysis = analyzeSalesQuery(sanitizedMessage);

        console.log('📊 Manager sales query:', {
          intent: salesAnalysis.intent,
          timeframe: salesAnalysis.timeframe,
          status: salesAnalysis.status,
        });

        // Always use comprehensive data for managers to get full details
        contextData.salesDetailed = await aiDataService.getCompleteSalesData({
          branchId, // CRITICAL: Always filter by manager's branch
          startDate: queryAnalysis.startDate,
          endDate: queryAnalysis.endDate,
          status: salesAnalysis.status,
          userRole: 'MANAGER', // Enforces 14-day limit
          maxDaysBack: 14, // Hard limit for managers
        });
      }

      if (queryAnalysis.needsInventory) {
        contextData.inventory = await aiDataService.getInventoryData({
          branchId, // CRITICAL: Branch filter
          lowStockOnly: queryAnalysis.lowStockOnly,
        });
      }

      if (queryAnalysis.needsCustomers) {
        contextData.customers = await aiDataService.getCustomerData({
          branchId, // CRITICAL: Branch filter
          withDebt: queryAnalysis.debtQuery,
        });
      }

      if (queryAnalysis.needsDebt) {
        contextData.debt = await aiDataService.getDebtData({
          branchId, // CRITICAL: Branch filter
        });
      }

      if (queryAnalysis.needsOperational) {
        contextData.operational = await aiDataService.getOperationalInsights({
          branchId, // CRITICAL: Branch filter
          days: Math.min(queryAnalysis.days || 14, 14), // Max 14 days
        });
      }
    } catch (dataError) {
      console.error('❌ Error fetching manager context data:', dataError);
      throw new Error(`Failed to fetch business data: ${dataError.message}`);
    }

    // Build contextual message with data (using sanitized message)
    const enhancedMessage = buildSimpleContextualMessage(sanitizedMessage, contextData, branch.name);

    // Generate AI response (no conversation history for managers)
    const aiResponse = await geminiService.generateResponse(
      systemPrompt,
      enhancedMessage,
      [] // No conversation history
    );

    // Log query for audit (sanitized query)
    await prisma.AIQueryLog.create({
      data: {
        userId,
        userRole,
        branchId, // Manager's branch
        query: sanitizedMessage,
        response: aiResponse.text,
        tokensUsed: aiResponse.tokensUsed,
        responseTimeMs: Date.now() - startTime,
        dataPointsAccessed: Object.values(contextData).reduce(
          (sum, data) => sum + (data?.dataPoints || 0),
          0
        ),
        queryType: queryAnalysis.type,
        successful: true,
      },
    });

    // Return response
    res.json({
      response: aiResponse.text,
      tokensUsed: aiResponse.tokensUsed,
      responseTime: aiResponse.responseTimeMs,
      branch: branch.name,
      dataContext: {
        salesRecords: contextData.sales?.dataPoints || 0,
        inventoryItems: contextData.inventory?.dataPoints || 0,
        customers: contextData.customers?.dataPoints || 0,
      },
    });
  } catch (error) {
    console.error('❌ Manager AI query error:', error);

    // Log failed query
    try {
      await prisma.AIQueryLog.create({
        data: {
          userId,
          userRole,
          branchId,
          query: req.body.message || '',
          response: null,
          tokensUsed: 0,
          responseTimeMs: Date.now() - startTime,
          dataPointsAccessed: 0,
          queryType: 'unknown',
          successful: false,
          errorMessage: error.message,
        },
      });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }

    next(error);
  }
};

/**
 * Get AI usage statistics for manager
 */
exports.getUsage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.AIUsageTracking.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    const limit = parseInt(process.env.AI_RATE_LIMIT_MANAGER) || 25;
    const used = usage?.queryCount || 0;
    const remaining = Math.max(0, limit - used);

    res.json({
      limit,
      used,
      remaining,
      resetAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching manager usage:', error);
    next(error);
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Analyze manager query (simpler than admin analysis)
 * PRIORITY: Product queries FIRST (most common operation)
 */
function analyzeManagerQuery(message) {
  const lowerMessage = message.toLowerCase();

  const analysis = {
    type: 'general',
    needsProductDetails: false,
    needsTransactionLookup: false,
    needsSales: false,
    needsInventory: false,
    needsCustomers: false,
    needsDebt: false,
    needsOperational: false,

    // Product query details
    productQuery: null,
    partNumber: null,
    vehicleMake: null,
    vehicleModel: null,

    // Transaction lookup
    receiptNumber: null,
    mpesaCode: null,

    lowStockOnly: false,
    debtQuery: false,
    startDate: null,
    endDate: null,
    days: 7,
  };

  // PRIORITY 1: PRODUCT QUERIES (INTELLIGENT DETECTION)
  // Uses smart detection - works even without keywords
  const { isProductQuery, extractProductContext } = require('../utils/smartProductSearch');

  if (isProductQuery(message)) {
    analysis.needsProductDetails = true;
    analysis.type = 'product';

    // Extract all product context intelligently
    const context = extractProductContext(message);
    analysis.partNumber = context.partNumber;
    analysis.productQuery = context.productName;
    analysis.vehicleMake = context.vehicleMake;
    analysis.vehicleModel = context.vehicleModel;

    console.log('🎯 Manager product query:', {
      partNumber: analysis.partNumber,
      productName: analysis.productQuery,
      vehicle: `${analysis.vehicleMake || ''} ${analysis.vehicleModel || ''}`.trim(),
    });
  }

  // PRIORITY 2: Transaction Lookup
  const receiptMatch = lowerMessage.match(/\b(REC-[\d-]+|receipt\s*#?\s*([\d-]+))\b/i);
  if (receiptMatch) {
    analysis.needsTransactionLookup = true;
    analysis.type = 'transaction';
    analysis.receiptNumber = receiptMatch[1] || receiptMatch[2];
  }

  const mpesaMatch = lowerMessage.match(/\b([A-Z]{3}\d{7,10}|mpesa\s*#?\s*([A-Z0-9]+))\b/i);
  if (mpesaMatch) {
    analysis.needsTransactionLookup = true;
    analysis.type = 'transaction';
    analysis.mpesaCode = mpesaMatch[1] || mpesaMatch[2];
  }

  // Standard queries (lower priority)
  if (!analysis.needsProductDetails && lowerMessage.match(/\b(sale|sales|uza|sold|revenue|transaction)\b/i)) {
    analysis.needsSales = true;
    if (analysis.type === 'general') analysis.type = 'sales';
  }

  if (!analysis.needsProductDetails && lowerMessage.match(/\b(stock.*summary|inventory.*report)\b/i)) {
    analysis.needsInventory = true;
    if (analysis.type === 'general') analysis.type = 'inventory';
    if (lowerMessage.match(/\b(low|running|finish|alert)\b/i)) {
      analysis.lowStockOnly = true;
    }
  }

  if (lowerMessage.match(/\b(customer|client|buyer|wateja)\b/i)) {
    analysis.needsCustomers = true;
    if (analysis.type === 'general') analysis.type = 'customer';
  }

  if (lowerMessage.match(/\b(debt|credit|deni|owe|owing)\b/i)) {
    analysis.needsDebt = true;
    analysis.debtQuery = true;
    if (analysis.type === 'general') analysis.type = 'debt';
  }

  // Time period detection (simple)
  if (lowerMessage.match(/\b(today|leo)\b/i)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    analysis.startDate = today;
    analysis.endDate = new Date();
    analysis.days = 1;
  } else if (lowerMessage.match(/\b(yesterday|jana)\b/i)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    analysis.startDate = yesterday;
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    analysis.endDate = endOfYesterday;
    analysis.days = 1;
  } else if (lowerMessage.match(/\b(this week|hii wiki|week)\b/i)) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    analysis.startDate = monday;
    analysis.endDate = new Date();
    analysis.days = 7;
  }

  // If query asks for "all" or general info, provide sales + inventory
  if (
    !analysis.needsSales &&
    !analysis.needsInventory &&
    !analysis.needsCustomers &&
    !analysis.needsDebt
  ) {
    // Default to sales if asking about performance
    if (lowerMessage.match(/\b(how|what|show|all|everything)\b/i)) {
      analysis.needsSales = true;
      analysis.needsInventory = true;
      analysis.type = 'general';
    }
  }

  return analysis;
}

/**
 * Build simple contextual message for managers
 */
function buildSimpleContextualMessage(message, contextData, branchName) {
  let contextualMessage = `Branch: ${branchName}\nUser Query: ${message}\n\n`;

  if (Object.keys(contextData).length === 0) {
    contextualMessage += 'No specific data available for this query.\n';
    return contextualMessage;
  }

  contextualMessage += `Business Data for ${branchName}:\n\n`;

  // PRIORITY: Product Details (most common for managers)
  if (contextData.products) {
    if (contextData.products.count === 0) {
      contextualMessage += `**Product Search:**\nNo products found.\n\n`;
      contextualMessage += 'INSTRUCTION: Ask for more details (part number or clearer name).\n\n';
    } else {
      contextualMessage += `**Products Found (${contextData.products.count}):**\n`;
      contextData.products.products.forEach((product, index) => {
        contextualMessage += `\n${index + 1}. ${product.name}\n`;
        if (product.partNumber) contextualMessage += `   Part#: ${product.partNumber}\n`;
        if (product.fitment.make) {
          contextualMessage += `   Fits: ${product.fitment.make} ${product.fitment.model || ''}`.trim() + '\n';
        }
        contextualMessage += `   PRICE: ${product.pricing.sellingPrice} KES (EXACT)\n`;

        // Only show THIS branch's stock
        const branchStock = product.inventory.find(inv => inv.branch === branchName);
        if (branchStock) {
          const status = branchStock.quantity === 0 ? '❌ Out' : branchStock.isLowStock ? '⚠️ Low' : '✓';
          contextualMessage += `   Stock: ${branchStock.quantity} units ${status}\n`;
        } else {
          contextualMessage += `   Stock: Not available at ${branchName}\n`;
        }
      });
      contextualMessage += '\n';
    }
  }

  // Transaction Details
  if (contextData.transaction) {
    if (!contextData.transaction.found) {
      contextualMessage += `**Transaction:**\nNot found.\n\n`;
    } else {
      contextualMessage += `**Transaction:**\n${JSON.stringify(contextData.transaction, null, 2)}\n\n`;
    }
  }

  // Standard data
  if (contextData.sales) {
    contextualMessage += `**Sales:**\n${JSON.stringify(contextData.sales.summary, null, 2)}\n\n`;
  }

  if (contextData.inventory) {
    contextualMessage += `**Inventory:**\n${JSON.stringify(contextData.inventory.summary, null, 2)}\n\n`;
  }

  if (contextData.customers) {
    contextualMessage += `**Customers:**\n${JSON.stringify(contextData.customers.summary, null, 2)}\n\n`;
  }

  if (contextData.debt) {
    contextualMessage += `**Debt/Credit:**\n${JSON.stringify(contextData.debt.summary, null, 2)}\n\n`;
  }

  if (contextData.operational) {
    contextualMessage += `**Operations:**\n${JSON.stringify(contextData.operational.summary, null, 2)}\n\n`;
  }

  contextualMessage += '\nIMPORTANT: Use EXACT prices shown. Keep response brief (2-5 sentences).';

  return contextualMessage;
}
