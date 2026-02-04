const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.get('/stats', authenticate, customerController.getCustomerStats);
router.get('/', authenticate, customerController.getCustomers);
router.get('/:id', authenticate, customerController.getCustomerDetails);
router.put('/:id', authenticate, customerController.updateCustomer);

module.exports = router;
