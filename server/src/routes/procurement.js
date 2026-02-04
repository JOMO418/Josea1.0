// ============================================
// PROCUREMENT ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const procurementController = require('../controllers/procurementController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ===== DASHBOARD =====
router.get('/stats', procurementController.getStats);
router.get('/activity', procurementController.getRecentActivity);

// ===== WORKERS =====
router.get('/workers', procurementController.getWorkers);

// ===== SUPPLIERS =====
router.get('/suppliers/by-location', procurementController.getSuppliersByLocation); // Must be before :id route
router.get('/suppliers', procurementController.getSuppliers);
router.get('/suppliers/:id', procurementController.getSupplierById);
router.post('/suppliers', authorize('OWNER', 'ADMIN'), procurementController.createSupplier);
router.put('/suppliers/:id', authorize('OWNER', 'ADMIN'), procurementController.updateSupplier);
router.delete('/suppliers/:id', authorize('OWNER', 'ADMIN'), procurementController.deleteSupplier);

// ===== SUPPLIER CATALOG (Products for a specific supplier) =====
router.get('/suppliers/:id/products', procurementController.getSupplierCatalog);
router.post('/suppliers/:id/products', authorize('OWNER', 'ADMIN'), procurementController.addProductToSupplier);

// ===== SUPPLIER PRODUCTS (PRICING) =====
router.get('/supplier-products', procurementController.getSupplierProducts);
router.post('/supplier-products', authorize('OWNER', 'ADMIN'), procurementController.createSupplierProduct);
router.put('/supplier-products/:id', authorize('OWNER', 'ADMIN'), procurementController.updateSupplierProduct);
router.delete('/supplier-products/:id', authorize('OWNER', 'ADMIN'), procurementController.deleteSupplierProduct);

// ===== PRODUCT SEARCH =====
router.get('/products/search', procurementController.searchProductsWithPrices);
router.get('/products/:id/suppliers', procurementController.getProductSuppliers);

// ===== PROCUREMENT ORDERS =====
router.get('/orders', procurementController.getProcurementOrders);
router.get('/orders/:id', procurementController.getProcurementOrderById);
router.post('/orders', authorize('OWNER', 'ADMIN', 'MANAGER'), procurementController.createProcurementOrder);
router.put('/orders/:id', authorize('OWNER', 'ADMIN', 'MANAGER'), procurementController.updateProcurementOrder);
router.delete('/orders/:id', authorize('OWNER', 'ADMIN'), procurementController.deleteProcurementOrder);

// ===== ORDER STATUS UPDATES =====
router.patch('/orders/:id/status', authorize('OWNER', 'ADMIN', 'MANAGER'), procurementController.updateOrderStatus);
router.patch('/orders/:id/payment', authorize('OWNER', 'ADMIN', 'MANAGER'), procurementController.updatePaymentStatus);
router.patch('/orders/:orderId/items/:itemId', authorize('OWNER', 'ADMIN', 'MANAGER'), procurementController.markItemReceived);

// ===== ORDER ITEM UPDATES (Worker actions) =====
router.put('/orders/:orderId/items/:itemId', authorize('OWNER', 'ADMIN', 'MANAGER'), procurementController.updateOrderItem);

// ===== SUPPLIER PAYMENTS =====
router.get('/supplier-payments', procurementController.getSupplierPayments);
router.put('/supplier-payments/:id', authorize('OWNER', 'ADMIN', 'MANAGER'), procurementController.updateSupplierPayment);

// ===== PENDING PAYMENTS =====
router.get('/payments/pending', procurementController.getPendingPayments);

module.exports = router;
