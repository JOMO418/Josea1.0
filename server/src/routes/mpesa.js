// server/src/routes/mpesa.js

const express = require('express');
const router = express.Router();
const mpesaController = require('../controllers/mpesaController');
const { authenticate, authorize } = require('../middleware/auth');

// ===================================
// M-PESA PAYMENT ROUTES
// ===================================

/**
 * Initiate STK Push payment
 * POST /api/mpesa/stk-push
 * Body: { phone, amount, accountReference, transactionDesc }
 */
router.post('/stk-push', authenticate, mpesaController.initiateStkPush);

/**
 * Query transaction status
 * GET /api/mpesa/status/:checkoutRequestId
 */
router.get('/status/:checkoutRequestId', authenticate, mpesaController.queryTransactionStatus);

/**
 * M-Pesa callback endpoint (webhook)
 * POST /api/mpesa/callback
 * This endpoint is called by Safaricom - no authentication required
 */
router.post('/callback', mpesaController.handleCallback);

// ===================================
// TRANSACTION MANAGEMENT ROUTES
// ===================================

/**
 * Get M-Pesa payment statistics
 * GET /api/mpesa/stats
 * Query params: startDate, endDate
 */
router.get('/stats', authenticate, mpesaController.getStats);

/**
 * Get all M-Pesa transactions for branch
 * GET /api/mpesa/transactions
 * Query params: page, limit, status, startDate, endDate
 */
router.get('/transactions', authenticate, mpesaController.getTransactions);

/**
 * Get single transaction by ID
 * GET /api/mpesa/transactions/:id
 */
router.get('/transactions/:id', authenticate, mpesaController.getTransactionById);

// ===================================
// C2B AUTO-DETECTION ROUTES (New)
// ===================================

/**
 * C2B Validation endpoint
 * POST /api/mpesa/c2b/validate
 * M-Pesa asks "Should I accept this payment?"
 * No authentication - called by Safaricom
 */
router.post('/c2b/validate', mpesaController.handleC2BValidation);

/**
 * C2B Confirmation endpoint
 * POST /api/mpesa/c2b/confirm
 * M-Pesa says "Payment successful!"
 * No authentication - called by Safaricom
 */
router.post('/c2b/confirm', mpesaController.handleC2BConfirmation);

/**
 * Check if payment received for sale reference
 * GET /api/mpesa/check-payment/:reference
 * Used by frontend auto-detection polling
 */
router.get('/check-payment/:reference', authenticate, mpesaController.checkPaymentStatus);

/**
 * Verify manual M-Pesa receipt code
 * POST /api/payment/verify-receipt
 * Body: { receiptCode, expectedAmount }
 */
router.post('/verify-receipt', authenticate, mpesaController.verifyManualReceipt);

module.exports = router;
