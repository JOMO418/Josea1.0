const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate, authorize } = require('../middleware/auth');

// IMPLEMENTED ROUTES
router.post('/', authenticate, salesController.createSale);
router.get('/', authenticate, salesController.getAllSales);
router.get('/:id', authenticate, salesController.getSaleById);
router.post('/:id/request-reversal', authenticate, authorize('MANAGER', 'ADMIN', 'OWNER'), salesController.requestReversal);

// TODO: Implement these advanced features
// router.post('/override-price', authenticate, authorize('OWNER', 'ADMIN'), salesController.createSaleWithOverride);
// router.post('/:id/payment', authenticate, salesController.recordPayment);
// router.post('/:id/reverse', authenticate, authorize('OWNER', 'ADMIN'), salesController.reverseSale);

module.exports = router;