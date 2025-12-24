const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, inventoryController.getInventory);
router.put('/adjust', authenticate, authorize('OWNER', 'ADMIN'), inventoryController.adjustStock);

module.exports = router;