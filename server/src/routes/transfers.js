const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authenticate, authorize } = require('../middleware/auth');

// ===================================
// ADMIN ROUTES - Branch Orders Module
// CRITICAL: Specific routes MUST come BEFORE dynamic /:id routes
// ===================================
router.get('/requests/pending', authenticate, authorize('OWNER', 'ADMIN'), transferController.getPendingRequests);
router.patch('/:id/status', authenticate, authorize('OWNER', 'ADMIN'), transferController.updateTransferStatus);

// ===================================
// STANDARD TRANSFER ROUTES
// ===================================
router.post('/request', authenticate, transferController.requestTransfer);
router.put('/:id/approve', authenticate, authorize('OWNER', 'ADMIN'), transferController.approveTransfer);
router.put('/:id/pack', authenticate, authorize('OWNER', 'ADMIN'), transferController.packTransfer);
router.put('/:id/dispatch', authenticate, authorize('OWNER', 'ADMIN'), transferController.dispatchTransfer);
router.put('/:id/receive', authenticate, transferController.receiveTransfer);
router.put('/:id/cancel', authenticate, authorize('OWNER', 'ADMIN'), transferController.cancelTransfer);

router.get('/', authenticate, transferController.getTransfers);
router.get('/:id', authenticate, transferController.getTransfer);

module.exports = router;