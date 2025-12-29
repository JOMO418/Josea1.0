const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate, authorize } = require('../middleware/auth');

// IMPLEMENTED ROUTES
router.post('/', authenticate, salesController.createSale);
router.get('/', authenticate, salesController.getAllSales);

// ADMIN ROUTES - Sales Audit Module (Place before /:id to avoid route conflicts)
router.get('/kpi-stats', authenticate, authorize('OWNER', 'ADMIN'), salesController.getSalesKPIs);

// SALE-SPECIFIC ROUTES
router.get('/:id', authenticate, salesController.getSaleById);
router.post('/:id/request-reversal', authenticate, authorize('MANAGER', 'ADMIN', 'OWNER'), salesController.requestReversal);
router.post('/:id/reversal-decision', authenticate, authorize('OWNER', 'ADMIN'), salesController.processReversal);
router.post('/:id/payment', authenticate, salesController.recordCreditPayment);

// TODO: Implement these advanced features
// router.post('/override-price', authenticate, authorize('OWNER', 'ADMIN'), salesController.createSaleWithOverride);

module.exports = router;