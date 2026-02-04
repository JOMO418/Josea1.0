// server/src/controllers/mpesaController.js

const { PrismaClient } = require('@prisma/client');
const mpesaService = require('../services/mpesa.service');
const prisma = new PrismaClient();

// ===================================
// INITIATE M-PESA STK PUSH
// ===================================

/**
 * Initiate M-Pesa payment via STK Push
 * @route POST /api/mpesa/stk-push
 * @access Private
 */
exports.initiateStkPush = async (req, res) => {
  const { phone, amount, accountReference, transactionDesc } = req.body;
  const userId = req.user.id;
  const branchId = req.user.branchId;

  // Validation
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  if (!amount || amount < 1) {
    return res.status(400).json({ message: 'Amount must be at least 1 KES' });
  }

  if (!accountReference) {
    return res.status(400).json({ message: 'Account reference is required' });
  }

  try {
    // Initiate STK Push
    const result = await mpesaService.initiateSTKPush(
      phone,
      amount,
      accountReference,
      transactionDesc
    );

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
        details: result,
      });
    }

    // Store transaction in database for tracking
    const transaction = await prisma.mpesaTransaction.create({
      data: {
        merchantRequestId: result.merchantRequestId,
        checkoutRequestId: result.checkoutRequestId,
        phoneNumber: phone,
        amount: parseFloat(amount),
        accountReference,
        transactionDesc: transactionDesc || accountReference,
        status: 'PENDING',
        branchId,
        initiatedBy: userId,
      },
    });

    console.log('[M-Pesa] Transaction stored:', transaction.id);

    return res.status(200).json({
      success: true,
      message: result.customerMessage || 'Payment request sent to your phone',
      data: {
        transactionId: transaction.id,
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId,
      },
    });
  } catch (error) {
    console.error('[M-Pesa Controller] STK Push error:', error);
    return res.status(500).json({
      message: 'Failed to initiate M-Pesa payment',
      error: error.message,
    });
  }
};

// ===================================
// QUERY TRANSACTION STATUS
// ===================================

/**
 * Query M-Pesa transaction status
 * @route GET /api/mpesa/status/:checkoutRequestId
 * @access Private
 */
exports.queryTransactionStatus = async (req, res) => {
  const { checkoutRequestId } = req.params;

  if (!checkoutRequestId) {
    return res.status(400).json({ message: 'Checkout Request ID is required' });
  }

  try {
    // Check database first
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestId },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // If already completed, return from database
    if (transaction.status === 'COMPLETED' || transaction.status === 'FAILED') {
      return res.status(200).json({
        success: transaction.status === 'COMPLETED',
        status: transaction.status,
        data: {
          transactionId: transaction.id,
          amount: transaction.amount,
          phoneNumber: transaction.phoneNumber,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          resultDesc: transaction.resultDesc,
          completedAt: transaction.completedAt,
        },
      });
    }

    // Query M-Pesa for latest status
    const result = await mpesaService.queryTransactionStatus(checkoutRequestId);

    // Update database with latest status
    if (result.resultCode !== undefined) {
      const status = result.success ? 'COMPLETED' : 'FAILED';

      await prisma.mpesaTransaction.update({
        where: { checkoutRequestId },
        data: {
          status,
          resultCode: result.resultCode.toString(),
          resultDesc: result.resultDesc,
          completedAt: result.success ? new Date() : null,
        },
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[M-Pesa Controller] Query status error:', error);
    return res.status(500).json({
      message: 'Failed to query transaction status',
      error: error.message,
    });
  }
};

// ===================================
// M-PESA CALLBACK HANDLER
// ===================================

/**
 * Handle M-Pesa callback (webhook)
 * @route POST /api/mpesa/callback
 * @access Public (Called by Safaricom)
 */
exports.handleCallback = async (req, res) => {
  console.log('[M-Pesa] Callback received:', JSON.stringify(req.body, null, 2));

  try {
    // Validate and extract callback data
    const callbackData = mpesaService.validateCallbackData(req.body);

    // Find transaction in database
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestId: callbackData.checkoutRequestId },
    });

    if (!transaction) {
      console.error('[M-Pesa] Transaction not found:', callbackData.checkoutRequestId);
      // Still return success to M-Pesa to avoid retries
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Determine status based on result code
    const status = callbackData.resultCode === 0 ? 'COMPLETED' : 'FAILED';

    // Update transaction
    const updatedTransaction = await prisma.mpesaTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        resultCode: callbackData.resultCode.toString(),
        resultDesc: callbackData.resultDesc,
        mpesaReceiptNumber: callbackData.mpesaReceiptNumber,
        transactionDate: callbackData.transactionDate,
        completedAt: new Date(),
      },
    });

    console.log('[M-Pesa] Transaction updated:', {
      id: updatedTransaction.id,
      status: updatedTransaction.status,
      receipt: updatedTransaction.mpesaReceiptNumber,
    });

    // If payment was successful, you might want to trigger additional logic here
    // For example: mark invoice as paid, update stock, send receipt, etc.
    if (status === 'COMPLETED') {
      console.log('[M-Pesa] Payment successful - Additional processing can be triggered here');

      // TODO: Add your business logic here
      // Examples:
      // - Update sale payment status
      // - Send SMS receipt
      // - Update inventory
      // - Trigger notifications
    }

    // Acknowledge receipt to M-Pesa
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  } catch (error) {
    console.error('[M-Pesa Controller] Callback processing error:', error);

    // Still return success to M-Pesa to avoid retries
    // Log the error for manual investigation
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  }
};

// ===================================
// GET TRANSACTION HISTORY
// ===================================

/**
 * Get M-Pesa transaction history for a branch
 * @route GET /api/mpesa/transactions
 * @access Private
 */
exports.getTransactions = async (req, res) => {
  const branchId = req.user.branchId;
  const { page = 1, limit = 20, status, startDate, endDate } = req.query;

  try {
    // Build filter
    const where = { branchId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await prisma.mpesaTransaction.count({ where });

    // Get transactions
    const transactions = await prisma.mpesaTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        initiatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[M-Pesa Controller] Get transactions error:', error);
    return res.status(500).json({
      message: 'Failed to fetch transactions',
      error: error.message,
    });
  }
};

// ===================================
// GET TRANSACTION BY ID
// ===================================

/**
 * Get single M-Pesa transaction details
 * @route GET /api/mpesa/transactions/:id
 * @access Private
 */
exports.getTransactionById = async (req, res) => {
  const { id } = req.params;
  const branchId = req.user.branchId;

  try {
    const transaction = await prisma.mpesaTransaction.findFirst({
      where: {
        id: parseInt(id),
        branchId, // Ensure user can only access their branch transactions
      },
      include: {
        initiatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    return res.status(200).json(transaction);
  } catch (error) {
    console.error('[M-Pesa Controller] Get transaction error:', error);
    return res.status(500).json({
      message: 'Failed to fetch transaction',
      error: error.message,
    });
  }
};

// ===================================
// GET M-PESA STATISTICS
// ===================================

/**
 * Get M-Pesa payment statistics for a branch
 * @route GET /api/mpesa/stats
 * @access Private
 */
exports.getStats = async (req, res) => {
  const branchId = req.user.branchId;
  const { startDate, endDate } = req.query;

  try {
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate);
      }
    }

    // Get statistics
    const [totalTransactions, completedTransactions, failedTransactions, pendingTransactions, totalRevenue] =
      await Promise.all([
        // Total transactions
        prisma.mpesaTransaction.count({
          where: { branchId, ...dateFilter },
        }),
        // Completed transactions
        prisma.mpesaTransaction.count({
          where: { branchId, status: 'COMPLETED', ...dateFilter },
        }),
        // Failed transactions
        prisma.mpesaTransaction.count({
          where: { branchId, status: 'FAILED', ...dateFilter },
        }),
        // Pending transactions
        prisma.mpesaTransaction.count({
          where: { branchId, status: 'PENDING', ...dateFilter },
        }),
        // Total revenue from completed transactions
        prisma.mpesaTransaction.aggregate({
          where: { branchId, status: 'COMPLETED', ...dateFilter },
          _sum: { amount: true },
        }),
      ]);

    const stats = {
      totalTransactions,
      completedTransactions,
      failedTransactions,
      pendingTransactions,
      totalRevenue: totalRevenue._sum.amount || 0,
      successRate:
        totalTransactions > 0
          ? ((completedTransactions / totalTransactions) * 100).toFixed(2)
          : 0,
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error('[M-Pesa Controller] Get stats error:', error);
    return res.status(500).json({
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
};

// ===================================
// C2B AUTO-DETECTION HANDLERS
// ===================================

/**
 * C2B Validation Handler
 * M-Pesa asks "Should I accept this payment?"
 * @route POST /api/mpesa/c2b/validate
 * @access Public (called by Safaricom)
 */
exports.handleC2BValidation = async (req, res) => {
  console.log('📱 [C2B Validation] Request received:', req.body);

  // M-Pesa sends:
  // {
  //   TransactionType: "Pay Bill",
  //   TransID: "QAB1234XYZ",
  //   TransTime: "20240203103045",
  //   TransAmount: "1500",
  //   BusinessShortCode: "174379",
  //   BillRefNumber: "SALE-12345",
  //   MSISDN: "254708374149",
  //   FirstName: "John"
  // }

  try {
    // You can add custom validation logic here
    // For example: Check if sale reference exists, verify amount, etc.

    // For now, accept all payments
    res.json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  } catch (error) {
    console.error('[C2B Validation] Error:', error);
    // Still accept payment even if validation fails
    res.json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  }
};

/**
 * C2B Confirmation Handler
 * M-Pesa says "Payment successful!"
 * @route POST /api/mpesa/c2b/confirm
 * @access Public (called by Safaricom)
 */
exports.handleC2BConfirmation = async (req, res) => {
  const {
    TransID,           // M-Pesa receipt: QAB1234XYZ
    MSISDN,            // Customer phone: 254708374149
    BillRefNumber,     // Your sale reference: SALE-12345
    TransAmount,       // Amount paid: "1500"
    TransTime,         // Payment time: "20240203103045"
    FirstName,         // Customer name (if available)
    MiddleName,
    LastName,
    BusinessShortCode,
    OrgAccountBalance
  } = req.body;

  console.log('✅ [C2B Confirmation] Payment received!', req.body);

  try {
    // Check if we already processed this transaction (idempotency)
    const existingTx = await prisma.mpesaTransaction.findFirst({
      where: { mpesaReceiptNumber: TransID }
    });

    if (existingTx) {
      console.log('ℹ️  Transaction already processed:', TransID);
      return res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }

    // Find pending sale by reference
    const sale = await prisma.sale.findFirst({
      where: {
        accountReference: BillRefNumber,
        status: { in: ['PENDING', 'PENDING_PAYMENT'] }
      }
    });

    // For supermarket C2B: Customer pays directly to till, no pre-existing sale needed
    // Store transaction immediately for auto-detect to find by amount + branch + timestamp

    // Get first active branch as default (or extract from BillRefNumber if encoded)
    const defaultBranch = await prisma.branch.findFirst({
      where: { isActive: true },
      select: { id: true }
    });

    if (!defaultBranch) {
      console.error('❌ No active branch found!');
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted - pending branch setup' });
    }

    // Get system user for C2B transactions
    const systemUser = await prisma.user.findFirst({
      where: { branchId: defaultBranch.id },
      select: { id: true }
    });

    if (!systemUser) {
      console.error('❌ No user found for branch!');
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted - pending user setup' });
    }

    // Store C2B transaction for auto-detect (no sale required yet)
    await prisma.mpesaTransaction.create({
      data: {
        merchantRequestId: `C2B-${TransID}`,
        checkoutRequestId: TransID,
        phoneNumber: MSISDN,
        amount: parseFloat(TransAmount),
        accountReference: BillRefNumber || 'TILL-PAYMENT',
        mpesaReceiptNumber: TransID,
        status: 'COMPLETED',
        resultCode: '0',
        resultDesc: 'C2B Payment received - awaiting sale completion',
        transactionDate: TransTime,
        branchId: defaultBranch.id,
        initiatedBy: systemUser.id,
        completedAt: new Date()
      }
    });

    console.log('✅ C2B Payment stored for auto-detect:', {
      receipt: TransID,
      amount: TransAmount,
      phone: MSISDN,
      branch: defaultBranch.id
    });

    // ==========================================
    // AUTO-VERIFY FLAGGED SALES
    // ==========================================
    // Check if there's a flagged sale waiting for this amount
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const flaggedSale = await prisma.sale.findFirst({
      where: {
        flaggedForVerification: true,
        mpesaVerificationStatus: 'PENDING',
        branchId: defaultBranch.id,
        flaggedAt: { gte: fiveMinutesAgo }, // Only check recent flags (last 5 minutes)
      },
      include: {
        payments: true
      },
      orderBy: {
        flaggedAt: 'desc' // Most recent first
      }
    });

    if (flaggedSale) {
      // Get M-Pesa payment amount from the sale
      const mpesaPayment = flaggedSale.payments.find(p => p.method === 'MPESA');
      const expectedAmount = mpesaPayment ? Number(mpesaPayment.amount) : 0;
      const receivedAmount = parseFloat(TransAmount);

      // Check if amounts match (1 KES tolerance)
      const amountDifference = Math.abs(receivedAmount - expectedAmount);
      if (amountDifference <= 1) {
        // PERFECT MATCH - Auto-verify the sale!
        await prisma.sale.update({
          where: { id: flaggedSale.id },
          data: {
            mpesaVerificationStatus: 'VERIFIED',
            flaggedForVerification: false,
            mpesaReceiptNumber: TransID,
            verifiedAt: new Date(),
            verificationMethod: 'AUTOMATIC',
            verificationNotes: `Auto-verified via C2B callback - Receipt: ${TransID}`,
          }
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: systemUser.id,
            action: 'MPESA_AUTO_VERIFIED',
            entityType: 'SALE',
            entityId: flaggedSale.id,
            oldValue: JSON.stringify({
              status: 'PENDING',
              flagged: true
            }),
            newValue: JSON.stringify({
              status: 'VERIFIED',
              flagged: false,
              mpesaCode: TransID,
              verificationMethod: 'AUTOMATIC',
              amount: receivedAmount
            }),
          },
        });

        console.log(`🎉 [Auto-Verified] Sale ${flaggedSale.receiptNumber} automatically verified! Receipt: ${TransID}`);
      } else {
        console.log(`⚠️  [Auto-Verify Skip] Amount mismatch - Expected: ${expectedAmount}, Received: ${receivedAmount}`);
      }
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Payment accepted' });

    // Verify amount matches
    if (parseFloat(TransAmount) !== sale.mpesaAmount) {
      console.warn('⚠️  Amount mismatch!', {
        expected: sale.mpesaAmount,
        received: TransAmount,
        saleId: sale.id
      });
      // Accept but flag for review
    }

    // Update sale status
    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        status: 'COMPLETED',
        mpesaReceiptNumber: TransID,
        metadata: {
          ...(sale.metadata || {}),
          c2bConfirmed: true,
          c2bTimestamp: new Date().toISOString()
        }
      }
    });

    // Record transaction
    await prisma.mpesaTransaction.create({
      data: {
        saleId: sale.id,
        merchantRequestId: 'C2B',
        checkoutRequestId: TransID,
        phoneNumber: MSISDN,
        amount: parseFloat(TransAmount),
        accountReference: BillRefNumber,
        mpesaReceiptNumber: TransID,
        status: 'COMPLETED',
        responseCode: '0',
        responseDescription: 'C2B Payment successful',
        branchId: sale.branchId,
        metadata: JSON.stringify(req.body)
      }
    });

    console.log('✅ Sale completed via C2B:', sale.id, TransID);

    res.json({
      ResultCode: 0,
      ResultDesc: 'Payment processed successfully'
    });

  } catch (error) {
    console.error('❌ [C2B Confirmation] Error:', error);

    // CRITICAL: Always return success to M-Pesa
    // Never reject payment due to internal errors
    // Log error for manual resolution
    res.json({
      ResultCode: 0,
      ResultDesc: 'Accepted (pending verification)'
    });
  }
};

/**
 * Check Payment Status by Amount
 * Used by frontend auto-detection polling for C2B payments
 * @route GET /api/payment/check-payment/:reference
 * @access Private
 */
exports.checkPaymentStatus = async (req, res) => {
  const { reference } = req.params;
  const { amount } = req.query; // Amount to match

  try {
    // For C2B auto-detect: Find recent completed M-Pesa transaction matching amount
    // Look for transactions in the last 5 minutes that haven't been claimed
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const transaction = await prisma.mpesaTransaction.findFirst({
      where: {
        status: 'COMPLETED',
        mpesaReceiptNumber: { not: null },
        amount: amount ? parseFloat(amount) : undefined,
        branchId: req.user.branchId, // Match current branch
        createdAt: { gte: fiveMinutesAgo }, // Within last 5 minutes
        // TODO: Add 'claimedBySaleId' field to prevent double-claiming
      },
      select: {
        id: true,
        mpesaReceiptNumber: true,
        amount: true,
        phoneNumber: true,
        completedAt: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc' // Most recent first
      }
    });

    if (transaction) {
      console.log('[C2B Auto-Detect] Payment found:', {
        receiptNumber: transaction.mpesaReceiptNumber,
        amount: transaction.amount,
        phone: transaction.phoneNumber
      });

      return res.json({
        found: true,
        receiptNumber: transaction.mpesaReceiptNumber,
        amount: transaction.amount,
        phoneNumber: transaction.phoneNumber,
        timestamp: transaction.completedAt || transaction.createdAt
      });
    }

    // Not found yet
    res.json({ found: false });

  } catch (error) {
    console.error('[M-Pesa] Check payment error:', error);
    res.status(500).json({
      message: 'Failed to check payment status',
      error: error.message
    });
  }
};

/**
 * Verify Manual M-Pesa Receipt Code
 * Checks if a manually entered receipt code exists in our records and matches amount
 * @route POST /api/payment/verify-receipt
 * @access Private
 */
exports.verifyManualReceipt = async (req, res) => {
  const { receiptCode, expectedAmount } = req.body;

  if (!receiptCode || receiptCode.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Invalid M-Pesa receipt code format. Must be at least 10 characters.'
    });
  }

  try {
    console.log('[Manual Verification] Checking receipt:', receiptCode);

    // Look for transaction with this receipt number in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const transaction = await prisma.mpesaTransaction.findFirst({
      where: {
        mpesaReceiptNumber: receiptCode.trim().toUpperCase(),
        status: 'COMPLETED',
        branchId: req.user.branchId, // Must be from same branch
        createdAt: { gte: oneDayAgo }
      },
      select: {
        id: true,
        mpesaReceiptNumber: true,
        amount: true,
        phoneNumber: true,
        completedAt: true,
        createdAt: true
      }
    });

    if (!transaction) {
      console.log('[Manual Verification] Receipt not found:', receiptCode);
      return res.json({
        success: false,
        error: 'M-Pesa receipt not found or expired. Please verify the code is correct.'
      });
    }

    // Verify amount matches (with 1 KES tolerance for rounding)
    const amountDifference = Math.abs(transaction.amount - expectedAmount);
    if (amountDifference > 1) {
      console.log('[Manual Verification] Amount mismatch:', {
        expected: expectedAmount,
        actual: transaction.amount,
        receipt: receiptCode
      });
      return res.json({
        success: false,
        error: `Amount mismatch. Receipt shows KES ${transaction.amount}, but sale total is KES ${expectedAmount}.`
      });
    }

    // Success - receipt is valid
    console.log('[Manual Verification] Receipt verified successfully:', {
      receipt: receiptCode,
      amount: transaction.amount
    });

    return res.json({
      success: true,
      receiptNumber: transaction.mpesaReceiptNumber,
      amount: transaction.amount,
      phoneNumber: transaction.phoneNumber
    });

  } catch (error) {
    console.error('[Manual Verification] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify receipt. Please try again.'
    });
  }
};
