const prisma = require('../utils/prisma');
const geminiService = require('../services/gemini.service');
const aiDataService = require('../services/ai-data.service');
const { getAdminSystemPrompt } = require('../config/ai-prompts');
const { validateAIQuery, sanitizeQuery } = require('../utils/aiQueryValidator');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * Admin AI Controller
 * Handles AI queries for ADMIN and OWNER users with full access
 */

/**
 * Process AI query with comprehensive data access
 */
exports.query = async (req, res, next) => {
  const startTime = Date.now();
  const userId = req.user.id;
  const userRole = req.user.role;
  const userName = req.user.name || 'Admin';

  try {
    const { message, conversationId } = req.body;

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

    // SECURITY: Validate query for malicious patterns
    const validation = validateAIQuery(message, userRole);
    if (!validation.valid) {
      console.warn('⚠️ Invalid query blocked:', validation.error);
      return res.status(400).json({
        error: 'Invalid query',
        message: validation.error,
      });
    }

    // SECURITY: Sanitize query
    const sanitizedMessage = sanitizeQuery(message);

    // Get all branches for context
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, location: true },
    });

    // Generate system prompt
    const systemPrompt = getAdminSystemPrompt(userName, branches);

    // Load conversation history if conversationId provided
    let conversationHistory = [];
    let conversation = null;

    if (conversationId) {
      conversation = await prisma.AIConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Last 20 messages for context
          },
        },
      });

      if (conversation) {
        // Decrypt messages when loading conversation history
        conversationHistory = conversation.messages.map(msg => ({
          role: msg.role,
          content: decrypt(msg.content), // SECURITY: Decrypt from database
        }));
      }
    }

    // Analyze query to determine what data to fetch
    const queryAnalysis = analyzeQuery(sanitizedMessage);
    console.log('📊 Query analysis:', queryAnalysis);

    // Fetch relevant data based on query type
    let contextData = {};

    try {
      // PRIORITY 1: Product Details (most common)
      if (queryAnalysis.needsProductDetails) {
        contextData.products = await aiDataService.getProductDetails({
          productName: queryAnalysis.productQuery,
          partNumber: queryAnalysis.partNumber,
          vehicleMake: queryAnalysis.vehicleMake,
          vehicleModel: queryAnalysis.vehicleModel,
          category: queryAnalysis.category,
          branchId: queryAnalysis.branchId, // Admin sees all branches if null
        });
        console.log('🔍 Product search:', {
          query: queryAnalysis.productQuery,
          partNumber: queryAnalysis.partNumber,
          vehicle: `${queryAnalysis.vehicleMake} ${queryAnalysis.vehicleModel}`.trim(),
          found: contextData.products?.count || 0
        });
      }

      // PRIORITY 2: Transaction Lookup
      if (queryAnalysis.needsTransactionLookup) {
        contextData.transaction = await aiDataService.getTransactionDetails({
          receiptNumber: queryAnalysis.receiptNumber,
          mpesaCode: queryAnalysis.mpesaCode,
          branchId: queryAnalysis.branchId,
        });
      }

      // PRIORITY 3: Supplier Information
      if (queryAnalysis.needsSupplierInfo) {
        contextData.suppliers = await aiDataService.getSupplierData({
          productId: contextData.products?.products?.[0]?.id, // Link to product if found
        });
      }

      // PRIORITY 4: Transfer Information
      if (queryAnalysis.needsTransferInfo) {
        contextData.transfers = await aiDataService.getTransferData({
          branchId: queryAnalysis.branchId,
        });
      }

      // INTELLIGENT SALES ANALYSIS
      if (queryAnalysis.needsSales) {
        const { analyzeSalesQuery, getResponseComplexity } = require('../utils/smartSalesAnalyzer');
        const salesAnalysis = analyzeSalesQuery(sanitizedMessage);

        console.log('📊 Sales query analysis:', {
          intent: salesAnalysis.intent,
          timeframe: salesAnalysis.timeframe,
          comparison: salesAnalysis.comparison,
          status: salesAnalysis.status,
        });

        // Use comprehensive data for complex queries
        if (salesAnalysis.requiresDetailed || salesAnalysis.requiresComparison) {
          // Period comparison
          if (salesAnalysis.requiresComparison && salesAnalysis.comparison === 'period') {
            contextData.salesComparison = await aiDataService.comparePeriods({
              branchId: queryAnalysis.branchId,
              period1: salesAnalysis.timeframe || 'today',
              period2: salesAnalysis.comparisonPeriod || 'yesterday',
              userRole,
            });
          } else {
            // Comprehensive sales data
            contextData.salesDetailed = await aiDataService.getCompleteSalesData({
              branchId: salesAnalysis.branchFilter === 'all' ? null : queryAnalysis.branchId,
              startDate: queryAnalysis.startDate,
              endDate: queryAnalysis.endDate,
              status: salesAnalysis.status,
              userRole,
            });
          }
        } else {
          // Simple sales data (backward compatible)
          contextData.sales = await aiDataService.getSalesData({
            userRole,
            startDate: queryAnalysis.startDate,
            endDate: queryAnalysis.endDate,
            branchId: queryAnalysis.branchId,
          });
        }

        // Mark response complexity for AI
        contextData.responseComplexity = getResponseComplexity(salesAnalysis);
      }

      if (queryAnalysis.needsInventory) {
        contextData.inventory = await aiDataService.getInventoryData({
          branchId: queryAnalysis.branchId,
          lowStockOnly: queryAnalysis.lowStockOnly,
        });
      }

      if (queryAnalysis.needsCustomers) {
        contextData.customers = await aiDataService.getCustomerData({
          branchId: queryAnalysis.branchId,
          withDebt: queryAnalysis.debtQuery,
        });
      }

      if (queryAnalysis.needsDebt) {
        contextData.debt = await aiDataService.getDebtData({
          branchId: queryAnalysis.branchId,
        });
      }

      if (queryAnalysis.needsOperational) {
        contextData.operational = await aiDataService.getOperationalInsights({
          branchId: queryAnalysis.branchId,
          days: queryAnalysis.days || 30,
        });
      }
    } catch (dataError) {
      console.error('❌ Error fetching context data:', dataError);
      throw new Error(`Failed to fetch business data: ${dataError.message}`);
    }

    // Build enhanced message with data context
    const enhancedMessage = buildContextualMessage(sanitizedMessage, contextData);

    // Generate AI response
    const aiResponse = await geminiService.generateResponse(
      systemPrompt,
      enhancedMessage,
      conversationHistory
    );

    // Create or update conversation
    if (!conversation && conversationId) {
      // Invalid conversation ID provided
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation) {
      // Create new conversation with auto-generated title
      const title = generateConversationTitle(sanitizedMessage);
      conversation = await prisma.AIConversation.create({
        data: {
          userId,
          title,
          messageCount: 2, // User message + AI response
          lastMessageAt: new Date(),
        },
      });

      // Save user message (sanitized and encrypted)
      await prisma.AIConversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: encrypt(sanitizedMessage), // SECURITY: Encrypt before storing
          tokensUsed: geminiService.estimateTokens(sanitizedMessage),
        },
      });

      // Save AI response (encrypted)
      await prisma.AIConversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: encrypt(aiResponse.text), // SECURITY: Encrypt before storing
          tokensUsed: aiResponse.tokensUsed,
        },
      });
    } else {
      // Update existing conversation
      await prisma.AIConversation.update({
        where: { id: conversation.id },
        data: {
          messageCount: { increment: 2 },
          lastMessageAt: new Date(),
        },
      });

      // Save messages (sanitized and encrypted)
      await prisma.AIConversationMessage.createMany({
        data: [
          {
            conversationId: conversation.id,
            role: 'user',
            content: encrypt(sanitizedMessage), // SECURITY: Encrypt before storing
            tokensUsed: geminiService.estimateTokens(sanitizedMessage),
          },
          {
            conversationId: conversation.id,
            role: 'assistant',
            content: encrypt(aiResponse.text), // SECURITY: Encrypt before storing
            tokensUsed: aiResponse.tokensUsed,
          },
        ],
      });
    }

    // Log query for audit (sanitized query)
    await prisma.AIQueryLog.create({
      data: {
        userId,
        userRole,
        branchId: null, // Admin sees all branches
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
      conversationId: conversation.id,
      tokensUsed: aiResponse.tokensUsed,
      responseTime: aiResponse.responseTimeMs,
      dataContext: {
        salesRecords: contextData.sales?.dataPoints || 0,
        inventoryItems: contextData.inventory?.dataPoints || 0,
        customers: contextData.customers?.dataPoints || 0,
      },
    });
  } catch (error) {
    console.error('❌ Admin AI query error:', error);

    // Log failed query
    try {
      await prisma.AIQueryLog.create({
        data: {
          userId,
          userRole,
          branchId: null,
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
 * Get conversation history (last 5 conversations)
 */
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const conversations = await prisma.AIConversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        messageCount: true,
        createdAt: true,
        lastMessageAt: true,
      },
    });

    res.json({ conversations });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    next(error);
  }
};

/**
 * Get specific conversation with messages
 */
exports.getConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await prisma.AIConversation.findFirst({
      where: {
        id,
        userId, // Ensure user owns this conversation
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Decrypt messages before sending to client
    const decryptedConversation = {
      ...conversation,
      messages: conversation.messages.map(msg => ({
        ...msg,
        content: decrypt(msg.content), // SECURITY: Decrypt for display
      })),
    };

    res.json({ conversation: decryptedConversation });
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    next(error);
  }
};

/**
 * Create new conversation
 */
exports.createConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    const conversation = await prisma.AIConversation.create({
      data: {
        userId,
        title: title || 'New Conversation',
        messageCount: 0,
      },
    });

    res.json({ conversation });
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    next(error);
  }
};

/**
 * Delete conversation
 */
exports.deleteConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const conversation = await prisma.AIConversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete (messages will cascade delete)
    await prisma.AIConversation.delete({
      where: { id },
    });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting conversation:', error);
    next(error);
  }
};

/**
 * Get AI usage statistics
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

    const limit = parseInt(process.env.AI_RATE_LIMIT_ADMIN) || 40;
    const used = usage?.queryCount || 0;
    const remaining = Math.max(0, limit - used);

    res.json({
      limit,
      used,
      remaining,
      resetAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching usage:', error);
    next(error);
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Analyze user query to determine what data to fetch
 * PRIORITY: Product queries FIRST (most common operation)
 * Uses intelligent detection - doesn't require keywords
 */
function analyzeQuery(message) {
  const { isProductQuery, extractProductContext } = require('../utils/smartProductSearch');
  const lowerMessage = message.toLowerCase();

  const analysis = {
    type: 'general',
    needsProductDetails: false,
    needsTransactionLookup: false,
    needsSupplierInfo: false,
    needsTransferInfo: false,
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
    category: null,

    // Transaction lookup
    receiptNumber: null,
    mpesaCode: null,

    // Other flags
    lowStockOnly: false,
    debtQuery: false,
    branchId: null,
    startDate: null,
    endDate: null,
    days: 30,
  };

  // ============================================
  // PRIORITY 1: PRODUCT QUERIES (INTELLIGENT DETECTION)
  // ============================================
  // Uses smart detection - works even without keywords like "price" or "how much"

  if (isProductQuery(message)) {
    analysis.needsProductDetails = true;
    analysis.type = 'product';

    // Extract all product context intelligently
    const context = extractProductContext(message);
    analysis.partNumber = context.partNumber;
    analysis.productQuery = context.productName;
    analysis.vehicleMake = context.vehicleMake;
    analysis.vehicleModel = context.vehicleModel;
    analysis.category = context.category;

    console.log('🎯 Product query detected:', {
      partNumber: analysis.partNumber,
      productName: analysis.productQuery,
      vehicle: `${analysis.vehicleMake || ''} ${analysis.vehicleModel || ''}`.trim(),
    });
  }

  // ============================================
  // PRIORITY 2: TRANSACTION LOOKUPS (RECEIPT/MPESA)
  // ============================================

  // Receipt number lookup
  const receiptMatch = lowerMessage.match(/\b(REC-[\d-]+|receipt\s*#?\s*([\d-]+))\b/i);
  if (receiptMatch) {
    analysis.needsTransactionLookup = true;
    analysis.type = 'transaction';
    analysis.receiptNumber = receiptMatch[1] || receiptMatch[2];
  }

  // M-Pesa code lookup
  const mpesaMatch = lowerMessage.match(/\b([A-Z]{3}\d{7,10}|mpesa\s*#?\s*([A-Z0-9]+))\b/i);
  if (mpesaMatch) {
    analysis.needsTransactionLookup = true;
    analysis.type = 'transaction';
    analysis.mpesaCode = mpesaMatch[1] || mpesaMatch[2];
  }

  // ============================================
  // PRIORITY 3: SUPPLIER QUERIES
  // ============================================

  if (lowerMessage.match(/\b(supplier|who supplies|where.*buy|wholesaler|vendor)\b/i)) {
    analysis.needsSupplierInfo = true;
    analysis.type = 'supplier';
  }

  // ============================================
  // PRIORITY 4: TRANSFER QUERIES
  // ============================================

  const transferMatch = lowerMessage.match(/\b(TRF-[\d-]+|transfer)\b/i);
  if (transferMatch || lowerMessage.match(/\b(transfer|pending.*transfer)\b/i)) {
    analysis.needsTransferInfo = true;
    analysis.type = 'transfer';
  }

  // ============================================
  // STANDARD QUERIES (Lower priority)
  // ============================================

  // Sales keywords - but not if product query
  if (!analysis.needsProductDetails &&
      lowerMessage.match(/\b(sale|sales|revenue|uza|sold|transaction)\b/i)) {
    analysis.needsSales = true;
    if (analysis.type === 'general') analysis.type = 'sales';
  }

  // Inventory summary - but not if product query
  if (!analysis.needsProductDetails &&
      lowerMessage.match(/\b(stock.*summary|inventory.*report|total.*stock)\b/i)) {
    analysis.needsInventory = true;
    if (analysis.type === 'general') analysis.type = 'inventory';
    if (lowerMessage.match(/\b(low|running|critical|alert)\b/i)) {
      analysis.lowStockOnly = true;
    }
  }

  // Customer keywords
  if (lowerMessage.match(/\b(customer|client|vip|buyer|wateja)\b/i)) {
    analysis.needsCustomers = true;
    if (analysis.type === 'general') analysis.type = 'customer';
  }

  // Debt keywords
  if (lowerMessage.match(/\b(debt|credit|deni|owe|owing|outstanding)\b/i)) {
    analysis.needsDebt = true;
    analysis.debtQuery = true;
    if (analysis.type === 'general') analysis.type = 'debt';
  }

  // Operational keywords
  if (lowerMessage.match(/\b(performance|insight|trend|peak|busy|operation)\b/i)) {
    analysis.needsOperational = true;
    if (analysis.type === 'general') analysis.type = 'operational';
  }

  // Time period detection
  if (lowerMessage.match(/\b(today|leo)\b/i)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    analysis.startDate = today;
    analysis.endDate = new Date();
  } else if (lowerMessage.match(/\b(yesterday|jana)\b/i)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    analysis.startDate = yesterday;
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    analysis.endDate = endOfYesterday;
  } else if (lowerMessage.match(/\b(this week|hii wiki)\b/i)) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    analysis.startDate = monday;
    analysis.endDate = new Date();
    analysis.days = 7;
  } else if (lowerMessage.match(/\b(this month|hii month)\b/i)) {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    analysis.startDate = firstDay;
    analysis.endDate = new Date();
    analysis.days = 30;
  }

  // If no specific data type identified but query seems analytical, fetch everything
  if (
    !analysis.needsSales &&
    !analysis.needsInventory &&
    !analysis.needsCustomers &&
    !analysis.needsDebt &&
    lowerMessage.match(/\b(show|display|what|how|analysis|report|summary)\b/i)
  ) {
    analysis.needsSales = true;
    analysis.needsInventory = true;
    analysis.type = 'general';
  }

  return analysis;
}

/**
 * Build contextual message with data
 */
function buildContextualMessage(message, contextData) {
  let contextualMessage = `User Query: ${message}\n\n`;

  if (Object.keys(contextData).length === 0) {
    contextualMessage += 'No specific data context provided. Please answer based on general business knowledge.\n';
    return contextualMessage;
  }

  contextualMessage += 'Relevant Business Data:\n\n';

  // PRIORITY: Product Details (most important to format well)
  if (contextData.products) {
    if (contextData.products.count === 0) {
      contextualMessage += `**Product Search Results:**\nNo products found matching "${contextData.products.searchCriteria.productName || contextData.products.searchCriteria.partNumber}".\n\n`;
      contextualMessage += 'INSTRUCTION: Ask the user for more details (part number, vehicle make/model, or clearer description).\n\n';
    } else {
      contextualMessage += `**Product Details Found (${contextData.products.count} products):**\n`;
      contextData.products.products.forEach((product, index) => {
        contextualMessage += `\n${index + 1}. ${product.name}\n`;
        contextualMessage += `   - Part Number: ${product.partNumber || 'N/A'}\n`;
        contextualMessage += `   - Category: ${product.category || 'N/A'}\n`;
        if (product.fitment.make) {
          contextualMessage += `   - Fits: ${product.fitment.make} ${product.fitment.model || ''} ${product.fitment.engine || ''}`.trim() + '\n';
        }
        contextualMessage += `   - SELLING PRICE: ${product.pricing.sellingPrice} KES (EXACT - DO NOT CHANGE)\n`;
        contextualMessage += `   - Cost Price: ${product.pricing.costPrice} KES\n`;
        contextualMessage += `   - Margin: ${product.pricing.margin} KES (${product.pricing.marginPercent}%)\n`;

        if (product.inventory && product.inventory.length > 0) {
          contextualMessage += `   - Stock Availability:\n`;
          product.inventory.forEach(inv => {
            const stockStatus = inv.quantity === 0 ? '❌ OUT OF STOCK' : inv.isLowStock ? '⚠️ LOW STOCK' : '✓ In Stock';
            contextualMessage += `     * ${inv.branch}: ${inv.quantity} units ${stockStatus}\n`;
            if (inv.branchPrice !== product.pricing.sellingPrice) {
              contextualMessage += `       (Branch-specific price: ${inv.branchPrice} KES)\n`;
            }
          });
        } else {
          contextualMessage += `   - Stock: Not available at any branch\n`;
        }

        if (product.suppliers && product.suppliers.length > 0) {
          contextualMessage += `   - Supplier: ${product.suppliers[0].name} (${product.suppliers[0].location})\n`;
          contextualMessage += `     Wholesale: ${product.suppliers[0].wholesalePrice} ${product.suppliers[0].currency}\n`;
        }
      });
      contextualMessage += '\n';
    }
  }

  // Transaction Details
  if (contextData.transaction) {
    if (!contextData.transaction.found) {
      contextualMessage += `**Transaction Lookup:**\nNo transaction found for ${contextData.transaction.searchCriteria.receiptNumber || contextData.transaction.searchCriteria.mpesaCode}.\n\n`;
    } else {
      contextualMessage += `**Transaction Details:**\n${JSON.stringify(contextData.transaction, null, 2)}\n\n`;
    }
  }

  // Supplier Information
  if (contextData.suppliers) {
    contextualMessage += `**Supplier Information:**\n${JSON.stringify(contextData.suppliers, null, 2)}\n\n`;
  }

  // Transfer Information
  if (contextData.transfers) {
    contextualMessage += `**Transfer Details:**\n${JSON.stringify(contextData.transfers, null, 2)}\n\n`;
  }

  // DETAILED SALES DATA (formatted for easy reading)
  if (contextData.salesDetailed) {
    const s = contextData.salesDetailed.summary;
    contextualMessage += `**SALES ANALYSIS DATA:**\n\n`;
    contextualMessage += `OVERALL PERFORMANCE:\n`;
    contextualMessage += `- Total Sales: ${s.totalSales} transactions\n`;
    contextualMessage += `- Total Revenue: ${s.totalRevenue.toFixed(2)} KES\n`;
    contextualMessage += `- Total Profit: ${s.totalProfit.toFixed(2)} KES (${s.profitMargin}% margin)\n`;
    contextualMessage += `- Average Transaction: ${(s.totalRevenue / s.totalSales).toFixed(2)} KES\n\n`;

    // BRANCH BREAKDOWN (critical for comparisons)
    if (Object.keys(s.byBranch).length > 0) {
      contextualMessage += `BRANCH PERFORMANCE BREAKDOWN:\n`;
      const branches = Object.entries(s.byBranch).sort((a, b) => b[1].revenue - a[1].revenue);
      branches.forEach(([branch, data]) => {
        const percentage = ((data.revenue / s.totalRevenue) * 100).toFixed(1);
        contextualMessage += `- ${branch}: ${data.revenue.toFixed(2)} KES (${percentage}%) | ${data.count} sales | ${data.profit.toFixed(2)} KES profit\n`;
      });
      contextualMessage += `\n`;
    }

    // PAYMENT METHODS
    contextualMessage += `PAYMENT METHOD BREAKDOWN:\n`;
    contextualMessage += `- Cash: ${s.cashSales.toFixed(2)} KES (${s.cashCount} transactions)\n`;
    contextualMessage += `- M-Pesa: ${s.mpesaSales.toFixed(2)} KES (${s.mpesaCount} transactions)\n`;
    contextualMessage += `- Credit: ${s.creditSales.toFixed(2)} KES (${s.creditCount} transactions)\n\n`;

    // FLAGGED/VERIFICATION
    if (s.flaggedCount > 0) {
      contextualMessage += `M-PESA VERIFICATION NEEDED:\n`;
      contextualMessage += `- ${s.flaggedCount} sales flagged, totaling ${s.flaggedValue.toFixed(2)} KES\n\n`;
    }

    // CREDIT STATUS
    if (s.creditPending > 0 || s.creditPartial > 0) {
      contextualMessage += `CREDIT SALES STATUS:\n`;
      contextualMessage += `- Pending: ${s.creditPending.toFixed(2)} KES\n`;
      contextualMessage += `- Partial: ${s.creditPartial.toFixed(2)} KES\n`;
      contextualMessage += `- Paid: ${s.creditPaid.toFixed(2)} KES\n\n`;
    }

    // REVERSALS
    if (s.reversedCount > 0 || s.pendingReversalCount > 0) {
      contextualMessage += `REVERSALS:\n`;
      if (s.reversedCount > 0) contextualMessage += `- Reversed: ${s.reversedCount} sales, ${s.reversedValue.toFixed(2)} KES\n`;
      if (s.pendingReversalCount > 0) contextualMessage += `- Pending Reversal: ${s.pendingReversalCount} sales, ${s.pendingReversalValue.toFixed(2)} KES\n`;
      contextualMessage += `\n`;
    }

    // TOP PRODUCTS
    if (s.topProducts && s.topProducts.length > 0) {
      contextualMessage += `TOP 5 PRODUCTS:\n`;
      s.topProducts.slice(0, 5).forEach((p, i) => {
        contextualMessage += `${i + 1}. ${p.name}: ${p.revenue.toFixed(2)} KES | ${p.quantity} units | ${p.profit.toFixed(2)} KES profit\n`;
      });
      contextualMessage += `\n`;
    }

    // STAFF PERFORMANCE
    if (Object.keys(s.byStaff).length > 0) {
      contextualMessage += `STAFF PERFORMANCE:\n`;
      const staff = Object.entries(s.byStaff).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
      staff.forEach(([name, data]) => {
        contextualMessage += `- ${name}: ${data.revenue.toFixed(2)} KES (${data.count} sales)\n`;
      });
      contextualMessage += `\n`;
    }
  }

  // PERIOD COMPARISON
  if (contextData.salesComparison) {
    const c = contextData.salesComparison;
    contextualMessage += `**PERIOD COMPARISON:**\n\n`;
    contextualMessage += `CURRENT PERIOD (${c.period1.name}):\n`;
    contextualMessage += `- Revenue: ${c.period1.totalRevenue.toFixed(2)} KES\n`;
    contextualMessage += `- Sales: ${c.period1.totalSales} transactions\n`;
    contextualMessage += `- Profit: ${c.period1.totalProfit.toFixed(2)} KES\n\n`;

    contextualMessage += `COMPARISON PERIOD (${c.period2.name}):\n`;
    contextualMessage += `- Revenue: ${c.period2.totalRevenue.toFixed(2)} KES\n`;
    contextualMessage += `- Sales: ${c.period2.totalSales} transactions\n`;
    contextualMessage += `- Profit: ${c.period2.totalProfit.toFixed(2)} KES\n\n`;

    contextualMessage += `CHANGES:\n`;
    contextualMessage += `- Revenue: ${c.changes.revenue > 0 ? '+' : ''}${c.changes.revenue}%\n`;
    contextualMessage += `- Sales Count: ${c.changes.salesCount > 0 ? '+' : ''}${c.changes.salesCount}%\n`;
    contextualMessage += `- Profit: ${c.changes.profit > 0 ? '+' : ''}${c.changes.profit}%\n`;
    contextualMessage += `- Avg Transaction: ${c.changes.averageTransaction > 0 ? '+' : ''}${c.changes.averageTransaction}%\n\n`;
  }

  // FALLBACK: Simple sales data
  if (contextData.sales && !contextData.salesDetailed) {
    contextualMessage += `**Sales Summary:**\n`;
    const s = contextData.sales.summary;
    contextualMessage += `- Total: ${s.totalRevenue.toFixed(2)} KES (${s.totalSales} sales)\n`;
    if (s.byBranch) {
      contextualMessage += `\nBy Branch:\n`;
      Object.entries(s.byBranch).forEach(([branch, data]) => {
        contextualMessage += `- ${branch}: ${data.revenue.toFixed(2)} KES (${data.count} sales)\n`;
      });
    }
    contextualMessage += `\n`;
  }

  if (contextData.inventory) {
    contextualMessage += `**Inventory Data:**\n${JSON.stringify(contextData.inventory.summary, null, 2)}\n\n`;
  }

  if (contextData.customers) {
    contextualMessage += `**Customer Data:**\n${JSON.stringify(contextData.customers.summary, null, 2)}\n\n`;
  }

  if (contextData.debt) {
    contextualMessage += `**Debt/Credit Data:**\n${JSON.stringify(contextData.debt.summary, null, 2)}\n\n`;
  }

  if (contextData.operational) {
    contextualMessage += `**Operational Insights:**\n${JSON.stringify(contextData.operational.summary, null, 2)}\n\n`;
  }

  contextualMessage += '\nIMPORTANT: Use EXACT prices and quantities as shown above. Do NOT round or approximate any numbers.';
  contextualMessage += '\nIf multiple products were found, help the user choose the right one by asking which specific product they need.';

  return contextualMessage;
}

/**
 * Generate conversation title from first message
 */
function generateConversationTitle(message) {
  // Take first 50 chars or until first question mark/period
  let title = message.substring(0, 50).trim();

  const firstStop = title.search(/[.?!]/);
  if (firstStop > 10) {
    title = title.substring(0, firstStop);
  }

  if (message.length > 50) {
    title += '...';
  }

  return title || 'New Conversation';
}
